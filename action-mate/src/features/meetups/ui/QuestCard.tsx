import React from "react";
import { Pressable, StyleSheet, Text, View, Platform, ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "~/shared/hooks/useAppTheme";

export type QuestCardData = {
  title: string;
  tags: string[];         // ["#친목", "#초보만"]
  timeLabel: string;      // "오늘 19:00"
  locationLabel: string;  // "강남역 3번 출구"
  iconName: keyof typeof MaterialIcons.glyphMap; // "terrain" | "directions-run" etc
  colorHex: string;       // ex) "#FF6B00"
  current: number;        // 3
  max: number;            // 4
};

type Props = {
  data: QuestCardData;
  onPress?: () => void;
  onJoin?: () => void;
};

export function QuestCard({ data, onPress, onJoin }: Props) {
  const t = useAppTheme();

  const remain = data.max - data.current;
  const isFull = remain <= 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}>
      <View style={[styles.card, shadowStyle(), { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
        <View style={{ flexDirection: "row" }}>
          {/* left icon block */}
          <View
            style={[
              styles.leftIconBox,
              { backgroundColor: withOpacity(data.colorHex, 0.12) },
            ]}
          >
            <MaterialIcons name={data.iconName} size={32} color={data.colorHex} />
          </View>

          {/* center content */}
          <View style={{ flex: 1, paddingLeft: 14 }}>
            {/* tags */}
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {data.tags.map((tag) => (
                <Text key={tag} style={[t.typography.labelSmall, { color: t.colors.textSub, marginRight: 6 }]}>
                  {tag}
                </Text>
              ))}
            </View>

            <Text style={[t.typography.titleSmall, { color: t.colors.textMain, marginTop: 4 }]} numberOfLines={1}>
              {data.title}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
              <MaterialIcons name="access-time" size={14} color={t.colors.primary} />
              <Text style={[t.typography.bodySmall, { color: t.colors.textMain, marginLeft: 4 }]}>
                {data.timeLabel}
              </Text>

              <View style={{ width: 10 }} />

              <MaterialIcons name="location-on" size={14} color={t.colors.textSub} />
              <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginLeft: 4 }]} numberOfLines={1}>
                {data.locationLabel}
              </Text>
            </View>
          </View>

          {/* right side */}
          <View style={{ alignItems: "center", justifyContent: "center", paddingLeft: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: t.colors.textMain }}>
              {data.current}/{data.max}
            </Text>
            <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginTop: 2 }]}>명</Text>

            <Pressable
              onPress={onJoin}
              disabled={isFull}
              style={({ pressed }) => [
                styles.joinBtn,
                {
                  backgroundColor: isFull ? t.colors.border : t.colors.primary,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <Text style={{ color: "white", fontSize: 12, fontWeight: "800" }}>
                {isFull ? "마감" : "참여"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function withOpacity(hex: string, opacity: number) {
  // "#RRGGBB" -> "rgba(r,g,b,opacity)"
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function shadowStyle(): ViewStyle {
  if (Platform.OS === "web") {
    return { boxShadow: "0px 4px 14px rgba(0,0,0,0.05)" } as any;
  }
  return {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  leftIconBox: {
    width: 70,
    height: 70,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  joinBtn: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
});
