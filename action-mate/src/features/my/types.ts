export type MySummary = {
  praiseCount: number; // 받은 칭찬 수
  temperature: number; // 계산된 온도(표시용)
};

export type MyProfile = {
  nickname: string;
  photoUrl?: string;
};

export type MyMeetingItem = {
  id: string;
  title: string;
  place: string;
  dateText: string; // "1/20(화) 19:00" 같은 표시용
  memberCount: number;
};