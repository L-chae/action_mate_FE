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
import MapView, { Marker, PROVIDER_GOOGLE, Region, Callout } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import AppLayout from "../../shared/ui/AppLayout";
import { Card } from "../../shared/ui/Card";
import { Button } from "../../shared/ui/Button";
import { useAppTheme } from "../../shared/hooks/useAppTheme";

import { fetchMapMeetings } from "./mapService";
import type { Meeting, CategoryKey } from "../meetings/types";

// ✅ 카테고리별 색상 설정 (아이콘 제거됨)
const CATEGORY_COLORS: Record<CategoryKey, string> = {
  SPORTS: "#4A90E2", // 파랑
  GAMES: "#9B59B6",  // 보라
  MEAL: "#FF9F43",   // 주황
  STUDY: "#2ECC71",  // 초록
  ETC: "#95A5A6",    // 회색
};

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

/**
 * 🛠️ [Simple Dot Marker]
 * 텍스트/이미지를 제거하고 순수 View(도형)로만 구성하여
 * 안드로이드 렌더링 이슈를 원천 차단했습니다.
 */
const MarkerDot = React.memo(function MarkerDot(props: {
  meeting: Meeting;
  isSelected: boolean;
  onPress: (id: string) => void;
  onGoDetail: (id: string) => void;
}) {
  const { meeting: m, isSelected, onPress, onGoDetail } = props;
  const color = CATEGORY_COLORS[m.category] || CATEGORY_COLORS.ETC;

  // ✅ 텍스트가 없으므로 렌더링 딜레이를 짧게 잡아도 안전함
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    setTracksViewChanges(true);
    // 도형 렌더링은 매우 빠르므로 200ms면 충분 (안드로이드 안전장치)
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [isSelected]);

  const coordinate = useMemo(
    () => ({
      latitude: m.lat ?? INITIAL_REGION.latitude,
      longitude: m.lng ?? INITIAL_REGION.longitude,
    }),
    [m.lat, m.lng]
  );

  return (
    <Marker
      coordinate={coordinate}
      onPress={() => onPress(m.id)}
      zIndex={isSelected ? 999 : 1}
      // 원형 마커이므로 anchor를 정중앙(0.5, 0.5)으로 설정
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      tracksInfoWindowChanges={false}
      stopPropagation={true}
    >
      {/* ✅ collapsable={false} 유지 (안드로이드 뷰 뭉개짐 방지)
         간단한 구조: [선택시 외곽링] + [내부 색상원] 
      */}
      <View collapsable={false} style={styles.markerRoot}>
        {isSelected && (
          <View style={[styles.glowRing, { backgroundColor: color }]} />
        )}
        <View
          style={[
            styles.dotCircle,
            {
              backgroundColor: color,
              width: isSelected ? 22 : 16,  // 선택 시 좀 더 커짐
              height: isSelected ? 22 : 16,
              borderRadius: isSelected ? 11 : 8,
            },
          ]}
        />
      </View>

      {/* 말풍선 */}
      <Callout tooltip onPress={() => onGoDetail(m.id)}>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle} numberOfLines={1}>
            {m.title}
          </Text>
          <Text style={styles.calloutDesc}>터치해서 상세보기 👉</Text>
          <View style={styles.calloutArrow} />
        </View>
      </Callout>
    </Marker>
  );
});

export default function MapScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [list, setList] = useState<Meeting[]>([]);
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

  const markers = useMemo(() => {
    return list.map((m) => (
      <MarkerDot
        key={m.id}
        meeting={m}
        isSelected={selectedId === m.id}
        onPress={handleMarkerPress}
        onGoDetail={goToDetail}
      />
    ));
  }, [list, selectedId, handleMarkerPress, goToDetail]);

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
          {markers}
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
                    <Text
                      style={[
                        t.typography.labelSmall,
                        {
                          color: CATEGORY_COLORS[selectedMeeting.category],
                          marginBottom: 2,
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      {selectedMeeting.category}
                    </Text>

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
                        : { backgroundColor: CATEGORY_COLORS[selectedMeeting.category] },
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

  // ✅ [수정됨] 단순 원형 마커 스타일
  markerRoot: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dotCircle: {
    borderWidth: 2,
    borderColor: "#fff",
    // Android Shadow
    elevation: 4,
    // iOS Shadow
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  glowRing: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    opacity: 0.4,
  },

  // 말풍선 스타일
  calloutContainer: {
    backgroundColor: "#222",
    borderRadius: 8,
    padding: 8,
    marginBottom: 5,
    width: 150,
    alignItems: "center",
  },
  calloutTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
    marginBottom: 2,
  },
  calloutDesc: {
    color: "#ccc",
    fontSize: 10,
  },
  calloutArrow: {
    position: "absolute",
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#222",
  },

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