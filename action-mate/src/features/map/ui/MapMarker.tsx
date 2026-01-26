// src/features/map/ui/MapMarker.tsx
import React, { useMemo } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Marker, MarkerPressEvent } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";
import type { MeetingPost, CategoryKey } from "@/features/meetings/model/types";

const WHITE = "#FFFFFF";

// ✅ 카테고리별 마커 스타일(칩/리스트/서클과 통일)
const CATEGORY_META = {
  SPORTS: { color: "#2E7D32", icon: "basketball" as const, label: "운동" },
  GAMES: { color: "#6A1B9A", icon: "game-controller" as const, label: "오락/게임" },
  MEAL: { color: "#EF6C00", icon: "restaurant" as const, label: "식사/카페" },
  STUDY: { color: "#1565C0", icon: "book" as const, label: "스터디" },
  ETC: { color: "#546E7A", icon: "ellipsis-horizontal-circle" as const, label: "기타" },
} satisfies Record<CategoryKey, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }>;

export function getCategoryMeta(key: CategoryKey) {
  return CATEGORY_META[key] ?? CATEGORY_META.ETC;
}

type Props = {
  meeting: MeetingPost;
  selected: boolean;
  onPress: (e: MarkerPressEvent) => void;
};

const DEFAULT_COORD = { latitude: 37.5665, longitude: 126.978 };

function toCoord(m: MeetingPost) {
  const loc: any = (m as any)?.location;
  const latRaw = loc?.latitude ?? loc?.lat;
  const lngRaw = loc?.longitude ?? loc?.lng;

  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  const isValid = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  return isValid ? { latitude: lat, longitude: lng } : DEFAULT_COORD;
}

export const MapMarker = React.memo(function MapMarker({ meeting: m, selected, onPress }: Props) {
  const t = useAppTheme();

  const coordinate = useMemo(() => toCoord(m), [m]);
  const catKey = ((m as any)?.category ?? "ETC") as CategoryKey;
  const meta = getCategoryMeta(catKey);

  const styles = useMemo(() => makeStyles(t), [t]);

  const ringBg = withAlpha(meta.color, t.mode === "dark" ? 0.18 : 0.12);
  const ringBorder = withAlpha(meta.color, 0.25);
  const stroke = withAlpha(t.colors?.surface ?? "#FFFFFF", 0.95);

  return (
    <Marker
      identifier={String((m as any)?.id ?? "")}
      coordinate={coordinate}
      onPress={onPress}
      zIndex={selected ? 999 : 1}
      opacity={selected ? 1 : 0.92}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View pointerEvents="none" style={styles.wrapper}>
        {selected ? (
          <View style={[styles.ring, { backgroundColor: ringBg, borderColor: ringBorder }]} />
        ) : null}

        <View
          style={[
            styles.pin,
            {
              backgroundColor: meta.color,
              borderColor: stroke,
              transform: [{ scale: selected ? 1.08 : 1 }],
            },
            selected ? styles.pinSelectedShadow : styles.pinShadow,
          ]}
        >
          <Ionicons name={meta.icon} size={16} color={WHITE} />
        </View>

        <View
          style={[
            styles.tail,
            {
              backgroundColor: meta.color,
              borderColor: stroke,
              transform: [{ rotate: "45deg" }, { translateY: -2 }],
            },
            selected ? styles.tailSelectedShadow : styles.tailShadow,
          ]}
        />
      </View>
    </Marker>
  );
});

function makeStyles(t: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    wrapper: {
      alignItems: "center",
      justifyContent: "flex-end",
    },
    ring: {
      position: "absolute",
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      top: -6,
    },
    pin: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      ...(Platform.OS === "android" ? { elevation: 2 } : null),
    },
    tail: {
      width: 10,
      height: 10,
      borderRadius: 2,
      marginTop: -3,
      borderWidth: 2,
      ...(Platform.OS === "android" ? { elevation: 2 } : null),
    },
    pinShadow: {
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    pinSelectedShadow: {
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    },
    tailShadow: {
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
    tailSelectedShadow: {
      shadowColor: "#000",
      shadowOpacity: 0.14,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
  });
}
