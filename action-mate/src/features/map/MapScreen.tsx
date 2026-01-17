// src/features/map/MapScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
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
import * as Haptics from "expo-haptics";

import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";

import AppLayout from "../../shared/ui/AppLayout";
import { Card } from "../../shared/ui/Card";
import { useAppTheme } from "../../shared/hooks/useAppTheme";

import { listMeetingsAround } from "../meetings/api/meetingService";
import type { MeetingPost, CategoryKey } from "../meetings/model/meeting.types";

/**
 * ✅ 목표(UX + 성능)
 * 1) 지도 마커 선택 시: 하단 리스트는 "선택한 모임 1개"만 표시
 * 2) 지도 빈 곳 탭 or "전체 보기": 리스트가 전체로 복귀
 * 3) 리스트는 "상세로 이동"만 지원 (이 화면에서 참여 버튼 제거)
 * 4) 성능 최적화:
 *   - meetingsById(Map) O(1) 조회
 *   - Marker는 memo + 공용 onPress(클로저 최소화)
 *   - 파생 리스트(listData)는 useMemo
 *   - 로딩 깜빡임 방지(300ms 지연)
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

// ✅ 유지보수 쉬운 카테고리 메타
const CATEGORY_META = {
  SPORTS: { color: "#4A90E2", icon: "basketball" as const, label: "스포츠" },
  GAMES: { color: "#9B59B6", icon: "game-controller" as const, label: "게임" },
  MEAL: { color: "#FF9F43", icon: "restaurant" as const, label: "식사" },
  STUDY: { color: "#2ECC71", icon: "book" as const, label: "스터디" },
  ETC: { color: "#95A5A6", icon: "ellipsis-horizontal" as const, label: "기타" },
} satisfies Record<CategoryKey, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }>;

function getCategoryMeta(key: CategoryKey) {
  return CATEGORY_META[key] ?? CATEGORY_META.ETC;
}

type SortKey = "NONE"; // ✅ 현재 정책: 정렬 불필요(확장 대비 타입만 남김)

const MeetingMarkerNative = React.memo(function MeetingMarkerNative(props: {
  meeting: MeetingPost;
  selected: boolean;
  onPress: (e: MarkerPressEvent) => void;
}) {
  const { meeting: m, selected, onPress } = props;

  // Marker coordinate는 객체 생성이 잦으면 리렌더 요인이 됨 → memo
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
    />
  );
});

export default function MapScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  // BottomSheet ref
  const bottomSheetRef = useRef<BottomSheet>(null);

  // 데이터
  const [list, setList] = useState<MeetingPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 로딩
  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 지도/권한
  const regionRef = useRef<Region>(INITIAL_REGION);
  const [locationPermission, setLocationPermission] = useState(false);

  // ✅ 필터/정렬 상태(확장 대비)
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | "ALL">("ALL");
  const [sortKey] = useState<SortKey>("NONE"); // 현재는 사용 안 함 (UI도 최소화 가능)

  // ✅ BottomSheet snap points (알바몬/알바천국 스타일)
  const snapPoints = useMemo(() => ["14%", "45%", "92%"], []);

  // ✅ 로딩 깜빡임 방지(300ms 이후에만 스피너 표시)
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

  /**
   * ✅ 최초 진입: 권한 요청 → 현재 위치 이동 → 주변 모임 로드
   */
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

  /**
   * ✅ 이 지역 재검색
   * - 선택 해제
   * - 해당 지역 중심으로 목록 로드
   * - 결과를 보이기 위해 BottomSheet 중간 높이로
   */
  const handleResearch = useCallback(() => {
    if (loading) return;
    setSelectedId(null);

    const r = regionRef.current;
    loadMeetings(r.latitude, r.longitude);

    bottomSheetRef.current?.snapToIndex(1);
  }, [loading, loadMeetings]);

  /**
   * ✅ 내 위치로 이동
   */
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

  /**
   * ✅ O(1) 조회 Map
   */
  const meetingsById = useMemo(() => {
    const map = new Map<string, MeetingPost>();
    for (const m of list) map.set(m.id, m);
    return map;
  }, [list]);

  const selectedMeeting = useMemo(() => {
    if (!selectedId) return undefined;
    return meetingsById.get(selectedId);
  }, [meetingsById, selectedId]);

  /**
   * ✅ 필터 적용 리스트
   * - selectedId가 있을 때는 아래 listData에서 "선택 1개만"으로 덮어씀
   */
  const filteredList = useMemo(() => {
    if (categoryFilter === "ALL") return list;
    return list.filter((m) => m.category === categoryFilter);
  }, [list, categoryFilter]);

  /**
   * ✅ 정렬은 현재는 제거(정책: UX 과밀 방지)
   * - 추후 필요하면 sortKey에 따라 여기서 확장
   */
  const filteredSortedList = useMemo(() => {
    if (sortKey === "NONE") return filteredList;
    return filteredList;
  }, [filteredList, sortKey]);

  /**
   * ✅ 핵심 UX:
   * - 마커 선택 시: 하단 리스트는 선택된 1개만 보여줌
   * - 선택 해제 시: 전체(필터 적용된) 리스트로 복귀
   */
  const listData = useMemo(() => {
    if (selectedMeeting) return [selectedMeeting];
    return filteredSortedList;
  }, [selectedMeeting, filteredSortedList]);

  /**
   * ✅ 상세로만 이동 (이 화면에서는 참여 버튼 X)
   */
  const goToDetail = useCallback(
    (id: string) => {
      router.push(`/meetings/${id}`);
    },
    [router]
  );

  /**
   * ✅ 공용 Marker onPress
   * - id 추출
   * - 선택 상태 반영
   * - 지도 카메라 이동
   * - 목록을 중간 높이로 올림
   */
  const onMarkerPress = useCallback(
    (e: MarkerPressEvent) => {
      const native = e.nativeEvent as any;
      const id: string | undefined = native?.id ?? native?.identifier;
      if (!id) return;

      setSelectedId(id);
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

      bottomSheetRef.current?.snapToIndex(1);
    },
    [meetingsById]
  );

  /**
   * ✅ 지도 빈 곳 탭:
   * - 선택 해제 → 리스트 전체 복귀
   * - BottomSheet를 낮춰 지도 시야 확보(원치 않으면 snapToIndex 제거)
   */
  const onMapPress = useCallback(() => {
    setSelectedId(null);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  /**
   * ✅ 선택 하이라이트 Circle
   */
  const selectedCircle = useMemo(() => {
    if (!selectedMeeting?.locationLat || !selectedMeeting?.locationLng) return null;
    const meta = getCategoryMeta(selectedMeeting.category);
    const fillColor = `${meta.color}33`;
    return (
      <Circle
        center={{ latitude: selectedMeeting.locationLat, longitude: selectedMeeting.locationLng }}
        radius={70}
        strokeWidth={2}
        strokeColor={meta.color}
        fillColor={fillColor}
        zIndex={998}
      />
    );
  }, [selectedMeeting]);

  /**
   * ✅ 리스트 항목 탭(=상세 이동) 외에도,
   * 선택 상태를 유지하고 싶으면 onSelectFromList로 선택만 하도록 확장 가능.
   * (현재는 Row 내부의 onSelect는 "센터링/선택" 역할만 수행)
   */
  const onSelectFromList = useCallback((m: MeetingPost) => {
    setSelectedId(m.id);

    if (m.locationLat && m.locationLng) {
      mapRef.current?.animateToRegion(
        {
          latitude: m.locationLat,
          longitude: m.locationLng,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        450
      );
    }
  }, []);

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
          onPress={onMapPress}
          showsUserLocation
          showsMyLocationButton={false}
          // ✅ BottomSheet가 있으니 지도 패딩은 고정값으로
          mapPadding={{ top: 20, right: 0, bottom: 160, left: 0 }}
          moveOnMarkerPress={false}
        >
          {selectedCircle}

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
              <View style={styles.rowCenter}>
                <Ionicons name="refresh" size={16} color={t.colors.primary} />
                <Text style={[t.typography.labelMedium, { color: t.colors.primary }]}>
                  이 지역 재검색
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* 내 위치 버튼 */}
        <View style={styles.myLocationWrapper}>
          <Pressable
            onPress={moveToMyLocation}
            style={[styles.iconBtn, { backgroundColor: t.colors.surface }]}
          >
            <Ionicons name="locate" size={22} color={t.colors.textMain} />
          </Pressable>
        </View>

        {/* ✅ BottomSheet: 필터(선택) + 리스트 */}
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={false}
          backgroundStyle={{ backgroundColor: t.colors.surface }}
          handleIndicatorStyle={{ backgroundColor: t.colors.overlay[12] }}
        >
          {/* ✅ 헤더: 필터 + (선택 시) 전체보기 */}
          <View style={[styles.sheetHeader, { borderBottomColor: t.colors.border }]}>
            <ScrollChips t={t} value={categoryFilter} onChange={setCategoryFilter} />

            {selectedMeeting ? (
              <View style={styles.selectedHeaderRow}>
                <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                  선택한 모임 1개 표시 중
                </Text>

                <Pressable
                  onPress={() => setSelectedId(null)}
                  hitSlop={10}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[t.typography.labelSmall, { color: t.colors.primary, fontWeight: "800" }]}>
                    전체 보기
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <BottomSheetFlatList
            data={listData}
            keyExtractor={(m: MeetingPost) => m.id}
            contentContainerStyle={{ paddingBottom: 16 }}
            renderItem={({ item }: { item: MeetingPost }) => (
              <Pressable
                // ✅ 이 화면에서는 "상세 이동"만
                onPress={() => goToDetail(item.id)}
                // 롱프레스로 선택/센터링(원하면 onPress로 바꿔도 됨)
                onLongPress={() => onSelectFromList(item)}
                style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
              >
                <MapListRow
                  t={t}
                  item={item}
                  selected={item.id === selectedId}
                />
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <View style={{ padding: 20 }}>
                <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>
                  주변에 모임이 없어요. 지도를 이동한 뒤 재검색해보세요.
                </Text>
              </View>
            }
          />
        </BottomSheet>
      </View>
    </AppLayout>
  );
}

/**
 * ✅ 카테고리 필터 칩 (필요 없으면 이 컴포넌트/헤더를 통째로 제거 가능)
 */
function ScrollChips({
  t,
  value,
  onChange,
}: {
  t: ReturnType<typeof useAppTheme>;
  value: CategoryKey | "ALL";
  onChange: (v: CategoryKey | "ALL") => void;
}) {
  const items: Array<{ key: CategoryKey | "ALL"; label: string }> = [
    { key: "ALL", label: "전체" },
    { key: "SPORTS", label: "스포츠" },
    { key: "GAMES", label: "게임" },
    { key: "MEAL", label: "식사" },
    { key: "STUDY", label: "스터디" },
    { key: "ETC", label: "기타" },
  ];

  return (
    <View style={styles.chipsWrap}>
      {items.map((it) => {
        const active = value === it.key;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? t.colors.overlay[8] : t.colors.overlay[6],
                borderColor: active ? t.colors.primary : t.colors.border,
              },
            ]}
          >
            <Text style={[t.typography.labelSmall, { color: active ? t.colors.textMain : t.colors.textSub }]}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * ✅ 목록 Row: "카드 느낌" 통일 + 선택 하이라이트
 * - onPress는 부모에서 상세로 이동
 * - onSelect는 지도 센터링/선택(롱프레스) 등에 사용
 */
function MapListRow({
  t,
  item,
  selected,
}: {
  t: ReturnType<typeof useAppTheme>;
  item: MeetingPost;
  selected: boolean;
}) {
  const meta = getCategoryMeta(item.category);

  return (
    <Card
      style={[
        styles.rowCard,
        {
          borderColor: selected ? meta.color : t.colors.border,
          backgroundColor: t.colors.surface,
        },
      ]}
    >
      {/* 상단 라벨 */}
      <View style={styles.rowTop}>
        <Ionicons name={meta.icon} size={14} color={meta.color} />
        <Text style={[t.typography.labelSmall, { color: meta.color, fontWeight: "800" }]}>
          {meta.label}
        </Text>

        {item.distanceText ? (
          <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>· {item.distanceText}</Text>
        ) : null}
      </View>

      {/* 타이틀 */}
      <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]} numberOfLines={1}>
        {item.title}
      </Text>

      {/* 위치 */}
      <View style={styles.rowLoc}>
        <Ionicons name="location-outline" size={14} color={t.colors.textSub} />
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]} numberOfLines={1}>
          {item.locationText}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: "100%", height: "100%" },

  rowCenter: { flexDirection: "row", alignItems: "center", gap: 6 },

  // 상단 재검색 버튼
  topContainer: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    zIndex: 30,
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

  // 내 위치 버튼
  myLocationWrapper: {
    position: "absolute",
    right: 16,
    top: 120,
    zIndex: 30,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  // BottomSheet 헤더
  sheetHeader: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  selectedHeaderRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // chips
  chipsWrap: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },

  // list row
  rowCard: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowLoc: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
});