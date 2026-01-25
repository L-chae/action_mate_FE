import React from "react";
import { StyleSheet, Text, View, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../hooks/useAppTheme";

type Props = {
  title?: string;
  description?: string;
  /** 외부에서 위치나 여백을 조정하기 위한 스타일 */
  style?: StyleProp<ViewStyle>;
  /** 상단에 표시할 아이콘 이름 (기본값: help-circle-outline) */
  iconName?: keyof typeof Ionicons.glyphMap;
};

/**
 * 공통 Empty State
 * - 데이터가 없거나 로딩 실패 시 보여주는 플레이스홀더 뷰
 */
export default function EmptyView({
  title = "비어 있어요",
  description = "아직 표시할 내용이 없어요.",
  style,
  iconName = "albums-outline", // 기본 아이콘 변경 (리스트 느낌)
}: Props) {
  const t = useAppTheme();

  return (
    <View style={[styles.wrap, style]}>
      {/* 아이콘 영역 */}
      <Ionicons 
        name={iconName} 
        size={48} 
        color={t.colors.border} // 은은한 회색
        style={{ marginBottom: 16 }}
      />
      
      {/* 텍스트 영역 */}
      <Text 
        style={[
          t.typography.titleMedium, 
          { color: t.colors.textSub, marginBottom: 4 }
        ]}
      >
        {title}
      </Text>
      
      <Text 
        style={[
          t.typography.bodySmall, 
          styles.desc, 
          { color: t.colors.textSub } // 투명도 대신 색상 사용 권장
        ]}
      >
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40, // 기본 상하 여백 확보
    paddingHorizontal: 20,
  },
  desc: {
    textAlign: "center",
    opacity: 0.8,
  },
});