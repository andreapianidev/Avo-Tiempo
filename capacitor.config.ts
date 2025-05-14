import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.avoagency.avoweather',
  appName: 'AVOWeather',
  webDir: 'build',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#FFF8F0",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP"
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#CE8D3E"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  },
  ios: {
    contentInset: 'always',
    scheme: 'AVOWeather',
    backgroundColor: '#FFF8F0'
  },
  android: {
    backgroundColor: '#FFF8F0'
  }  
};

export default config;
