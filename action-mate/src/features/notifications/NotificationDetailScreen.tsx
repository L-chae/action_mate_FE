// features/notifications/NotificationDetailScreen.tsx
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

type ActionState = { userId: string; kind: "approve" | "reject" } | null;

/** Participant shape이 바뀌어도 화면이 깨지지 않게 "표시용" 값만 안전하게 추출 */
function getParticipantUserId(p: Participant): string {
  const anyP = p as any;
  return String(anyP.userId ?? anyP.memberId ?? anyP.id ?? "");
}
function getParticipantLabel(p: Participant): string {
  const anyP = p as any;
  const uid = getParticipantUserId(p);
  return (
    String(anyP.nickname ?? anyP.name ?? anyP.displayName ?? "") ||
    (uid ? `사용자 ${uid}` : "사용자")
  );
}

export default function NotificationDetailScreen() {
  const t = useAppTheme();
  const s = t.spacing;

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { id } = useLocalSearchParams<{ id?: string }>();
  const meetingId = useMemo(() => String(id ?? ""), [id]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [action, setAction] = useState<ActionState>(null);

  const [meeting, setMeeting] = useState<MeetingPost | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const isHost = useMemo(() => {
    const hostId = (meeting as any)?.host?.id;
    return Boolean(hostId) && String(hostId) === CURRENT_USER_ID;
  }, [meeting]);

  const pending = useMemo(
    () => participants.filter((p) => (p as any)?.status === "PENDING"),
    [participants]
  );

  const emptyPending = !loading && isHost && pending.length === 0;

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      // 의도: 라우트 파라미터가 비었을 때 무한 로딩 방지
      if (!meetingId) {
        setMeeting(null);
        setParticipants([]);
        setLoading(false);
        return;
      }

      if (!opts?.silent) setLoading(true);

      try {
        const m = await meetingApi.getMeeting(meetingId);
        setMeeting(m);

        const hostId = (m as any)?.host?.id;
        const host = Boolean(hostId) && String(hostId) === CURRENT_USER_ID;

        // 의도: 호스트만 신청자 목록을 내려받도록 해서 불필요한 호출/노출 방지
        if (host) {
          const parts = await meetingApi.getParticipants(meetingId);
          setParticipants(parts);
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
    [meetingId]
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
      if (!isHost) return;
      if (action) return;

      setAction({ userId, kind: "approve" });
      try {
        const updated = await meetingApi.approveParticipant(meetingId, userId);
        setParticipants(updated as any);
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
      if (!isHost) return;
      if (action) return;

      Alert.alert("거절할까요?", "이 참여 신청을 거절합니다.", [
        { text: "취소", style: "cancel" },
        {
          text: "거절",
          style: "destructive",
          onPress: async () => {
            setAction({ userId, kind: "reject" });
            try {
              const updated = await meetingApi.rejectParticipant(meetingId, userId);
              setParticipants(updated as any);
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

  // 의도: 요약 영역은 "브랜드 톤"만 살짝 주고, 라이트는 primaryLight를 우선 사용(예측 가능)
  const summaryBg =
    t.mode === "dark" ? withAlpha(t.colors.primary, 0.18) : t.colors.primaryLight;
  const summaryBorder =
    t.mode === "dark"
      ? withAlpha(t.colors.primary, 0.30)
      : withAlpha(t.colors.primary, 0.22);

  const EmptyCard = useCallback(
    ({
      icon,
      title,
      desc,
    }: {
      icon: keyof typeof Ionicons.glyphMap;
      title: string;
      desc: string;
    }) => (
      <Card style={{ marginTop: s.space[3] }}>
        <View style={styles.centerStack}>
          <Ionicons name={icon} size={28} color={t.colors.textSub} />
          <View style={{ height: s.space[2] }} />
          <EmptyView title={title} description={desc} />
        </View>
      </Card>
    ),
    [s.space, t.colors.textSub]
  );

  const refreshIconColor = t.colors.icon?.default ?? t.colors.textMain;

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
            style={{ padding: s.space[1], opacity: loading || refreshing ? 0.5 : 1 }}
          >
            <Ionicons name="refresh" size={22} color={refreshIconColor} />
          </Pressable>
        )}
      />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.primary}
            colors={[t.colors.primary]}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: s.pagePaddingH,
          paddingTop: s.space[4],
          paddingBottom: Math.max(s.space[4], insets.bottom),
          flexGrow: 1,
        }}
      >
        {loading ? (
          <View style={styles.centerGrow}>
            <ActivityIndicator size="large" color={t.colors.primary} />
          </View>
        ) : !meetingId ? (
          <EmptyCard
            icon="alert-circle-outline"
            title="잘못된 접근이에요"
            desc="알림 ID를 확인할 수 없습니다. 다시 시도해 주세요."
          />
        ) : (
          <>
            {/* 요약 헤더: Card/Badge 토큰 기반으로 재사용 */}
            <Card style={{ backgroundColor: summaryBg, borderColor: summaryBorder }}>
              <Text
                style={[t.typography.titleMedium, { color: t.colors.textMain }]}
                numberOfLines={1}
              >
                {meeting?.title ?? "모임"}
              </Text>

              <View style={{ marginTop: s.space[2] }}>
                <View style={styles.rowCenter}>
                  <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>
                    대기 중 신청
                  </Text>
                  <View style={{ width: s.space[2] }} />
                  <Badge
                    label={`${isHost ? pending.length : 0}건`}
                    tone={isHost && pending.length > 0 ? "warning" : "neutral"}
                    size="md"
                  />
                </View>
              </View>
            </Card>

            {/* 호스트가 아니면 처리 UI는 숨김 */}
            {!isHost ? (
              <EmptyCard
                icon="lock-closed-outline"
                title="호스트만 볼 수 있어요"
                desc="이 화면은 참여 신청 처리(수락/거절) 전용입니다."
              />
            ) : emptyPending ? (
              <EmptyCard
                icon="checkmark-circle-outline"
                title="처리할 신청이 없어요"
                desc="새 참여 신청이 들어오면 여기에 표시됩니다."
              />
            ) : (
              <View style={{ marginTop: s.space[3] }}>
                {pending.map((p, idx) => {
                  const uid = getParticipantUserId(p);
                  const name = getParticipantLabel(p);

                  const actingApprove =
                    action?.userId === uid && action.kind === "approve";
                  const actingReject = action?.userId === uid && action.kind === "reject";

                  // 의도: 동시에 여러건 처리 방지(초기 앱에서는 단순한 UX가 안전)
                  const disableAll = !!action;

                  return (
                    <View
                      key={uid ? `p-${uid}` : `p-idx-${idx}`}
                      style={{
                        marginBottom: idx === pending.length - 1 ? 0 : s.space[2],
                      }}
                    >
                      <Card padded={false} style={{ padding: s.space[4] }}>
                        <View style={styles.rowTop}>
                          <View style={styles.flex1Min0}>
                            <Text
                              style={[
                                t.typography.labelLarge,
                                { color: t.colors.textMain },
                              ]}
                              numberOfLines={1}
                            >
                              {name}
                            </Text>

                            <View style={{ height: s.space[1] }} />

                            <View style={styles.rowCenter}>
                              <Text
                                style={[
                                  t.typography.bodySmall,
                                  { color: t.colors.textSub },
                                ]}
                              >
                                상태:
                              </Text>
                              <View style={{ width: s.space[2] }} />
                              <Badge label="대기" tone="warning" size="sm" />
                            </View>
                          </View>

                          <View style={{ width: s.space[3] }} />

                          <View style={styles.actionsRow}>
                            <Button
                              title="거절"
                              variant="secondary"
                              size="sm"
                              disabled={disableAll}
                              loading={actingReject}
                              onPress={() => onReject(uid)}
                              style={{ minWidth: 86 }}
                            />
                            <View style={{ width: s.space[2] }} />
                            <Button
                              title="수락"
                              variant="primary"
                              size="sm"
                              disabled={disableAll}
                              loading={actingApprove}
                              onPress={() => onApprove(uid)}
                              style={{ minWidth: 86 }}
                            />
                          </View>
                        </View>
                      </Card>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  centerGrow: { flex: 1, justifyContent: "center", alignItems: "center" },
  // gap 대신 명시적 spacing(View height/width)로 처리해 RN 버전 차이 리스크 감소
  centerStack: { alignItems: "center" },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  rowTop: { flexDirection: "row", alignItems: "center" },
  flex1Min0: { flex: 1, minWidth: 0 },
  actionsRow: { flexDirection: "row", alignItems: "center" },
});