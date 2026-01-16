import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import MapView, {
  Circle,
  Marker,
  PROVIDER_GOOGLE,
  Region,
  MarkerPressEvent,
} from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
// (옵션) 탭 피드백
import * as Haptics from "expo-haptics";

import AppLayout from "../../shared/ui/AppLayout";
import { Card } from "../../shared/ui/Card";
import { Button } from "../../shared/ui/Button";
import { useAppTheme } from "../../shared/hooks/useAppTheme";

import { listMeetingsAround } from "../meetings/meetingService";
import type { MeetingPost, CategoryKey } from "../meetings/types";

/**
 * ✅ 개선 버전 (네이티브 pinColor 유지 + 선택 하이라이트/성능/유지보수 강화)
 * - Marker children 없음(안드로이드 잘림 회피 유지)
 * - 선택된 마커는 Circle 오버레이로 확실한 피드백
 * - meetingsById(Map)로 O(1) 조회, find() 반복 제거
 * - Marker identifier + 공용 onPress 핸들러로 마커별 클로저 생성 최소화
 * - 카테고리 메타(색/아이콘/라벨) 단일 객체로 통합
 */

const MAP_STYLE = [
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

const INITIAL_REGION: Region = {
  latitude: 37.498095,
  longitude: 127.02761,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

// ✅ 카테고리 메타(유지보수/확장 용이)
const CATEGORY_META = {
  SPORTS: { color: "#4A90E2", icon: "basketball" as const, label: "SPORTS" },
  GAMES: { color: "#9B59B6", icon: "game-controller" as const, label: "GAMES" },
  MEAL: { color: "#FF9F43", icon: "restaurant" as const, label: "MEAL" },
  STUDY: { color: "#2ECC71", icon: "book" as const, label: "STUDY" },
  ETC: { color: "#95A5A6", icon: "ellipsis-horizontal" as const, label: "ETC" },
} satisfies Record<
  CategoryKey,
  { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }
>;

function getCategoryMeta(key: CategoryKey) {
  return CATEGORY_META[key] ?? CATEGORY_META.ETC;
}

const MeetingMarkerNative = React.memo(function MeetingMarkerNative(props: {
  meeting: MeetingPost;
  selected: boolean;
  onPress: (e: MarkerPressEvent) => void;
}) {
  const { meeting: m, selected, onPress } = props;

  const coordinate = useMemo(
    () => ({
      latitude: m.locationLat ?? INITIAL_REGION.latitude,
      longitude: m.locationLng ?? INITIAL_REGION.longitude,
    }),
    [m.locationLat, m.locationLng]
  );

  const meta = getCategoryMeta(m.category);

  return (
    <Marker
      // ✅ identifier로 공용 onPress에서 id 추출 (마커별 클로저 최소화)
      identifier={m.id}
      coordinate={coordinate}
      onPress={onPress}
      pinColor={meta.color}
      zIndex={selected ? 999 : 1}
      opacity={selected ? 1 : 0.9}
      // moveOnMarkerPress는 MapView에 false로 두고, 여기서는 필요 없음
    />
  );
});

export default function MapScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [list, setList] = useState<MeetingPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const regionRef = useRef<Region>(INITIAL_REGION);
  const [locationPermission, setLocationPermission] = useState(false);

  // ✅ O(1) lookup 용 Map
  const meetingsById = useMemo(() => {
    const map = new Map<string, MeetingPost>();
    for (const m of list) map.set(m.id, m);
    return map;
  }, [list]);

  const selectedMeeting = useMemo(() => {
    if (!selectedId) return undefined;
    return meetingsById.get(selectedId);
  }, [meetingsById, selectedId]);

  const goToDetail = useCallback(
    (id: string) => {
      router.push(`/meetings/${id}`);
    },
    [router]
  );

  // ✅ 로딩 깜빡임 방지(300ms 지연 표시)
  useEffect(() => {
    if (loading) {
      loadingTimerRef.current = setTimeout(() => setShowLoading(true), 300);
    } else {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      setShowLoading(false);
    }
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, [loading]);

  const loadMeetings = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const data = await listMeetingsAround(lat, lng);
      setList(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 최초 진입: 권한/현재 위치/로드
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("알림", "위치 권한을 허용하면 내 주변 모임을 찾을 수 있어요.");
          return;
        }
        setLocationPermission(true);

        const location = await Location.getCurrentPositionAsync({});
        const currentRegion: Region = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        };

        regionRef.current = currentRegion;
        mapRef.current?.animateToRegion(currentRegion, 800);
        loadMeetings(currentRegion.latitude, currentRegion.longitude);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [loadMeetings]);

  const onRegionChangeComplete = useCallback((r: Region) => {
    regionRef.current = r;
  }, []);

  const handleResearch = useCallback(() => {
    if (loading) return;
    setSelectedId(null);
    const r = regionRef.current;
    loadMeetings(r.latitude, r.longitude);
  }, [loading, loadMeetings]);

  const moveToMyLocation = useCallback(async () => {
    if (!locationPermission) {
      Alert.alert("권한 필요", "위치 권한 설정이 필요합니다.");
      return;
    }
    try {
      const location = await Location.getCurrentPositionAsync({});
      const newRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
      regionRef.current = newRegion;
      mapRef.current?.animateToRegion(newRegion, 700);
    } catch (e) {
      console.error(e);
    }
  }, [locationPermission]);

  // ✅ 공용 Marker onPress: identifier/id에서 meetingId를 꺼냄
  const onMarkerPress = useCallback(
    (e: MarkerPressEvent) => {
      // RN Maps 버전에 따라 identifier가 id/identifier로 들어올 수 있어 안전하게 처리
      const native = e.nativeEvent as any;
      const id: string | undefined = native?.id ?? native?.identifier;
      if (!id) return;

      setSelectedId(id);

      // (옵션) 햅틱
      Haptics.selectionAsync().catch(() => {});

      const target = meetingsById.get(id);
      if (!target?.locationLat || !target?.locationLng) return;

      mapRef.current?.animateToRegion(
        {
          latitude: target.locationLat,
          longitude: target.locationLng,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        450
      );
    },
    [meetingsById]
  );

  // ✅ 선택 하이라이트 Circle (선택감 확실)
  const selectedCircle = useMemo(() => {
    if (!selectedMeeting?.locationLat || !selectedMeeting?.locationLng) return null;
    const meta = getCategoryMeta(selectedMeeting.category);
    const fillColor = `${meta.color}33`; // 약 20% 투명
    return (
      <Circle
        center={{
          latitude: selectedMeeting.locationLat,
          longitude: selectedMeeting.locationLng,
        }}
        radius={70}
        strokeWidth={2}
        strokeColor={meta.color}
        fillColor={fillColor}
        zIndex={998}
      />
    );
  }, [selectedMeeting]);

  return (
    <AppLayout padded={false}>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          customMapStyle={MAP_STYLE}
          onRegionChangeComplete={onRegionChangeComplete}
          onPress={() => setSelectedId(null)}
          showsUserLocation
          showsMyLocationButton={false}
          mapPadding={{
            top: 20,
            right: 0,
            bottom: selectedMeeting ? 240 : 80,
            left: 0,
          }}
          moveOnMarkerPress={false}
        >
          {/* ✅ 선택 하이라이트 */}
          {selectedCircle}

          {/* ✅ 마커 */}
          {list.map((m) => (
            <MeetingMarkerNative
              key={m.id}
              meeting={m}
              selected={selectedId === m.id}
              onPress={onMarkerPress}
            />
          ))}
        </MapView>

        {/* 상단 재검색 버튼 */}
        <View style={styles.topContainer}>
          <Pressable
            onPress={handleResearch}
            style={({ pressed }) => [
              styles.pillBtn,
              { backgroundColor: t.colors.surface, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            {showLoading ? (
              <ActivityIndicator size="small" color={t.colors.primary} />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="refresh" size={16} color={t.colors.primary} />
                <Text style={[t.typography.labelMedium, { color: t.colors.primary }]}>
                  이 지역 재검색
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* 내 위치 버튼 */}
        <View style={[styles.myLocationWrapper, selectedMeeting ? { bottom: 200 } : { bottom: 30 }]}>
          <Pressable onPress={moveToMyLocation} style={styles.iconBtn}>
            <Ionicons name="locate" size={24} color="#333" />
          </Pressable>
        </View>

        {/* 하단 정보 카드 */}
        {selectedMeeting && (
          <BottomInfoCard
            meeting={selectedMeeting}
            onPressDetail={() => goToDetail(selectedMeeting.id)}
            t={t}
          />
        )}
      </View>
    </AppLayout>
  );
}

/** ✅ 하단 카드 컴포넌트 분리(가독성/유지보수) */
const BottomInfoCard = React.memo(function BottomInfoCard(props: {
  meeting: MeetingPost;
  onPressDetail: () => void;
  t: ReturnType<typeof useAppTheme>;
}) {
  const { meeting, onPressDetail, t } = props;
  const meta = getCategoryMeta(meeting.category);

  return (
    <View style={styles.bottomContainer}>
      <Card style={styles.infoCard}>
        <Pressable onPress={onPressDetail}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 4 }}>
                <Ionicons name={meta.icon} size={14} color={meta.color} />
                <Text
                  style={[
                    t.typography.labelSmall,
                    {
                      color: meta.color,
                      fontWeight: "bold",
                    },
                  ]}
                >
                  {meta.label}
                </Text>
              </View>

              <Text style={t.typography.titleMedium} numberOfLines={1}>
                {meeting.title}
              </Text>

              <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]}>
                {meeting.locationText}
                {meeting.distanceText ? ` · ${meeting.distanceText}` : ""}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                meeting.status === "FULL" ? { backgroundColor: "#bbb" } : { backgroundColor: meta.color },
              ]}
            >
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>
                {meeting.status === "FULL" ? "마감" : "모집중"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />
        </Pressable>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button title="자세히 보기" variant="secondary" onPress={onPressDetail} style={{ flex: 1 }} />
          <Button
            title="참여하기"
            disabled={meeting.status === "FULL"}
            onPress={onPressDetail}
            style={{ flex: 1 }}
          />
        </View>
      </Card>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: "100%", height: "100%" },

  topContainer: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    zIndex: 10,
  },
  pillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  myLocationWrapper: {
    position: "absolute",
    right: 16,
    zIndex: 10,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  bottomContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    zIndex: 20,
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    backgroundColor: "#fff",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    height: 22,
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEE",
    marginVertical: 12,
  },
});
