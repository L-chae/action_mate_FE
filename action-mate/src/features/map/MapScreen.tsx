// src/features/map/MapScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import MapView, { Circle, PROVIDER_GOOGLE, type MarkerPressEvent, type Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { Id } from "@/shared/model/types";
import MultiCategoryChips from "@/shared/ui/MultiCategoryChips";
import { withAlpha } from "@/shared/theme/colors";
import { calculateDistance } from "@/shared/utils/distance";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { CategoryKey, MeetingPost } from "@/features/meetings/model/types";
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

type LatLng = { latitude: number; longitude: number };

function getLatLng(m?: MeetingPost) {
  const loc: any = (m as any)?.location;
  const lat = Number(loc?.latitude ?? loc?.lat);
  const lng = Number(loc?.longitude ?? loc?.lng);
  const ok = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  return ok ? { latitude: lat, longitude: lng } : null;
}

function safeDistanceText(my: LatLng | null, target: LatLng | null, fallback?: unknown) {
  if (!my || !target) return String(fallback ?? "");
  try {
    const v = calculateDistance(my.latitude, my.longitude, target.latitude, target.longitude);
    return String(v ?? fallback ?? "");
  } catch {
    return String(fallback ?? "");
  }
}

function parseSnapPercent(raw?: string) {
  if (typeof raw !== "string") return 0.15;
  const m = raw.match(/^(\d+(?:\.\d+)?)%$/);
  const pct = m ? Number(m[1]) / 100 : 0.15;
  return Number.isFinite(pct) ? Math.max(0, Math.min(1, pct)) : 0.15;
}

