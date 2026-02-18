package app.lovable.flowcall;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.telephony.SmsManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * CompanionForegroundService
 *
 * Runs as a foreground service with a persistent notification.
 * Polls Supabase every 5 seconds for pending dial_requests and sms_requests,
 * executes them natively (call / SMS), then marks them as completed.
 *
 * Auth credentials are passed in via SharedPreferences by CompanionServicePlugin.
 */
public class CompanionForegroundService extends Service {

    private static final String TAG = "CompanionService";
    private static final String CHANNEL_ID = "flowcall_companion";
    private static final int NOTIFICATION_ID = 1001;
    private static final long POLL_INTERVAL_MS = 5000; // 5 seconds

    public static final String PREFS_NAME = "flowcall_companion";
    public static final String KEY_SUPABASE_URL = "supabase_url";
    public static final String KEY_ANON_KEY = "anon_key";
    public static final String KEY_ACCESS_TOKEN = "access_token";
    public static final String KEY_USER_ID = "user_id";

    private Handler handler;
    private Runnable pollRunnable;
    private boolean running = false;

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        handler = new Handler(Looper.getMainLooper());
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, buildNotification("Ready — waiting for requests"));
        startPolling();
        return START_STICKY; // Restart if killed
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        running = false;
        if (handler != null && pollRunnable != null) {
            handler.removeCallbacks(pollRunnable);
        }
        super.onDestroy();
    }

    // ── Polling ────────────────────────────────────────────────────────────────

    private void startPolling() {
        if (running) return;
        running = true;

        pollRunnable = new Runnable() {
            @Override
            public void run() {
                if (!running) return;
                try {
                    pollRequests();
                } catch (Exception e) {
                    Log.e(TAG, "Poll error", e);
                }
                handler.postDelayed(this, POLL_INTERVAL_MS);
            }
        };

        handler.post(pollRunnable);
    }

    private void pollRequests() throws Exception {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String supabaseUrl   = prefs.getString(KEY_SUPABASE_URL, "");
        String anonKey       = prefs.getString(KEY_ANON_KEY, "");
        String accessToken   = prefs.getString(KEY_ACCESS_TOKEN, "");
        String userId        = prefs.getString(KEY_USER_ID, "");

        if (supabaseUrl.isEmpty() || accessToken.isEmpty() || userId.isEmpty()) {
            Log.w(TAG, "Credentials not set — skipping poll");
            return;
        }

        // Poll dial_requests
        JSONArray dialRequests = fetchPendingRequests(
            supabaseUrl + "/rest/v1/dial_requests?user_id=eq." + userId + "&status=eq.pending&select=id,phone_number",
            anonKey, accessToken
        );
        for (int i = 0; i < dialRequests.length(); i++) {
            JSONObject req = dialRequests.getJSONObject(i);
            String id = req.getString("id");
            String phone = req.getString("phone_number");
            makeCall(phone);
            markDone(supabaseUrl + "/rest/v1/dial_requests?id=eq." + id, anonKey, accessToken);
            updateNotification("Called " + phone);
        }

        // Poll sms_requests
        JSONArray smsRequests = fetchPendingRequests(
            supabaseUrl + "/rest/v1/sms_requests?user_id=eq." + userId + "&status=eq.pending&select=id,phone_number,message",
            anonKey, accessToken
        );
        for (int i = 0; i < smsRequests.length(); i++) {
            JSONObject req = smsRequests.getJSONObject(i);
            String id      = req.getString("id");
            String phone   = req.getString("phone_number");
            String message = req.getString("message");
            sendSms(phone, message);
            markDone(supabaseUrl + "/rest/v1/sms_requests?id=eq." + id, anonKey, accessToken);
            updateNotification("SMS sent to " + phone);
        }
    }

    // ── HTTP helpers ───────────────────────────────────────────────────────────

    private JSONArray fetchPendingRequests(String urlStr, String anonKey, String accessToken) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("apikey", anonKey);
        conn.setRequestProperty("Authorization", "Bearer " + accessToken);
        conn.setRequestProperty("Accept", "application/json");
        conn.setConnectTimeout(4000);
        conn.setReadTimeout(4000);

        int code = conn.getResponseCode();
        if (code != 200) {
            Log.w(TAG, "Fetch returned " + code);
            return new JSONArray();
        }

        BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) sb.append(line);
        conn.disconnect();

        return new JSONArray(sb.toString());
    }

    private void markDone(String urlStr, String anonKey, String accessToken) {
        new Thread(() -> {
            try {
                URL url = new URL(urlStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PATCH");
                conn.setRequestProperty("apikey", anonKey);
                conn.setRequestProperty("Authorization", "Bearer " + accessToken);
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Prefer", "return=minimal");
                conn.setDoOutput(true);
                conn.setConnectTimeout(4000);
                conn.setReadTimeout(4000);

                String body = "{\"status\":\"completed\"}";
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.getBytes("UTF-8"));
                }
                conn.getResponseCode(); // trigger request
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "markDone error", e);
            }
        }).start();
    }

    // ── Native call / SMS ──────────────────────────────────────────────────────

    private void makeCall(String phone) {
        try {
            Intent callIntent = new Intent(Intent.ACTION_CALL);
            callIntent.setData(Uri.parse("tel:" + phone));
            callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(callIntent);
            Log.i(TAG, "Call initiated: " + phone);
        } catch (Exception e) {
            Log.e(TAG, "makeCall error", e);
        }
    }

    private void sendSms(String phone, String message) {
        try {
            SmsManager smsManager;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }

            if (message.length() > 160) {
                ArrayList<String> parts = smsManager.divideMessage(message);
                smsManager.sendMultipartTextMessage(phone, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(phone, null, message, null, null);
            }
            Log.i(TAG, "SMS sent: " + phone);
        } catch (Exception e) {
            Log.e(TAG, "sendSms error", e);
        }
    }

    // ── Notification ───────────────────────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "FlowCall Smart",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Companion service for automatic calls and SMS");
            channel.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(String text) {
        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            this, 0, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("FlowCall Smart")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.sym_call_outgoing)
            .setContentIntent(pi)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void updateNotification(String text) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification(text));
    }
}
