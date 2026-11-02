import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.almo7taref.koutbo6',
  appName: 'كوت بو ستة أونو',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#070c14',
      overlaysWebView: false,
    },
    ScreenOrientation: {
      // Allows portrait on phones and full flexibility on tablets
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#070c14',
  },
  ios: {
    backgroundColor: '#070c14',
    contentInset: 'always',
    preferredContentMode: 'mobile',
  },
};

export default config;
