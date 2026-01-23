// src/shared/api/endpoints.ts

export const endpoints = {
  auth: {
    login: "/auth/login",     // POST
    logout: "/auth/logout",   // GET (명세 변경 반영)
    refresh: "/auth/refresh", // POST
  },
  users: {
    signup: "/users",         // POST
    // GET /users/exists?loginId=...
    exists: (loginId: string) => 
      `/users/exists?loginId=${encodeURIComponent(loginId)}`,
    profile: (userId: string) => `/users/${encodeURIComponent(userId)}/profile`,
  },
  posts: {
    list: "/posts",           // GET (전체 목록)
    create: "/posts",         // POST
    // GET /posts/id/{postId} (상세 조회 - 중간에 /id/ 포함됨 주의)
    byId: (postId: number | string) => `/posts/id/${postId}`,
    byCategory: (category: string) =>
      `/posts/category/${encodeURIComponent(category)}`,
    nearby: "/posts/nearby",  // GET (Query param 필요)
    
    // 신청자 관련
    applicants: (postId: number | string) => `/posts/${postId}/applicants`,
    // 승인/거절 (PATCH)
    decideApplicant: (postId: number | string, userId: string) =>
      `/posts/${postId}/applicants/${encodeURIComponent(userId)}`,
    
    // 평점
    ratings: (postId: number | string) => `/posts/${postId}/ratings`,
  },
  message: {
    rooms: "/message/room",       // GET: 채팅방 목록
    room: (roomId: number | string) => `/message/room/${roomId}`, // GET: 내용, POST: 전송
    sendNew: "/message",          // POST: 첫 쪽지 전송
  },
  reports: {
    create: "/reports",
  },
} as const;