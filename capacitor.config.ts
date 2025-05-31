import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.avoagency.avotiempo',
  appName: 'Avo Tiempo',
  webDir: 'build',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#4299e1",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP"
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#2f855a"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  },
  ios: {
    contentInset: 'always',
    scheme: 'AvoTiempo',
    backgroundColor: '#4299e1'
  },
  android: {
    backgroundColor: '#4299e1'
  }  
};

export default config;
