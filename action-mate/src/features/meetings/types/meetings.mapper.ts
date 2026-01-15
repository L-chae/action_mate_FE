// src/features/meetings/types/meetings.mapper.ts

import type { MeetingDTO } from "./meetings.api";
import type { MeetingUI } from "./meetings.ui";

// ✅ 공용 유틸 (네가 만든 formatTime.ts 기준)
import { formatMeetingTime, formatTimeAgo } from "../../../shared/utils/formatTime";

// (선택) 거리 유틸이 이미 있다면 사용
import { formatDistance } from "../../../shared/utils/formatDistance";

export function toMeetingUI(dto: MeetingDTO): MeetingUI {
  return {
    ...dto,

    // 원본 -> UI 텍스트
    meetingTimeText: formatMeetingTime(dto.meetingAt),

    distanceText:
      dto.distanceMeters != null ? formatDistance(dto.distanceMeters) : undefined,

    memoUpdatedAtText:
      dto.memoUpdatedAt ? formatTimeAgo(dto.memoUpdatedAt) : undefined,
  };
}

export function toMeetingsUI(list: MeetingDTO[]): MeetingUI[] {
  return list.map(toMeetingUI);
}
