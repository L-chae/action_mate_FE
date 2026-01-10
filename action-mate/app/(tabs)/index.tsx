import React from "react";
import { Text, Pressable, View } from "react-native";
import { Screen } from "~/shared/layout/Screen";
import { useMeetupsStore } from "~/features/meetups/store";
import { useAppTheme } from "~/shared/hooks/useAppTheme";

export default function HomeScreen() {
  const t = useAppTheme();
  const meetups = useMeetupsStore((s) => s.meetups);
  const joinMeetup = useMeetupsStore((s) => s.joinMeetup);

  return (
    <Screen>
      <Text style={[t.typography.titleLarge, { marginBottom: 12 }]}>홈 (mock)</Text>

      {meetups.map((m) => {
        const remain = m.capacity - m.joinedCount;
        return (
          <View key={m.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: t.colors.border }}>
            <Text style={t.typography.titleSmall}>{m.title}</Text>
            <Text style={t.typography.bodySmall}>
              {m.category} · 남은자리 {remain} · 상태 {m.joinStatus}
            </Text>

            <Pressable
              onPress={() => joinMeetup(m.id)}
              disabled={m.joinStatus === "joined" || remain <= 0}
              style={{ marginTop: 8 }}
            >
              <Text style={[t.typography.labelLarge, { color: t.colors.primary }]}>
                참여하기(테스트)
              </Text>
            </Pressable>
          </View>
        );
      })}
    </Screen>
  );
}
