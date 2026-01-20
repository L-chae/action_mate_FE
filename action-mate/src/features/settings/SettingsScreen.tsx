// src/features/settings/SettingsScreen.tsx
import React, { useCallback } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";

import { useAuthStore } from "@/features/auth/model/authStore";

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  rightText?: string;
  danger?: boolean;
  onPress?: () => void;
};

function SettingRow({ icon, title, description, rightText, danger, onPress }: RowProps) {
  const t = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: t.colors.surface,
          borderColor: t.colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.rowLeft}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.16 : 0.1) },
          ]}
        >
          <Ionicons name={icon} size={18} color={danger ? t.colors.error : t.colors.icon.default} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[
              t.typography.bodyLarge,
              { color: danger ? t.colors.error : t.colors.textMain, fontWeight: "700" },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>

          {description ? (
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rowRight}>
        {rightText ? (
          <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginRight: 6 }]}>{rightText}</Text>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={t.colors.icon.muted} />
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const logout = useAuthStore((s) => s.logout);
  // 의도: 스토어에 탈퇴 액션이 아직 없더라도 UI 플로우는 유지 (데모/포트폴리오 목적)
  const withdraw = useAuthStore((s) => (s as any).withdrawAccount?.bind?.(s) ?? (s as any).withdrawAccount);

  const onLogout = useCallback(() => {
    Alert.alert("로그아웃", "정말 로그아웃할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/" as any);
          } catch (e) {
            console.error(e);
            Alert.alert("오류", "로그아웃에 실패했습니다.");
          }
        },
      },
    ]);
  }, [logout, router]);

  const onWithdraw = useCallback(() => {
    Alert.alert("회원 탈퇴", "탈퇴 시 계정 데이터가 삭제되며 복구할 수 없습니다.\n계속 진행할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "탈퇴",
        style: "destructive",
        onPress: async () => {
          try {
            // 의도: 파괴적 액션은 2단 확인 + 실패 처리로 신뢰성을 확보
            if (typeof withdraw === "function") {
              await withdraw();
            } else {
              // fallback: 탈퇴 구현 전에는 로그아웃으로라도 흐름이 끊기지 않게
              await logout();
            }
            router.replace("/" as any);
          } catch (e) {
            console.error(e);
            Alert.alert("오류", "회원 탈퇴에 실패했습니다.");
          }
        },
      },
    ]);
  }, [withdraw, logout, router]);

  return (
    <AppLayout padded={false}>
      <TopBar title="설정" showBorder showBack onPressBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: Math.max(24, insets.bottom + 16),
        }}
      >
        <Text style={[t.typography.labelLarge, { color: t.colors.textSub, marginBottom: 8 }]}>계정</Text>
        <View style={styles.group}>
          <SettingRow
            icon="person-outline"
            title="프로필"
            description="닉네임, 프로필 이미지 관리"
            onPress={() => router.push("/settings/profile" as any)}
          />
        </View>

        <Text style={[t.typography.labelLarge, { color: t.colors.textSub, marginBottom: 8, marginTop: 18 }]}>
          계정 작업
        </Text>
        <View style={styles.group}>
          <SettingRow
            icon="log-out-outline"
            title="로그아웃"
            description="현재 계정에서 로그아웃합니다."
            danger
            onPress={onLogout}
          />
          <SettingRow
            icon="trash-outline"
            title="회원 탈퇴"
            description="계정과 데이터가 삭제되며 복구할 수 없습니다."
            danger
            onPress={onWithdraw}
          />
        </View>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  row: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});