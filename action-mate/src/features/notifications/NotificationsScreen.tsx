import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingPost, Participant } from "@/features/meetings/model/types";

const CURRENT_USER_ID = "me";

type HostNotiItem = {
  meetingId: string;
  title: string;
  pendingCount: number;
};

export default function NotificationsScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<HostNotiItem[]>([]);

  const totalPending = useMemo(
    () => items.reduce((sum, it) => sum + it.pendingCount, 0),
    [items]
  );

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    // ✅ 화면 구조는 유지하되, 로딩 플래그만 제어
    if (!opts?.silent) setLoading(true);

    try {
      const all = await meetingApi.listMeetings(undefined);
      const hostMeetings = all.filter((m: MeetingPost) => m.host?.id === CURRENT_USER_ID);

      const results = await Promise.all(
        hostMeetings.map(async (m) => {
          try {
            const parts: Participant[] = await meetingApi.getParticipants(m.id);
            const pendingCount = parts.filter((p) => p.status === "PENDING").length;
            return pendingCount > 0
              ? ({
                meetingId: String(m.id),
                title: m.title,
                pendingCount,
              } as HostNotiItem)
              : null;
          } catch {
            return null;
          }
        })
      );

      const filtered = results.filter(Boolean) as HostNotiItem[];
      filtered.sort((a, b) => b.pendingCount - a.pendingCount);

      setItems(filtered);
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "알림 정보를 불러오지 못했습니다.");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const empty = !loading && items.length === 0;

  return (
    // ✅ 항상 동일 레이아웃 유지 (padded=false 고정)
    <AppLayout padded={false}>
      <TopBar
        title="알림"
        showBack
        onPressBack={() => router.back()}
        showBorder
        showNoti={false}
        renderRight={() => (
          <Pressable onPress={onRefresh} hitSlop={10} style={{ padding: 4 }}>
            <Ionicons name="refresh" size={22} color={t.colors.textMain} />
          </Pressable>
        )}
      />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: Math.max(16, insets.bottom),
          flexGrow: 1, // ✅ 로딩/빈화면에서도 높이 유지 → 가운데 정렬이 자연스러움
        }}
      >
        {loading ? (
          // ✅ 로딩도 동일 padding/배경/스크롤 구조 안에서 표시
          <View style={styles.centerGrow}>
            <ActivityIndicator size="large" color={t.colors.primary} />
          </View>
        ) : (
          <>
            {/* 요약 */}
            <View
              style={[
                styles.summary,
                {
                  backgroundColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.18 : 0.08),
                  borderColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.30 : 0.22),
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color={t.colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[t.typography.titleMedium, { color: t.colors.textMain, flex: 1 }]}
                  numberOfLines={1}
                >
                  참여 신청 알림
                </Text>
              </View>

              <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 8 }]}>
                대기 중 신청 {totalPending}건
              </Text>
            </View>

            {/* 리스트 */}
            {empty ? (
              <View style={[styles.emptyBox, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                <Ionicons name="checkmark-circle-outline" size={28} color={t.colors.textSub} />
                <Text style={[t.typography.titleSmall, { marginTop: 10, color: t.colors.textMain }]}>
                  지금 확인할 알림이 없어요
                </Text>
                <Text
                  style={[
                    t.typography.bodySmall,
                    { marginTop: 6, color: t.colors.textSub, textAlign: "center" },
                  ]}
                >
                  새 참여 신청이 들어오면 여기에 표시됩니다.
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: 12, gap: 10 }}>
                {items.map((it) => (
                  <Pressable
                    key={it.meetingId}
                    onPress={() =>
                      router.push({
                        pathname: "/notifications/[id]",
                        params: { id: it.meetingId },
                      })
                    }

                    style={({ pressed }) => [
                      styles.card,
                      {
                        backgroundColor: t.colors.surface,
                        borderColor: t.colors.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]} numberOfLines={1}>
                        {it.title}
                      </Text>
                      <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]}>
                        대기 {it.pendingCount}명
                      </Text>
                    </View>

                    <View style={[styles.badge, { backgroundColor: t.colors.error }]}>
                      <Text style={{ color: "white", fontSize: 12, fontWeight: "900" }}>
                        {it.pendingCount > 99 ? "99+" : it.pendingCount}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color={t.colors.textSub} style={{ marginLeft: 8 }} />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  // ✅ flexGrow에서 가운데 정렬용
  centerGrow: { flex: 1, justifyContent: "center", alignItems: "center" },

  summary: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },

  emptyBox: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
  },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  badge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
});