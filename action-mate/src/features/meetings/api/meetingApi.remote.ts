import { MeetingApi } from "./meetingApi";

// TODO: Axios 인스턴스 연동
// import { client } from "@/shared/api/client";

export const meetingApiRemote: MeetingApi = {
  listHotMeetings: async () => { throw new Error("Not Implemented"); },
  listMeetings: async () => { throw new Error("Not Implemented"); },
  listMeetingsAround: async () => { throw new Error("Not Implemented"); },
  getMeeting: async () => { throw new Error("Not Implemented"); },
  createMeeting: async () => { throw new Error("Not Implemented"); },
  updateMeeting: async () => { throw new Error("Not Implemented"); },
  joinMeeting: async () => { throw new Error("Not Implemented"); },
  cancelJoin: async () => { throw new Error("Not Implemented"); },
  cancelMeeting: async () => { throw new Error("Not Implemented"); },
};