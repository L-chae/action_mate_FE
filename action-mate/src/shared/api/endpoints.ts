// src/shared/api/endpoints.ts
/**
 * Backend Truth 기준 endpoint 모음
 * - baseURL: .../api (apiClient에서 /api까지 포함)
 * - 여기서는 "/api" 이후 경로만 관리합니다.
 *
 * ✅ permitAll(무인증): /auth/login, /users, /users/exists, /images/**
 * ✅ 그 외 /api/**: 기본적으로 ACCESS 토큰 필요
 * ✅ /auth/refresh: refresh 토큰 Bearer로 호출(서버 설정상 403 가능성 있음)
 *
 * ⚠️ 레거시/프론트 호환:
 * - meetings/api/meetingApi.ts가 posts.hot / posts.nearby / posts.byCategory를 참조하는 경우가 있어
 *   컴파일/런타임 크래시 방지를 위해 alias를 제공하되, 서버가 미구현이면 404 가능.
 */

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

export const endpoints = {
  auth: {
    login: "/auth/login", // POST (permitAll)
    refresh: "/auth/refresh", // POST (Authorization: Bearer <refreshToken>)
  },

  users: {
    signup: "/users", // POST (permitAll)
    exists: (loginId: string) =>
      `/users/exists?loginId=${encodeURIComponent(safeStr(loginId))}`, // GET (permitAll) -> boolean
    profile: (userId: string) =>
      `/users/${encodeURIComponent(safeStr(userId))}/profile`, // GET (ACCESS)
    update: "/users/update", // PUT multipart/form-data (data + image) (ACCESS)
  },

  images: {
    // permitAll: /images/**
    root: "/images",
    byPath: (path: string) => `/images/${encodeURIComponent(safeStr(path))}`,
  },

  posts: {
    list: "/posts", // GET
    create: "/posts", // POST
    byId: (postId: number | string) => `/posts/${encodeURIComponent(safeStr(postId))}`, // GET/PUT/DELETE(구현에 따라)
    applicants: (postId: number | string) =>
      `/posts/${encodeURIComponent(safeStr(postId))}/applicants`, // POST/GET/DELETE
    decideApplicant: (postId: number | string, userId: string) =>
      `/posts/${encodeURIComponent(safeStr(postId))}/applicants/${encodeURIComponent(safeStr(userId))}`, // PATCH body: "MEMBER" | "REJECTED"
    ratings: (postId: number | string) =>
      `/posts/${encodeURIComponent(safeStr(postId))}/ratings`, // POST

    // -------------------------
    // ✅ 레거시 호환 alias (meetingApi 컴파일 에러 방지)
    // -------------------------
    // 서버에 /posts/hot, /posts/nearby, /posts/category/{category} 가 없을 수 있어도
    // 프론트는 최소한 컴파일/앱 셧다운을 막아야 하므로 list 기반으로 우회 경로 제공.
    // meetingApi가 query/params를 추가로 붙이는 구조라면 아래 alias로도 동작 가능.
    hot: "/posts",
    nearby: "/posts",
    byCategory: (category: string) => {
      const c = safeStr(category);
      if (!c) return "/posts";
      return `/posts?category=${encodeURIComponent(c)}`;
    },
  },

  message: {
    rooms: "/message/room", // GET
    room: (roomId: number | string) =>
      `/message/room/${encodeURIComponent(safeStr(roomId))}`, // GET/POST (@RequestBody String => body: "내용")
    sendNew: "/message", // POST (EnsureRoomAndSendMessageRequest)
  },

  reports: {
    create: "/reports", // POST
  },
} as const;

export default endpoints;

/*
요약(3줄)
- meetingApi가 참조하는 posts.hot/nearby/byCategory를 alias로 복구해 TS 컴파일 에러를 제거.
- 서버 미구현 가능성이 있는 경로는 list(/posts) 기반 우회로 제공해 런타임 크래시를 방지.
- permitAll/ACCESS/refresh 권한 전제는 주석으로 고정해 네트워크 레이어 규칙과 일치시킴.
*/