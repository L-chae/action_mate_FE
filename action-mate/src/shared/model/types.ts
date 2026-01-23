// src/shared/model/types.ts

// 1. 기본 Alias
export type ISODateString = string;
export type Id = string | number;

// ✅ 2. 공통 Enum (프론트엔드 편의를 위해 Gender는 영문 유지)
export type Gender = "male" | "female"; 

export type PostCategory = '운동' | '오락' | '식사' | '자유';
export type PostState = 'OPEN' | 'STARTED' | 'ENDED' | 'FULL' | 'CANCELED';
export type JoinMode = 'INSTANT' | 'APPROVAL';
export type ApplicantState = 'APPROVED' | 'REJECTED' | 'PENDING';
export type MyParticipationStatus = 'HOST' | 'MEMBER' | 'PENDING' | 'NONE';

// 3. 유저 관련
export type UserSummary = {
  id: string;
  nickname: string;
  avatarUrl?: string | null;
};

// 백엔드에서 내려오는 원본 프로필 타입 (변환 전)
export interface ServerProfile {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  birth: string;
  gender: "남" | "여"; // 👈 서버는 한글
  avgRate: number;
  orgTime: number;
}

// 프론트엔드 내부에서 쓸 유저 객체
export interface UserProfile { // User와 호환됨
  id: string;
  nickname: string;
  profileImageUrl?: string;
  birth: string;
  gender: Gender; // 👈 프론트는 영문
  avgRate: number;
  orgTime: number;
}

// 4. 게시글
export interface Post {
  id: number;
  category: PostCategory;
  title: string;
  content: string;
  writerId: string;
  writerNickname: string;
  writerImageUrl?: string;
  meetingTime: ISODateString;
  locationName: string;
  longitude: number;
  latitude: number;
  currentCount: number;
  capacity: number;
  state: PostState;
  joinMode: JoinMode;
  lastModified: ISODateString;
  myParticipationStatus: MyParticipationStatus;
}

// 5. 기타
export interface Applicant {
  postId: number;
  userId: string;
  state: ApplicantState;
}

export interface ChatRoom {
  roomId: number;
  opponentId: string;
  opponentNickname: string;
  opponentProfileImageUrl?: string;
  postId: number;
  unReadCount: number;
  lastMessageContent: string;
}

export interface Message {
  messageId: number;
  roomId: number;
  postId: number;
  postTitle: string;
  senderId: string;
  content: string;
}