export default function MapScreen() {
  const t = useAppTheme();
  const s = t.spacing;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height: screenH } = useWindowDimensions();

  const styles = useMemo(() => makeStyles(t), [t]);

  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<any>(null);

  const regionRef = useRef<Region>(INITIAL_REGION);
  const lastLoadedRegionRef = useRef<Region>(INITIAL_REGION);

  const dirtyRef = useRef(false);
  const reqSeqRef = useRef(0);
  const focusedFromMarkerRef = useRef(false);

  const [list, setList] = useState<MeetingPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [locationPermission, setLocationPermission] = useState(false);
  const [myCoords, setMyCoords] = useState<LatLng | null>(null);

  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>([]);
  const [mapDirty, setMapDirty] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [sheetIndex, setSheetIndex] = useState(0);
  const snapPoints = useMemo(() => ["15%", "45%", "90%"], []);
  const hideSheetActions = sheetIndex >= 2;

  const snapPct = useMemo(() => parseSnapPercent(snapPoints?.[sheetIndex]), [snapPoints, sheetIndex]);
  const sheetHeightPx = useMemo(() => Math.max(0, Math.min(screenH, screenH * snapPct)), [screenH, snapPct]);

  // ✅ 버튼 위치: "모달(시트) 위쪽"에 자연스럽게 떠보이도록 시트 top 기준으로 배치
  const floatingBottom = useMemo(() => {
    const gap = 14;
    return sheetHeightPx + gap;
  }, [sheetHeightPx]);

  useEffect(() => {
    if (Platform.OS === "android") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (UIManager as any).setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const loadMeetings = useCallback(async (lat: number, lng: number) => {
    const seq = ++reqSeqRef.current;
    setLoading(true);

    try {
      const data = await meetingApi.listMeetingsAround(lat, lng);
      if (seq !== reqSeqRef.current) return;

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
          const lat = Number(location?.coords?.latitude);
          const lng = Number(location?.coords?.longitude);

          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const currentRegion: Region = {
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            };

            setMyCoords({ latitude: lat, longitude: lng });

            regionRef.current = currentRegion;
            mapRef.current?.animateToRegion(currentRegion, 800);
            loadMeetings(currentRegion.latitude, currentRegion.longitude);
          } else {
            setMyCoords(null);
            loadMeetings(INITIAL_REGION.latitude, INITIAL_REGION.longitude);
          }
        } else {
          setLocationPermission(false);
          setMyCoords(null);
          Alert.alert("알림", "위치 권한을 허용하면 내 주변 모임을 찾을 수 있어요.");
          loadMeetings(INITIAL_REGION.latitude, INITIAL_REGION.longitude);
        }
      } catch (e) {
        console.error(e);
        setMyCoords(null);
        loadMeetings(INITIAL_REGION.latitude, INITIAL_REGION.longitude);
      }
    })();
  }, [loadMeetings]);

  const onRegionChangeComplete = useCallback((r: Region) => {
    regionRef.current = r;

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
          setLocationPermission(false);
          setMyCoords(null);
          Alert.alert("권한 필요", "위치 권한 설정이 필요합니다.");
          return;
        }
        setLocationPermission(true);
      }

      const location = await Location.getCurrentPositionAsync({});
      const lat = Number(location?.coords?.latitude);
      const lng = Number(location?.coords?.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        Alert.alert("오류", "현재 위치를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }

      setMyCoords({ latitude: lat, longitude: lng });

      const newRegion: Region = {
        latitude: lat,
        longitude: lng,
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
      Alert.alert("오류", "현재 위치를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setGpsLoading(false);
    }
  }, [gpsLoading, locationPermission]);

  const listWithDistance = useMemo(() => {
    if (!myCoords) return list;

    return list.map((m) => {
      const target = getLatLng(m);
      if (!target) return m;

      const next = safeDistanceText(myCoords, target, (m as any)?.distanceText);
      if (String(next ?? "") === String((m as any)?.distanceText ?? "")) return m;

      return { ...m, distanceText: next };
    });
  }, [list, myCoords]);

  const meetingsById = useMemo(() => {
    const m = new Map<string, MeetingPost>();
    for (const it of listWithDistance) m.set(toIdString(it.id), it);
    return m;
  }, [listWithDistance]);

  const selectedMeeting = useMemo(() => {
    if (!selectedId) return undefined;
    return meetingsById.get(selectedId);
  }, [meetingsById, selectedId]);

  const filteredList = useMemo(() => {
    if ((selectedCategories?.length ?? 0) === 0) return listWithDistance;
    const set = new Set(selectedCategories);
    return listWithDistance.filter((m) => set.has(m.category));
  }, [listWithDistance, selectedCategories]);

  const markerList = useMemo(() => {
    if ((selectedCategories?.length ?? 0) === 0) return listWithDistance;

    const base = filteredList;
    if (selectedMeeting && !base.some((m) => toIdString(m.id) === toIdString(selectedMeeting.id))) {
      return [selectedMeeting, ...base];
    }
    return base;
  }, [filteredList, listWithDistance, selectedCategories, selectedMeeting]);

  // ✅ 선택된 모임을 목록 최상단으로 올림(마커 탭 시 즉시 보이게)
  const displayList = useMemo(() => {
    const base = filteredList;
    if (!selectedMeeting) return base;

    const sid = toIdString(selectedMeeting.id);
    const rest = base.filter((m) => toIdString(m.id) !== sid);
    return [selectedMeeting, ...rest];
  }, [filteredList, selectedMeeting]);

  const onChangeCategories = useCallback((next: CategoryKey[]) => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setSelectedCategories(next ?? []);
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

      focusedFromMarkerRef.current = true;
      Haptics.selectionAsync().catch(() => {});
      onFocusItem(item);
    },
    [meetingsById, onFocusItem]
  );

  useEffect(() => {
    if (!selectedId) return;
    if (!focusedFromMarkerRef.current) return;

    focusedFromMarkerRef.current = false;
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
      } catch {
        // ignore
      }
    });
  }, [selectedId]);

  const headerTitle = useMemo(() => {
    const total = filteredList.length;
    if ((selectedCategories?.length ?? 0) === 0) return `전체 모임 ${total}개`;

    const labels = (selectedCategories ?? []).map((c) => getCategoryMeta(c).label);
    if (labels.length <= 2) return `${labels.join(", ")} · ${total}개`;
    return `${labels.slice(0, 2).join(", ")} 외 ${labels.length - 2} · ${total}개`;
  }, [filteredList.length, selectedCategories]);

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
        fillColor={withAlpha(meta.color, 0.14)}
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
      />
    ),
    [onFocusItem, onGoToDetail, selectedId]
  );

  const keyExtractor = useCallback((m: MeetingPost) => toIdString(m.id), []);

  const topOverlayPadTop = Math.max(insets.top, 10) + 6;

  const showResearch = mapDirty && !hideSheetActions;
  const showGps = !hideSheetActions;

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
          {markerList.map((m) => {
            const id = toIdString(m.id);
            return <MapMarker key={id} meeting={m} selected={selectedId === id} onPress={onMarkerPress} />;
          })}
        </MapView>

        {/* 상단 필터(흰색 컨테이너) */}
        <View
          style={[styles.topOverlay, { paddingTop: topOverlayPadTop, paddingBottom: s.space[2] }]}
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

        {/* ✅ 버튼 위치: 스크린샷 화살표 위치처럼 "시트 위" 지도 영역에 떠보이게 */}
        {(showResearch || showGps) && (
          <View
            style={[
              styles.floatingActions,
              {
                bottom: floatingBottom,
                paddingHorizontal: s.pagePaddingH,
              },
            ]}
            pointerEvents="box-none"
          >
            {showResearch ? (
              <Pressable
                onPress={handleResearch}
                disabled={loading}
                style={({ pressed }) => [
                  styles.researchPill,
                  {
                    alignSelf: "center",
                    borderColor: t.colors.border,
                    backgroundColor: "#FFFFFF",
                    opacity: loading ? 0.82 : pressed ? 0.92 : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={t.colors.primary} />
                ) : (
                  <View style={styles.rowCenter}>
                    <Ionicons name="refresh" size={14} color={t.colors.primary} />
                    <View style={{ width: 6 }} />
                    <Text style={[t.typography.labelMedium, { color: t.colors.primary, fontWeight: "700" }]}>
                      이 지역 재검색
                    </Text>
                  </View>
                )}
              </Pressable>
            ) : null}

            {showGps ? (
              <Pressable
                onPress={moveToMyLocation}
                disabled={gpsLoading}
                style={({ pressed }) => [
                  styles.gpsFab,
                  {
                    position: "absolute",
                    right: s.pagePaddingH,
                    borderColor: t.colors.border,
                    backgroundColor: "#FFFFFF",
                    opacity: gpsLoading ? 0.75 : pressed ? 0.9 : 1,
                  },
                ]}
                pointerEvents="auto"
              >
                {gpsLoading ? (
                  <ActivityIndicator size="small" color={t.colors.primary} />
                ) : (
                  <Ionicons name="locate" size={20} color={t.colors.textMain} />
                )}
              </Pressable>
            ) : null}
          </View>
        )}

        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          onChange={setSheetIndex}
          backgroundStyle={{
            backgroundColor: t.colors.surface,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
          }}
          handleIndicatorStyle={{ backgroundColor: withAlpha(t.colors.border, 0.9) }}
          handleStyle={styles.sheetHandle}
        >
          <View style={[styles.sheetHeader, { borderBottomColor: withAlpha(t.colors.border, 0.8) }]}>
            <Text style={[t.typography.titleSmall, { color: t.colors.textMain, fontWeight: "800" }]} numberOfLines={1}>
              {headerTitle}
            </Text>
          </View>

          <BottomSheetFlatList
            ref={listRef}
            data={displayList}
            keyExtractor={keyExtractor}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingTop: s.space[2], // ✅ "전체 모임" 밑 여백 축소
                paddingBottom: Math.max(s.space[6], insets.bottom + s.space[3]),
              },
            ]}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: s.space[3] }} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>조건에 맞는 모임이 없어요.</Text>
              </View>
            }
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

  function ExpandableMeetingRow({
    item,
    isSelected,
    onPress,
    onDetailPress,
  }: {
    item: MeetingPost;
    isSelected: boolean;
    onPress: () => void;
    onDetailPress: () => void;
  }) {
    const meta = getCategoryMeta(item.category);

    const chipBg = withAlpha(meta.color, t.mode === "dark" ? 0.22 : 0.14);
    const pressedBg = t.colors.overlay[6];

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.meetingCard,
          {
            backgroundColor: pressed ? pressedBg : t.colors.surface,
            borderColor: isSelected ? t.colors.primary : t.colors.border,
            borderWidth: isSelected ? 1.5 : s.borderWidth,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.miniChip, { backgroundColor: chipBg }]}>
            <Ionicons name={meta.icon} size={10} color={meta.color} />
            <View style={{ width: 4 }} />
            <Text style={[t.typography.labelSmall, { color: meta.color, fontWeight: "800" }]}>{meta.label}</Text>
          </View>

          <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]} numberOfLines={1}>
            {String((item as any)?.distanceText ?? "").trim() || "내 주변"}
          </Text>
        </View>

        <Text
          style={[t.typography.titleMedium, { color: t.colors.textMain, fontWeight: "700", marginTop: s.space[2] }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>

        <View style={[styles.rowCenter, { marginTop: s.space[1] }]}>
          <Ionicons name="location-outline" size={13} color={t.colors.icon.muted} />
          <View style={{ width: 6 }} />
          <Text style={[t.typography.bodySmall, { color: t.colors.textSub, flex: 1 }]} numberOfLines={1}>
            {(item as any)?.location?.name ?? "장소 미정"}
          </Text>
        </View>

        {isSelected ? (
          <View style={{ marginTop: s.space[3] }}>
            <View style={{ height: 1, backgroundColor: t.colors.divider, marginBottom: s.space[2] }} />
            <Pressable
              onPress={onDetailPress}
              style={({ pressed }) => [
                styles.detailBtn,
                { backgroundColor: pressed ? withAlpha(t.colors.primary, 0.9) : t.colors.primary },
              ]}
            >
              <Text style={[t.typography.labelLarge, { color: "#FFF", fontWeight: "700" }]}>상세보기</Text>
              <View style={{ width: 6 }} />
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    );
  }
}

function makeStyles(t: ReturnType<typeof useAppTheme>) {
  const s = t.spacing;

  return StyleSheet.create({
    container: { flex: 1 },
    map: { width: "100%", height: "100%" },

    topOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 30,
    },

    sheetHandle: {
      paddingTop: 8,
    },

    sheetHeader: {
      paddingHorizontal: s.pagePaddingH,
      paddingTop: s.space[1],
      paddingBottom: s.space[2], // ✅ 헤더 아래 여백 축소
      borderBottomWidth: StyleSheet.hairlineWidth,
    },

    floatingActions: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 40,
      height: 44,
      justifyContent: "center",
    },

    rowCenter: { flexDirection: "row", alignItems: "center" },

    gpsFab: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: s.borderWidth,
      elevation: 3,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 10,
    },

    researchPill: {
      height: 44,
      paddingHorizontal: s.space[4],
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: s.borderWidth,
      elevation: 3,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 10,
    },

    listContent: {
      paddingHorizontal: s.pagePaddingH,
    },
    emptyState: { alignItems: "center", paddingTop: s.space[6] },

    meetingCard: {
      borderRadius: s.radiusLg,
      padding: s.space[3],
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
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: s.radiusSm,
    },

    detailBtn: {
      height: 44,
      borderRadius: s.radiusMd,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    },
  });
}