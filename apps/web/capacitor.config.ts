import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.corgicafe.pos',
  appName: 'Corgi POS',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  // POS shell (Orders + Tables only) activates automatically via Capacitor.isNativePlatform().
  // Web preview: NEXT_PUBLIC_POS_SHELL=true npm run dev
};

export default config;
