// src/features/map/MapScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import MapView, { Circle, PROVIDER_GOOGLE, Region, MarkerPressEvent } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ✅ Shared Components & Hooks
import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { Id } from "@/shared/model/types";
import MultiCategoryChips from "@/shared/ui/MultiCategoryChips";

// ✅ Features & API
import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingPost, CategoryKey } from "@/features/meetings/model/types";
import { MapMarker, getCategoryMeta } from "./ui/MapMarker";


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

const DEFAULT_FOCUS_DELTA = { latitudeDelta: 0.005, longitudeDelta: 0.005 };
const MAP_PADDING = { top: 10, right: 0, bottom: 0, left: 0 };

const toIdString = (v: Id) => String(v);

function getLatLng(m?: MeetingPost) {
  const loc: any = (m as any)?.location;
  const lat = Number(loc?.latitude ?? loc?.lat);
  const lng = Number(loc?.longitude ?? loc?.lng);
  const ok = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  return ok ? { latitude: lat, longitude: lng } : null;
}

export default function MapScreen() {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const regionRef = useRef<Region>(INITIAL_REGION);
  const lastLoadedRegionRef = useRef<Region>(INITIAL_REGION);

  // ✅ 불필요한 리렌더 방지: dirty는 ref로 1회만 true 전환
  const dirtyRef = useRef(false);

  // ✅ 네트워크 경합 방지: 최신 요청만 반영
  const reqSeqRef = useRef(0);

  const [list, setList] = useState<MeetingPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);

  // ✅ 멀티 선택 필터 (빈 배열 = 전체)
  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>([]);

  const [mapDirty, setMapDirty] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // ✅ 바텀시트가 최대(90%)일 때 액션바 숨김
  const [sheetIndex, setSheetIndex] = useState(0);
  const snapPoints = useMemo(() => ["15%", "45%", "90%"], []);
  const hideSheetActions = sheetIndex >= 2;

  const loadMeetings = useCallback(async (lat: number, lng: number) => {
    const seq = ++reqSeqRef.current;
    setLoading(true);
    try {
      const data = await meetingApi.listMeetingsAround(lat, lng);
      if (seq !== reqSeqRef.current) return; // stale response ignore

      setList(data);
      lastLoadedRegionRef.current = { ...regionRef.current };

      dirtyRef.current = false;
      setMapDirty(false);
    } catch (error) {
      if (seq === reqSeqRef.current) console.error(error);
    } finally {
      if (seq === reqSeqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
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
        } else {
          Alert.alert("알림", "위치 권한을 허용하면 내 주변 모임을 찾을 수 있어요.");
          loadMeetings(INITIAL_REGION.latitude, INITIAL_REGION.longitude);
        }
      } catch (e) {
        console.error(e);
        loadMeetings(INITIAL_REGION.latitude, INITIAL_REGION.longitude);
      }
    })();
  }, [loadMeetings]);

  const onRegionChangeComplete = useCallback((r: Region) => {
    regionRef.current = r;

    // ✅ dirty는 'false -> true'로 한 번만 전환(지도 이동 중 상태 업데이트 폭주 방지)
    if (dirtyRef.current) return;

    const latDiff = Math.abs(r.latitude - lastLoadedRegionRef.current.latitude);
    const lngDiff = Math.abs(r.longitude - lastLoadedRegionRef.current.longitude);
    if (latDiff > 0.005 || lngDiff > 0.005) {
      dirtyRef.current = true;
      setMapDirty(true);
    }
  }, []);

  const handleResearch = useCallback(() => {
    if (loading) return;
    setSelectedId(null);

    const r = regionRef.current;
    loadMeetings(r.latitude, r.longitude);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [loading, loadMeetings]);

  const moveToMyLocation = useCallback(async () => {
    if (gpsLoading) return;

    setGpsLoading(true);
    try {
      if (!locationPermission) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("권한 필요", "위치 권한 설정이 필요합니다.");
          return;
        }
        setLocationPermission(true);
      }

      const location = await Location.getCurrentPositionAsync({});
      const newRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };

      regionRef.current = newRegion;
      mapRef.current?.animateToRegion(newRegion, 700);

      if (!dirtyRef.current) {
        dirtyRef.current = true;
        setMapDirty(true);
      }

      Haptics.selectionAsync().catch(() => {});
    } catch (e) {
      console.error(e);
    } finally {
      setGpsLoading(false);
    }
  }, [gpsLoading, locationPermission]);

  const meetingsById = useMemo(() => {
    // why: 마커 클릭 시 list.find O(n) 반복을 줄이기 위함
    const m = new Map<string, MeetingPost>();
    for (const it of list) m.set(toIdString(it.id), it);
    return m;
  }, [list]);

  const selectedMeeting = useMemo(() => {
    if (!selectedId) return undefined;
    return meetingsById.get(selectedId);
  }, [meetingsById, selectedId]);

  const filteredList = useMemo(() => {
    if (selectedCategories.length === 0) return list;
    const set = new Set(selectedCategories);
    return list.filter((m) => set.has(m.category));
  }, [list, selectedCategories]);

  const markerList = useMemo(() => {
    // ✅ 필터 적용 + 선택된 모임은 유지(사용자 맥락 유지)
    if (selectedCategories.length === 0) return list;
    const base = filteredList;
    if (selectedMeeting && !base.some((m) => toIdString(m.id) === toIdString(selectedMeeting.id))) {
      return [selectedMeeting, ...base];
    }
    return base;
  }, [list, filteredList, selectedCategories.length, selectedMeeting]);

  const onChangeCategories = useCallback((next: CategoryKey[]) => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setSelectedCategories(next);
    setSelectedId(null);
  }, []);

  const onFocusItem = useCallback(
    (item: MeetingPost) => {
      const id = toIdString(item.id);
      if (selectedId === id) return;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelectedId(id);

      const pos = getLatLng(item);
      if (pos) {
        mapRef.current?.animateToRegion({ ...pos, ...DEFAULT_FOCUS_DELTA }, 500);
      }
      bottomSheetRef.current?.snapToIndex(1);
    },
    [selectedId]
  );

  const onGoToDetail = useCallback(
    (id: Id) => {
      router.push(`/meetings/${toIdString(id)}`);
    },
    [router]
  );

  const onMarkerPress = useCallback(
    (e: MarkerPressEvent) => {
      const native = e.nativeEvent as any;
      const rawId = native?.id ?? native?.identifier;
      if (!rawId) return;

      const id = String(rawId);
      const item = meetingsById.get(id);
      if (!item) return;

      Haptics.selectionAsync().catch(() => {});
      onFocusItem(item);
    },
    [meetingsById, onFocusItem]
  );

  const headerTitle = useMemo(() => {
    const total = filteredList.length;
    if (selectedCategories.length === 0) return `전체 모임 ${total}개`;

    const labels = selectedCategories.map((c) => getCategoryMeta(c).label);
    if (labels.length <= 2) return `${labels.join(", ")} · ${total}개`;
    return `${labels.slice(0, 2).join(", ")} 외 ${labels.length - 2} · ${total}개`;
  }, [selectedCategories, filteredList.length]);

  const selectedCircle = useMemo(() => {
    if (!selectedMeeting) return null;
    const pos = getLatLng(selectedMeeting);
    if (!pos) return null;

    const meta = getCategoryMeta(selectedMeeting.category);
    return (
      <Circle
        center={pos}
        radius={100}
        strokeWidth={1}
        strokeColor={meta.color}
        fillColor={meta.color + "22"}
        zIndex={999}
      />
    );
  }, [selectedMeeting]);

  const renderItem = useCallback(
    ({ item }: { item: MeetingPost }) => (
      <ExpandableMeetingRow
        item={item}
        isSelected={selectedId === toIdString(item.id)}
        onPress={() => onFocusItem(item)}
        onDetailPress={() => onGoToDetail(item.id)}
        t={t}
      />
    ),
    [onFocusItem, onGoToDetail, selectedId, t]
  );

  const keyExtractor = useCallback((m: MeetingPost) => toIdString(m.id), []);

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
          onPress={() => {
            if (!selectedId) return;
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSelectedId(null);
          }}
          showsUserLocation
          showsMyLocationButton={false}
          mapPadding={MAP_PADDING}
          rotateEnabled={false}
          moveOnMarkerPress={false}
        >
          {selectedCircle}
          {markerList.map((m) => (
            <MapMarker
              key={toIdString(m.id)}
              meeting={m}
              selected={selectedId === toIdString(m.id)}
              onPress={onMarkerPress}
            />
          ))}
        </MapView>

        {/* ✅ 상단 칩은 "항상 보이게" + safe-area 반영 => 잘림/겹침 방지 */}
        <View
          style={[
            styles.topOverlay,
            {
              paddingTop: Math.max(insets.top, 10) + 6,
              paddingBottom: 8,
            },
          ]}
          pointerEvents="box-none"
        >
          <View pointerEvents="auto">
            <MultiCategoryChips
              value={selectedCategories}
              onChange={onChangeCategories}
              mode="filter"
              transparentBackground
              containerStyle={{ borderBottomWidth: 0 }}
            />
          </View>
        </View>

        {/* ✅ 바텀시트: 버튼/액션을 "목록 위"에 넣어 겹침 제거 + 최대 올리면 숨김 */}
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          onChange={setSheetIndex}
          backgroundStyle={{ backgroundColor: t.colors.surface }}
          handleIndicatorStyle={{ backgroundColor: t.colors.border }}
        >
          <View style={styles.sheetHeader}>
            <Text style={[t.typography.titleSmall, { fontWeight: "800", color: t.colors.textMain }]}>
              {headerTitle}
            </Text>
          </View>

          {!hideSheetActions && (
            <View style={[styles.sheetActions, { borderBottomColor: t.colors.border }]}>
              <View style={styles.sheetActionsCenter}>
                {mapDirty && (
                  <Pressable
                    onPress={handleResearch}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.researchPill,
                      {
                        backgroundColor: t.colors.surface,
                        opacity: loading ? 0.82 : pressed ? 0.92 : 1,
                      },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={t.colors.primary} />
                    ) : (
                      <View style={styles.rowCenter}>
                        <Ionicons name="refresh" size={14} color={t.colors.primary} />
                        <Text style={[t.typography.labelMedium, { color: t.colors.primary, fontWeight: "700" }]}>
                          이 지역 재검색
                        </Text>
                      </View>
                    )}
                  </Pressable>
                )}
              </View>

              <Pressable
                onPress={moveToMyLocation}
                disabled={gpsLoading}
                style={({ pressed }) => [
                  styles.sheetGpsBtn,
                  {
                    backgroundColor: t.colors.surface,
                    opacity: gpsLoading ? 0.75 : pressed ? 0.9 : 1,
                  },
                ]}
              >
                {gpsLoading ? (
                  <ActivityIndicator size="small" color={t.colors.primary} />
                ) : (
                  <Ionicons name="locate" size={20} color={t.colors.textMain} />
                )}
              </Pressable>
            </View>
          )}

          <BottomSheetFlatList
            data={filteredList}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={{ color: t.colors.textSub }}>조건에 맞는 모임이 없어요.</Text>
              </View>
            }
            // ✅ 실서비스 튜닝(리스트 성능)
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={Platform.OS === "android"}
          />
        </BottomSheet>
      </View>
    </AppLayout>
  );
}

