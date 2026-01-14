export type MyProfile = {
  nickname: string;

  // ✅ 당근온도 스타일
  mannerTemp: number;      // 0~100 (예: 36.5)
  mannerLabel: string;     // "좋은 매너" 같은 문구

  // 옵션(원하면 유지)
  kudosCount?: number;     // 참고용
};
