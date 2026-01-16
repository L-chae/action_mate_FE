import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import TopBar from "@/shared/ui/TopBar";
import AppLayout from "@/shared/ui/AppLayout";
import EmptyView from "@/shared/ui/EmptyView";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import { listDMThreads } from "./dmService";
import type { DMThread } from "./types";

function formatTime(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60 * 1000) return "방금 전";
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function DMListScreen() {
  const t = useAppTheme();
  const router = useRouter();

  const [threads, setThreads] = useState<DMThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await listDMThreads();
      setThreads(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderItem = ({ item }: { item: DMThread }) => (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/dm/[threadId]",
          params: {
            threadId: item.id,
            nickname: item.otherUser.nickname,
            meetingId: item.relatedMeetingId ?? "",
            meetingTitle: item.relatedMeetingTitle ?? "",
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
      <View style={[styles.avatar, { backgroundColor: t.colors.neutral[200] }]}>
        <Ionicons name="person" size={24} color={t.colors.neutral[400]} />
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]} numberOfLines={1}>
            {item.otherUser.nickname}
          </Text>
          <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>{formatTime(item.updatedAt)}</Text>
        </View>

        {item.relatedMeetingTitle ? (
          <View style={[styles.meetingBadge, { backgroundColor: t.colors.neutral[50] }]}>
            <Ionicons name="pricetag-outline" size={10} color={t.colors.primary} />
            <Text style={[t.typography.labelSmall, { color: t.colors.textSub, fontSize: 10 }]} numberOfLines={1}>
              {item.relatedMeetingTitle}
            </Text>
          </View>
        ) : null}

        <View style={styles.msgRow}>
          <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, flex: 1 }]} numberOfLines={1}>
            {item.lastMessage?.text ?? "대화를 시작해보세요"}
          </Text>

          {item.unreadCount > 0 ? (
            <View style={[styles.unreadBadge, { backgroundColor: t.colors.primary }]}>
              <Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>{item.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );

  return (
    <AppLayout padded={false}>
      <TopBar title="채팅" showBorder showNoti showNotiDot={false} showMenu={false} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={t.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={threads}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />}
          ListEmptyComponent={
            <View style={{ marginTop: 100 }}>
              <EmptyView title="대화 내역이 없어요" description="모임에 참여하여 호스트와 대화를 나눠보세요!" />
            </View>
          }
        />
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  itemContainer: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginRight: 16 },
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
  unreadBadge: { minWidth: 18, height: 18, borderRadius: 9, justifyContent: "center", alignItems: "center", paddingHorizontal: 5, marginLeft: 8 },
});
