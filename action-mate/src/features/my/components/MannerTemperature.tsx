import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../../shared/hooks/useAppTheme";

type Props = {
  value: number;   // 0~100
  label: string;
};

export default function MannerTemperature({ value, label }: Props) {
  const t = useAppTheme();

  const v = useMemo(() => {
    const clamped = Math.max(0, Math.min(100, value));
    return clamped;
  }, [value]);

  // 당근온도처럼 "낮음~높음" 영역을 살짝 구분(초기 MVP용)
  const accent = useMemo(() => {
    if (v >= 70) return t.colors.success;
    if (v >= 40) return t.colors.primary;
    return t.colors.warning;
  }, [v, t.colors.success, t.colors.primary, t.colors.warning]);

  return (
    <View>
      <View style={styles.row}>
        <Text style={[t.typography.titleLarge, { flex: 1 }]} numberOfLines={1}>
          {label}
        </Text>

        <Text style={[t.typography.titleLarge, { color: accent }]}>
          {v.toFixed(1)}℃
        </Text>
      </View>

      <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]}>
        활동/신고/칭찬에 따라 온도가 변해요
      </Text>

      <View style={{ height: 12 }} />

      {/* bar */}
      <View style={[styles.track, { backgroundColor: t.colors.border }]}>
        <View style={[styles.fill, { width: `${v}%`, backgroundColor: accent }]} />
        {/* 현재 위치 점 */}
        <View
          style={[
            styles.dot,
            {
              left: `${v}%`,
              backgroundColor: accent,
              borderColor: t.colors.surface,
            },
          ]}
        />
      </View>

      <View style={styles.scaleRow}>
        <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>0</Text>
        <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>50</Text>
        <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>100</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  track: {
    height: 10,
    borderRadius: 999,
    overflow: "visible",
    position: "relative",
    justifyContent: "center",
  },
  fill: {
    height: 10,
    borderRadius: 999,
  },
  dot: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8, // 가운데 정렬
    borderWidth: 2,
    top: -3,
  },
  scaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
});
