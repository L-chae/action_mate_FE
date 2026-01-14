// src/features/dm/types/dm.mapper.ts

import type { DMMessageDTO, DMThreadDTO } from "./dm.api";
import type { DMMessageUI, DMThreadUI } from "./dm.ui";
import { formatTimeAgo } from "../../../shared/utils/formatTime";

/**
 * DTO -> UI 변환 (한 곳에서만)
 */
export function toDMMessageUI(dto: DMMessageDTO, myUserId?: string): DMMessageUI {
  return {
    ...dto,
    isMine: myUserId ? dto.senderId === myUserId : undefined,
    createdAtText: formatTimeAgo(dto.createdAt),
  };
}

export function toDMThreadUI(dto: DMThreadDTO, myUserId?: string): DMThreadUI {
  return {
    ...dto,
    lastMessage: dto.lastMessage ? toDMMessageUI(dto.lastMessage, myUserId) : undefined,
    updatedAtText: formatTimeAgo(dto.updatedAt),
  };
}

/**
 * 배열 변환이 필요하면 이거도 같이 쓰면 편함
 */
export function toDMThreadsUI(list: DMThreadDTO[], myUserId?: string): DMThreadUI[] {
  return list.map((t) => toDMThreadUI(t, myUserId));
}
