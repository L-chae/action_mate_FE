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

import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import EmptyView from "@/shared/ui/EmptyView";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingPost, Participant } from "@/features/meetings/model/types";

const CURRENT_USER_ID = "me";
type TabKey = "PENDING" | "CONFIRMED";

/** avatar 필드명 혼재(avatar/avatarUrl/photoUrl) 대응 */
type ParticipantAvatarLike = Participant & {
  avatar?: string;
  avatarUrl?: string;
  photoUrl?: string;
};
function getAvatarUri(p: ParticipantAvatarLike): string | undefined {
  const anyP = p as any;
  return (
    (typeof anyP.avatar === "string" && anyP.avatar) ||
    (typeof anyP.avatarUrl === "string" && anyP.avatarUrl) ||
    (typeof anyP.photoUrl === "string" && anyP.photoUrl) ||
    undefined
  );
}

/** FlatList sticky 안정 패턴: sticky를 data 첫 row로 넣기 */
type Row =
  | { _type: "STICKY" }
  | { _type: "EMPTY" }
  | (ParticipantAvatarLike & { _type?: undefined });

export default function ManageParticipantsScreen() {
  const t = useAppTheme();
  const s = t.spacing;

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

  const isHost =
    post?.myState?.membershipStatus === "HOST" || post?.host?.id === CURRENT_USER_ID;

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

  // ✅ optimistic helpers
  const updateParticipant = useCallback((userId: string, patch: Partial<Participant>) => {
    setParticipants((prev) => prev.map((p) => (p.userId === userId ? { ...p, ...patch } : p)));
  }, []);

  const removeParticipant = useCallback((userId: string) => {
    setParticipants((prev) => prev.filter((p) => p.userId !== userId));
  }, []);

  const handleApprove = useCallback(
    async (userId: string) => {
      if (!post) return;
      if (processingId) return;

      const prevSnapshot = participantsRef.current;
      setProcessingId(userId);

      updateParticipant(userId, { status: "CONFIRMED" as any });

      try {
        await meetingApi.approveParticipant(post.id, userId);
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

            removeParticipant(userId);

            try {
              await meetingApi.rejectParticipant(post.id, userId);
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

  // ✅ 토큰 기반 파생 스타일(색/배경)
  const summaryBg = withAlpha(t.colors.primary, t.mode === "dark" ? 0.16 : 0.08);
  const summaryBorder = withAlpha(t.colors.primary, t.mode === "dark" ? 0.28 : 0.18);

  const emptyTitle = tab === "PENDING" ? "대기 중 신청이 없어요" : "확정된 참여자가 없어요";
  const emptyDesc =
    tab === "PENDING" ? "새 신청이 들어오면 여기에 표시됩니다." : "승인된 참여자가 생기면 여기에 표시됩니다.";

  // ✅ HeaderTop(스크롤 영역)
  const HeaderTop = useMemo(() => {
    return (
      <View style={{ paddingHorizontal: s.pagePaddingH, paddingTop: s.space[4], paddingBottom: s.space[3] }}>
        <Card
          style={{
            backgroundColor: summaryBg,
            borderColor: summaryBorder,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="clipboard-outline" size={18} color={t.colors.primary} style={{ marginRight: s.space[2] }} />
            <Text style={[t.typography.titleMedium, { color: t.colors.textMain, flex: 1 }]} numberOfLines={1}>
              {post?.title ?? "참여자 관리"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", marginTop: s.space[3], gap: s.space[2] }}>
            <Badge label={`대기 ${pending.length}`} tone="warning" size="md" />
            <Badge label={`확정 ${confirmed.length}`} tone="success" size="md" />
          </View>

          <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: s.space[2] }]}>
            대기 신청을 승인하면 참여가 확정됩니다.
          </Text>
        </Card>

        {/* Search */}
        <Card padded={false} style={{ marginTop: s.space[3] }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: s.space[4],
              paddingVertical: s.space[3],
              borderRadius: s.radiusLg,
            }}
          >
            <Ionicons name="search" size={18} color={t.colors.textSub} style={{ marginRight: s.space[2] }} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="닉네임 검색"
              placeholderTextColor={t.colors.placeholder}
              style={[styles.searchInput, { color: t.colors.textMain }, t.typography.bodyMedium]}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} hitSlop={10} style={{ padding: s.space[1] }}>
                <Ionicons name="close-circle" size={18} color={t.colors.textSub} />
              </Pressable>
            )}
          </View>
        </Card>
      </View>
    );
  }, [
    s,
    t.colors.primary,
    t.colors.textMain,
    t.colors.textSub,
    t.colors.placeholder,
    t.typography.titleMedium,
    t.typography.bodySmall,
    t.typography.bodyMedium,
    summaryBg,
    summaryBorder,
    post?.title,
    pending.length,
    confirmed.length,
    query,
  ]);

  // ✅ StickyHeader(탭 영역)
  const StickyHeader = useMemo(() => {
    return (
      <View
        style={{
          paddingHorizontal: s.pagePaddingH,
          paddingBottom: s.space[3],
          backgroundColor: t.colors.background,
          borderBottomWidth: s.borderWidth,
          borderBottomColor: t.colors.border,
        }}
      >
        <Card padded={false}>
          <View style={{ flexDirection: "row", overflow: "hidden", borderRadius: s.radiusLg }}>
            <SegmentTab
              active={tab === "PENDING"}
              label={`대기 (${pending.length})`}
              onPress={() => setTab("PENDING")}
            />
            <SegmentTab
              active={tab === "CONFIRMED"}
              label={`확정 (${confirmed.length})`}
              onPress={() => setTab("CONFIRMED")}
            />
          </View>
        </Card>

        <Text style={[t.typography.titleSmall, { color: t.colors.textMain, marginTop: s.space[3] }]}>
          {tab === "PENDING" ? "대기 중" : "확정됨"}
        </Text>
      </View>
    );
  }, [s, t, tab, pending.length, confirmed.length]);

  // ✅ EmptyRow(로딩/권한/빈목록)
  const EmptyRow = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.centerGrow}>
          <ActivityIndicator size="large" color={t.colors.primary} />
        </View>
      );
    }

    if (accessDenied) {
      return (
        <View style={[styles.centerGrow, { paddingHorizontal: s.pagePaddingH }]}>
          <Ionicons name="lock-closed-outline" size={28} color={t.colors.textSub} />
          <Text style={[t.typography.titleMedium, { marginTop: s.space[3], color: t.colors.textMain }]}>
            접근할 수 없어요
          </Text>
          <Text
            style={[
              t.typography.bodyMedium,
              { marginTop: s.space[2], color: t.colors.textSub, textAlign: "center" },
            ]}
          >
            이 페이지는 호스트만 볼 수 있습니다.
          </Text>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: s.pagePaddingH, paddingTop: s.space[3] }}>
        <Card>
          <EmptyView title={emptyTitle} description={emptyDesc} />
        </Card>
      </View>
    );
  }, [loading, accessDenied, s, t, emptyTitle, emptyDesc]);

  const showEmptyRow = loading || accessDenied || filtered.length === 0;

  const listData: Row[] = useMemo(() => {
    const base: Row[] = [{ _type: "STICKY" }];
    if (showEmptyRow) return base.concat([{ _type: "EMPTY" }]);
    return base.concat(filtered as unknown as Row[]);
  }, [filtered, showEmptyRow]);

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if ("_type" in item) {
        if (item._type === "STICKY") return StickyHeader;
        if (item._type === "EMPTY") return EmptyRow;
        return <View />;
      }

      const avatarUri = getAvatarUri(item);
      const isPending = item.status === "PENDING";
      const isProcessing = processingId === item.userId;

      const avatarSize = s.space[9]; // 40
      const avatarRadius = avatarSize / 2;

      return (
        <View style={{ paddingHorizontal: s.pagePaddingH }}>
          <Card
            padded={false}
            style={{
              paddingHorizontal: s.space[4],
              paddingVertical: s.space[3],
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: avatarSize, height: avatarSize, borderRadius: avatarRadius, marginRight: s.space[3] }}
                />
              ) : (
                <View
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: avatarRadius,
                    marginRight: s.space[3],
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: t.colors.chipBg,
                  }}
                >
                  <Ionicons name="person" size={18} color={t.colors.icon.muted} />
                </View>
              )}

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]} numberOfLines={1}>
                  {item.nickname}
                </Text>
                <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: s.space[1] }]}>
                  {isPending ? "신청 대기" : "참여 확정"}
                </Text>
              </View>

              <View style={{ marginLeft: s.space[3] }}>
                {isPending ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: s.space[2] }}>
                    <IconCircleButton
                      icon="close"
                      tone="error"
                      disabled={isProcessing}
                      onPress={() => handleReject(item.userId)}
                    />
                    <Button
                      title="승인"
                      size="sm"
                      variant="primary"
                      loading={isProcessing}
                      disabled={isProcessing}
                      onPress={() => handleApprove(item.userId)}
                      style={{ height: 40, paddingHorizontal: s.space[4], borderRadius: s.radiusMd }}
                    />
                  </View>
                ) : (
                  <Badge label="확정" tone="success" size="md" />
                )}
              </View>
            </View>
          </Card>
        </View>
      );
    },
    [StickyHeader, EmptyRow, s, t, processingId, handleReject, handleApprove]
  );

  const keyExtractor = useCallback((item: Row) => {
    if ("_type" in item) return item._type === "STICKY" ? "sticky" : "empty";
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
          <Pressable onPress={onRefresh} hitSlop={10} style={{ padding: s.space[1] }}>
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
          processingId,
          pendingCount: pending.length,
          confirmedCount: confirmed.length,
          denied: accessDenied,
          loading,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{
          paddingBottom: Math.max(s.space[4], insets.bottom),
          flexGrow: 1,
        }}
        ListHeaderComponent={HeaderTop}
        stickyHeaderIndices={[1]}
        ItemSeparatorComponent={() => <View style={{ height: s.space[2] }} />}
      />
    </AppLayout>
  );

  /** Segmented Tab (내부 컴포넌트) */
  function SegmentTab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          {
            flex: 1,
            paddingVertical: s.space[3],
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: active ? withAlpha(t.colors.primary, 0.12) : "transparent",
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Text
          style={[
            t.typography.labelMedium,
            { color: active ? t.colors.primary : t.colors.textSub },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  /** 작은 원형 아이콘 버튼 (재사용 가능) */
  function IconCircleButton({
    icon,
    tone,
    onPress,
    disabled,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    tone: "error" | "primary";
    onPress: () => void;
    disabled?: boolean;
  }) {
    const fg = tone === "error" ? t.colors.error : t.colors.primary;

    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        hitSlop={10}
        style={({ pressed }) => [
          {
            width: s.space[9], // 40
            height: s.space[9],
            borderRadius: s.radiusMd,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: s.borderWidth,
            borderColor: withAlpha(fg, 0.35),
            backgroundColor: withAlpha(fg, 0.10),
            opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={fg} />
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  centerGrow: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchInput: { flex: 1, padding: 0, margin: 0 },
});
