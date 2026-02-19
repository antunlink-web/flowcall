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
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

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
 *
 * IMPORTANT: All network calls run on a background thread via ScheduledExecutorService.
 */
public class CompanionForegroundService extends Service {

    private static final String TAG = "CompanionService";
    private static final String CHANNEL_ID = "flowcall_companion";
    private static final int NOTIFICATION_ID = 1001;
    private static final long POLL_INTERVAL_SECONDS = 5;

    public static final String PREFS_NAME = "flowcall_companion";
    public static final String KEY_SUPABASE_URL = "supabase_url";
    public static final String KEY_ANON_KEY = "anon_key";
    public static final String KEY_ACCESS_TOKEN = "access_token";
    public static final String KEY_USER_ID = "user_id";

    // Use a background executor — never run network on main thread
    private ScheduledExecutorService executor;
    private Handler mainHandler;

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        mainHandler = new Handler(Looper.getMainLooper());
        executor = Executors.newSingleThreadScheduledExecutor();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        try {
            startForeground(NOTIFICATION_ID, buildNotification("Ready — waiting for requests"));
        } catch (SecurityException e) {
            Log.e(TAG, "Cannot start foreground service — missing permission. Running without foreground.", e);
            // Don't crash the app — just run as a regular service (may get killed by OS)
        }
        startPolling();
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        if (executor != null && !executor.isShutdown()) {
            executor.shutdownNow();
        }
        super.onDestroy();
    }

    // ── Polling (background thread) ────────────────────────────────────────────

    private void startPolling() {
        executor.scheduleWithFixedDelay(
            this::pollRequests,
            0,
            POLL_INTERVAL_SECONDS,
            TimeUnit.SECONDS
        );
    }

    private void pollRequests() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String supabaseUrl  = prefs.getString(KEY_SUPABASE_URL, "");
        String anonKey      = prefs.getString(KEY_ANON_KEY, "");
        String accessToken  = prefs.getString(KEY_ACCESS_TOKEN, "");
        String userId       = prefs.getString(KEY_USER_ID, "");

        if (supabaseUrl.isEmpty() || accessToken.isEmpty() || userId.isEmpty()) {
            Log.w(TAG, "Credentials not set — skipping poll");
            return;
        }

        try {
            // Poll dial_requests
            JSONArray dialRequests = fetchPendingRequests(
                supabaseUrl + "/rest/v1/dial_requests?user_id=eq." + userId
                    + "&status=eq.pending&select=id,phone_number",
                anonKey, accessToken
            );
            for (int i = 0; i < dialRequests.length(); i++) {
                JSONObject req = dialRequests.getJSONObject(i);
                String id    = req.getString("id");
                String phone = req.getString("phone_number");
                // Calls must be dispatched on the main thread
                final String finalPhone = phone;
                mainHandler.post(() -> makeCall(finalPhone));
                markDone(
                    supabaseUrl + "/rest/v1/dial_requests?id=eq." + id,
                    anonKey, accessToken
                );
                postNotification("Called " + phone);
            }

            // Poll sms_requests
            JSONArray smsRequests = fetchPendingRequests(
                supabaseUrl + "/rest/v1/sms_requests?user_id=eq." + userId
                    + "&status=eq.pending&select=id,phone_number,message",
                anonKey, accessToken
            );
            for (int i = 0; i < smsRequests.length(); i++) {
                JSONObject req = smsRequests.getJSONObject(i);
                String id      = req.getString("id");
                String phone   = req.getString("phone_number");
                String message = req.getString("message");
                sendSms(phone, message);
                markDone(
                    supabaseUrl + "/rest/v1/sms_requests?id=eq." + id,
                    anonKey, accessToken
                );
                postNotification("SMS sent to " + phone);
            }
        } catch (Exception e) {
            Log.e(TAG, "Poll error", e);
        }
    }

    // ── HTTP helpers ───────────────────────────────────────────────────────────

    private JSONArray fetchPendingRequests(String urlStr, String anonKey, String accessToken)
            throws Exception {
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
            Log.w(TAG, "Fetch returned HTTP " + code + " for " + urlStr);
            conn.disconnect();
            return new JSONArray();
        }

        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(conn.getInputStream()))) {
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
        }
        conn.disconnect();
        return new JSONArray(sb.toString());
    }

    private void markDone(String urlStr, String anonKey, String accessToken) {
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

            byte[] body = "{\"status\":\"completed\"}".getBytes("UTF-8");
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body);
            }
            conn.getResponseCode();
            conn.disconnect();
        } catch (Exception e) {
            Log.e(TAG, "markDone error", e);
        }
    }

    // ── Native call / SMS ──────────────────────────────────────────────────────

    /** Must be called on the main thread — startActivity requires it */
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

    /** SMS is safe to call from background thread */
    private void sendSms(String phone, String message) {
        try {
            SmsManager smsManager;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }

            if (smsManager == null) {
                Log.e(TAG, "SmsManager is null");
                return;
            }

            if (message.length() > 160) {
                ArrayList<String> parts = smsManager.divideMessage(message);
                smsManager.sendMultipartTextMessage(phone, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(phone, null, message, null, null);
            }
            Log.i(TAG, "SMS sent to " + phone);
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

    private void postNotification(String text) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification(text));
    }
}
