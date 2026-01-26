// src/features/dm/DMListScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import TopBar from "@/shared/ui/TopBar";
import AppLayout from "@/shared/ui/AppLayout";
import EmptyView from "@/shared/ui/EmptyView";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import { listDMThreads } from "./api/dmApi";
import type { DMThread } from "./model/types";

// ✅ 알림 점 표시용 (호스트 PENDING 체크)
import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingPost, Participant } from "@/features/meetings/model/types";
import { getCurrentUserId } from "@/shared/api/authToken";

// ------------------------------
// Helpers
// ------------------------------
function safeToMs(iso?: string) {
  const t = iso ? Date.parse(iso) : 0;
  return Number.isFinite(t) ? t : 0;
}

function formatTime(isoString?: string) {
  const ms = safeToMs(isoString);
  if (!ms) return "";

  const date = new Date(ms);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60 * 1000) return "방금 전";

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

async function hasPendingParticipantsForHostMeetings(hostId: string): Promise<boolean> {
  const all = await meetingApi.listMeetings(undefined);
  const hostMeetings = all.filter((m: MeetingPost) => String(m.host?.id ?? "") === String(hostId));

  // 왜 순차/조기 종료?:
  // - 참가자 조회는 네트워크 비용이 크고, "하나라도 PENDING이면 점 표시"라서
  //   병렬로 전부 때리지 않고, 발견 즉시 종료하는 게 앱 체감이 좋아집니다.
  for (const m of hostMeetings) {
    try {
      const parts: Participant[] = await meetingApi.getParticipants(String(m.id));
      if (parts.some((p) => p.status === "PENDING")) return true;
    } catch {
      // 개별 모임 참가자 조회 실패는 무시하고 다음으로(전체 UX 안정)
    }
  }

  return false;
}

function Avatar({ uri, size, bg, iconColor }: { uri: string | null; size: number; bg: string; iconColor: string }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: "center", alignItems: "center" }}>
      <Ionicons name="person" size={Math.floor(size * 0.5)} color={iconColor} />
    </View>
  );
}

// ------------------------------
// Screen
// ------------------------------
export default function DMListScreen() {
  const t = useAppTheme();
  const router = useRouter();

  const [threads, setThreads] = useState<DMThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [hasNoti, setHasNoti] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("me");

  const loadCurrentUserId = useCallback(async () => {
    try {
      const id = await getCurrentUserId();
      setCurrentUserId(id ?? "me");
    } catch {
      setCurrentUserId("me");
    }
  }, []);

  const fetchThreads = useCallback(async () => {
    try {
      const data = await listDMThreads();
      setThreads(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const checkHasNoti = useCallback(
    async (hostId: string) => {
      try {
        const v = await hasPendingParticipantsForHostMeetings(hostId);
        setHasNoti(v);
      } catch (e) {
        console.error(e);
        setHasNoti(false);
      }
    },
    [],
  );

  const refreshAll = useCallback(
    async (opts?: { showSpinner?: boolean }) => {
      const showSpinner = opts?.showSpinner ?? false;

      if (showSpinner) setLoading(true);
      try {
        // currentUserId가 확정되기 전이면 먼저 로드
        let hostId = currentUserId;
        if (!hostId || hostId === "me") {
          const id = await getCurrentUserId();
          hostId = id ?? "me";
          setCurrentUserId(hostId);
        }

        await Promise.all([fetchThreads(), checkHasNoti(hostId)]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [checkHasNoti, currentUserId, fetchThreads],
  );

  useEffect(() => {
    loadCurrentUserId();
  }, [loadCurrentUserId]);

  useEffect(() => {
    refreshAll({ showSpinner: true });
  }, [refreshAll]);

  // ✅ DM방 들어갔다가 돌아오면 목록/안읽음/알림점 갱신
  useFocusEffect(
    useCallback(() => {
      refreshAll({ showSpinner: false });
      // cleanup 없음
      return () => {};
    }, [refreshAll]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshAll({ showSpinner: false });
  }, [refreshAll]);

  const renderItem = useCallback(
    ({ item }: { item: DMThread }) => {
      const meetingTitle = item.relatedMeetingTitle || item.relatedMeeting?.title || "";
      const lastText = item.lastMessage?.text?.trim() ? item.lastMessage.text : "대화를 시작해보세요.";

      return (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/dm/[threadId]",
              params: {
                threadId: item.id,
                nickname: item.otherUser.nickname,
                meetingId: item.relatedMeetingId ?? "",
                meetingTitle,
              },
            } as any)
          }
          style={({ pressed }) => [
            styles.itemContainer,
            {
              backgroundColor: pressed ? t.colors.neutral[100] : t.colors.surface,
              borderBottomColor: t.colors.neutral[100],
            },
          ]}
        >
          <View style={styles.avatarWrap}>
            <Avatar
              uri={item.otherUser.avatarUrl ?? null}
              size={48}
              bg={t.colors.neutral[200]}
              iconColor={t.colors.neutral[400]}
            />
          </View>

          <View style={styles.content}>
            <View style={styles.headerRow}>
              <Text style={[t.typography.titleMedium, { color: t.colors.textMain, flex: 1 }]} numberOfLines={1}>
                {item.otherUser.nickname}
              </Text>
              <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                {formatTime(item.updatedAt)}
              </Text>
            </View>

            {meetingTitle ? (
              <View style={[styles.meetingBadge, { backgroundColor: t.colors.neutral[50] }]}>
                <Ionicons name="pricetag-outline" size={10} color={t.colors.primary} />
                <Text style={[t.typography.labelSmall, { color: t.colors.textSub, fontSize: 10 }]} numberOfLines={1}>
                  {meetingTitle}
                </Text>
              </View>
            ) : null}

            <View style={styles.msgRow}>
              <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, flex: 1 }]} numberOfLines={1}>
                {lastText}
              </Text>

              {item.unreadCount > 0 ? (
                <View style={[styles.unreadBadge, { backgroundColor: t.colors.primary }]}>
                  <Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>
                    {item.unreadCount > 99 ? "99+" : String(item.unreadCount)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>
      );
    },
    [router, t],
  );

  const listEmpty = useMemo(
    () => (
      <View style={{ marginTop: 100 }}>
        <EmptyView title="대화 내역이 없어요" description="모임에 참여하여 호스트와 대화를 나눠보세요!" />
      </View>
    ),
    [],
  );

  return (
    <AppLayout padded={false}>
      <TopBar
        title="채팅"
        showBorder
        showNoti
        showNotiDot={hasNoti}
        showMenu={false}
        onPressNoti={() => router.push("/notifications")}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={t.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={threads}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100, flexGrow: threads.length ? 0 : 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />}
          ListEmptyComponent={listEmpty}
          removeClippedSubviews
          initialNumToRender={12}
          windowSize={8}
        />
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  itemContainer: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  avatarWrap: { width: 48, height: 48, marginRight: 16 },
  content: { flex: 1, justifyContent: "center", minWidth: 0 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 10 },
  msgRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meetingBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
    maxWidth: "100%",
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    marginLeft: 8,
  },
});