import "dotenv/config"; // .env 로드

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "";
const KAKAO_NATIVE_APP_KEY = process.env.KAKAO_NATIVE_APP_KEY ?? "";

if (!GOOGLE_MAPS_KEY) {
  console.warn("[app.config] EXPO_PUBLIC_GOOGLE_MAPS_KEY is missing. Google Maps may not work.");
}
if (!KAKAO_NATIVE_APP_KEY) {
  console.warn("[app.config] KAKAO_NATIVE_APP_KEY is missing. Kakao login build/config may fail.");
}

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

    extra: {
      eas: {
        projectId: "0968327b-5914-4a6e-b637-76d47a977ef9",
      },
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.actionmate.app",
      config: {
        googleMapsApiKey: GOOGLE_MAPS_KEY,
      },
    },

    android: {
      package: "com.actionmate.app",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },

      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      softwareKeyboardLayoutMode: "resize",
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_KEY,
        },
      },
    },

    androidStatusBar: {
      translucent: false,
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
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
            backgroundColor: "#000000",
          },
        },
      ],
      [
        "@react-native-seoul/kakao-login",
        {
          kakaoAppKey: String(KAKAO_NATIVE_APP_KEY),
          kotlinVersion: "2.0.0",
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            extraMavenRepos: ["https://devrepo.kakao.com/nexus/content/groups/public/"],
          },
        },
      ],
      "@react-native-community/datetimepicker",
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};