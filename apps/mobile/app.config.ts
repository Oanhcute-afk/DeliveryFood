export default {
  expo: {
    name: 'mobile',
    slug: 'mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'mobile',
    userInterfaceStyle: 'automatic',

    ios: {
      icon: './assets/expo.icon',
      bundleIdentifier: 'com.loopoen.fooddelivery',
      // Tải từ Firebase Console. Trên EAS có thể dùng biến môi trường kiểu file.
      googleServicesFile:
        process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist',
    },

    android: {
      package: 'com.loopoen.fooddelivery',
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
      ],
    },

    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },

    plugins: [
      'expo-router',
      // iOS: dùng CocoaPods + static frameworks (SPM bắt buộc dynamic frameworks)
      ['@react-native-firebase/app', { ios: { disableSPM: true } }],
      '@react-native-firebase/auth',
      '@react-native-google-signin/google-signin',
      [
        'expo-build-properties',
        {
          // React Native Firebase trên iOS cần static frameworks
          ios: { useFrameworks: 'static' },
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#208AEF',
          android: {
            image: './assets/images/splash-icon.png',
            imageWidth: 76,
          },
        },
      ],
      [
        '@stripe/stripe-react-native',
        {
          merchantIdentifier: 'merchant.com.fooddelivery.mobile',
          enableGooglePay: false,
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Allow Food Delivery to use your location for delivery tracking.',
          locationAlwaysPermission:
            'Allow Food Delivery to track your location in the background while delivering.',
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      eas: {
        projectId: 'ee2a5212-ca6e-4a18-a1ab-b9c56df0b2f8',
      },
    },
  },
};