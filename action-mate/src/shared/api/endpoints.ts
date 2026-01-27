// src/shared/api/endpoints.ts
/**
 * Backend Truth 기준 endpoint 모음
 * - baseURL: .../api (apiClient에서 /api까지 포함)
 * - 여기서는 "/api" 이후 경로만 관리합니다.
 *
 * ✅ permitAll(무인증): /auth/login, /users, /users/exists, /images/**
 * ✅ 그 외 /api/**: 기본적으로 ACCESS 토큰 필요
 * ✅ /auth/refresh: refresh 토큰 Bearer로 호출(서버 설정상 403 가능성 있음)
 */

export const endpoints = {
  auth: {
    login: "/auth/login", // POST
    refresh: "/auth/refresh", // POST (Authorization: Bearer <refreshToken>)
  },

  users: {
    signup: "/users", // POST (permitAll)
    exists: (loginId: string) =>
      `/users/exists?loginId=${encodeURIComponent(String(loginId ?? "").trim())}`, // GET (permitAll) -> boolean
    profile: (userId: string) =>
      `/users/${encodeURIComponent(String(userId ?? "").trim())}/profile`, // GET (ACCESS)
    update: "/users/update", // PUT multipart/form-data (data + image) (ACCESS)
  },

  images: {
    // permitAll: /images/**
    // 실제 세부 라우팅은 서버 구현에 따라 다를 수 있으므로 root만 제공
    root: "/images",
    byPath: (path: string) => `/images/${encodeURIComponent(String(path ?? "").trim())}`,
  },

  posts: {
    list: "/posts", // GET
    create: "/posts", // POST
    byId: (postId: number | string) => `/posts/${encodeURIComponent(String(postId ?? "").trim())}`, // GET/PUT/DELETE(구현에 따라)
    applicants: (postId: number | string) =>
      `/posts/${encodeURIComponent(String(postId ?? "").trim())}/applicants`, // POST/GET/DELETE
    decideApplicant: (postId: number | string, userId: string) =>
      `/posts/${encodeURIComponent(String(postId ?? "").trim())}/applicants/${encodeURIComponent(
        String(userId ?? "").trim()
      )}`, // PATCH body: "MEMBER" | "REJECTED"
    ratings: (postId: number | string) =>
      `/posts/${encodeURIComponent(String(postId ?? "").trim())}/ratings`, // POST
  },

  message: {
    rooms: "/message/room", // GET
    room: (roomId: number | string) =>
      `/message/room/${encodeURIComponent(String(roomId ?? "").trim())}`, // GET/POST (@RequestBody String => body: "내용")
    sendNew: "/message", // POST (EnsureRoomAndSendMessageRequest)
  },

  reports: {
    create: "/reports", // POST
  },
} as const;

export default endpoints;

// 요약(3줄)
// - permitAll 범위를 서버 기준(/auth/login,/users,/users/exists,/images/**)으로 명시하고 그 외는 ACCESS 전제.
// - refresh는 Bearer refreshToken 기반 호출을 전제로 하되 서버 권한 불일치로 403 가능성을 고려.
// - Applicant PATCH/Message POST(raw string)처럼 “문자열 바디”가 필요한 경로를 주석으로 고정.