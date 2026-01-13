import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

import { Screen } from "~/shared/layout/Screen";
import { useAppTheme } from "~/shared/hooks/useAppTheme";
import { Card } from "~/shared/ui/Card";
import { Button } from "~/shared/ui/Button";

import { useMeetupsStore } from "~/features/meetups/store";
import { MapPreview } from "~/features/map/ui/MapPreview";
import { NearbyMeetupRow } from "~/features/map/ui/NearbyMeetupRow";
import { distanceKm, formatKm } from "~/shared/lib/geo";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function timeLabelFromIso(iso: string) {
  const d = new Date(iso);
  const now = new Date();

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();

  const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  if (sameDay) return `오늘 ${hhmm}`;
  if (isTomorrow) return `내일 ${hhmm}`;
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${hhmm}`;
}

export default function MapScreen() {
  const t = useAppTheme();

  const meetups = useMeetupsStore((s) => s.meetups);
  const myLocation = useMeetupsStore((s) => s.myLocation);

  // ✅ 주변(거리순) 정렬 + 1차 반경(예: 3km)
  const radiusKm = 3;

  const nearby = useMemo(() => {
    return meetups
      .map((m) => {
        const km = distanceKm(myLocation, { lat: m.lat, lng: m.lng });
        return { m, km };
      })
      .filter((x) => x.km <= radiusKm)
      .sort((a, b) => a.km - b.km);
  }, [meetups, myLocation]);

  return (
    <Screen>
      <Text style={[t.typography.titleLarge, { color: t.colors.textMain }]}>지도</Text>
      <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, marginTop: 6 }]}>
        내 위치 주변 모임을 빠르게 찾아보세요
      </Text>

      <View style={{ height: 12 }} />

      <MapPreview
        title="지도(placeholder)"
        subtitle={`반경 ${radiusKm}km 내 모임을 거리순으로 보여줘요. (실제 지도는 다음 단계에서 마커로 연결)`}
      />

      <View style={{ height: 12 }} />

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>
            근처 모임 ({nearby.length})
          </Text>

          <Button
            title="모임 만들기"
            variant="secondary"
            onPress={() => router.push("/meetups/create")}
          />
        </View>

        <View style={{ height: 10 }} />

        {nearby.length === 0 ? (
          <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>
            근처에 모임이 없어요. 반경을 늘리거나 모임을 만들어보세요!
          </Text>
        ) : (
          <ScrollView style={{ marginTop: 4 }} contentContainerStyle={{ gap: 10 } as any}>
            {nearby.map(({ m, km }) => (
              <NearbyMeetupRow
                key={m.id}
                title={m.title}
                placeName={m.placeName}
                distanceLabel={formatKm(km)}
                timeLabel={timeLabelFromIso(m.startsAt)}
                capacityLabel={`${m.joinedCount}/${m.capacity}`}
                category={m.category}
                onPress={() =>
                  router.push({ pathname: "/meetups/[meetupId]", params: { meetupId: m.id } })
                }
              />
            ))}
          </ScrollView>
        )}
      </Card>

      <View style={{ height: 12 }} />

      <Card>
        <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>내 위치(1차 본)</Text>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 6 }]}>
          lat: {myLocation.lat.toFixed(4)} / lng: {myLocation.lng.toFixed(4)}
        </Text>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 6 }]}>
          다음 단계: 위치 권한(온보딩) 연결 + 실제 GPS 값으로 교체
        </Text>
      </Card>
    </Screen>
  );
}
