import { Meeting } from "../meetings/types";

// ✅ 서울 강남역 + 경기 동탄 1신도시 더미 데이터
const MOCK_MEETINGS: Meeting[] = [
  // --- [강남역 기존 데이터] ---
  {
    id: "m1",
    category: "SPORTS",
    title: "⚡️ 퇴근 후 배드민턴 한 판!",
    meetingTimeText: "오늘 19:30",
    locationText: "강남 서초 배드민턴장",
    lat: 37.4979,
    lng: 127.0276, // 강남역 근처
    distanceText: "300m",
    capacityJoined: 3,
    capacityTotal: 4,
    joinMode: "INSTANT",
    status: "OPEN",
  },
  {
    id: "m2",
    category: "MEAL",
    title: "🍔 쉑쉑버거 같이 드실 분",
    meetingTimeText: "오늘 12:00",
    locationText: "강남 쉑쉑버거 1호점",
    lat: 37.5025,
    lng: 127.0258, // 신논현역 쪽
    distanceText: "500m",
    capacityJoined: 1,
    capacityTotal: 4,
    joinMode: "INSTANT",
    status: "OPEN",
  },
  {
    id: "m3",
    category: "STUDY",
    title: "📚 각자 코딩 모각코 (조용함)",
    meetingTimeText: "내일 14:00",
    locationText: "스타벅스 강남R점",
    lat: 37.4990,
    lng: 127.0300,
    distanceText: "450m",
    capacityJoined: 2,
    capacityTotal: 6,
    joinMode: "APPROVAL",
    status: "OPEN",
  },
  {
    id: "m4",
    category: "GAMES",
    title: "🎲 보드게임 초보 환영",
    meetingTimeText: "주말 15:00",
    locationText: "레드버튼 강남점",
    lat: 37.5010,
    lng: 127.0260,
    distanceText: "400m",
    capacityJoined: 3,
    capacityTotal: 4,
    joinMode: "INSTANT",
    status: "FULL",
  },

  // --- [추가됨: 동탄 1동 주변 데이터] ---
  {
    id: "m5",
    category: "SPORTS",
    title: "🏃‍♂️ 동탄 센트럴파크 야간 러닝",
    meetingTimeText: "오늘 20:00",
    locationText: "동탄 센트럴파크 축구장 옆",
    lat: 37.2005, // 동탄 센트럴파크 좌표
    lng: 127.0685,
    distanceText: "100m",
    capacityJoined: 4,
    capacityTotal: 10,
    joinMode: "INSTANT",
    status: "OPEN",
  },
  {
    id: "m6",
    category: "MEAL",
    title: "🍝 타임테라스 파스타 맛집",
    meetingTimeText: "내일 12:30",
    locationText: "동탄 메타폴리스 타임테라스",
    lat: 37.2045, // 메타폴리스 좌표
    lng: 127.0665,
    distanceText: "500m",
    capacityJoined: 2,
    capacityTotal: 4,
    joinMode: "APPROVAL",
    status: "OPEN",
  },
];

// ✅ 지도 영역(Region) 내의 모임을 불러오는 가짜 API
export async function fetchMapMeetings(
  lat: number,
  lng: number
): Promise<Meeting[]> {
  // 실제로는 lat, lng, zoom level 등을 서버로 보내서 쿼리해야 함
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_MEETINGS);
    }, 600); // 0.6초 딜레이 (네트워크 느낌)
  });
}