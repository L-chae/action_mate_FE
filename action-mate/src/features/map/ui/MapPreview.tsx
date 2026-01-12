import React from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "~/shared/hooks/useAppTheme";

type Props = {
  title?: string;
  subtitle?: string;
};

export function MapPreview({ title = "지도(placeholder)", subtitle }: Props) {
  const t = useAppTheme();

  return (
    <View
      style={{
        height: 220,
        borderRadius: t.spacing.radiusLg,
        backgroundColor: t.colors.surface,
        borderWidth: t.spacing.borderWidth,
        borderColor: t.colors.border,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
        }}
      >
        <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>{title}</Text>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 6, textAlign: "center" }]}>
          {subtitle ?? "1차본: 실제 지도는 나중에 붙이고, 주변 모임 리스트/상세 이동 흐름부터 완성합니다."}
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderTopWidth: t.spacing.borderWidth,
          borderTopColor: t.colors.border,
          backgroundColor: t.colors.background,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Text style={[t.typography.labelMedium, { color: t.colors.textSub }]}>내 위치 기반</Text>
        <Text style={[t.typography.labelMedium, { color: t.colors.textSub }]}>마커/줌: 다음 단계</Text>
      </View>
    </View>
  );
}
