export const endpoints = {
  auth: {
    login: "/auth/login",
    signup: "/auth/signup",
    me: "/users/me",
  },
  meetings: {
    list: "/meetings",
    detail: (id: string) => `/meetings/${id}`,
    join: (id: string) => `/meetings/${id}/join`,
    cancel: (id: string) => `/meetings/${id}/cancel`,
  },
  map: {
    nearby: "/map/meetings",
  },
  dm: {
    threads: "/dm/threads",
    messages: (threadId: string) => `/dm/threads/${threadId}/messages`,
  },
} as const;
