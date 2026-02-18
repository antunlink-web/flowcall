import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.flowcall',
  appName: 'flowcall',
  webDir: 'dist',
  server: {
    url: 'https://flowcall.eu',
    cleartext: true,
  },
  plugins: {
    // SMS and Call plugins will be added here
  },
  android: {
    // Allow cleartext traffic for development
    allowMixedContent: true,
    // Append custom string to User-Agent so isNativeApp() can detect the WebView reliably
    appendUserAgent: 'CapacitorApp/app.lovable.flowcall',
  },
};

export default config;
