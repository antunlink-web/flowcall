package app.lovable.flowcall;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * CompanionServicePlugin
 *
 * Capacitor plugin that allows the JS layer to:
 * - start() / stop() the foreground service
 * - setCredentials() — passes Supabase URL, anon key, JWT, user ID
 *   into SharedPreferences so the background service can make authenticated requests
 */
@CapacitorPlugin(name = "CompanionService")
public class CompanionServicePlugin extends Plugin {

    /** Store auth credentials in SharedPreferences for the background service */
    @PluginMethod
    public void setCredentials(PluginCall call) {
        String supabaseUrl  = call.getString("supabaseUrl", "");
        String anonKey      = call.getString("anonKey", "");
        String accessToken  = call.getString("accessToken", "");
        String userId       = call.getString("userId", "");

        SharedPreferences prefs = getContext().getSharedPreferences(
            CompanionForegroundService.PREFS_NAME, Context.MODE_PRIVATE
        );
        prefs.edit()
            .putString(CompanionForegroundService.KEY_SUPABASE_URL, supabaseUrl)
            .putString(CompanionForegroundService.KEY_ANON_KEY, anonKey)
            .putString(CompanionForegroundService.KEY_ACCESS_TOKEN, accessToken)
            .putString(CompanionForegroundService.KEY_USER_ID, userId)
            .apply();

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    /** Start the foreground companion service */
    @PluginMethod
    public void start(PluginCall call) {
        Intent intent = new Intent(getContext(), CompanionForegroundService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    /** Stop the foreground companion service */
    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), CompanionForegroundService.class);
        getContext().stopService(intent);

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
}
