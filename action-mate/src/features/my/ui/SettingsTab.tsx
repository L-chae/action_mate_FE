// src/features/my/components/SettingsTab.tsx
import React from "react";
import { Alert, StyleSheet, Text, View, Pressable } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { useAuthStore } from "@/features/auth/store/authStore";
import { router } from "expo-router";

type Props = {
  onOpenProfileEdit?: () => void; // ✅ 옵션으로 변경 (settings 페이지에서 <SettingsTab /> 가능)
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
          <Text
            style={[
              t.typography.titleSmall,
              { color: danger ? t.colors.error : t.colors.textMain },
            ]}
          >
            {title}
          </Text>
          {!!subtitle && (
            <Text style={[t.typography.bodySmall, { marginTop: 4, color: t.colors.textSub }]}>
              {subtitle}
            </Text>
          )}
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
      {/* ✅ 회원정보 수정(프로필 편집)은 '있을 때만' 노출 */}
      {onOpenProfileEdit ? (
        <Row
          title="회원정보 수정"
          subtitle="닉네임/성별/생년월일 등"
          onPress={onOpenProfileEdit}
        />
      ) : null}

      {/* ✅ 프로필 편집에서 뺀 것들은 여기로 */}
      <Row
        title="매너온도 관리"
        subtitle="평가 기준/내 온도 내역"
        onPress={() => Alert.alert("준비중", "매너온도 관리 화면은 다음 단계에서 연결하면 돼요.")}
      />

      <Row
        title="알림 설정"
        subtitle="푸시/채팅/모임 알림"
        onPress={() => Alert.alert("준비중", "알림 설정 화면은 다음 단계에서 붙이면 돼요.")}
      />

      <Row
        title="계정 관리"
        subtitle="연동/보안/계정정보"
        onPress={() => Alert.alert("준비중", "계정 관리 화면은 다음 단계에서 붙이면 돼요.")}
      />

      <Row
        title="신고 관리"
        subtitle="내 신고 내역/처리 상태"
        onPress={() => Alert.alert("준비중", "신고 관리 화면은 다음 단계에서 붙이면 돼요.")}
      />

      {/* 기본적으로 많이 넣는 항목들 */}
      <Row
        title="공지사항"
        subtitle="업데이트/안내"
        onPress={() => Alert.alert("준비중", "공지사항 화면은 다음 단계에서 붙이면 돼요.")}
      />
      <Row
        title="이용약관"
        subtitle="서비스 이용약관"
        onPress={() => Alert.alert("준비중", "이용약관 화면은 다음 단계에서 붙이면 돼요.")}
      />
      <Row
        title="개인정보 처리방침"
        subtitle="개인정보 보호 안내"
        onPress={() => Alert.alert("준비중", "개인정보 처리방침 화면은 다음 단계에서 붙이면 돼요.")}
      />

      <Row
        title="탈퇴"
        subtitle="계정 및 데이터 삭제"
        danger
        onPress={() =>
          Alert.alert("탈퇴", "정말 탈퇴할까요?", [
            { text: "취소", style: "cancel" },
            {
              text: "탈퇴",
              style: "destructive",
              onPress: () => Alert.alert("안내", "탈퇴 API 연결이 필요해요."),
            },
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