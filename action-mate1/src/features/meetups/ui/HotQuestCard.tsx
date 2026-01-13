import React from "react";
import { Pressable, Text, View, Platform, StyleSheet, ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "~/shared/hooks/useAppTheme";

type Props = {
  title: string;
  location: string;
  minutesLeft: number; // ex) 35
  progress?: number;   // 0~1 (선택)
  onPress?: () => void;
};

export function HotQuestCard({ title, location, minutesLeft, progress = 0.8, onPress }: Props) {
  const t = useAppTheme();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }, { marginRight: 12 }]}>
      <View style={[styles.card, shadowStyle(), { backgroundColor: t.colors.surface }]}>
        {/* Top badge */}
        <View style={[styles.topBadge, { backgroundColor: t.colors.error ?? "#E53935" }]}>
          <Text style={[styles.topBadgeText, { color: "white" }]}>⚡ {minutesLeft}분 뒤</Text>
        </View>

        <View style={{ padding: 12 }}>
          <Text style={[t.typography.titleSmall, { color: t.colors.textMain }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]} numberOfLines={1}>
            {location}
          </Text>

          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="schedule" size={14} color={t.colors.textSub} />
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginLeft: 4 }]}>
              마감 임박
            </Text>
          </View>
        </View>

        {/* progress */}
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          <View style={[styles.progressTrack, { backgroundColor: (t.colors.error ?? "#E53935") + "20" }]}>
            <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(1, progress)) * 100}%`, backgroundColor: t.colors.error ?? "#E53935" }]} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function shadowStyle(): ViewStyle {
  // RN Web: shadow* 경고 → boxShadow 사용
  if (Platform.OS === "web") {
    return { boxShadow: "0px 4px 12px rgba(0,0,0,0.06)" } as any;
  }
  return {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  topBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 10,
  },
  topBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 999,
  },
});
