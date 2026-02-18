import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.flowcall',
  appName: 'flowcall',
  webDir: 'dist',
  server: {
    url: 'https://flowcall.lovable.app',
    cleartext: true,
  },
  plugins: {
    // SMS and Call plugins will be added here
  },
  android: {
    // Allow cleartext traffic for development
    allowMixedContent: true,
  },
};

export default config;
