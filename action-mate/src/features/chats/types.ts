export type Room = {
  id: string;       // roomId
  postId: string;   // meetingId
  title: string;
  lastMessage: string;
  updatedAtText: string;
  status: "ACTIVE" | "ARCHIVED";
};

export type Message = {
  id: string;
  roomId: string;
  sender: "ME" | "OTHER" | "SYSTEM";
  content: string;
  createdAtText: string;
};
