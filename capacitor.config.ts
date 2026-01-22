import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.586aecdfc0d14d65843c63a86d0999f4',
  appName: 'flowcall',
  webDir: 'dist',
  server: {
    url: 'https://586aecdf-c0d1-4d65-843c-63a86d0999f4.lovableproject.com?forceHideBadge=true',
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