const ExpandableMeetingRow = React.memo(
  ({
    item,
    isSelected,
    onPress,
    onDetailPress,
    t,
  }: {
    item: MeetingPost;
    isSelected: boolean;
    onPress: () => void;
    onDetailPress: () => void;
    t: any;
  }) => {
    const meta = getCategoryMeta(item.category);

    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor: t.colors.surface,
            borderColor: isSelected ? t.colors.primary : t.colors.border,
            borderWidth: isSelected ? 1.5 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.miniChip, { backgroundColor: meta.color + "15" }]}>
            <Ionicons name={meta.icon} size={10} color={meta.color} />
            <Text style={{ color: meta.color, fontSize: 10, fontWeight: "800" }}>{meta.label}</Text>
          </View>
          <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>{item.distanceText || "내 주변"}</Text>
        </View>

        <Text style={[t.typography.titleMedium, { fontWeight: "700", marginTop: 6, marginBottom: 4 }]} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={styles.rowCenter}>
          <Ionicons name="location-outline" size={13} color={t.colors.textSub} />
          <Text style={{ color: t.colors.textSub, fontSize: 13 }} numberOfLines={1}>
            {item.location?.name}
          </Text>
        </View>

        {isSelected && (
          <View style={styles.cardActionArea}>
            <View style={styles.divider} />
            <Pressable
              onPress={onDetailPress}
              style={({ pressed }) => [styles.detailBtn, { backgroundColor: t.colors.primary, opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 14 }}>상세보기</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: "100%", height: "100%" },

  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },

  sheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },

  // ✅ 버튼을 "목록 위"에 고정 배치 (바텀시트 내부라 겹침 없음)
  sheetActions: {
    position: "relative",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetActionsCenter: {
    alignItems: "center",
  },
  sheetGpsBtn: {
    position: "absolute",
    right: 16,
    top: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
  },

  rowCenter: { flexDirection: "row", alignItems: "center", gap: 6 },

  researchPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
  },

  card: {
    borderRadius: 16,
    padding: 14,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },

  cardActionArea: { marginTop: 12 },
  divider: { height: 1, backgroundColor: "#EEE", marginBottom: 10 },
  detailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
});