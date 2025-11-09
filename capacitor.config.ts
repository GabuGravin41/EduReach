import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.edureach.app',
  appName: 'EduReach',
  webDir: 'dist',
  server: {
    url: 'https://melodious-cooperation-production.up.railway.app',
    cleartext: true
  }
};

export default config;
