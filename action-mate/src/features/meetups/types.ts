export type Category = "running" | "walk" | "climb" | "gym" | "etc";

export type JoinStatus = "none" | "joined";

export type Meetup = {
  id: string;
  title: string;
  category: Category;

  startsAt: string;          // ISO string
  durationMin: number;       // ex) 30, 60

  capacity: number;
  joinedCount: number;
  joinStatus: JoinStatus;

  placeName: string;
  lat: number;
  lng: number;

  createdAt: string;         // ISO string
};

export type CreateMeetupInput = {
  title: string;
  category: Category;
  startsAt: string;
  durationMin: number;
  capacity: number;
  placeName: string;
  lat: number;
  lng: number;
};
