// src/features/meetings/model/mapper.ts

import { MeetingPostDTO, ApplicantDTO } from "./dto";
import { MeetingPost, CategoryKey, Participant } from "./types";

// ✅ 1. 카테고리 안전 변환기 (여기가 에러 원인)
const parseCategory = (raw?: string): CategoryKey => {
  // 🛡️ 방어 코드: 값이 없으면 무조건 ETC 반환 (앱 종료 방지)
  if (!raw) return "ETC"; 

  const key = raw.toUpperCase();
  switch (key) {
    case "SPORTS": case "운동": return "SPORTS";
    case "GAMES":  case "오락": return "GAMES";
    case "MEAL":   case "식사": return "MEAL";
    case "STUDY":  case "공부": case "자유": return "STUDY";
    default: return "ETC";
  }
};

// 2. DTO -> Domain 변환 함수 (게시글)
export const toMeetingPost = (dto: MeetingPostDTO): MeetingPost => {
  // 🛡️ DTO 자체가 없을 경우 방어
  if (!dto) {
    console.warn("toMeetingPost: dto is null/undefined");
    return {} as MeetingPost;
  }

  return {
    id: String(dto.id),
    title: dto.title || "",
    content: dto.content || "",
    // 여기서 parseCategory가 호출됨 -> 위 방어 코드로 해결됨
    category: parseCategory(dto.category), 
    
    meetingTime: dto.meetingTime,
    
    location: {
      name: dto.locationName || "",
      lat: dto.latitude || 0,
      lng: dto.longitude || 0,
    },
    
    capacity: {
      total: dto.capacity || 1,
      current: 0,
    },
    
    status: dto.state || "OPEN", 
    joinMode: dto.joinMode || "INSTANT",
  };
};

// 3. DTO -> Participant 변환
export const toParticipant = (dto: ApplicantDTO): Participant => {
  if (!dto) return {} as Participant;

  const statusMap: Record<string, any> = {
    APPROVED: "MEMBER",
    PENDING: "PENDING",
    REJECTED: "REJECTED"
  };

  return {
    id: dto.userId,
    nickname: dto.userId, 
    avatarUrl: null, 
    status: statusMap[dto.state] || "NONE",
    appliedAt: new Date().toISOString(), 
  };
};