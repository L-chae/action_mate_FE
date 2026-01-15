// src/features/my/components/TemperatureGauge.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type Props = {
  temperature: number;
  min?: number;
  max?: number;

  title?: string;
  subtitle?: string;

  animateKey?: number;
  durationMs?: number;

  colorMode?: "theme" | "carrot";
};

export default function TemperatureGauge({
  temperature,
  min = 32,
  max = 42,
  title = "매너 점수",
  subtitle = "평가가 반영된 점수예요",
  animateKey = 0,
  durationMs = 900,
  colorMode = "theme",
}: Props) {
  const t = useAppTheme();
  const { colors, typography } = t;

  const goal = useMemo(() => clamp(temperature, min, max), [temperature, min, max]);
  const goalProgress = useMemo(() => (goal - min) / (max - min), [goal, min, max]);

  const gaugeColor = colorMode === "carrot" ? colors.success : colors.primary;

  const progress = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(min);

  useEffect(() => {
    progress.setValue(0);
    setDisplayValue(min);

    const id = progress.addListener(({ value }) => {
      const v = min + (max - min) * value;
      setDisplayValue(Number(v.toFixed(1)));
    });

    Animated.timing(progress, {
      toValue: goalProgress,
      duration: durationMs,
      useNativeDriver: false,
    }).start();

    return () => {
      progress.removeListener(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateKey, goalProgress, durationMs, min, max]);

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.wrap}>
      <Text style={typography.titleMedium}>{title}</Text>

      {/* ✅ 숫자 크기 줄임 */}
      <View style={{ alignItems: "center", marginTop: 8 }}>
        <Text style={[typography.titleLarge, styles.valueText, { color: gaugeColor }]}>
          {displayValue.toFixed(1)}℃
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textSub, marginTop: 4 }]}>
          {subtitle}
        </Text>
      </View>

      {/* 일자 게이지 */}
      <View style={[styles.barWrap, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.barFill, { backgroundColor: gaugeColor, width: fillWidth }]} />
      </View>

      {/* min/max */}
      <View style={styles.minMaxRow}>
        <Text style={[typography.bodySmall, styles.minMax, { color: colors.textSub }]}>{min}</Text>
        <Text style={[typography.bodySmall, styles.minMax, { color: colors.textSub }]}>{max}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },

  // 🔽 기존 48 → 30으로 축소(원하면 26~34 사이로 더 조절 가능)
  valueText: {
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.3,
  },

  barWrap: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },
  minMaxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  minMax: { fontSize: 12 },
});
