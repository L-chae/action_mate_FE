// FILE: src/features/meetings/ManageParticipantsScreen.tsx
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

import { useAuthStore } from "@/features/auth/model/authStore";
import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingPost, Participant, MembershipStatus } from "@/features/meetings/model/types";

type TabKey = "PENDING" | "CONFIRMED";

type ParticipantRow = Participant & { _rowKey: string; _type?: undefined };
type Row = { _type: "STICKY" } | { _type: "EMPTY" } | { _type: "LOADING" } | ParticipantRow;

const isConfirmedStatus = (s: MembershipStatus) => s === "MEMBER" || s === "HOST";

// ✅ 화면 전환/재진입 시 즉시 보여주기 위한 캐시(인메모리)
const PARTICIPANTS_CACHE: Record<string, Participant[]> = {};

function makeUniqueParticipantRows(list: Participant[]): ParticipantRow[] {
  const arr = Array.isArray(list) ? list : [];
  const seen = new Map<string, number>();

  return arr.map((p) => {
    const baseId = String((p as any)?.id ?? "unknown").trim() || "unknown";
    const n = (seen.get(baseId) ?? 0) + 1;
    seen.set(baseId, n);

    // ✅ key 중복 방지: id가 중복되면 suffix를 붙인 _rowKey만 유니크하게
    const rowKey = n === 1 ? baseId : `${baseId}__${n}`;
    return { ...(p as any), _rowKey: rowKey } as ParticipantRow;
  });
}

