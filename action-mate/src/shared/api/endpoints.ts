// src/shared/api/endpoints.ts
/**
 * OpenAPI(제공 명세 v1.2.4) 기준 endpoint 모음
 * - baseURL: .../api
 * - 여기서는 "/api" 이후 경로만 관리합니다.
 */
export const endpoints = {
  auth: {
    login: "/auth/login", // POST
    logout: "/auth/logout", // GET
    refresh: "/auth/refresh", // POST
  },
  users: {
    signup: "/users", // POST
    exists: (loginId: string) => `/users/exists?loginId=${encodeURIComponent(loginId)}`, // GET
    profile: (userId: string) => `/users/${encodeURIComponent(userId)}/profile`, // GET
  },
  images: {
    get: (filename: string) => `/images/${encodeURIComponent(filename)}`, // GET
  },
  posts: {
    list: "/posts", // GET
    create: "/posts", // POST
    hot: "/posts/hot", // GET (latitude/longitude/radiusMeters query)
    byId: (postId: number | string) => `/posts/id/${encodeURIComponent(String(postId))}`, // GET/PUT/DELETE
    byCategory: (category: string) => `/posts/category/${encodeURIComponent(category)}`, // GET
    nearby: "/posts/nearby", // GET (latitude/longitude/radiusMeters/category query)
    applicants: (postId: number | string) => `/posts/${encodeURIComponent(String(postId))}/applicants`, // POST/GET/DELETE
    decideApplicant: (postId: number | string, userId: string) =>
      `/posts/${encodeURIComponent(String(postId))}/applicants/${encodeURIComponent(userId)}`, // PATCH
    ratings: (postId: number | string) => `/posts/${encodeURIComponent(String(postId))}/ratings`, // POST
  },
  message: {
    rooms: "/message/room", // GET
    room: (roomId: number | string) => `/message/room/${encodeURIComponent(String(roomId))}`, // GET/POST(text/plain)
    sendNew: "/message", // POST(JSON)
  },
  reports: {
    create: "/reports", // POST
  },
} as const;

/*
요약:
1) v1.2.4 추가된 /images/{filename} 엔드포인트를 images.get으로 반영.
2) path 파라미터(postId/roomId 등)는 encodeURIComponent(String(...))로 일관 처리.
3) 나머지 경로는 명세의 paths와 1:1로 유지.
*/