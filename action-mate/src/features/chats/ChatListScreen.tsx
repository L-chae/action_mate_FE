import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import AppLayout from "../../shared/ui/AppLayout";
import { Card } from "../../shared/ui/Card";
import { Badge } from "../../shared/ui/Badge";
import { useAppTheme } from "../../shared/hooks/useAppTheme";
import { listRooms } from "./chatService";
import type { Room } from "./types";

export default function ChatListScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    listRooms().then(setRooms);
  }, []);

  return (
    <AppLayout>
      <Text style={t.typography.headlineSmall}>모임(대화)</Text>
      <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]}>
        참여한 모임방에서 간단히 소통해요
      </Text>

      <View style={{ height: 12 }} />

      <View style={{ gap: 12 }}>
        {rooms.map((r) => (
          <Card key={r.id} onPress={() => router.push(`/chat/${r.id}`)} style={{ padding: 14 }}>
            <View style={styles.row}>
              <Text style={[t.typography.titleMedium, { flex: 1 }]} numberOfLines={1}>
                {r.title}
              </Text>
              <Badge label={r.status === "ACTIVE" ? "진행중" : "보관"} tone={r.status === "ACTIVE" ? "success" : "default"} />
            </View>

            <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 6 }]} numberOfLines={1}>
              {r.lastMessage}
            </Text>

            <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginTop: 8 }]}>
              {r.updatedAtText}
            </Text>
          </Card>
        ))}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
