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
  PROVIDER_GOOGLE,
  Region,
  MarkerPressEvent,
} from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";

// ✅ Shared Components & Hooks
import AppLayout from "@/shared/ui/AppLayout";
import { Card } from "@/shared/ui/Card";
import CategoryChips from "@/shared/ui/CategoryChips"; // 🔹 교체된 컴포넌트 Import
import { useAppTheme } from "@/shared/hooks/useAppTheme";

// ✅ Features & API
import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingPost, CategoryKey } from "@/features/meetings/model/types";
import { MapMarker, getCategoryMeta } from "./ui/MapMarker";

// 🗺️ 지도 스타일 설정
const MAP_STYLE = [
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

const INITIAL_REGION: Region = {
  latitude: 37.498095, longitude: 127.02761, latitudeDelta: 0.015, longitudeDelta: 0.015,
};

export default function MapScreen() {
  const t = useAppTheme();
  const router = useRouter();
  
  // Refs
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const regionRef = useRef<Region>(INITIAL_REGION);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // States
  const [list, setList] = useState<MeetingPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | "ALL">("ALL");

  const snapPoints = useMemo(() => ["14%", "45%", "92%"], []);

  // 🔄 로딩 상태 디바운싱
  useEffect(() => {
    if (loading) {
      loadingTimerRef.current = setTimeout(() => setShowLoading(true), 300);
    } else {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      setShowLoading(false);
    }
    return () => { if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current); };
  }, [loading]);

  // 📡 데이터 로드
  const loadMeetings = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const data = await meetingApi.listMeetingsAround(lat, lng);
      setList(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 📍 초기 위치 권한 및 로드
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
          longitudeDelta: 0.015 
        };
        regionRef.current = currentRegion;
        mapRef.current?.animateToRegion(currentRegion, 800);
        loadMeetings(currentRegion.latitude, currentRegion.longitude);
      } catch (e) { console.error(e); }
    })();
  }, [loadMeetings]);

  // 🗺️ 지도 조작 핸들러
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
      const newRegion: Region = { 
        latitude: location.coords.latitude, 
        longitude: location.coords.longitude, 
        latitudeDelta: 0.015, 
        longitudeDelta: 0.015 
      };
      regionRef.current = newRegion;
      mapRef.current?.animateToRegion(newRegion, 700);
    } catch (e) { console.error(e); }
  }, [locationPermission]);

  // 🔍 데이터 필터링 및 선택 로직
  const meetingsById = useMemo(() => {
    const map = new Map<string, MeetingPost>();
    for (const m of list) map.set(m.id, m);
    return map;
  }, [list]);

  const selectedMeeting = useMemo(() => (!selectedId ? undefined : meetingsById.get(selectedId)), [meetingsById, selectedId]);

  const filteredList = useMemo(() => (
    categoryFilter === "ALL" 
      ? list 
      : list.filter((m: MeetingPost) => m.category === categoryFilter)
  ), [list, categoryFilter]);

  const listData = useMemo(() => (selectedMeeting ? [selectedMeeting] : filteredList), [selectedMeeting, filteredList]);

  // 👆 인터랙션 핸들러
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

  const onSelectFromList = useCallback((m: MeetingPost) => {
    setSelectedId(m.id);
    if (m.locationLat && m.locationLng) {
      mapRef.current?.animateToRegion({ latitude: m.locationLat, longitude: m.locationLng, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 450);
    }
  }, []);

  // 🎨 선택된 마커 하이라이트 원
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

  return (
    <AppLayout padded={false}>
      <View style={styles.container}>
        {/* 🗺️ 지도 뷰 */}
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
          mapPadding={{ top: 20, right: 0, bottom: 160, left: 0 }} 
          moveOnMarkerPress={false}
        >
          {selectedCircle}
          {list.map((m: MeetingPost) => (
            <MapMarker key={m.id} meeting={m} selected={selectedId === m.id} onPress={onMarkerPress} />
          ))}
        </MapView>

        {/* 🔄 재검색 버튼 */}
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

        {/* 📍 내 위치 버튼 */}
        <View style={styles.myLocationWrapper}>
          <Pressable onPress={moveToMyLocation} style={[styles.iconBtn, { backgroundColor: t.colors.surface }]}>
            <Ionicons name="locate" size={22} color={t.colors.textMain} />
          </Pressable>
        </View>

        {/* 📜 바텀 시트 (리스트) */}
        <BottomSheet 
          ref={bottomSheetRef} 
          index={0} 
          snapPoints={snapPoints} 
          enablePanDownToClose={false} 
          backgroundStyle={{ backgroundColor: t.colors.surface }} 
          handleIndicatorStyle={{ backgroundColor: t.colors.overlay[12] }}
        >
          {/* 🔹 1. 카테고리 칩 (교체됨) */}
          <CategoryChips value={categoryFilter} onChange={setCategoryFilter} />

          {/* 🔹 2. 선택된 모임 헤더 (조건부 렌더링) */}
          {selectedMeeting && (
            <View style={[styles.selectedInfoBar, { borderBottomColor: t.colors.border }]}>
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
          )}

          {/* 🔹 3. 모임 리스트 */}
          <BottomSheetFlatList
            data={listData} 
            keyExtractor={(m: any) => m.id} 
            contentContainerStyle={{ paddingVertical: 12 }}
            renderItem={({ item }: { item: MeetingPost }) => (
              <Pressable 
                onPress={() => goToDetail(item.id)} 
                onLongPress={() => onSelectFromList(item)} 
                style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
              >
                <MapListRow t={t} item={item} selected={item.id === selectedId} />
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>
                  주변에 조건에 맞는 모임이 없어요.
                </Text>
              </View>
            }
          />
        </BottomSheet>
      </View>
    </AppLayout>
  );
}

// ✅ 하위 컴포넌트 (MapListRow)
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

// 🎨 Styles
const styles = StyleSheet.create({
  container: { flex: 1 }, 
  map: { width: "100%", height: "100%" }, 
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  
  // Floating Buttons
  topContainer: { position: "absolute", top: 60, alignSelf: "center", zIndex: 30 },
  pillBtn: { 
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, 
    elevation: 6, shadowColor: "#000", shadowOpacity: 0.15, 
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 } 
  },
  myLocationWrapper: { position: "absolute", right: 16, top: 120, zIndex: 30 },
  iconBtn: { 
    width: 44, height: 44, borderRadius: 22, 
    alignItems: "center", justifyContent: "center", 
    elevation: 5, shadowColor: "#000", shadowOpacity: 0.2, 
    shadowRadius: 4 
  },

  // BottomSheet Inner Styles
  selectedInfoBar: { 
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 
  },
  
  // List Row
  rowCard: { marginHorizontal: 16, padding: 14, borderRadius: 16, borderWidth: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowLoc: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
});