// src/shared/api/endpoints.ts
/**
 * OpenAPI(제공 명세) 기준 endpoint 모음
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
  posts: {
    list: "/posts", // GET (명세가 단일/배열 혼재 가능 -> 응답은 ensureArray로 방어 권장)
    create: "/posts", // POST
    hot: "/posts/hot", // GET (latitude/longitude/radiusMeters query)
    byId: (postId: number | string) => `/posts/id/${postId}`, // GET/PUT/DELETE
    byCategory: (category: string) => `/posts/category/${encodeURIComponent(category)}`, // GET
    nearby: "/posts/nearby", // GET (query)
    applicants: (postId: number | string) => `/posts/${postId}/applicants`, // POST/GET/DELETE
    decideApplicant: (postId: number | string, userId: string) =>
      `/posts/${postId}/applicants/${encodeURIComponent(userId)}`, // PATCH
    ratings: (postId: number | string) => `/posts/${postId}/ratings`, // POST
  },
  message: {
    rooms: "/message/room", // GET (명세는 단일객체로 되어있을 수 있어 ensureArray로 방어 권장)
    room: (roomId: number | string) => `/message/room/${roomId}`, // GET/POST(text/plain)
    sendNew: "/message", // POST(JSON)
  },
  reports: {
    create: "/reports", // POST
  },
} as const;