export const endpoints = {
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
  },
  users: {
    signup: "/users",
    exists: (loginId: string) =>
      `/users/exists?loginId=${encodeURIComponent(loginId)}`,
    profile: (userId: string) => `/users/${encodeURIComponent(userId)}/profile`,
  },
  posts: {
    create: "/posts",
    byId: (postId: number | string) => `/posts/id/${postId}`,
    byCategory: (category: string) =>
      `/posts/category/${encodeURIComponent(category)}`,
    nearby: "/posts/nearby",
    applicants: (postId: number | string) => `/posts/${postId}/applicants`,
    decideApplicant: (postId: number | string, userId: string) =>
      `/posts/${postId}/applicants/${encodeURIComponent(userId)}`,
    ratings: (postId: number | string) => `/posts/${postId}/ratings`,
  },
  message: {
    rooms: "/message/room",
    room: (roomId: number | string) => `/message/room/${roomId}`,
    send: "/message",
  },
  reports: {
    create: "/reports",
  },
} as const;
