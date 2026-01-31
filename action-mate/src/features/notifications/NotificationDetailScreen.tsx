// FILE: features/notifications/NotificationDetailScreen.tsx
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
import type { MeetingPost, Participant } from "@/features/meetings/model/types";

type ActionState = { userId: string; kind: "approve" | "reject" } | null;

type ParticipantRow = Participant & { _rowKey: string; _type?: undefined };

function safeStr(v: unknown) {
  return String(v ?? "").trim();
}

function pickMyIdCandidates(me: any): string[] {
  const cands = [
    safeStr(me?.id),
    safeStr(me?.userId),
    safeStr(me?.loginId),
    safeStr(me?.memberId),
  ].filter(Boolean);

  // 중복 제거
  return Array.from(new Set(cands));
}

function pickHostIdCandidates(meeting: any): string[] {
  const host = meeting?.host ?? meeting?.writer ?? meeting?.author ?? null;
  const cands = [
    safeStr(host?.id),
    safeStr(host?.userId),
    safeStr(host?.loginId),
    safeStr(host?.memberId),
    safeStr(meeting?.hostId),
    safeStr(meeting?.ownerId),
  ].filter(Boolean);

  return Array.from(new Set(cands));
}

/** Participant shape이 바뀌어도 화면이 깨지지 않게 "표시용" 값만 안전하게 추출 */
function getParticipantUserId(p: Participant): string {
  const anyP = p as any;
  return safeStr(anyP?.userId ?? anyP?.memberId ?? anyP?.id ?? "");
}
function getParticipantLabel(p: Participant): string {
  const anyP = p as any;
  const uid = getParticipantUserId(p);
  return safeStr(anyP?.nickname ?? anyP?.name ?? anyP?.displayName ?? "") || (uid ? `사용자 ${uid}` : "사용자");
}
function getParticipantAvatarUrl(p: Participant): string | null {
  const anyP = p as any;
  const url = safeStr(anyP?.avatarUrl ?? anyP?.profileImage ?? anyP?.profileUrl ?? anyP?.imageUrl ?? "");
  return url ? url : null;
}

