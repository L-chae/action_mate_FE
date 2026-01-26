// src/shared/config/ReactotronConfig.ts
import Reactotron from "reactotron-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

// ✅ 필요 시 직접 PC IP를 고정해서 사용하세요 (자동 host 추출이 실패할 때)
const MY_IP = "192.168.10.45";

type TronType = typeof Reactotron;

const globalAny = global as unknown as {
  __REACTOTRON__?: TronType;
  __REACTOTRON_ORIGINAL_CONSOLE__?: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
  };
};

function safeGetHostFromScriptURL(): string | undefined {
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL as string | undefined;
  if (!scriptURL) return undefined;

  // 예: exp://192.168.0.10:19000, http://192.168.0.10:8081/index.bundle?...
  const afterProtocol = scriptURL.split("://")?.[1];
  if (!afterProtocol) return undefined;

  const hostPortPath = afterProtocol.split("/")?.[0] ?? "";
  const host = hostPortPath.split(":")?.[0]?.trim();
  return host || undefined;
}

function pickHost(): string {
  const detected = safeGetHostFromScriptURL();

  // 자동 감지된 host가 있으면 우선 사용
  if (detected) return detected;

  // 에뮬레이터 기본값 (실기기/Expo Go라면 보통 MY_IP가 필요)
  if (Platform.OS === "android") return "10.0.2.2";
  return "localhost";
}

let tron: TronType = Reactotron;

if (__DEV__) {
  // Fast Refresh로 중복 연결/console 납치 방지
  if (!globalAny.__REACTOTRON__) {
    const host = pickHost();

    tron = Reactotron.setAsyncStorageHandler(AsyncStorage)
      .configure({
        name: "Action Mate",
        host: MY_IP, // 자동 연결이 안 되면 이 줄로 고정
      })
      .useReactNative({
        asyncStorage: true,
        networking: { ignoreUrls: /symbolicate/ },
        errors: true,
        overlay: false,
      })
      .connect();

    globalAny.__REACTOTRON__ = tron;

    // console 원본 보관 후 Reactotron으로 라우팅 (앱 셧다운 방지)
    if (!globalAny.__REACTOTRON_ORIGINAL_CONSOLE__) {
      globalAny.__REACTOTRON_ORIGINAL_CONSOLE__ = {
        log: console.log,
        warn: console.warn,
        error: console.error,
      };
    }

    (console as any).log = (...args: any[]) => (tron as any).log?.(...args);
    (console as any).warn = (...args: any[]) => (tron as any).warn?.(...args);
    (console as any).error = (...args: any[]) => (tron as any).error?.(...args);

    // 연결 상태 확인용 (Reactotron에서 바로 보임)
    (tron as any).log?.(`[Reactotron] connected (host=${host})`);
  } else {
    tron = globalAny.__REACTOTRON__ ?? Reactotron;
  }
}

export default tron;