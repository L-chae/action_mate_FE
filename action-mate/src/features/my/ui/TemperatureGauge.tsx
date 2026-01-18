// src/features/my/components/TemperatureGauge.tsx
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type Props = {
  temperature: number;
  title?: string;    // 안 주면 숨김
  subtitle?: string; // 안 주면 숨김
  animateKey?: number;
  durationMs?: number;
  min?: number;
  max?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type GradientColors = readonly [string, string];

function gradientByTemp(temp: number): GradientColors {
  if (temp <= 35.5) return ["#6EA8FF", "#1F6FEB"] as const;
  if (temp <= 36.5) return ["#FFE08A", "#FFC107"] as const;
  if (temp <= 38.0) return ["#FFB36A", "#FF7A00"] as const;
  return ["#FF7B7B", "#E53935"] as const;
}

export default function TemperatureGauge({
  temperature,
  title,
  subtitle,
  animateKey = 0,
  durationMs = 900,
  min = 32,
  max = 42,
}: Props) {
  const t = useAppTheme();

  const temp = clamp(temperature ?? 36.5, min, max);
  const ratio = (temp - min) / (max - min);

  const barAnim = useRef(new Animated.Value(0)).current;
  const colors = useMemo(() => gradientByTemp(temp), [temp]);

  useEffect(() => {
    barAnim.setValue(0);
    Animated.timing(barAnim, {
      toValue: ratio,
      duration: durationMs,
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateKey, ratio, durationMs]);

  const widthPct = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const showTitle = !!title && title.trim().length > 0;

  return (
    <View>
      {showTitle && (
        <View style={styles.header}>
          <Text style={t.typography.titleMedium}>{title}</Text>
        </View>
      )}

      {/* B: 온도 숫자 작게 + 자동 축소 */}
      <Text
        style={[styles.tempText, { color: colors[1] }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {temp.toFixed(1)}℃
      </Text>

      {!!subtitle && (
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]}>
          {subtitle}
        </Text>
      )}

      <View style={[styles.barTrack, { backgroundColor: t.colors.border }]}>
        <Animated.View style={[styles.barFillWrap, { width: widthPct }]}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.barFill}
          />
        </Animated.View>
      </View>

      <View style={styles.rangeRow}>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>{min}</Text>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>{max}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tempText: { marginTop: 10, fontSize: 30, fontWeight: "900", textAlign: "center" },
  barTrack: { marginTop: 14, height: 14, borderRadius: 999, overflow: "hidden" },
  barFillWrap: { height: "100%" },
  barFill: { height: "100%", borderRadius: 999 },
  rangeRow: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
});