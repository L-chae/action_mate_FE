import { create } from "zustand";
import type { CreateMeetupInput, Meetup, Category } from "./types";
import { MOCK_MEETUPS } from "./mock";

type CategoryFilter = "all" | Category;

type Location = { lat: number; lng: number };

type MeetupsState = {
  meetups: Meetup[];
  myLocation: Location;
  categoryFilter: CategoryFilter;

  setCategoryFilter: (filter: CategoryFilter) => void;

  joinMeetup: (meetupId: string) => void;
  createMeetup: (input: CreateMeetupInput) => string; // created id
};

export const useMeetupsStore = create<MeetupsState>((set, get) => ({
  meetups: MOCK_MEETUPS,

  // 임시 내 위치(강남역 근처). 나중에 GPS로 교체
  myLocation: { lat: 37.4979, lng: 127.0276 },

  categoryFilter: "all",

  setCategoryFilter: (filter) => set({ categoryFilter: filter }),

  joinMeetup: (meetupId) => {
    const { meetups } = get();
    
  const next = meetups.map<Meetup>((m) => {
      if (m.id !== meetupId) return m;

      // 이미 참여한 경우 무시
      if (m.joinStatus === "joined") return m;

      const remain = m.capacity - m.joinedCount;
      if (remain <= 0) return m; // 자리 없음

      return {
        ...m,
        joinedCount: m.joinedCount + 1,
        joinStatus: "joined",
      };
    });

    set({ meetups: next });
  },

  createMeetup: (input) => {
    const id = `m_${Date.now()}`;

    const nowIso = new Date().toISOString();

    const newMeetup: Meetup = {
      id,
      title: input.title,
      category: input.category,
      startsAt: input.startsAt,
      durationMin: input.durationMin,
      capacity: input.capacity,
      joinedCount: 0,
      joinStatus: "none",
      placeName: input.placeName,
      lat: input.lat,
      lng: input.lng,
      createdAt: nowIso,
    };

    set((s) => ({ meetups: [newMeetup, ...s.meetups] }));
    return id;
  },
}));
