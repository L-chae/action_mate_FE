import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {Pressable, StyleSheet, Text, View, ActivityIndicator, Alert,} from "react-native";
import { useRouter } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import AppLayout from "../../shared/ui/AppLayout";
import { Card } from "../../shared/ui/Card";
import { Button } from "../../shared/ui/Button";
import { useAppTheme } from "../../shared/hooks/useAppTheme";

import { fetchMapMeetings } from "./mapService";
import type { MeetingPost, CategoryKey } from "../meetings/types";

/**
 * ✅ 최종 안정화(안드로이드 "1/4 잘림" 완전 회피) 버전
 * - Marker children(View/Ionicons/Image) 완전 제거
 * - 네이티브 마커(pinColor)만 사용 → Google Maps SDK가 직접 그려서 잘림 이슈 사실상 0%
 * - 알바앱 UX처럼 "마커 탭 → 하단 카드"로 정보 제공
 *
 * ⚠️ 제약:
 * - 커스텀 원형 아이콘 디자인은 포기(대신 안정성 최우선)
 * - 커스텀 디자인이 꼭 필요하면 결국 Marker.image(PNG)로 가야 0%에 수렴
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

// ✅ 카테고리별 색상 (pinColor에 사용)
const CATEGORY_COLORS: Record<CategoryKey, string> = {
  SPORTS: "#4A90E2",
  GAMES: "#9B59B6",
  MEAL: "#FF9F43",
  STUDY: "#2ECC71",
  ETC: "#95A5A6",
};

// ✅ 하단 카드 표시용 아이콘(이건 지도 마커가 아니라 카드에서만 사용)
const CATEGORY_ICONS: Record<CategoryKey, keyof typeof Ionicons.glyphMap> = {
  SPORTS: "basketball",
  GAMES: "game-controller",
  MEAL: "restaurant",
  STUDY: "book",
  ETC: "ellipsis-horizontal",
};

const MeetingMarkerNative = React.memo(function MeetingMarkerNative(props: {
  meeting: MeetingPost;
  selected: boolean;
  onPress: (id: string) => void;
}) {
  const { meeting: m, selected, onPress } = props;

  const coordinate = useMemo(
    () => ({
      latitude: m.lat ?? INITIAL_REGION.latitude,
      longitude: m.lng ?? INITIAL_REGION.longitude,
    }),
    [m.lat, m.lng]
  );

  const color = CATEGORY_COLORS[m.category] ?? CATEGORY_COLORS.ETC;

  // ✅ 선택 강조: zIndex + (원하면 색상 변경도 가능)
  // 여기선 색상 동일, zIndex만 올림 (안정적)
  return (
    <Marker
      coordinate={coordinate}
      onPress={() => onPress(m.id)}
      pinColor={color}
      zIndex={selected ? 999 : 1}
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

  const selectedMeeting = useMemo(
    () => list.find((m) => m.id === selectedId),
    [list, selectedId]
  );

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
      const data = await fetchMapMeetings(lat, lng);
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

  const handleMarkerPress = useCallback(
    (id: string) => {
      setSelectedId(id);

      const target = list.find((m) => m.id === id);
      if (!target?.lat || !target?.lng) return;

      // ✅ 마커 중심으로 줌인 (네이티브 마커에서도 안정적)
      mapRef.current?.animateToRegion(
        {
          latitude: target.lat,
          longitude: target.lng,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        450
      );
    },
    [list]
  );

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

  const onRegionChangeComplete = useCallback((r: Region) => {
    regionRef.current = r;
  }, []);

  const renderMarker = useCallback(
    (m: MeetingPost) => (
      <MeetingMarkerNative
        key={m.id}
        meeting={m}
        selected={selectedId === m.id}
        onPress={handleMarkerPress}
      />
    ),
    [selectedId, handleMarkerPress]
  );

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
          {list.map(renderMarker)}
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
          <View style={styles.bottomContainer}>
            <Card style={styles.infoCard}>
              <Pressable onPress={() => goToDetail(selectedMeeting.id)}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 4 }}>
                      <Ionicons
                        name={CATEGORY_ICONS[selectedMeeting.category] ?? CATEGORY_ICONS.ETC}
                        size={14}
                        color={CATEGORY_COLORS[selectedMeeting.category] ?? CATEGORY_COLORS.ETC}
                      />
                      <Text
                        style={[
                          t.typography.labelSmall,
                          {
                            color: CATEGORY_COLORS[selectedMeeting.category] ?? CATEGORY_COLORS.ETC,
                            fontWeight: "bold",
                          },
                        ]}
                      >
                        {selectedMeeting.category}
                      </Text>
                    </View>

                    <Text style={t.typography.titleMedium} numberOfLines={1}>
                      {selectedMeeting.title}
                    </Text>

                    <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]}>
                      {selectedMeeting.locationText}
                      {selectedMeeting.distanceText ? ` · ${selectedMeeting.distanceText}` : ""}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      selectedMeeting.status === "FULL"
                        ? { backgroundColor: "#bbb" }
                        : { backgroundColor: CATEGORY_COLORS[selectedMeeting.category] ?? CATEGORY_COLORS.ETC },
                    ]}
                  >
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>
                      {selectedMeeting.status === "FULL" ? "마감" : "모집중"}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />
              </Pressable>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button
                  title="자세히 보기"
                  variant="secondary"
                  onPress={() => goToDetail(selectedMeeting.id)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="참여하기"
                  disabled={selectedMeeting.status === "FULL"}
                  onPress={() => goToDetail(selectedMeeting.id)}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </View>
        )}
      </View>
    </AppLayout>
  );
}

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
    bottom: 30,
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