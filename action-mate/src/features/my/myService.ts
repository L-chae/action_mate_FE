import type { MyProfile } from "./types";

export async function getMyProfile(): Promise<MyProfile> {
  return {
    nickname: "동네 산책러 김개발",

    mannerTemp: 36.5,
    mannerLabel: "좋은 매너",

    kudosCount: 12,
  };
}
