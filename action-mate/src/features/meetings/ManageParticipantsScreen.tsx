import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingPost, Participant } from "@/features/meetings/model/types";

const CURRENT_USER_ID = "me";
type TabKey = "PENDING" | "CONFIRMED";

// ✅ FlatList sticky를 “실무에서 가장 안정적으로” 먹이는 패턴:
// - ListHeaderComponent는 Top(요약/검색)만 둠
// - sticky 영역(탭/섹션 타이틀)은 data의 첫 아이템으로 넣어서 stickyHeaderIndices로 고정
type Row =
  | { _type: "STICKY" }
  | { _type: "SPACER"; id: string }
  | (Participant & { _type?: undefined });

export default function ManageParticipantsScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [post, setPost] = useState<MeetingPost | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const participantsRef = useRef<Participant[]>([]);
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  const [processingId, setProcessingId] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>("PENDING");
  const [query, setQuery] = useState("");

  const isHost = post?.myState?.membershipStatus === "HOST" || post?.host?.id === CURRENT_USER_ID;

  // ✅ derived lists
  const pending = useMemo(() => participants.filter((p) => p.status === "PENDING"), [participants]);
  const confirmed = useMemo(() => participants.filter((p) => p.status !== "PENDING"), [participants]);

  const filtered = useMemo(() => {
    const base = tab === "PENDING" ? pending : confirmed;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((p) => (p.nickname ?? "").toLowerCase().includes(q));
  }, [tab, pending, confirmed, query]);

  // ✅ access guards
  const isReady = !loading && !!post;
  const accessDenied = isReady && (!post || !isHost);

  // ✅ load 레이스 방지: 마지막 요청만 반영
  const loadSeq = useRef(0);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!id) return;
      const seq = ++loadSeq.current;

      if (!opts?.silent) setLoading(true);
      try {
        const m = await meetingApi.getMeeting(id);
        if (seq !== loadSeq.current) return;
        setPost(m);

        if (m.myState?.membershipStatus === "HOST" || m.host?.id === CURRENT_USER_ID) {
          const parts = await meetingApi.getParticipants(m.id);
          if (seq !== loadSeq.current) return;
          setParticipants(parts);
        } else {
          setParticipants([]);
        }
      } catch (e) {
        console.error(e);
        Alert.alert("오류", "참여자 정보를 불러오지 못했습니다.");
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [id]
  );

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

  // ✅ 로컬 즉시 업데이트 helpers (optimistic)
  const updateParticipant = useCallback((userId: string, patch: Partial<Participant>) => {
    setParticipants((prev) => prev.map((p) => (p.userId === userId ? { ...p, ...patch } : p)));
  }, []);

  const removeParticipant = useCallback((userId: string) => {
    setParticipants((prev) => prev.filter((p) => p.userId !== userId));
  }, []);

  // ✅ 승인: 즉시 반영 + 실패 시 롤백 + (선택) 백그라운드 revalidate
  const handleApprove = useCallback(
    async (userId: string) => {
      if (!post) return;
      if (processingId) return;

      const prevSnapshot = participantsRef.current;
      setProcessingId(userId);

      // 즉시 UI 반영 (PENDING -> CONFIRMED)
      updateParticipant(userId, { status: "CONFIRMED" as any });

      try {
        await meetingApi.approveParticipant(post.id, userId);

        // (선택) 서버 정합성 보정: 조용히 한번 더 동기화
        // load({ silent: true });

        Alert.alert("승인 완료", "참여가 확정되었습니다.");
      } catch {
        setParticipants(prevSnapshot);
        Alert.alert("오류", "승인 처리에 실패했습니다.");
      } finally {
        setProcessingId(null);
      }
    },
    [post, processingId, updateParticipant]
  );

  // ✅ 거절: 즉시 제거 + 실패 시 롤백
  const handleReject = useCallback(
    async (userId: string) => {
      if (!post) return;

      Alert.alert("거절", "이 신청을 거절할까요?", [
        { text: "취소", style: "cancel" },
        {
          text: "거절",
          style: "destructive",
          onPress: async () => {
            const prevSnapshot = participantsRef.current;
            setProcessingId(userId);

            // 즉시 UI 반영 (목록에서 제거)
            removeParticipant(userId);

            try {
              await meetingApi.rejectParticipant(post.id, userId);

              // (선택) 서버 정합성 보정
              // load({ silent: true });
            } catch {
              setParticipants(prevSnapshot);
              Alert.alert("오류", "거절 처리에 실패했습니다.");
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]);
    },
    [post, removeParticipant]
  );

  // ✅ theme derived
  const headerBg = withAlpha(t.colors.primary, t.mode === "dark" ? 0.18 : 0.08);
  const cardBorder = withAlpha(t.colors.primary, t.mode === "dark" ? 0.3 : 0.22);

  const emptyTitle = tab === "PENDING" ? "대기 중 신청이 없어요" : "확정된 참여자가 없어요";
  const emptyDesc =
    tab === "PENDING" ? "새 신청이 들어오면 여기에 표시됩니다." : "승인된 참여자가 생기면 여기에 표시됩니다.";

  // ✅ HeaderTop: 스크롤되는 영역(요약+검색) — ListHeaderComponent로만 둠
  const HeaderTop = useMemo(() => {
    return (
      <View style={{ padding: 16, paddingBottom: 10 }}>
        <View style={[styles.summaryCard, { backgroundColor: headerBg, borderColor: cardBorder }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="clipboard-outline" size={18} color={t.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[t.typography.titleMedium, { color: t.colors.textMain, flex: 1 }]} numberOfLines={1}>
              {post?.title ?? "참여자 관리"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <Pill label={`대기 ${pending.length}`} tone="warning" />
            <View style={{ width: 8 }} />
            <Pill label={`확정 ${confirmed.length}`} tone="success" />
          </View>

          <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 8 }]}>
            대기 신청을 승인하면 참여가 확정됩니다.
          </Text>
        </View>

        <View style={[styles.searchBox, { borderColor: t.colors.border, backgroundColor: t.colors.surface }]}>
          <Ionicons name="search" size={18} color={t.colors.textSub} style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="닉네임 검색"
            placeholderTextColor={t.colors.textSub}
            style={[styles.searchInput, { color: t.colors.textMain }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={10} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={t.colors.textSub} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }, [t, headerBg, cardBorder, post?.title, pending.length, confirmed.length, query]);

  // ✅ Sticky 영역을 data에 넣기 위한 컴포넌트 (항상 최신 count/tab을 렌더)
  const StickyHeader = useMemo(() => {
    return (
      <View style={[styles.stickyWrap, { backgroundColor: t.colors.background, borderBottomColor: t.colors.border }]}>
        <View style={[styles.tabs, { borderColor: t.colors.border, backgroundColor: t.colors.surface }]}>
          <TabButton active={tab === "PENDING"} label={`대기 (${pending.length})`} onPress={() => setTab("PENDING")} />
          <TabButton
            active={tab === "CONFIRMED"}
            label={`확정 (${confirmed.length})`}
            onPress={() => setTab("CONFIRMED")}
          />
        </View>

        <Text style={[t.typography.titleSmall, { color: t.colors.textMain, marginTop: 12 }]}>
          {tab === "PENDING" ? "대기 중" : "확정됨"}
        </Text>
      </View>
    );
  }, [t, tab, pending.length, confirmed.length]);

  // ✅ FlatList data (첫 아이템이 sticky)
  const listData: Row[] = useMemo(() => {
    const base: Row[] = [{ _type: "STICKY" }];

    if (accessDenied) return base;

    // filtered 바로 밑에 separator spacing을 일정하게 하고 싶으면 SPACER를 넣을 수도 있지만,
    // 지금은 ItemSeparatorComponent로 충분해서 생략 가능.
    return base.concat(filtered as Row[]);
  }, [accessDenied, filtered]);

  // ✅ Empty 상태
  const EmptyState = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.centerGrow}>
          <ActivityIndicator size="large" color={t.colors.primary} />
        </View>
      );
    }

    if (accessDenied) {
      return (
        <View style={[styles.centerGrow, { paddingHorizontal: 20 }]}>
          <Ionicons name="lock-closed-outline" size={28} color={t.colors.textSub} />
          <Text style={[t.typography.titleMedium, { marginTop: 12, color: t.colors.textMain }]}>접근할 수 없어요</Text>
          <Text style={[t.typography.bodyMedium, { marginTop: 6, color: t.colors.textSub, textAlign: "center" }]}>
            이 페이지는 호스트만 볼 수 있습니다.
          </Text>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
        <View style={[styles.emptyBox, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <Ionicons name="information-circle-outline" size={26} color={t.colors.textSub} />
          <Text style={[t.typography.titleSmall, { marginTop: 10, color: t.colors.textMain }]}>{emptyTitle}</Text>
          <Text style={[t.typography.bodySmall, { marginTop: 6, color: t.colors.textSub, textAlign: "center" }]}>
            {emptyDesc}
          </Text>
        </View>
      </View>
    );
  }, [loading, accessDenied, t, emptyTitle, emptyDesc]);

  // ✅ renderItem 최적화
  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if ("_type" in item) {
        if (item._type === "STICKY") return StickyHeader;
        return <View />; // (미사용)
      }

      const isPending = item.status === "PENDING";
      const isProcessing = processingId === item.userId;

      return (
        <View style={{ paddingHorizontal: 16 }}>
          <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
            <View style={styles.cardLeft}>
              {item.avatarUrlUrl ? (
                <Image source={{ uri: item.avatarUrlUrl }} style={styles.avatarUrl} />
              ) : (
                <View style={[styles.avatarUrlPlaceholder, { backgroundColor: t.colors.neutral[100] }]}>
                  <Ionicons name="person" size={18} color={t.colors.icon.muted} />
                </View>
              )}

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]} numberOfLines={1}>
                  {item.nickname}
                </Text>
                <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 2 }]}>
                  {isPending ? "신청 대기" : "참여 확정"}
                </Text>
              </View>
            </View>

            <View style={styles.cardRight}>
              {isProcessing ? (
                <ActivityIndicator size="small" color={t.colors.primary} />
              ) : isPending ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Pressable
                    onPress={() => handleReject(item.userId)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.iconAction,
                      { borderColor: t.colors.error, opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <Ionicons name="close" size={18} color={t.colors.error} />
                  </Pressable>

                  <View style={{ width: 8 }} />

                  <Pressable
                    onPress={() => handleApprove(item.userId)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.primaryAction,
                      { backgroundColor: t.colors.primary, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Text style={[t.typography.labelSmall, { color: "white", fontWeight: "800" }]}>승인</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={[styles.confirmedBadge, { backgroundColor: withAlpha(t.colors.success, 0.12) }]}>
                  <Ionicons name="checkmark-circle" size={16} color={t.colors.success} style={{ marginRight: 6 }} />
                  <Text style={[t.typography.labelSmall, { color: t.colors.success, fontWeight: "800" }]}>확정</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      );
    },
    [StickyHeader, processingId, t, handleReject, handleApprove]
  );

  // ✅ keyExtractor 안정화
  const keyExtractor = useCallback((item: Row, index: number) => {
    if ("_type" in item) return "sticky";
    return item.userId;
  }, []);

  return (
    <AppLayout padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <TopBar
        title="참여자 관리"
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

      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        // ✅ “탭 눌러야 갱신”/“숫자 지연” 방지: FlatList가 header/sticky를 놓치지 않게 강제 트리거
        extraData={{
          tab,
          query,
          processingId,
          pendingCount: pending.length,
          confirmedCount: confirmed.length,
          denied: accessDenied,
          loading,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{
          paddingBottom: Math.max(16, insets.bottom),
          flexGrow: 1,
        }}
        // ✅ HeaderTop만 “헤더”로, sticky는 data 첫 아이템으로 처리
        ListHeaderComponent={() => <View>{HeaderTop}</View>}
        // ✅ HeaderTop(0) 다음의 첫 아이템(STICKY)을 고정
        stickyHeaderIndices={[1]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        // ✅ STICKY만 있고 실제 데이터가 없을 수 있으니 Empty는 여기서 처리
        ListEmptyComponent={EmptyState}
      />
    </AppLayout>
  );
}

function Pill({ label, tone }: { label: string; tone: "warning" | "success" }) {
  const t = useAppTheme();
  const bg = withAlpha(tone === "warning" ? t.colors.warning : t.colors.success, 0.14);
  const fg = tone === "warning" ? t.colors.warning : t.colors.success;

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[t.typography.labelSmall, { color: fg, fontWeight: "900" }]}>{label}</Text>
    </View>
  );
}

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const t = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabBtn,
        {
          backgroundColor: active ? withAlpha(t.colors.primary, 0.12) : "transparent",
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text
        style={[
          t.typography.labelMedium,
          { color: active ? t.colors.primary : t.colors.textSub, fontWeight: active ? "900" : "700" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centerGrow: { flex: 1, justifyContent: "center", alignItems: "center" },

  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },

  stickyWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 0,
    borderBottomWidth: 1,
  },

  tabs: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  searchBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    padding: 0,
    margin: 0,
    fontSize: 14,
  },

  emptyBox: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
  },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  cardRight: {
    marginLeft: 10,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  avatarUrl: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  avatarUrlPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  iconAction: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryAction: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
});