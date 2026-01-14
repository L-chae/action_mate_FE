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
  Marker,
  PROVIDER_GOOGLE,
  Region,
  Callout,
} from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import AppLayout from "../../shared/ui/AppLayout";
import { Card } from "../../shared/ui/Card";
import { Button } from "../../shared/ui/Button";
import { useAppTheme } from "../../shared/hooks/useAppTheme";

import { fetchMapMeetings } from "./mapService";
import type { Meeting, CategoryKey } from "../meetings/types";

// ✅ 카테고리별 디자인 설정
const CATEGORY_CONFIG: Record<CategoryKey, { color: string; icon: string }> = {
  SPORTS: { color: "#4A90E2", icon: "⚽" },
  GAMES: { color: "#9B59B6", icon: "🎲" },
  MEAL: { color: "#FF9F43", icon: "🍔" },
  STUDY: { color: "#2ECC71", icon: "📚" },
  ETC: { color: "#95A5A6", icon: "🚩" },
};

const MAP_STYLE = [
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

// 기본 위치 (강남역)
const INITIAL_REGION: Region = {
  latitude: 37.498095,
  longitude: 127.02761,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

/**
 * ✅ 커스텀 마커 컴포넌트
 * - React.memo 로 불필요 리렌더 차단
 * - tracksViewChanges 를 "짧게만" true로 켰다가 자동으로 false (안드 깜박임 방지)
 * - padding/overflow로 잘림 방지
 */
const MarkerPin = React.memo(function MarkerPin(props: {
  meeting: Meeting;
  isSelected: boolean;
  onPress: (id: string) => void;
  onGoDetail: (id: string) => void;
}) {
  const { meeting: m, isSelected, onPress, onGoDetail } = props;
  const config = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.ETC;

  const [track, setTrack] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 선택/해제 등 UI가 바뀌는 순간만 잠깐 true
    setTrack(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTrack(false), 200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isSelected, m.category]);

  const coordinate = useMemo(
    () => ({
      latitude: m.lat ?? 37.498,
      longitude: m.lng ?? 127.027,
    }),
    [m.lat, m.lng]
  );

  const visualStyle = useMemo(
    () => [
      styles.markerVisual,
      {
        borderColor: config.color,
        backgroundColor: isSelected ? config.color : "#fff",
        transform: [{ scale: isSelected ? 1.18 : 1 }],
      },
    ],
    [config.color, isSelected]
  );

  return (
    <Marker
      key={m.id}
      coordinate={coordinate}
      onPress={() => onPress(m.id)}
      zIndex={isSelected ? 999 : 1}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={track}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <View style={styles.markerRoot}>
        <View style={styles.markerHitbox}>
          <View style={visualStyle}>
            <Text style={{ fontSize: isSelected ? 20 : 16 }}>{config.icon}</Text>
          </View>
        </View>
      </View>

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

  // ✅ region state 제거(ESLint no-unused-vars 해결)
  // 지도 현재 위치는 ref로만 관리
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

  // 📍 1) 현재 위치 권한 요청 및 이동
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

      // ✅ 길찾기/안내 없음. 그냥 해당 핀으로 약간 확대 이동만.
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
    setSelectedId(null);
    const r = regionRef.current;
    loadMeetings(r.latitude, r.longitude);
  }, [loadMeetings]);

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
    // ✅ 재검색 기준으로만 쓰면 ref로 충분 (리렌더 없음 → 깜박임 감소)
    regionRef.current = r;
  }, []);

  const markers = useMemo(() => {
    return list.map((m) => (
      <MarkerPin
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
            top: 90,
            right: 16,
            bottom: selectedMeeting ? 240 : 110,
            left: 16,
          }}
        >
          {markers}
        </MapView>

        {/* --- 상단 버튼 그룹 --- */}
        <View style={styles.topContainer}>
          <Pressable
            onPress={handleResearch}
            style={({ pressed }) => [
              styles.pillBtn,
              { backgroundColor: t.colors.surface, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            {loading ? (
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

        {/* --- 내 위치 버튼 (우측 하단) --- */}
        <View
          style={[
            styles.myLocationWrapper,
            selectedMeeting ? { bottom: 200 } : { bottom: 30 },
          ]}
        >
          <Pressable onPress={moveToMyLocation} style={styles.iconBtn}>
            <Ionicons name="locate" size={24} color="#333" />
          </Pressable>
        </View>

        {/* --- 하단 요약 카드 --- */}
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
                          color: CATEGORY_CONFIG[selectedMeeting.category].color,
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
                    <Text
                      style={[
                        t.typography.bodySmall,
                        { color: t.colors.textSub, marginTop: 4 },
                      ]}
                    >
                      {selectedMeeting.locationText} · {selectedMeeting.distanceText}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      selectedMeeting.status === "FULL"
                        ? { backgroundColor: "#bbb" }
                        : { backgroundColor: CATEGORY_CONFIG[selectedMeeting.category].color },
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

  markerRoot: {
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
  },
  markerHitbox: {
    padding: 10, // ✅ shadow/scale 여유(잘림 방지)
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
  },
  markerVisual: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",

    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },

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
    top: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  myLocationWrapper: {
    position: "absolute",
    right: 16,
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
    bottom: 24,
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
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
