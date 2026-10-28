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
      bundleIdentifier: 'com.oanh.fooddelivery',
    },

    android: {
      package: 'com.oanh.fooddelivery',
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

    owner: 'oanhcute-afk',
    extra: {
      eas: {
        projectId: 'c1bd7458-407f-4941-9664-37134df9d6af',
      },
    },
  },
};