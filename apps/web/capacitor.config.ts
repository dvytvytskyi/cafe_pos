import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.corgicafe.pos',
  appName: 'Corgi POS',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
