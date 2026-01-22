import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";

import { Button } from "@/shared/ui/Button";
import StarRating from "@/shared/ui/StarRating";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingPost, Participant } from "@/features/meetings/model/types";

// ✅ 임시(추후 store로 교체)
const CURRENT_USER_ID = "me";
const ratingDoneKey = (meetingId: string) => `meeting_rating_done:${meetingId}`;

type HostNotiItem = {
  meetingId: string;
  title: string;
  pendingCount: number;
};

type RatingNotiItem = {
  meetingId: string;
  title: string;
  subtitle?: string;
};

type RatingSheetState =
  | { open: false }
  | { open: true; meetingId: string; title: string; subtitle?: string };

function stripEndedPrefix(title: string) {
  return title.replace(/^\(종료\)\s*/g, "").trim();
}

export default function NotificationsScreen() {
  const t = useAppTheme();
  const s = t.spacing;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => makeStyles(t), [t]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ 섹션 1: 호스트 참여 신청
  const [hostItems, setHostItems] = useState<HostNotiItem[]>([]);

  // ✅ 섹션 2: 참여자 모임 평가
  const [ratingItems, setRatingItems] = useState<RatingNotiItem[]>([]);

  // ✅ 평가 모달 상태
  const [sheet, setSheet] = useState<RatingSheetState>({ open: false });
  const [stars, setStars] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);

  const closeGuardRef = useRef(false);

  const totalPending = useMemo(
    () => hostItems.reduce((sum, it) => sum + it.pendingCount, 0),
    [hostItems]
  );
  const totalRating = useMemo(() => ratingItems.length, [ratingItems]);

  const closeSheet = useCallback(() => {
    if (ratingLoading) return;
    setSheet({ open: false });
    setStars(0);
  }, [ratingLoading]);

  const openRatingSheet = useCallback((item: RatingNotiItem) => {
    setSheet({
      open: true,
      meetingId: item.meetingId,
      title: item.title,
      subtitle: item.subtitle,
    });
    setStars(0);
  }, []);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);

    try {
      const all = await meetingApi.listMeetings({});

      // =========================
      // 1) 참여 신청(호스트용)
      // =========================
      const hostMeetings = all.filter((m: MeetingPost) => m.host?.id === CURRENT_USER_ID);

      const hostResults = await Promise.all(
        hostMeetings.map(async (m) => {
          try {
            const parts: Participant[] = await meetingApi.getParticipants(String(m.id));
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

      const hostFiltered = hostResults.filter(Boolean) as HostNotiItem[];
      hostFiltered.sort((a, b) => b.pendingCount - a.pendingCount);
      setHostItems(hostFiltered);

      // =========================
      // 2) 모임 평가(참여자용)
      // - ENDED + MEMBER + 아직 평가 안함
      // =========================
      const candidates = all.filter((m: MeetingPost) => {
        const statusAny = (m as any).status;
        const membership = (m as any).myState?.membershipStatus;
        return statusAny === "ENDED" && membership === "MEMBER";
      });

      const ratingResults = await Promise.all(
        candidates.map(async (m) => {
          const meetingId = String(m.id);
          const done = await AsyncStorage.getItem(ratingDoneKey(meetingId));
          if (done === "1") return null;

          return {
            meetingId,
            title: m.title,
            // ✅ 목업/실서버 혼용 대응
            subtitle: (m as any).location?.name ?? (m as any).locationText ?? undefined,
          } as RatingNotiItem;
        })
      );

      setRatingItems(ratingResults.filter(Boolean) as RatingNotiItem[]);
    } catch (e) {
      console.error(e);
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

  const empty = useMemo(
    () => !loading && hostItems.length === 0 && ratingItems.length === 0,
    [loading, hostItems.length, ratingItems.length]
  );

  const onSubmitRating = useCallback(async () => {
    if (!sheet.open) return;

    if (stars < 1) {
      Alert.alert("별점을 선택해 주세요", "최소 1점부터 평가할 수 있어요.");
      return;
    }

    if (closeGuardRef.current) return;
    closeGuardRef.current = true;

    try {
      setRatingLoading(true);

      if ("submitMeetingRating" in meetingApi) {
        await (meetingApi as any).submitMeetingRating({ meetingId: sheet.meetingId, stars });
      } else {
        await new Promise((r) => setTimeout(r, 500));
      }

      await AsyncStorage.setItem(ratingDoneKey(sheet.meetingId), "1");
      setRatingItems((prev) => prev.filter((it) => it.meetingId !== sheet.meetingId));

      // ✅ UX: 모달 먼저 닫고 -> 살짝 뒤에 완료 피드백
      setSheet({ open: false });
      setStars(0);

      setTimeout(() => {
        Alert.alert("평가 완료", "소중한 평가가 반영됐어요!");
      }, 180);
    } catch (e: any) {
      Alert.alert("평가 실패", e?.message ?? "잠시 후 다시 시도해 주세요.");
    } finally {
      setRatingLoading(false);
      closeGuardRef.current = false;
    }
  }, [sheet, stars]);

  const modalTitle = sheet.open ? stripEndedPrefix(sheet.title) : "";

  return (
    <AppLayout padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <TopBar
        title="알림"
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
        ) : empty ? (
          <View style={[styles.emptyBox, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
            <Ionicons name="checkmark-circle-outline" size={28} color={t.colors.textSub} />
            <Text style={[t.typography.titleSmall, { marginTop: s.space[2], color: t.colors.textMain }]}>
              지금 확인할 알림이 없어요
            </Text>
            <Text style={[t.typography.bodySmall, { marginTop: s.space[1], color: t.colors.textSub, textAlign: "center" }]}>
              새 참여 신청이나 평가 요청이 들어오면 여기에 표시됩니다.
            </Text>
          </View>
        ) : (
          <>
            {/* ✅ 참여 신청 */}
            {hostItems.length > 0 && (
              <>
                <View
                  style={[
                    styles.summary,
                    {
                      backgroundColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.18 : 0.08),
                      borderColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.3 : 0.22),
                    },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name="notifications-outline"
                      size={18}
                      color={t.colors.primary}
                      style={{ marginRight: s.space[2] }}
                    />
                    <Text style={[t.typography.titleMedium, { color: t.colors.textMain, flex: 1 }]} numberOfLines={1}>
                      참여 신청
                    </Text>
                  </View>

                  <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: s.space[2] }]}>
                    대기 중 신청 {totalPending}건
                  </Text>
                </View>

                <View style={{ marginTop: s.space[3] }}>
                  {hostItems.map((it, idx) => (
                    <Pressable
                      key={it.meetingId}
                      onPress={() =>
                        router.push({
                          pathname: "/notifications/[id]",
                          params: { id: it.meetingId },
                        })
                      }
                      style={({ pressed }) => [
                        styles.cardRow,
                        {
                          backgroundColor: t.colors.surface,
                          borderColor: t.colors.border,
                          opacity: pressed ? 0.92 : 1,
                          marginBottom: idx === hostItems.length - 1 ? 0 : s.space[2],
                        },
                      ]}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]} numberOfLines={1}>
                          {it.title}
                        </Text>
                        <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: s.space[1] }]}>
                          대기 {it.pendingCount}명
                        </Text>
                      </View>

                      <View style={[styles.badge, { backgroundColor: t.colors.error }]}>
                        <Text style={[t.typography.labelSmall, { color: t.colors.neutral[50], fontWeight: "900" }]}>
                          {it.pendingCount > 99 ? "99+" : it.pendingCount}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={t.colors.icon.muted}
                        style={{ marginLeft: s.space[2] }}
                      />
                    </Pressable>
                  ))}
                </View>

                <View style={{ height: s.space[4] }} />
              </>
            )}

            {/* ✅ 모임 평가 */}
            <View
              style={[
                styles.summary,
                {
                  backgroundColor: withAlpha(t.colors.success, t.mode === "dark" ? 0.18 : 0.08),
                  borderColor: withAlpha(t.colors.success, t.mode === "dark" ? 0.3 : 0.22),
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="star-outline" size={18} color={t.colors.success} style={{ marginRight: s.space[2] }} />
                <Text style={[t.typography.titleMedium, { color: t.colors.textMain, flex: 1 }]} numberOfLines={1}>
                  모임 평가
                </Text>
              </View>

              <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: s.space[2] }]}>
                평가할 모임 {totalRating}건
              </Text>
            </View>

            {ratingItems.length === 0 ? (
              <View style={[styles.sectionEmpty, { borderColor: t.colors.border, backgroundColor: t.colors.surface }]}>
                <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>평가할 모임이 없어요.</Text>
              </View>
            ) : (
              <View style={{ marginTop: s.space[3] }}>
                {ratingItems.map((it, idx) => (
                  <Pressable
                    key={it.meetingId}
                    onPress={() => openRatingSheet(it)}
                    style={({ pressed }) => [
                      styles.cardRow,
                      {
                        backgroundColor: t.colors.surface,
                        borderColor: t.colors.border,
                        opacity: pressed ? 0.92 : 1,
                        marginBottom: idx === ratingItems.length - 1 ? 0 : s.space[2],
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]} numberOfLines={1}>
                        {stripEndedPrefix(it.title)}
                      </Text>
                      <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: s.space[1] }]}>
                        눌러서 평가하기
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={t.colors.icon.muted}
                      style={{ marginLeft: s.space[2] }}
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ✅ 평가 모달: 가운데 카드(이모지 중복 없음) */}
      <Modal transparent visible={sheet.open} animationType="fade" onRequestClose={closeSheet}>
        <View style={styles.modalWrap}>
          <Pressable style={[styles.backdrop, { backgroundColor: t.colors.overlay[55] }]} onPress={closeSheet} />

          <View style={[styles.dialog, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
            <Pressable onPress={closeSheet} hitSlop={10} style={styles.dialogClose}>
              <Ionicons name="close" size={20} color={t.colors.textMain} />
            </Pressable>

            {/* ✅ 상단 라벨: 제목만 + 종료 pill (이모지 중복 제거) */}
            <View style={styles.modalTopRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[t.typography.labelMedium, { color: t.colors.textSub }]} numberOfLines={1}>
                  {modalTitle}
                </Text>
              </View>

              <View style={[styles.endedPill, { backgroundColor: t.colors.overlay[8], borderColor: t.colors.border }]}>
                <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>종료</Text>
                </View>
            </View>

            <Text style={[t.typography.titleLarge, { color: t.colors.textMain, textAlign: "center", marginTop: s.space[3] }]}>
              오늘 모임은 어땠어요?
            </Text>

            <Text style={[t.typography.bodySmall, { color: t.colors.textSub, textAlign: "center", marginTop: s.space[3] }]}>
              별을 눌러 평가해 주세요
            </Text>

            <View style={{ marginTop: s.space[3], alignItems: "center" }}>
              <StarRating value={stars} onChange={setStars} size={32} disabled={ratingLoading} />
            </View>

            <View style={{ marginTop: s.space[4] }}>
              <Button
                title={ratingLoading ? "전송 중..." : "평가 완료"}
                onPress={onSubmitRating}
                disabled={ratingLoading || stars < 1}
                loading={ratingLoading}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

function makeStyles(t: ReturnType<typeof useAppTheme>) {
  const s = t.spacing;

  return StyleSheet.create({
    centerGrow: { flex: 1, justifyContent: "center", alignItems: "center" },

    summary: {
      borderWidth: s.borderWidth,
      borderRadius: s.radiusLg,
      padding: s.space[3],
    },

    emptyBox: {
      marginTop: s.space[3],
      borderWidth: s.borderWidth,
      borderRadius: s.radiusLg,
      paddingVertical: s.space[6],
      paddingHorizontal: s.pagePaddingH,
      alignItems: "center",
    },

    sectionEmpty: {
      marginTop: s.space[3],
      borderWidth: s.borderWidth,
      borderRadius: s.radiusLg,
      paddingVertical: s.space[3],
      paddingHorizontal: s.space[3],
      alignItems: "center",
    },

    cardRow: {
      borderWidth: s.borderWidth,
      borderRadius: s.radiusLg,
      paddingHorizontal: s.space[3],
      paddingVertical: s.space[3],
      flexDirection: "row",
      alignItems: "center",
    },

    badge: {
      minWidth: s.space[7],
      height: s.space[7],
      paddingHorizontal: s.space[2],
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: s.space[2],
    },

    modalWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
    backdrop: { ...StyleSheet.absoluteFillObject },

    dialog: {
      width: "88%",
      maxWidth: 420,
      borderWidth: s.borderWidth,
      borderRadius: s.radiusXl,
      paddingHorizontal: s.pagePaddingH,
      paddingTop: s.space[3],
      paddingBottom: s.space[3],
    },

    dialogClose: {
      position: "absolute",
      right: s.space[2],
      top: s.space[2],
      padding: s.space[1],
      zIndex: 10,
    },

    modalTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: s.space[2],
      paddingRight: s.space[6], // X 버튼 영역 간섭 방지
    },

    endedPill: {
      borderWidth: s.borderWidth,
      borderRadius: 999,
      paddingHorizontal: s.space[2],
      paddingVertical: 2,
    },
  });
}
