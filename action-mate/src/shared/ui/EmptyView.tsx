import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type Props = {
  title?: string;
  description?: string;
};

/**
 * 공통 Empty State
 * - 데이터 없을 때/초기 화면 placeholder용
 */
export default function EmptyView({
  title = "비어 있어요",
  description = "아직 표시할 내용이 없어요.",
}: Props) {
  const t = useAppTheme();

  return (
    <View style={styles.wrap}>
      <Text style={t.typography.titleMedium}>{title}</Text>
      <Text style={[t.typography.bodySmall, styles.desc]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  desc: { opacity: 0.8, textAlign: "center" },
});
