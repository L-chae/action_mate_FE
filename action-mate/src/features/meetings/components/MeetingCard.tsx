import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Card } from "../../../shared/ui/Card";
import { Badge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { useAppTheme } from "../../../shared/hooks/useAppTheme";
import type { MeetingPost } from "../types";

export default function MeetingCard({
  item,
  onJoin,
}: {
  item: MeetingPost;
  onJoin?: (id: string) => void; // 홈/지도에서 필요하면 주입
}) {
  const t = useAppTheme();
  const router = useRouter();

  const joinModeLabel = item.joinMode === "INSTANT" ? "⚡ 선착순" : "🙋 승인제";

  const statusBadge = (() => {
    switch (item.status) {
      case "FULL":
        return <Badge label="정원마감" tone="warning" />;
      case "CANCELED":
        return <Badge label="취소" tone="error" />;
      case "ENDED":
        return <Badge label="종료" />;
      case "STARTED":
        return <Badge label="진행중" tone="primary" />;
      default:
        return <Badge label="모집중" tone="success" />;
    }
  })();

  const canJoin = item.myState?.canJoin ?? item.status === "OPEN";

  return (
    <Card onPress={() => router.push(`/meetings/${item.id}`)} style={{ padding: 16 }}>
      <View style={styles.top}>
        <Text style={t.typography.titleMedium} numberOfLines={1}>
          {item.title}
        </Text>
        {statusBadge}
      </View>

      <View style={styles.metaRow}>
        <Text style={[t.typography.bodySmall, { color: t.colors.primary }]}>
          ⏰ {item.meetingTimeText}
        </Text>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>
          📍 {item.locationText}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={t.typography.bodySmall}>
          👥 {item.capacityJoined}/{item.capacityTotal}
        </Text>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>· {joinModeLabel}</Text>
        {item.distanceText ? (
          <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>· {item.distanceText}</Text>
        ) : null}
      </View>

      {item.hostMemo ? (
        <View style={{ marginTop: 10 }}>
          <Badge label={`📝 ${item.hostMemo}`} tone="point" size="md" />
        </View>
      ) : null}

      <View style={{ marginTop: 12 }}>
        <Button
          title={canJoin ? "참여하기" : item.myState?.reason ?? "참여 불가"}
          disabled={!canJoin}
          onPress={() => (onJoin ? onJoin(item.id) : router.push(`/meetings/${item.id}`))}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" },
});
