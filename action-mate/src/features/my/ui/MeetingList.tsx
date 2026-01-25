// src/features/my/ui/MeetingList.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Card } from "@/shared/ui/Card";
import EmptyView from "@/shared/ui/EmptyView";
import type { MyMeetingItem } from "../model/types";

type Props = {
  items: MyMeetingItem[];
  emptyText: string;

  editable?: boolean;
  onEdit?: (item: MyMeetingItem) => void;
  onDelete?: (item: MyMeetingItem) => void;
};

export default function MeetingList({
  items,
  emptyText,
  editable = false,
  onEdit,
  onDelete,
}: Props) {
  const t = useAppTheme();
  const s = t.spacing;

  if (!items?.length) {
    return (
      <EmptyView
        title={emptyText}
        description="새로운 모임을 만들어보거나 참여해보세요."
      />
    );
  }

  return (
    <View style={{ marginTop: s.space[2] }}>
      {items.map((m, idx) => (
        <Card
          key={m.id}
          onPress={() => router.push(`/meetings/${m.id}`)}
          style={[
            styles.card,
            { marginBottom: idx === items.length - 1 ? 0 : s.space[2] },
          ]}
        >
          <View style={styles.topRow}>
            <Text
              style={[t.typography.titleMedium, { color: t.colors.textMain, flex: 1 }]}
              numberOfLines={1}
            >
              {m.title}
            </Text>

            {editable && (
              <View style={styles.actions}>
                {!!onEdit && (
                  <Pressable
                    onPress={() => onEdit(m)}
                    hitSlop={10}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[t.typography.labelLarge, { color: t.colors.secondary }]}>
                      수정
                    </Text>
                  </Pressable>
                )}

                {!!onDelete && (
                  <Pressable
                    onPress={() => onDelete(m)}
                    hitSlop={10}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[t.typography.labelLarge, { color: t.colors.error }]}>
                      삭제
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          <View style={{ marginTop: s.space[1] }}>
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]} numberOfLines={1}>
              {m.location.name}
            </Text>

            <Text
              style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: s.space[1] }]}
              numberOfLines={1}
            >
              {m.dateText} · {m.memberCount}명
            </Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // 의도: Card 컴포넌트의 기본 padding을 유지하고, 세로 여백만 살짝 보강
  card: { paddingVertical: 14 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actions: { flexDirection: "row", alignItems: "center" },
});
