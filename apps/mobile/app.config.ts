export default {
  expo: {
    name: 'deliFood',
    slug: 'mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'mobile',
    userInterfaceStyle: 'automatic',

    ios: {
      icon: './assets/images/icon.png',
      bundleIdentifier: 'com.oanh.fooddelivery',
    },

    android: {
      package: 'com.oanh.fooddelivery',
      adaptiveIcon: {
        backgroundColor: '#FF6B35',
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
      [
        'expo-splash-screen',
        {
          backgroundColor: '#FF6B35',
          android: {
            image: './assets/images/splash-icon.png',
            imageWidth: 160,
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
            'Allow deliFood to use your location for delivery tracking.',
          locationAlwaysPermission:
            'Allow deliFood to track your location in the background while delivering.',
        },
      ],
    ],

        experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

<<<<<<< HEAD
    // Project EAS: https://expo.dev/accounts/oanhcute-afk/projects/mobile
=======
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    owner: 'oanhcute-afk',
    extra: {
      eas: {
        projectId: 'c1bd7458-407f-4941-9664-37134df9d6af',
      },
    },
  },
};