import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'sa.teachix.app',
  appName: 'Teachix',
  webDir: 'www',
  server: {
    url: 'https://teachix.sa/dashboard',
    cleartext: false,
    allowNavigation: ['teachix.sa'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
        backgroundColor: '#1769FF',
      androidSplashResourceName: 'splash_icon',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
};

export default config;
