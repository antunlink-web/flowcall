package app.lovable.flowcall;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "NativeDialer",
    permissions = {
        @Permission(
            alias = "call",
            strings = { Manifest.permission.CALL_PHONE }
        )
    }
)
public class NativeDialerPlugin extends Plugin {
    private static final int CALL_PHONE_PERMISSION_CODE = 100;

    /**
     * Make a direct phone call without user interaction
     * Requires CALL_PHONE permission
     */
    @PluginMethod
    public void call(PluginCall call) {
        String number = call.getString("number");
        
        if (number == null || number.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }

        // Check permission
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CALL_PHONE) 
                != PackageManager.PERMISSION_GRANTED) {
            call.reject("CALL_PHONE permission not granted");
            return;
        }

        try {
            // Use ACTION_CALL for direct calling (no user interaction)
            Intent callIntent = new Intent(Intent.ACTION_CALL);
            callIntent.setData(Uri.parse("tel:" + number));
            callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(callIntent);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to make call: " + e.getMessage());
        }
    }

    /**
     * Check if CALL_PHONE permission is granted
     */
    @PluginMethod
    public void checkCallPermission(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(
            getContext(), 
            Manifest.permission.CALL_PHONE
        ) == PackageManager.PERMISSION_GRANTED;

        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    /**
     * Request CALL_PHONE permission
     */
    @PluginMethod
    public void requestCallPermission(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CALL_PHONE) 
                == PackageManager.PERMISSION_GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }

        // Save the call for the callback
        saveCall(call);
        
        // Request permission
        requestPermissionForAlias("call", call, "callPermissionCallback");
    }

    @PermissionCallback
    private void callPermissionCallback(PluginCall call) {
        boolean granted = getPermissionState("call") == PermissionState.GRANTED;
        
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }
}
