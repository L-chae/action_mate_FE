import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Card } from "@/shared/ui/Card";
import EmptyView from "@/shared/ui/EmptyView";
import type { MyMeetingItem } from "../types";

type Props = {
  items: MyMeetingItem[];
  emptyText: string;

  editable?: boolean;
  onEdit?: (item: MyMeetingItem) => void;
  onDelete?: (item: MyMeetingItem) => void;
};

export default function MeetingList({ items, emptyText, editable = false, onEdit, onDelete }: Props) {
  const t = useAppTheme();

  if (!items?.length) {
    return <EmptyView title={emptyText} description="새로운 모임을 만들어보거나 참여해보세요." />;
  }

  return (
    <View style={{ gap: 12 }}>
      {items.map((m) => (
        <Card key={m.id} onPress={() => router.push(`/meetings/${m.id}`)} style={styles.card}>
          <View style={styles.topRow}>
            <Text style={[t.typography.titleMedium, { flex: 1 }]} numberOfLines={1}>
              {m.title}
            </Text>

            {editable && (
              <View style={styles.actions}>
                {!!onDelete && (
                  <Pressable
                    onPress={() => onDelete(m)}
                    hitSlop={10}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[t.typography.labelLarge, { color: t.colors.error }]}>삭제</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          <View style={{ marginTop: 6, gap: 4 }}>
            <Text style={t.typography.bodySmall}>{m.place}</Text>
            <Text style={t.typography.bodySmall}>
              {m.dateText} · {m.memberCount}명
            </Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 14 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
});
