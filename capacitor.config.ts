import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'sa.teachix.app',
  appName: 'Teachix',
  webDir: 'www',
  server: {
    url: 'https://teachix.sa/dashboard',
    cleartext: false,
    allowNavigation: ['https://teachix.sa'],
  },
};

export default config;