export default function ManageParticipantsScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const id = Array.isArray((params as any)?.id) ? (params as any).id[0] : (params as any)?.id;

  const me = useAuthStore((s) => s.user);
  const currentUserId = me?.id ? String(me.id) : "guest";

  const [loading, setLoading] = useState(true);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [post, setPost] = useState<MeetingPost | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const participantsRef = useRef<Participant[]>([]);
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>("PENDING");
  const [query, setQuery] = useState("");

  const meetingIdKey = useMemo(() => String(id ?? "").trim(), [id]);

  const isHost =
    post?.myState?.membershipStatus === "HOST" || (post?.host?.id != null && String(post.host.id) === currentUserId);

  const pending = useMemo(
    () => (Array.isArray(participants) ? participants : []).filter((p) => (p as any)?.status === "PENDING"),
    [participants]
  );
  const confirmed = useMemo(
    () => (Array.isArray(participants) ? participants : []).filter((p) => isConfirmedStatus((p as any)?.status)),
    [participants]
  );

  const filtered = useMemo(() => {
    const base = tab === "PENDING" ? pending : confirmed;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((p) => String((p as any)?.nickname ?? "").toLowerCase().includes(q));
  }, [tab, pending, confirmed, query]);

  const isReady = !loading && !!post;
  const accessDenied = isReady && (!post || !isHost);

  const loadSeq = useRef(0);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const meetingId = String(id ?? "").trim();
      if (!meetingId) return;

      const seq = ++loadSeq.current;

      if (!opts?.silent) setLoading(true);

      try {
        // ✅ 1) 모임 정보 먼저(화면을 빨리 띄우기 위해)
        const m = await meetingApi.getMeeting(meetingId as any);
        if (seq !== loadSeq.current) return;

        setPost(m);

        const hostOk =
          (m as any)?.myState?.membershipStatus === "HOST" ||
          ((m as any)?.host?.id != null && String((m as any).host.id) === currentUserId);

        if (!hostOk) {
          setParticipants([]);
          setParticipantsLoading(false);
          return;
        }

        // ✅ 2) 캐시가 있으면 즉시 반영(지연 체감 감소)
        const cacheKey = String((m as any)?.id ?? meetingId).trim();
        const cached = PARTICIPANTS_CACHE[cacheKey];
        if (Array.isArray(cached) && cached.length > 0) {
          setParticipants(cached);
        }

        // ✅ 3) 참여자 목록은 별도 로딩(스크린 전체 로딩을 오래 잡지 않음)
        setParticipantsLoading(true);
        if (!opts?.silent) setLoading(false);

        const parts = await meetingApi.getParticipants(String((m as any)?.id ?? meetingId) as any);
        if (seq !== loadSeq.current) return;

        const safeParts = Array.isArray(parts) ? parts : [];
        setParticipants(safeParts);
        PARTICIPANTS_CACHE[cacheKey] = safeParts;
      } catch (e) {
        console.error(e);
        Alert.alert("오류", "참여자 정보를 불러오지 못했습니다.");
      } finally {
        if (!opts?.silent) setLoading(false);
        setParticipantsLoading(false);
      }
    },
    [id, currentUserId]
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

  const updateParticipant = useCallback((userId: string, patch: Partial<Participant>) => {
    setParticipants((prev) =>
      (Array.isArray(prev) ? prev : []).map((p) =>
        String((p as any).id) === String(userId) ? ({ ...(p as any), ...(patch as any) } as any) : p
      )
    );
  }, []);

  const removeParticipant = useCallback((userId: string) => {
    setParticipants((prev) => (Array.isArray(prev) ? prev : []).filter((p) => String((p as any).id) !== String(userId)));
  }, []);

  const handleApprove = useCallback(
    async (userId: string) => {
      if (!post) return;
      if (processingUserId) return;

      const prevSnapshot = participantsRef.current;
      setProcessingUserId(userId);

      updateParticipant(userId, { status: "MEMBER" } as any);

      try {
        const updated = await meetingApi.approveParticipant(String((post as any).id) as any, userId);
        if (Array.isArray(updated)) {
          setParticipants(updated);
          const cacheKey = String((post as any)?.id ?? meetingIdKey).trim();
          if (cacheKey) PARTICIPANTS_CACHE[cacheKey] = updated;
        }
        Alert.alert("승인 완료", "참여가 확정되었습니다.");
      } catch {
        setParticipants(prevSnapshot);
        Alert.alert("오류", "승인 처리에 실패했습니다.");
      } finally {
        setProcessingUserId(null);
      }
    },
    [post, processingUserId, updateParticipant, meetingIdKey]
  );

  const handleReject = useCallback(
    async (userId: string) => {
      if (!post) return;
      if (processingUserId) return;

      Alert.alert("거절", "이 신청을 거절할까요?", [
        { text: "취소", style: "cancel" },
        {
          text: "거절",
          style: "destructive",
          onPress: async () => {
            const prevSnapshot = participantsRef.current;
            setProcessingUserId(userId);

            removeParticipant(userId);

            try {
              const updated = await meetingApi.rejectParticipant(String((post as any).id) as any, userId);
              if (Array.isArray(updated)) {
                setParticipants(updated);
                const cacheKey = String((post as any)?.id ?? meetingIdKey).trim();
                if (cacheKey) PARTICIPANTS_CACHE[cacheKey] = updated;
              }
            } catch {
              setParticipants(prevSnapshot);
              Alert.alert("오류", "거절 처리에 실패했습니다.");
            } finally {
              setProcessingUserId(null);
            }
          },
        },
      ]);
    },
    [post, processingUserId, removeParticipant, meetingIdKey]
  );

  const primary = t?.colors?.primary ?? "#000000";
  const headerBg = withAlpha(primary, t?.mode === "dark" ? 0.18 : 0.08);
  const cardBorder = withAlpha(primary, t?.mode === "dark" ? 0.3 : 0.22);

  const emptyTitle = tab === "PENDING" ? "대기 중 신청이 없어요" : "확정된 참여자가 없어요";
  const emptyDesc = tab === "PENDING" ? "새 신청이 들어오면 여기에 표시됩니다." : "승인된 참여자가 생기면 여기에 표시됩니다.";

  const HeaderTop = useMemo(() => {
    return (
      <View style={{ padding: 16, paddingBottom: 10 }}>
        <View style={[styles.summaryCard, { backgroundColor: headerBg, borderColor: cardBorder }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="clipboard-outline" size={18} color={primary} style={{ marginRight: 8 }} />
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
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={10} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={t.colors.textSub} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }, [t, headerBg, cardBorder, post?.title, pending.length, confirmed.length, query, primary]);

  const StickyHeader = useMemo(() => {
    return (
      <View style={[styles.stickyWrap, { backgroundColor: t.colors.background, borderBottomColor: t.colors.border }]}>
        <View style={[styles.tabs, { borderColor: t.colors.border, backgroundColor: t.colors.surface }]}>
          <TabButton active={tab === "PENDING"} label={`대기 (${pending.length})`} onPress={() => setTab("PENDING")} />
          <TabButton active={tab === "CONFIRMED"} label={`확정 (${confirmed.length})`} onPress={() => setTab("CONFIRMED")} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
          <Text style={[t.typography.titleSmall, { color: t.colors.textMain, flex: 1 }]}>
            {tab === "PENDING" ? "대기 중" : "확정됨"}
          </Text>
    
        </View>
      </View>
    );
  }, [t, tab, pending.length, confirmed.length, participantsLoading]);

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

  const LoadingRow = useMemo(() => {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <View style={[styles.emptyBox, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <ActivityIndicator size="small" color={t.colors.primary} />
          <Text style={[t.typography.bodySmall, { marginTop: 10, color: t.colors.textSub }]}>
            참여자 목록을 불러오는 중…
          </Text>
        </View>
      </View>
    );
  }, [t]);

  const listData: Row[] = useMemo(() => {
    const base: Row[] = [{ _type: "STICKY" }];

    if (loading || accessDenied) return base.concat([{ _type: "EMPTY" }]);
    if (participantsLoading && filtered.length === 0) return base.concat([{ _type: "LOADING" }]);
    if (filtered.length === 0) return base.concat([{ _type: "EMPTY" }]);

    return base.concat(makeUniqueParticipantRows(filtered));
  }, [loading, accessDenied, participantsLoading, filtered]);

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if ("_type" in item) {
        if (item._type === "STICKY") return StickyHeader;
        if (item._type === "LOADING") return LoadingRow;
        if (item._type === "EMPTY") return EmptyState;
        return <View />;
      }

      const userId = String((item as any)?.id ?? "");
      const isPending = (item as any)?.status === "PENDING";
      const isProcessing = processingUserId === userId;

      const onPrimary = (t as any)?.colors?.onPrimary ?? "#FFFFFF";

      return (
        <View style={{ paddingHorizontal: 16 }}>
          <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
            <View style={styles.cardLeft}>
              {(item as any)?.avatarUrl ? (
                <Image source={{ uri: String((item as any)?.avatarUrl) }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: t.colors.neutral?.[100] ?? t.colors.border }]}>
                  <Ionicons name="person" size={18} color={t.colors.icon?.muted ?? t.colors.textSub} />
                </View>
              )}

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]} numberOfLines={1}>
                  {(item as any)?.nickname ?? "알 수 없음"}
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
                    onPress={() => handleReject(userId)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.rejectAction,
                      { borderColor: t.colors.error, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Text style={[t.typography.labelSmall, { color: t.colors.error, fontWeight: "800" }]}>거절</Text>
                  </Pressable>

                  <View style={{ width: 8 }} />

                  <Pressable
                    onPress={() => handleApprove(userId)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.primaryAction,
                      { backgroundColor: t.colors.primary, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Text style={[t.typography.labelSmall, { color: onPrimary, fontWeight: "800" }]}>승인</Text>
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
    [StickyHeader, EmptyState, LoadingRow, processingUserId, t, handleReject, handleApprove]
  );

  const keyExtractor = useCallback((item: Row) => {
    if ("_type" in item) return item._type === "STICKY" ? "sticky" : item._type === "LOADING" ? "loading" : "empty";
    return String((item as any)?._rowKey ?? (item as any)?.id ?? "row");
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
        extraData={{
          tab,
          query,
          processingUserId,
          pendingCount: pending.length,
          confirmedCount: confirmed.length,
          denied: accessDenied,
          loading,
          participantsLoading,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{
          paddingBottom: Math.max(16, insets.bottom),
          flexGrow: 1,
        }}
        ListHeaderComponent={() => <View>{HeaderTop}</View>}
        stickyHeaderIndices={[1]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </AppLayout>
  );
}

function Pill({ label, tone }: { label: string; tone: "warning" | "success" }) {
  const t = useAppTheme();
  const base = tone === "warning" ? t.colors.warning : t.colors.success;
  const bg = withAlpha(base ?? "#000000", 0.14);
  const fg = base ?? t.colors.textMain;

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

  avatarImage: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  rejectAction: {
    height: 34,
    paddingHorizontal: 14,
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

/*
3줄 요약
- 대기 상태 액션에서 X 아이콘 버튼을 “거절” 텍스트 버튼으로 교체했습니다.
- 스타일은 Notification/Manage 공통 톤(높이 34, radius 10, border 1)으로 맞췄습니다.
- 승인 버튼과 동일한 레이아웃을 유지해 시각적 일관성을 확보했습니다.
*/
