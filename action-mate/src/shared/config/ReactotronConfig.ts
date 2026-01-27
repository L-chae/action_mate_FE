// src/shared/config/ReactotronConfig.ts
import Reactotron from "reactotron-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

// Types
type TronType = typeof Reactotron;

// 전역 객체 타입 정의 (Fast Refresh 시 설정 유지용)
const globalAny = global as unknown as {
  __REACTOTRON__?: TronType;
  __REACTOTRON_ORIGINAL_CONSOLE__?: {
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
};

/**
 * [Host 자동 감지 함수]
 * 1. Expo Go (Wi-Fi): 실행 중인 스크립트 주소(scriptURL)에서 IP를 추출합니다.
 * 2. Android Emulator: 10.0.2.2를 반환합니다.
 * 3. iOS Simulator / USB: localhost를 반환합니다.
 */
function getHost(): string {
  try {
    const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL as string | undefined;
    
    // 1. scriptURL이 있으면 IP 추출 (Wi-Fi 연결 시 핵심)
    if (scriptURL) {
      const address = scriptURL.split("://")[1]?.split("/")[0];
      const ip = address?.split(":")[0];
      if (ip) return ip;
    }

    // 2. scriptURL이 없거나 파싱 실패 시 기본값 (에뮬레이터/USB)
    if (Platform.OS === "android") return "10.0.2.2";
    return "localhost";

  } catch (e) {
    return "localhost";
  }
}

let tron: TronType = Reactotron;
const MY_PC_IP="192.168.10.57";
if (__DEV__) {
  // Fast Refresh로 인한 중복 실행 방지
  if (!globalAny.__REACTOTRON__) {
    
    const detectedHost = getHost();

    tron = Reactotron.setAsyncStorageHandler(AsyncStorage)
      .configure({
        name: "Action Mate",
        host: MY_PC_IP,
      })
      .useReactNative({
        asyncStorage: true,
        networking: {
          ignoreUrls: /symbolicate/,
        },
        errors: true,
        editor: false,
        overlay: false,
      })
      .connect();

    globalAny.__REACTOTRON__ = tron;

    // [Console Patching]
    if (!globalAny.__REACTOTRON_ORIGINAL_CONSOLE__) {
      globalAny.__REACTOTRON_ORIGINAL_CONSOLE__ = {
        log: console.log,
        warn: console.warn,
        error: console.error,
      };
    }

    // ✅ Fix: (tron as any)를 사용하여 TS(2556) Spread Argument 오류 해결
    console.log = (...args: any[]) => {
      globalAny.__REACTOTRON_ORIGINAL_CONSOLE__?.log(...args);
      (tron as any).log?.(...args);
    };

    console.warn = (...args: any[]) => {
      globalAny.__REACTOTRON_ORIGINAL_CONSOLE__?.warn(...args);
      (tron as any).warn?.(...args);
    };

    console.error = (...args: any[]) => {
      globalAny.__REACTOTRON_ORIGINAL_CONSOLE__?.error(...args);
      (tron as any).error?.(...args);
    };

    (tron as any).log?.(`[Reactotron] Configured & Connected! Host: ${detectedHost}`);
    
  } else {
    tron = globalAny.__REACTOTRON__;
  }
}

export default tron;