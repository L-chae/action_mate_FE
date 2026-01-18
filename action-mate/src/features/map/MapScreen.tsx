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

import AppLayout from "@/shared/ui/AppLayout";
import { Card } from "@/shared/ui/Card";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

// ✅ [수정 1] API 객체 import
import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingPost, CategoryKey } from "@/features/meetings/model/types";

const MAP_STYLE = [
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

const INITIAL_REGION: Region = {
  latitude: 37.498095, longitude: 127.02761, latitudeDelta: 0.015, longitudeDelta: 0.015,
};

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

const MeetingMarkerNative = React.memo(function MeetingMarkerNative(props: {
  meeting: MeetingPost; selected: boolean; onPress: (e: MarkerPressEvent) => void;
}) {
  const { meeting: m, selected, onPress } = props;
  const coordinate = useMemo(() => ({
    latitude: m.locationLat ?? INITIAL_REGION.latitude,
    longitude: m.locationLng ?? INITIAL_REGION.longitude,
  }), [m.locationLat, m.locationLng]);

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

export default function MapScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [list, setList] = useState<MeetingPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const regionRef = useRef<Region>(INITIAL_REGION);
  const [locationPermission, setLocationPermission] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | "ALL">("ALL");

  const snapPoints = useMemo(() => ["14%", "45%", "92%"], []);

  useEffect(() => {
    if (loading) {
      loadingTimerRef.current = setTimeout(() => setShowLoading(true), 300);
    } else {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      setShowLoading(false);
    }
    return () => { if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current); };
  }, [loading]);

  const loadMeetings = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      // ✅ [수정 2] API 호출 방식 변경
      const data = await meetingApi.listMeetingsAround(lat, lng);
      setList(data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

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
        const currentRegion: Region = { latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 };
        regionRef.current = currentRegion;
        mapRef.current?.animateToRegion(currentRegion, 800);
        loadMeetings(currentRegion.latitude, currentRegion.longitude);
      } catch (e) { console.error(e); }
    })();
  }, [loadMeetings]);

  const onRegionChangeComplete = useCallback((r: Region) => { regionRef.current = r; }, []);

  const handleResearch = useCallback(() => {
    if (loading) return;
    setSelectedId(null);
    const r = regionRef.current;
    loadMeetings(r.latitude, r.longitude);
    bottomSheetRef.current?.snapToIndex(1);
  }, [loading, loadMeetings]);

  const moveToMyLocation = useCallback(async () => {
    if (!locationPermission) { Alert.alert("권한 필요", "위치 권한 설정이 필요합니다."); return; }
    try {
      const location = await Location.getCurrentPositionAsync({});
      const newRegion: Region = { latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 };
      regionRef.current = newRegion;
      mapRef.current?.animateToRegion(newRegion, 700);
    } catch (e) { console.error(e); }
  }, [locationPermission]);

  const meetingsById = useMemo(() => {
    const map = new Map<string, MeetingPost>();
    for (const m of list) map.set(m.id, m);
    return map;
  }, [list]);

  const selectedMeeting = useMemo(() => (!selectedId ? undefined : meetingsById.get(selectedId)), [meetingsById, selectedId]);

  // ✅ [수정 3] 파라미터 타입 명시 (m: MeetingPost)
  const filteredList = useMemo(() => (
    categoryFilter === "ALL" 
      ? list 
      : list.filter((m: MeetingPost) => m.category === categoryFilter)
  ), [list, categoryFilter]);

  const listData = useMemo(() => (selectedMeeting ? [selectedMeeting] : filteredList), [selectedMeeting, filteredList]);

  const goToDetail = useCallback((id: string) => { router.push(`/meetings/${id}`); }, [router]);

  const onMarkerPress = useCallback((e: MarkerPressEvent) => {
    const native = e.nativeEvent as any;
    const id: string | undefined = native?.id ?? native?.identifier;
    if (!id) return;
    setSelectedId(id);
    Haptics.selectionAsync().catch(() => {});
    const target = meetingsById.get(id);
    if (!target?.locationLat || !target?.locationLng) return;
    mapRef.current?.animateToRegion({ latitude: target.locationLat, longitude: target.locationLng, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 450);
    bottomSheetRef.current?.snapToIndex(1);
  }, [meetingsById]);

  const onMapPress = useCallback(() => { setSelectedId(null); bottomSheetRef.current?.snapToIndex(0); }, []);

  const selectedCircle = useMemo(() => {
    if (!selectedMeeting?.locationLat || !selectedMeeting?.locationLng) return null;
    const meta = getCategoryMeta(selectedMeeting.category);
    return (
      <Circle
        center={{ latitude: selectedMeeting.locationLat, longitude: selectedMeeting.locationLng }}
        radius={70} strokeWidth={2} strokeColor={meta.color} fillColor={`${meta.color}33`} zIndex={998}
      />
    );
  }, [selectedMeeting]);

  const onSelectFromList = useCallback((m: MeetingPost) => {
    setSelectedId(m.id);
    if (m.locationLat && m.locationLng) {
      mapRef.current?.animateToRegion({ latitude: m.locationLat, longitude: m.locationLng, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 450);
    }
  }, []);

  return (
    <AppLayout padded={false}>
      <View style={styles.container}>
        <MapView
          ref={mapRef} provider={PROVIDER_GOOGLE} style={styles.map} initialRegion={INITIAL_REGION} customMapStyle={MAP_STYLE}
          onRegionChangeComplete={onRegionChangeComplete} onPress={onMapPress} showsUserLocation showsMyLocationButton={false}
          mapPadding={{ top: 20, right: 0, bottom: 160, left: 0 }} moveOnMarkerPress={false}
        >
          {selectedCircle}
          {list.map((m: MeetingPost) => (
            <MeetingMarkerNative key={m.id} meeting={m} selected={selectedId === m.id} onPress={onMarkerPress} />
          ))}
        </MapView>

        <View style={styles.topContainer}>
          <Pressable onPress={handleResearch} style={({ pressed }) => [styles.pillBtn, { backgroundColor: t.colors.surface, opacity: pressed ? 0.9 : 1 }]}>
            {showLoading ? <ActivityIndicator size="small" color={t.colors.primary} /> : (
              <View style={styles.rowCenter}>
                <Ionicons name="refresh" size={16} color={t.colors.primary} />
                <Text style={[t.typography.labelMedium, { color: t.colors.primary }]}>이 지역 재검색</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.myLocationWrapper}>
          <Pressable onPress={moveToMyLocation} style={[styles.iconBtn, { backgroundColor: t.colors.surface }]}>
            <Ionicons name="locate" size={22} color={t.colors.textMain} />
          </Pressable>
        </View>

        <BottomSheet ref={bottomSheetRef} index={0} snapPoints={snapPoints} enablePanDownToClose={false} backgroundStyle={{ backgroundColor: t.colors.surface }} handleIndicatorStyle={{ backgroundColor: t.colors.overlay[12] }}>
          <View style={[styles.sheetHeader, { borderBottomColor: t.colors.border }]}>
            <ScrollChips t={t} value={categoryFilter} onChange={setCategoryFilter} />
            {selectedMeeting ? (
              <View style={styles.selectedHeaderRow}>
                <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>선택한 모임 1개 표시 중</Text>
                <Pressable onPress={() => setSelectedId(null)} hitSlop={10} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <Text style={[t.typography.labelSmall, { color: t.colors.primary, fontWeight: "800" }]}>전체 보기</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <BottomSheetFlatList
            data={listData} 
            keyExtractor={(m: any) => m.id} // TS가 혼란스러워하면 any로 우회 가능하나 가급적 타입 유지
            contentContainerStyle={{ paddingBottom: 16 }}
            // ✅ [수정 4] item 타입 명시 ({ item }: { item: MeetingPost })
            renderItem={({ item }: { item: MeetingPost }) => (
              <Pressable onPress={() => goToDetail(item.id)} onLongPress={() => onSelectFromList(item)} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
                <MapListRow t={t} item={item} selected={item.id === selectedId} />
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <View style={{ padding: 20 }}>
                <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>주변에 모임이 없어요. 지도를 이동한 뒤 재검색해보세요.</Text>
              </View>
            }
          />
        </BottomSheet>
      </View>
    </AppLayout>
  );
}

function ScrollChips({ t, value, onChange }: { t: ReturnType<typeof useAppTheme>; value: CategoryKey | "ALL"; onChange: (v: CategoryKey | "ALL") => void; }) {
  const items: Array<{ key: CategoryKey | "ALL"; label: string }> = [
    { key: "ALL", label: "전체" }, { key: "SPORTS", label: "스포츠" }, { key: "GAMES", label: "게임" }, { key: "MEAL", label: "식사" }, { key: "STUDY", label: "스터디" }, { key: "ETC", label: "기타" },
  ];
  return (
    <View style={styles.chipsWrap}>
      {items.map((it) => {
        const active = value === it.key;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} style={[styles.chip, { backgroundColor: active ? t.colors.overlay[8] : t.colors.overlay[6], borderColor: active ? t.colors.primary : t.colors.border }]}>
            <Text style={[t.typography.labelSmall, { color: active ? t.colors.textMain : t.colors.textSub }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MapListRow({ t, item, selected }: { t: ReturnType<typeof useAppTheme>; item: MeetingPost; selected: boolean; }) {
  const meta = getCategoryMeta(item.category);
  return (
    <Card style={[styles.rowCard, { borderColor: selected ? meta.color : t.colors.border, backgroundColor: t.colors.surface }]}>
      <View style={styles.rowTop}>
        <Ionicons name={meta.icon} size={14} color={meta.color} />
        <Text style={[t.typography.labelSmall, { color: meta.color, fontWeight: "800" }]}>{meta.label}</Text>
        {item.distanceText ? <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>· {item.distanceText}</Text> : null}
      </View>
      <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]} numberOfLines={1}>{item.title}</Text>
      <View style={styles.rowLoc}>
        <Ionicons name="location-outline" size={14} color={t.colors.textSub} />
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]} numberOfLines={1}>{item.locationText}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, map: { width: "100%", height: "100%" }, rowCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  topContainer: { position: "absolute", top: 60, alignSelf: "center", zIndex: 30 },
  pillBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, elevation: 6, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  myLocationWrapper: { position: "absolute", right: 16, top: 120, zIndex: 30 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", elevation: 5, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4 },
  sheetHeader: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10, borderBottomWidth: 1 },
  selectedHeaderRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chipsWrap: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  rowCard: { marginHorizontal: 16, padding: 14, borderRadius: 16, borderWidth: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowLoc: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
});