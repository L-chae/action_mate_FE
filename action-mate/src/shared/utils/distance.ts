// src/shared/utils/distance.ts

/**
 * 두 좌표(위도, 경도) 사이의 거리를 계산해서
 * "500m" 또는 "1.2km" 처럼 예쁜 문자열로 돌려주는 함수
 */
export function calculateDistance(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): string {
  // 좌표가 하나라도 없으면 빈카드로 리턴
  if (!lat1 || !lon1 || !lat2 || !lon2) return "";

  const R = 6371; // 지구의 반지름 (km)
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  // 1km 미만이면 "m" 단위로, 이상이면 "km" 단위로 표시
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}