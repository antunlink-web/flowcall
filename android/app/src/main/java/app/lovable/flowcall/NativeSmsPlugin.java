package app.lovable.flowcall;

import android.Manifest;
import android.content.pm.PackageManager;
import android.telephony.SmsManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;

@CapacitorPlugin(
    name = "NativeSms",
    permissions = {
        @Permission(
            alias = "sms",
            strings = { Manifest.permission.SEND_SMS }
        )
    }
)
public class NativeSmsPlugin extends Plugin {

    /**
     * Send an SMS directly without user interaction
     * Requires SEND_SMS permission
     */
    @PluginMethod
    public void send(PluginCall call) {
        String number = call.getString("number");
        String message = call.getString("message");
        
        if (number == null || number.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }
        
        if (message == null || message.isEmpty()) {
            call.reject("Message is required");
            return;
        }

        // Check permission
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.SEND_SMS) 
                != PackageManager.PERMISSION_GRANTED) {
            call.reject("SEND_SMS permission not granted");
            return;
        }

        try {
            SmsManager smsManager;
            
            // Get SmsManager based on Android version
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = getContext().getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }

            // Handle long messages by splitting into multiple parts
            if (message.length() > 160) {
                ArrayList<String> messageParts = smsManager.divideMessage(message);
                smsManager.sendMultipartTextMessage(number, null, messageParts, null, null);
            } else {
                smsManager.sendTextMessage(number, null, message, null, null);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to send SMS: " + e.getMessage());
        }
    }

    /**
     * Check if SEND_SMS permission is granted
     */
    @PluginMethod
    public void checkSmsPermission(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(
            getContext(), 
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED;

        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    /**
     * Request SEND_SMS permission
     */
    @PluginMethod
    public void requestSmsPermission(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.SEND_SMS) 
                == PackageManager.PERMISSION_GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }

        // Save the call for the callback
        saveCall(call);
        
        // Request permission
        requestPermissionForAlias("sms", call, "smsPermissionCallback");
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        boolean granted = getPermissionState("sms") == PermissionState.GRANTED;
        
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }
}
