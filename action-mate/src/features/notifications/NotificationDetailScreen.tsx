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

/** Participant에서 안전하게 userId / 표시이름을 뽑는 유틸 */
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
  const [actionLoadingUserId, setActionLoadingUserId] = useState<string | null>(null);

  const [meeting, setMeeting] = useState<MeetingPost | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const isHost = useMemo(() => {
    const hostId = (meeting as any)?.host?.id;
    return Boolean(hostId) && String(hostId) === CURRENT_USER_ID;
  }, [meeting]);

  const pending = useMemo(() => participants.filter((p) => p.status === "PENDING"), [participants]);
  const emptyPending = !loading && isHost && pending.length === 0;

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!meetingId) return;
      if (!opts?.silent) setLoading(true);

      try {
        const m = await meetingApi.getMeeting(meetingId);
        setMeeting(m);

        const hostId = (m as any)?.host?.id;
        const host = Boolean(hostId) && String(hostId) === CURRENT_USER_ID;

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
      if (actionLoadingUserId) return;

      setActionLoadingUserId(userId);
      try {
        const updated = await meetingApi.approveParticipant(meetingId, userId);
        // approveParticipant가 "participants list"를 주는 형태라면 그대로 유지
        setParticipants(updated as any);
      } catch (e) {
        console.error(e);
        Alert.alert("오류", "수락 처리에 실패했습니다.");
      } finally {
        setActionLoadingUserId(null);
      }
    },
    [isHost, meetingId, actionLoadingUserId]
  );

  const onReject = useCallback(
    async (userId: string) => {
      if (!isHost) return;
      if (actionLoadingUserId) return;

      Alert.alert("거절할까요?", "이 참여 신청을 거절합니다.", [
        { text: "취소", style: "cancel" },
        {
          text: "거절",
          style: "destructive",
          onPress: async () => {
            setActionLoadingUserId(userId);
            try {
              const updated = await meetingApi.rejectParticipant(meetingId, userId);
              setParticipants(updated as any);
            } catch (e) {
              console.error(e);
              Alert.alert("오류", "거절 처리에 실패했습니다.");
            } finally {
              setActionLoadingUserId(null);
            }
          },
        },
      ]);
    },
    [isHost, meetingId, actionLoadingUserId]
  );

  // ✅ 토큰 기반 summary 배경
  const summaryBg = withAlpha(t.colors.primary, t.mode === "dark" ? 0.18 : 0.08);
  const summaryBorder = withAlpha(t.colors.primary, t.mode === "dark" ? 0.30 : 0.22);

  // ✅ 공용 Empty Card (아이콘 + EmptyView 조합)
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
        <View style={{ alignItems: "center", gap: s.space[2] }}>
          <Ionicons name={icon} size={28} color={t.colors.textSub} />
          <EmptyView title={title} description={desc} />
        </View>
      </Card>
    ),
    [s.space, t.colors.textSub]
  );

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
          <Pressable onPress={onRefresh} hitSlop={10} style={{ padding: s.space[1] }}>
            <Ionicons name="refresh" size={22} color={t.colors.textMain} />
          </Pressable>
        )}
      />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
        ) : (
          <>
            {/* ✅ 헤더 요약: Card 재사용 */}
            <Card style={{ backgroundColor: summaryBg, borderColor: summaryBorder }}>
              <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]} numberOfLines={1}>
                {meeting?.title ?? "모임"}
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center", marginTop: s.space[2] }}>
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
            </Card>

            {/* ✅ 호스트가 아니면 여기서 끝 */}
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
                  const acting = actionLoadingUserId === uid;
                  const disableAll = !!actionLoadingUserId; // 동시에 여러건 처리 방지(원하면 제거)

                  return (
                    <View key={uid} style={{ marginBottom: idx === pending.length - 1 ? 0 : s.space[2] }}>
                      <Card padded={false} style={{ padding: s.space[4] }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]} numberOfLines={1}>
                              {name}
                            </Text>

                            <View style={{ flexDirection: "row", alignItems: "center", marginTop: s.space[1] }}>
                              <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>상태:</Text>
                              <View style={{ width: s.space[2] }} />
                              <Badge label="대기" tone="warning" size="sm" />
                            </View>
                          </View>

                          <View style={{ flexDirection: "row", marginLeft: s.space[3] }}>
                            <Button
                              title="거절"
                              variant="secondary"
                              size="sm"
                              disabled={disableAll}
                              loading={acting}
                              onPress={() => onReject(uid)}
                              style={{ minWidth: 86 }}
                            />
                            <View style={{ width: s.space[2] }} />
                            <Button
                              title="수락"
                              variant="primary"
                              size="sm"
                              disabled={disableAll}
                              loading={acting}
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
});