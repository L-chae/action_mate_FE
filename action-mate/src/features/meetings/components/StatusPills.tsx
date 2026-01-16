// src/features/meetings/components/StatusPills.tsx
import React, { useMemo } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";
import type { PillTone, StatusPillToken } from "./meetingStatus";

type Props = {
  tokens: StatusPillToken[];
  disabled?: boolean;
  style?: ViewStyle;
  gap?: number;
};

type ToneStyle = { bg: string; fg: string; border?: string };

export default function StatusPills({ tokens, disabled = false, style, gap = 8 }: Props) {
  const t = useAppTheme();

  const alphaBase = t.mode === "dark" ? 0.24 : 0.14;

  const toneStyle = useMemo(() => {
    const soft = (hex: string, a = alphaBase) => withAlpha(hex, a);

    const map = (tone: PillTone): ToneStyle => {
      switch (tone) {
        case "primary":
          return { bg: soft(t.colors.primary, alphaBase), fg: t.colors.primary };
        case "info":
          // info 토큰이 테마에 없다면(대부분 있음) primary로 fallback
          return {
            bg: soft(t.colors.info ?? t.colors.primary, alphaBase + 0.02),
            fg: t.colors.info ?? t.colors.primary,
          };
        case "success":
          return { bg: soft(t.colors.success, alphaBase), fg: t.colors.success };
        case "warning":
          return { bg: soft(t.colors.warning, alphaBase + 0.02), fg: t.colors.warning };
        case "error":
          return { bg: soft(t.colors.error, alphaBase), fg: t.colors.error };
        case "point":
          return { bg: soft(t.colors.point, alphaBase + 0.02), fg: t.colors.point };
        case "neutral":
        default:
          return { bg: t.colors.overlay[8], fg: t.colors.textSub };
      }
    };

    return map;
  }, [t, alphaBase]);

  // disabled일 때 pill 전체 톤을 살짝 죽임 (배경/글자 대비는 유지)
  const disabledWrapStyle = useMemo(() => {
    if (!disabled) return null;
    return {
      opacity: 0.85,
    } as const;
  }, [disabled]);

  if (!tokens?.length) return null;

  return (
    <View style={[styles.row, { gap }, disabledWrapStyle, style]}>
      {tokens.map((tk) => {
        const ts = toneStyle(tk.tone);
        const fg = disabled ? withAlpha(ts.fg, 0.78) : ts.fg;
        const bg = disabled ? withAlpha(ts.bg, t.mode === "dark" ? 0.85 : 0.92) : ts.bg;

        return (
          <View key={tk.key} style={[styles.pill, { backgroundColor: bg }]}>
            {tk.iconName ? (
              <Ionicons
                name={tk.iconName}
                size={14}
                color={fg}
                style={{ marginRight: 5, marginTop: 0.5 }}
              />
            ) : null}

            <Text style={[t.typography.labelSmall, styles.label, { color: fg }]} numberOfLines={1}>
              {tk.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  label: {
    fontWeight: "800",
  },
});
