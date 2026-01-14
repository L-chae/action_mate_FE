import React from "react";
import { Alert, StyleSheet, Text, View, Pressable } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { useAuthStore } from "@/features/auth/authStore";
import { router } from "expo-router";

type Props = {
  onOpenProfileEdit: () => void; // ✅ 추가
};

type RowProps = {
  title: string;
  subtitle?: string;
  danger?: boolean;
  onPress: () => void;
};

function Row({ title, subtitle, danger, onPress }: RowProps) {
  const t = useAppTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      <Card padded style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[t.typography.titleSmall, { color: danger ? t.colors.error : t.colors.textMain }]}>
            {title}
          </Text>
          {!!subtitle && <Text style={[t.typography.bodySmall, { marginTop: 4 }]}>{subtitle}</Text>}
        </View>
        <Text style={[t.typography.labelLarge, { color: t.colors.textSub }]}>›</Text>
      </Card>
    </Pressable>
  );
}

export default function SettingsTab({ onOpenProfileEdit }: Props) {
  const logout = useAuthStore((s) => s.logout);

  return (
    <View style={{ gap: 10 }}>
      {/* ✅ 여기! 회원정보 수정 누르면 프로필 수정 모달 */}
      <Row
        title="회원정보 수정"
        subtitle="닉네임, 프로필 사진 등"
        onPress={onOpenProfileEdit}
      />

      <Row
        title="알림 설정"
        subtitle="푸시/채팅/모임 알림"
        onPress={() => Alert.alert("준비중", "알림 설정 화면은 다음 단계에서 붙이면 돼요.")}
      />
      <Row
        title="계정정보관리"
        subtitle="연동/보안"
        onPress={() => Alert.alert("준비중", "계정정보 관리 화면은 다음 단계에서 붙이면 돼요.")}
      />
      <Row
        title="신고 관리"
        subtitle="내 신고 내역/처리 상태"
        onPress={() => Alert.alert("준비중", "신고 관리 화면은 다음 단계에서 붙이면 돼요.")}
      />
      <Row
        title="탈퇴"
        subtitle="계정 및 데이터 삭제"
        danger
        onPress={() =>
          Alert.alert("탈퇴", "정말 탈퇴할까요?", [
            { text: "취소", style: "cancel" },
            { text: "탈퇴", style: "destructive", onPress: () => Alert.alert("안내", "탈퇴 API 연결이 필요해요.") },
          ])
        }
      />

      <View style={{ height: 6 }} />

      <Button
        title="로그아웃"
        variant="danger"
        onPress={() =>
          Alert.alert("로그아웃", "로그아웃 할까요?", [
            { text: "취소", style: "cancel" },
            {
              text: "로그아웃",
              style: "destructive",
              onPress: () => {
                logout();
                router.replace("/(auth)/login");
              },
            },
          ])
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 14 },
});