/** key 중복 방지: 동일 userId가 여러 번 오거나, userId가 비었을 때도 안정적으로 유니크 key 생성 */
function makeUniqueParticipantRows(list: Participant[]): ParticipantRow[] {
  const arr = Array.isArray(list) ? list : [];
  const seen = new Map<string, number>();

  return arr.map((p, idx) => {
    const uid = getParticipantUserId(p);
    const base = uid ? `p_${uid}` : `p_idx_${idx}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const rowKey = n === 1 ? base : `${base}__${n}`;
    return { ...(p as any), _rowKey: rowKey } as ParticipantRow;
  });
}

function EmptyBox({ icon, title, desc }: { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }) {
  const t = useAppTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      <View style={[styles.emptyBox, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
        <Ionicons name={icon} size={26} color={t.colors.textSub} />
        <Text style={[t.typography.titleSmall, { marginTop: 10, color: t.colors.textMain }]}>{title}</Text>
        <Text style={[t.typography.bodySmall, { marginTop: 6, color: t.colors.textSub, textAlign: "center" }]}>{desc}</Text>
      </View>
    </View>
  );
}

function Pill({ label, tone }: { label: string; tone: "warning" | "success" | "neutral" }) {
  const t = useAppTheme();
  const base =
    tone === "warning"
      ? t.colors.warning
      : tone === "success"
      ? t.colors.success
      : t.colors.neutral?.[500] ?? t.colors.textSub;

  const bg = withAlpha(base ?? "#000000", 0.14);
  const fg = base ?? t.colors.textMain;

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[t.typography.labelSmall, { color: fg, fontWeight: "900" }]}>{label}</Text>
    </View>
  );
}

export default function NotificationDetailScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ id?: string }>();
  const meetingId = useMemo(() => safeStr(params?.id), [params?.id]);

  const me = useAuthStore((s) => s.user);
  const myIdCandidates = useMemo(() => pickMyIdCandidates(me as any), [me]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [action, setAction] = useState<ActionState>(null);

  const [meeting, setMeeting] = useState<MeetingPost | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const loadSeq = useRef(0);

  const hostIdCandidates = useMemo(() => pickHostIdCandidates(meeting as any), [meeting]);

  const isHost = useMemo(() => {
    const status = safeStr((meeting as any)?.myState?.membershipStatus ?? (meeting as any)?.membershipStatus);
    if (status === "HOST") return true;

    if (myIdCandidates.length <= 0 || hostIdCandidates.length <= 0) return false;
    return hostIdCandidates.some((hid) => myIdCandidates.includes(safeStr(hid)));
  }, [meeting, myIdCandidates, hostIdCandidates]);

  const pending = useMemo(() => {
    const list = Array.isArray(participants) ? participants : [];
    return list.filter((p) => safeStr((p as any)?.status) === "PENDING");
  }, [participants]);

  const rows = useMemo(() => makeUniqueParticipantRows(pending), [pending]);

  const primary = t?.colors?.primary ?? "#000000";
  const headerBg = withAlpha(primary, t?.mode === "dark" ? 0.18 : 0.08);
  const cardBorder = withAlpha(primary, t?.mode === "dark" ? 0.3 : 0.22);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const id = safeStr(meetingId);
      if (!id) {
        setMeeting(null);
        setParticipants([]);
        setLoading(false);
        return;
      }

      const seq = ++loadSeq.current;
      if (!opts?.silent) setLoading(true);

      try {
        const m = await meetingApi.getMeeting(id);
        if (seq !== loadSeq.current) return;

        setMeeting(m);

        // ✅ 호스트 판정은 myState.HOST 우선, 없으면 hostId 매칭으로 보강
        const status = safeStr((m as any)?.myState?.membershipStatus ?? (m as any)?.membershipStatus);
        const hostIds = pickHostIdCandidates(m as any);
        const meIds = myIdCandidates.length > 0 ? myIdCandidates : pickMyIdCandidates(me as any);

        const hostOk = status === "HOST" || (hostIds.length > 0 && meIds.length > 0 && hostIds.some((hid) => meIds.includes(safeStr(hid))));

        if (hostOk) {
          const parts = await meetingApi.getParticipants(id);
          if (seq !== loadSeq.current) return;
          setParticipants(Array.isArray(parts) ? parts : []);
        } else {
          setParticipants([]);
        }
      } catch (e) {
        console.error(e);
        Alert.alert("오류", "알림 상세 정보를 불러오지 못했습니다.");
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [meetingId, myIdCandidates, me]
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

  const onApprove = useCallback(
    async (userId: string) => {
      const uid = safeStr(userId);
      if (!isHost) return;
      if (!uid) return;
      if (action) return;

      setAction({ userId: uid, kind: "approve" });
      try {
        const updated = await meetingApi.approveParticipant(meetingId, uid);
        setParticipants(Array.isArray(updated) ? (updated as any) : []);
        Alert.alert("승인 완료", "참여가 확정되었습니다.");
      } catch (e) {
        console.error(e);
        Alert.alert("오류", "수락 처리에 실패했습니다.");
      } finally {
        setAction(null);
      }
    },
    [isHost, meetingId, action]
  );

  const onReject = useCallback(
    async (userId: string) => {
      const uid = safeStr(userId);
      if (!isHost) return;
      if (!uid) return;
      if (action) return;

      Alert.alert("거절", "이 참여 신청을 거절할까요?", [
        { text: "취소", style: "cancel" },
        {
          text: "거절",
          style: "destructive",
          onPress: async () => {
            setAction({ userId: uid, kind: "reject" });
            try {
              const updated = await meetingApi.rejectParticipant(meetingId, uid);
              setParticipants(Array.isArray(updated) ? (updated as any) : []);
            } catch (e) {
              console.error(e);
              Alert.alert("오류", "거절 처리에 실패했습니다.");
            } finally {
              setAction(null);
            }
          },
        },
      ]);
    },
    [isHost, meetingId, action]
  );

  const refreshIconColor = t.colors.icon?.default ?? t.colors.textMain;

  const HeaderTop = useMemo(() => {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
        <View style={[styles.summaryCard, { backgroundColor: headerBg, borderColor: cardBorder }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="clipboard-outline" size={18} color={primary} style={{ marginRight: 8 }} />
            <Text style={[t.typography.titleMedium, { color: t.colors.textMain, flex: 1 }]} numberOfLines={1}>
              {meeting?.title ?? "참여 신청"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <Pill label={`대기 ${isHost ? pending.length : 0}`} tone={isHost && pending.length > 0 ? "warning" : "neutral"} />
          </View>

          <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 8 }]}>
            {isHost ? "대기 신청을 승인하면 참여가 확정됩니다." : "이 화면은 호스트만 참여 신청을 처리할 수 있어요."}
          </Text>
        </View>

        {!meetingId ? (
          <EmptyBox icon="alert-circle-outline" title="잘못된 접근이에요" desc="알림 ID를 확인할 수 없습니다. 다시 시도해 주세요." />
        ) : !isHost && !loading ? (
          <EmptyBox icon="lock-closed-outline" title="호스트만 볼 수 있어요" desc="호스트 상태가 아니거나 사용자/호스트 ID 매칭이 되지 않았습니다." />
        ) : isHost && !loading && pending.length === 0 ? (
          <EmptyBox icon="checkmark-circle-outline" title="처리할 신청이 없어요" desc="새 참여 신청이 들어오면 여기에 표시됩니다." />
        ) : null}
      </View>
    );
  }, [t, meeting?.title, headerBg, cardBorder, primary, isHost, pending.length, meetingId, loading]);

  const renderItem = useCallback(
    ({ item }: { item: ParticipantRow }) => {
      const uid = getParticipantUserId(item);
      const name = getParticipantLabel(item);
      const avatarUrl = getParticipantAvatarUrl(item);

      const actingApprove = action?.userId === uid && action.kind === "approve";
      const actingReject = action?.userId === uid && action.kind === "reject";
      const disableAll = !!action;

      const onPrimary = (t as any)?.colors?.onPrimary ?? "#FFFFFF";

      return (
        <View style={{ paddingHorizontal: 16 }}>
          <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
            <View style={styles.cardLeft}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: t.colors.neutral?.[100] ?? t.colors.border }]}>
                  <Ionicons name="person" size={18} color={t.colors.icon?.muted ?? t.colors.textSub} />
                </View>
              )}

              <View style={styles.flex1Min0}>
                <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 2 }]}>신청 대기</Text>
              </View>
            </View>

            <View style={styles.cardRight}>
              {actingApprove || actingReject ? (
                <ActivityIndicator size="small" color={t.colors.primary} />
              ) : (
                <View style={styles.actionsRow}>
                 <Pressable
  onPress={disableAll ? undefined : () => onReject(uid)}
  hitSlop={10}
  style={({ pressed }) => [
    styles.rejectAction,
    { borderColor: t.colors.error, opacity: pressed ? 0.85 : disableAll ? 0.55 : 1 },
  ]}
>
  <Text style={[t.typography.labelSmall, { color: t.colors.error, fontWeight: "800" }]}>거절</Text>
</Pressable>


                  <View style={{ width: 8 }} />

                  <Pressable
                    onPress={disableAll ? undefined : () => onApprove(uid)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.primaryAction,
                      { backgroundColor: t.colors.primary, opacity: pressed ? 0.85 : disableAll ? 0.55 : 1 },
                    ]}
                  >
                    <Text style={[t.typography.labelSmall, { color: onPrimary, fontWeight: "800" }]}>승인</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>
      );
    },
    [t, action, onReject, onApprove]
  );

  const keyExtractor = useCallback((item: ParticipantRow) => String((item as any)?._rowKey ?? getParticipantUserId(item) ?? "row"), []);

  if (loading) {
    return (
      <AppLayout padded={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <TopBar
          title="참여 신청"
          showBack
          onPressBack={() => router.back()}
          showBorder
          showNoti={false}
          renderRight={() => (
            <Pressable
              onPress={loading || refreshing ? undefined : onRefresh}
              hitSlop={10}
              style={{ padding: 4, opacity: loading || refreshing ? 0.5 : 1 }}
            >
              <Ionicons name="refresh" size={22} color={refreshIconColor} />
            </Pressable>
          )}
        />
        <View style={[styles.centerGrow, { paddingBottom: Math.max(16, insets.bottom) }]}>
          <ActivityIndicator size="large" color={t.colors.primary} />
        </View>
      </AppLayout>
    );
  }

  const showList = Boolean(meetingId) && isHost && pending.length > 0;

  return (
    <AppLayout padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <TopBar
        title="참여 신청"
        showBack
        onPressBack={() => router.back()}
        showBorder
        showNoti={false}
        renderRight={() => (
          <Pressable
            onPress={loading || refreshing ? undefined : onRefresh}
            hitSlop={10}
            style={{ padding: 4, opacity: loading || refreshing ? 0.5 : 1 }}
          >
            <Ionicons name="refresh" size={22} color={refreshIconColor} />
          </Pressable>
        )}
      />

      <FlatList
        data={showList ? rows : []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={() => <View>{HeaderTop}</View>}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.primary}
            colors={[t.colors.primary]}
          />
        }
        contentContainerStyle={{
          paddingBottom: Math.max(16, insets.bottom),
          flexGrow: 1,
        }}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  centerGrow: { flex: 1, justifyContent: "center", alignItems: "center" },

  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
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
  flex1Min0: { flex: 1, minWidth: 0 },

  avatarImage: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  actionsRow: { flexDirection: "row", alignItems: "center" },

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
  rejectAction: {
  height: 34,
  paddingHorizontal: 14,
  borderRadius: 10,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
},

});

/*
3줄 요약
- 호스트 판정을 host.id 매칭만 보지 않고 meeting.myState.membershipStatus==="HOST"를 최우선으로 반영했습니다.
- authStore의 me.id/userId/loginId 등과 meeting.host의 다양한 id 필드를 후보군으로 비교해 “호스트인데 권한없음”을 방지합니다.
- load 단계의 hostOk도 동일 로직으로 맞춰서, 호스트면 participants를 정상 로드하도록 수정했습니다.
*/
