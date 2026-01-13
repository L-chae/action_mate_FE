import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import AppLayout from "../../shared/ui/AppLayout";
import { Card } from "../../shared/ui/Card";
import { Button } from "../../shared/ui/Button";
import { useAppTheme } from "../../shared/hooks/useAppTheme";

import { listMeetings } from "../meetings/meetingService";
import type { Meeting } from "../meetings/types";

export default function MapScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>("1");

  const items = useMemo<Meeting[]>(() => {
    // 목데이터 재사용
    // (실제로는 mapService로 주변 모임 조회)
    // 여기선 즉시 리스트로 사용
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    return [];
  }, []);

  // 간단히 meetingService 목을 바로 쓰자
  const [list, setList] = React.useState<Meeting[]>([]);
  React.useEffect(() => {
    listMeetings({ category: "ALL" }).then(setList);
  }, []);

  const selected = list.find((m) => m.id === selectedId) ?? list[0];

  return (
    <AppLayout padded={false}>
      {/* 지도 영역(가짜 배경) */}
      <View style={[styles.map, { backgroundColor: "#E0E0E0" }]}>
        {/* 격자 느낌 */}
        <View style={styles.grid} />

        {/* 상단 버튼 */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => Alert.alert("재검색", "나중에 연결")}
            style={[styles.research, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
          >
            <Text style={[t.typography.labelMedium, { color: t.colors.primary }]}>🔄 이 지역 재검색</Text>
          </Pressable>
        </View>

        {/* 핀(가짜 위치) */}
        {list.map((m, idx) => (
          <Pressable
            key={m.id}
            onPress={() => setSelectedId(m.id)}
            style={[
              styles.pin,
              { left: 60 + idx * 90, top: 160 + (idx % 2) * 120, borderColor: t.colors.primary },
            ]}
          >
            <Text style={{ fontSize: 16 }}>{m.title.slice(0, 2)}</Text>
          </Pressable>
        ))}

        {/* 하단 바텀 카드 */}
        {selected ? (
          <View style={styles.bottom}>
            <Card style={{ padding: 12 }}>
              <Text style={t.typography.titleMedium} numberOfLines={1}>
                {selected.title}
              </Text>
              <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]}>
                {selected.distanceText ?? "300m 이내"} · {selected.meetingTimeText}
              </Text>

              <View style={{ height: 10 }} />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button title="상세" variant="secondary" onPress={() => router.push(`/meetings/${selected.id}`)} style={{ flex: 1 }} />
                <Button title="참여" onPress={() => router.push(`/meetings/${selected.id}`)} style={{ flex: 1 }} />
              </View>
            </Card>
          </View>
        ) : null}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
    borderWidth: 1,
    borderColor: "#fff",
  },
  topBar: { position: "absolute", top: 14, left: 0, right: 0, alignItems: "center" },
  research: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },

  pin: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  bottom: { position: "absolute", left: 16, right: 16, bottom: 16 },
});
