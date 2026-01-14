import 'dotenv/config'; // .env 파일을 읽어오기 위해 필수

export default {
  expo: {
    name: "action-mate",
    slug: "action-mate",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "actionmate",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.actionmate.app",
      config: {
        // ✅ 수정됨: 직접 키를 적지 않고 환경 변수에서 가져옵니다.
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY
      }
    },
    
    android: {
      package: "com.actionmate.app",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      softwareKeyboardLayoutMode: "resize",
      config: {
        googleMaps: {
          // ✅ 수정됨: 안드로이드도 동일하게 환경 변수 사용
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY
        }
      }
    },
    
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ],
      "@react-native-community/datetimepicker"
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    }
  }
};