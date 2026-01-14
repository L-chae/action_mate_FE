// src/features/dm/types/dm.ui.ts

import type { DMMessageDTO, DMThreadDTO, UserSummaryDTO } from "./dm.api";

/**
 * 최소 버전: UI 타입을 DTO alias로 시작해도 됨.
 * 나중에 필요해질 때만 아래처럼 확장.
 */
export type UserSummaryUI = UserSummaryDTO;

export type DMMessageUI = DMMessageDTO & {
  // 예) 화면 표시용
  createdAtText?: string; // "방금", "오후 3:10"
  isMine?: boolean;       // 현재 로그인 유저 기준 (화면에서만 필요)
};

export type DMThreadUI = Omit<DMThreadDTO, "lastMessage" | "updatedAt"> & {
  lastMessage?: DMMessageUI;

  // 예) 리스트 표시용 텍스트
  updatedAtText?: string; // "어제", "1시간 전"
};
