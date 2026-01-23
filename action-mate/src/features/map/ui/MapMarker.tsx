// 📂 src/features/map/ui/MapMarker.tsx
import React, { useMemo } from "react";
import { Marker, MarkerPressEvent } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import type { MeetingPost, CategoryKey } from "@/features/meetings/model/types";

// ✅ 카테고리별 마커 스타일 정의
const CATEGORY_META = {
  SPORTS: { color: "#4A90E2", icon: "basketball" as const, label: "스포츠" },
  GAMES: { color: "#9B59B6", icon: "game-controller" as const, label: "게임" },
  MEAL: { color: "#FF9F43", icon: "restaurant" as const, label: "식사" },
  STUDY: { color: "#2ECC71", icon: "book" as const, label: "스터디" },
  ETC: { color: "#95A5A6", icon: "ellipsis-horizontal" as const, label: "기타" },
} satisfies Record<
  CategoryKey,
  { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }
>;

export function getCategoryMeta(key: CategoryKey) {
  return CATEGORY_META[key] ?? CATEGORY_META.ETC;
}

type Props = {
  meeting: MeetingPost;
  selected: boolean;
  onPress: (e: MarkerPressEvent) => void;
};

// ✅ 통일 Shape 대응: meeting.location.{lat,lng}
const DEFAULT_COORD = { latitude: 37.5665, longitude: 126.978 };

function toCoord(m: MeetingPost) {
  const latRaw = (m as any)?.location?.lat;
  const lngRaw = (m as any)?.location?.lng;

  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  // 0/NaN/Infinity 등은 지도에서 튀는 포인트가 될 수 있어 기본값으로 방어
  const isValid = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

  return isValid ? { latitude: lat, longitude: lng } : DEFAULT_COORD;
}

// ✅ 메모이제이션된 마커 컴포넌트
export const MapMarker = React.memo(function MapMarker({ meeting: m, selected, onPress }: Props) {
  const coordinate = useMemo(() => toCoord(m), [m]);
  const meta = getCategoryMeta(m.category);

  return (
    <Marker
      identifier={m.id}
      coordinate={coordinate}
      onPress={onPress}
      pinColor={meta.color}
      zIndex={selected ? 999 : 1}
      opacity={selected ? 1 : 0.9}
    />
  );
});