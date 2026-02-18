package app.lovable.flowcall;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register all custom Capacitor plugins
        registerPlugin(NativeDialerPlugin.class);
        registerPlugin(NativeSmsPlugin.class);
        registerPlugin(CompanionServicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
