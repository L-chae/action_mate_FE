import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppLayout from "../../shared/ui/AppLayout";
import { Card } from "../../shared/ui/Card";
import { useAppTheme } from "../../shared/hooks/useAppTheme";

import ProfileCard from "./components/ProfileCard";
import { getMyProfile } from "./myService";
import type { MyProfile } from "./types";

import { router } from "expo-router";
import { useAuthStore } from "@/features/auth/authStore";

export default function MyScreen() {
  const t = useAppTheme();
  const [profile, setProfile] = useState<MyProfile | null>(null);
const logout = useAuthStore((s) => s.logout);
<Pressable
  onPress={async () => {
    await logout();
    router.replace("/(auth)/login");
  }}
>
  <Text>로그아웃</Text>
</Pressable>

  useEffect(() => {
    getMyProfile().then(setProfile);
  }, []);

  return (
    <AppLayout>
      <Text style={t.typography.headlineSmall}>마이</Text>
      <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]}>
        내 기록과 매너온도를 확인해요
      </Text>

      <View style={{ height: 12 }} />

      {profile ? <ProfileCard profile={profile} /> : null}

      <View style={{ height: 18 }} />

      {/* 메뉴 */}
      <Card style={{ padding: 0 }}>
        <MenuItem title="내가 만든 모임" onPress={() => {}} />
        <Divider />
        <MenuItem title="참여한 모임" onPress={() => {}} />
        <Divider />
        <MenuItem title="설정" onPress={() => {}} />
      </Card>
    </AppLayout>
  );
}

function MenuItem({ title, onPress }: { title: string; onPress: () => void }) {
  const t = useAppTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menu, { opacity: pressed ? 0.85 : 1 }]}>
      <Text style={t.typography.bodyLarge}>{title}</Text>
      <Text style={[t.typography.bodyLarge, { color: t.colors.textSub }]}>›</Text>
    </Pressable>
  );
}

function Divider() {
  const t = useAppTheme();
  return <View style={{ height: 1, backgroundColor: t.colors.border }} />;
}

const styles = StyleSheet.create({
  menu: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
});
