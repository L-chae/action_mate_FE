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
            { backgroundColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.16 : 0.10) },
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


  const onLogout = useCallback(() => {
    Alert.alert("로그아웃", "정말 로그아웃할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            // ✅ 로그인 라우트가 있으면 교체
            router.replace("/" as any);
          } catch (e) {
            console.error(e);
            Alert.alert("오류", "로그아웃에 실패했습니다.");
          }
        },
      },
    ]);
  }, [logout, router]);

  return (
    <AppLayout padded={false}>
      <TopBar title="설정" showBorder showBack onPressBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: Math.max(24, insets.bottom + 16),
        }}
      >
        {/* 계정 */}
        <Text style={[t.typography.labelLarge, { color: t.colors.textSub, marginBottom: 8 }]}>계정</Text>
        <View style={styles.group}>
          <SettingRow
            icon="person-outline"
            title="프로필 관리"
            description="닉네임, 프로필 이미지 등을 수정합니다."
            onPress={() => Alert.alert("안내", "프로필 관리 화면 연결 필요")}
          />
          <SettingRow
            icon="key-outline"
            title="계정/보안"
            description="계정 및 보안 설정"
            onPress={() => Alert.alert("안내", "계정/보안 화면 연결 필요")}
          />
        </View>

        {/* 알림 */}
        <Text style={[t.typography.labelLarge, { color: t.colors.textSub, marginBottom: 8, marginTop: 18 }]}>알림</Text>
        <View style={styles.group}>
          <SettingRow
            icon="notifications-outline"
            title="알림 설정"
            description="푸시 알림, 모임/채팅 알림 설정"
            onPress={() => Alert.alert("안내", "알림 설정 화면 연결 필요")}
          />
        </View>

        {/* 앱 */}
        <Text style={[t.typography.labelLarge, { color: t.colors.textSub, marginBottom: 8, marginTop: 18 }]}>앱</Text>
        <View style={styles.group}>
          <SettingRow
            icon="help-circle-outline"
            title="고객센터"
            description="문의하기, FAQ"
            onPress={() => Alert.alert("안내", "고객센터 화면 연결 필요")}
          />
          <SettingRow
            icon="document-text-outline"
            title="이용약관"
            onPress={() => Alert.alert("안내", "약관 화면 연결 필요")}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            title="개인정보 처리방침"
            onPress={() => Alert.alert("안내", "개인정보 처리방침 화면 연결 필요")}
          />
          <SettingRow
            icon="information-circle-outline"
            title="앱 정보"
            rightText="v1.0.0"
            onPress={() => Alert.alert("안내", "앱 정보 화면 연결 필요")}
          />
        </View>

        {/* 기타 */}
        <Text style={[t.typography.labelLarge, { color: t.colors.textSub, marginBottom: 8, marginTop: 18 }]}>기타</Text>
        <View style={styles.group}>
          <SettingRow
            icon="log-out-outline"
            title="로그아웃"
            description="현재 계정에서 로그아웃합니다."
            danger
            onPress={onLogout}
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