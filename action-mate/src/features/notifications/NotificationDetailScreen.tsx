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
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";

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
          // ✅ 호스트가 아니면 참여자 목록 자체를 안 가져오고 빈 배열
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

      setActionLoadingUserId(userId);
      try {
        const updated = await meetingApi.approveParticipant(meetingId, userId);
        setParticipants(updated);
      } catch (e) {
        console.error(e);
        Alert.alert("오류", "수락 처리에 실패했습니다.");
      } finally {
        setActionLoadingUserId(null);
      }
    },
    [isHost, meetingId]
  );

  const onReject = useCallback(
    async (userId: string) => {
      if (!isHost) return;

      Alert.alert("거절할까요?", "이 참여 신청을 거절합니다.", [
        { text: "취소", style: "cancel" },
        {
          text: "거절",
          style: "destructive",
          onPress: async () => {
            setActionLoadingUserId(userId);
            try {
              const updated = await meetingApi.rejectParticipant(meetingId, userId);
              setParticipants(updated);
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
    [isHost, meetingId]
  );

  const emptyPending = !loading && pending.length === 0;

  return (
    <AppLayout padded={false}>
      <TopBar
        title="참여 신청"
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
          flexGrow: 1,
        }}
      >
        {loading ? (
          <View style={styles.centerGrow}>
            <ActivityIndicator size="large" color={t.colors.primary} />
          </View>
        ) : (
          <>
            {/* 헤더 요약 */}
            <View
              style={[
                styles.summary,
                {
                  backgroundColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.18 : 0.08),
                  borderColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.3 : 0.22),
                },
              ]}
            >
              <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]} numberOfLines={1}>
                {meeting?.title ?? "모임"}
              </Text>

              <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 8 }]}>
                대기 중 신청 {isHost ? pending.length : 0}건
              </Text>
            </View>

            {/* ✅ 호스트가 아니면 여기서 끝 */}
            {!isHost ? (
              <View style={[styles.emptyBox, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                <Ionicons name="lock-closed-outline" size={28} color={t.colors.textSub} />
                <Text style={[t.typography.titleSmall, { marginTop: 10, color: t.colors.textMain }]}>
                  호스트만 볼 수 있어요
                </Text>
                <Text
                  style={[
                    t.typography.bodySmall,
                    { marginTop: 6, color: t.colors.textSub, textAlign: "center" },
                  ]}
                >
                  이 화면은 참여 신청 처리(수락/거절) 전용입니다.
                </Text>
              </View>
            ) : emptyPending ? (
              <View style={[styles.emptyBox, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                <Ionicons name="checkmark-circle-outline" size={28} color={t.colors.textSub} />
                <Text style={[t.typography.titleSmall, { marginTop: 10, color: t.colors.textMain }]}>
                  처리할 신청이 없어요
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
                {pending.map((p) => {
                  const uid = getParticipantUserId(p);
                  const name = getParticipantLabel(p);
                  const acting = actionLoadingUserId === uid;

                  return (
                    <View
                      key={uid}
                      style={[
                        styles.card,
                        { backgroundColor: t.colors.surface, borderColor: t.colors.border },
                      ]}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]}>
                          상태: 대기
                        </Text>
                      </View>

                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Pressable
                          disabled={acting}
                          onPress={() => onReject(uid)}
                          style={({ pressed }) => [
                            styles.actionBtn,
                            {
                              backgroundColor: withAlpha(t.colors.textSub, t.mode === "dark" ? 0.18 : 0.1),
                              opacity: pressed ? 0.9 : 1,
                            },
                          ]}
                        >
                          {acting ? (
                            <ActivityIndicator />
                          ) : (
                            <Text style={[t.typography.labelMedium, { color: t.colors.textMain }]}>거절</Text>
                          )}
                        </Pressable>

                        <Pressable
                          disabled={acting}
                          onPress={() => onApprove(uid)}
                          style={({ pressed }) => [
                            styles.actionBtn,
                            {
                              backgroundColor: t.colors.primary,
                              opacity: pressed ? 0.9 : 1,
                            },
                          ]}
                        >
                          {acting ? (
                            <ActivityIndicator color="white" />
                          ) : (
                            <Text style={[t.typography.labelMedium, { color: "white" }]}>수락</Text>
                          )}
                        </Pressable>
                      </View>
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

  actionBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
  },
});
