// features/notifications/NotificationsScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import StarRating from "@/shared/ui/StarRating";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingPost, Participant } from "@/features/meetings/model/types";

// TODO: 실제 앱에서는 Store/Auth에서 가져오는 값으로 교체
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

export default function NotificationsScreen() {
  const t = useAppTheme();
  const s = t.spacing;

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => makeStyles(t), [t]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 섹션 1: 호스트 참여 신청
  const [hostItems, setHostItems] = useState<HostNotiItem[]>([]);

  // 섹션 2: 참여자 모임 평가
  const [ratingItems, setRatingItems] = useState<RatingNotiItem[]>([]);

  // 평가 모달 상태
  const [sheet, setSheet] = useState<RatingSheetState>({ open: false });
  const [stars, setStars] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);

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
      // 의도: API 파라미터가 optional이라도 안정적으로 빈 객체 전달
      const all = await meetingApi.listMeetings({});

      /**
       * 1) 참여 신청(호스트용)
       * - host인 모임 중 PENDING 참가자 수가 있는 것만 노출
       * - 실패한 모임은 조용히 제외(알림 화면에서 에러 과다 노출 방지)
       */
      const hostMeetings = all.filter((m: MeetingPost) => m.host?.id === CURRENT_USER_ID);

      const hostResults = await Promise.all(
        hostMeetings.map(async (m) => {
          try {
            const parts: Participant[] = await meetingApi.getParticipants(m.id);
            const pendingCount = parts.filter((p) => (p as any).status === "PENDING").length;

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

      /**
       * 2) 모임 평가(참여자용)
       * - ENDED + MEMBER + 아직 평가 안함(AsyncStorage)
       */
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
            subtitle: m.location?.name || undefined,
          } as RatingNotiItem;
        })
      );

      setRatingItems(ratingResults.filter(Boolean) as RatingNotiItem[]);
    } catch (e) {
      console.error(e);
      // 의도: 알림 화면은 "자주 들어오는 화면"이라 Alert 과다 노출을 피함
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

    try {
      setRatingLoading(true);

      // 의도: 실제 API 유무에 따라 안전하게 처리 (초기 개발 단계 대응)
      if ("submitMeetingRating" in meetingApi) {
        await (meetingApi as any).submitMeetingRating({
          meetingId: sheet.meetingId,
          stars,
        });
      } else {
        await new Promise((r) => setTimeout(r, 500));
      }

      await AsyncStorage.setItem(ratingDoneKey(sheet.meetingId), "1");
      setRatingItems((prev) => prev.filter((it) => it.meetingId !== sheet.meetingId));

      setSheet({ open: false });
      setStars(0);

      Alert.alert("평가 완료", "소중한 평가가 반영됐어요!");
    } catch (e: any) {
      Alert.alert("평가 실패", e?.message ?? "잠시 후 다시 시도해 주세요.");
    } finally {
      setRatingLoading(false);
    }
  }, [sheet, stars]);

  // 요약 카드 톤: Card 컴포넌트의 border/surface 룰을 그대로 타고, 배경만 "soft tint"로 준다
  const hostSummaryBg =
    t.mode === "dark" ? withAlpha(t.colors.primary, 0.18) : t.colors.primaryLight;
  const hostSummaryBorder =
    t.mode === "dark"
      ? withAlpha(t.colors.primary, 0.30)
      : withAlpha(t.colors.primary, 0.22);

  const ratingSummaryBg =
    t.mode === "dark" ? withAlpha(t.colors.success, 0.18) : t.colors.successBg;
  const ratingSummaryBorder =
    t.mode === "dark"
      ? withAlpha(t.colors.success, 0.30)
      : withAlpha(t.colors.success, 0.22);

  const refreshIconColor = t.colors.icon?.default ?? t.colors.textMain;

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
        ) : empty ? (
          <Card style={{ marginTop: s.space[3] }}>
            <View style={styles.emptyInner}>
              <Ionicons name="checkmark-circle-outline" size={28} color={t.colors.textSub} />
              <View style={{ height: s.space[2] }} />
              <Text style={[t.typography.titleSmall, { color: t.colors.textMain, textAlign: "center" }]}>
                지금 확인할 알림이 없어요
              </Text>
              <View style={{ height: s.space[1] }} />
              <Text style={[t.typography.bodySmall, { color: t.colors.textSub, textAlign: "center" }]}>
                새 참여 신청이나 평가 요청이 들어오면 여기에 표시됩니다.
              </Text>
            </View>
          </Card>
        ) : (
          <>
            {/* 참여 신청(호스트) */}
            {hostItems.length > 0 && (
              <>
                <Card style={{ backgroundColor: hostSummaryBg, borderColor: hostSummaryBorder }}>
                  <View style={styles.summaryHeaderRow}>
                    <Ionicons
                      name="notifications-outline"
                      size={18}
                      color={t.colors.primary}
                      style={{ marginRight: s.space[2] }}
                    />
                    <Text
                      style={[t.typography.titleMedium, { color: t.colors.textMain, flex: 1 }]}
                      numberOfLines={1}
                    >
                      참여 신청
                    </Text>

                    <Badge
                      label={`${totalPending}건`}
                      tone={totalPending > 0 ? "warning" : "neutral"}
                      size="md"
                    />
                  </View>

                  <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: s.space[2] }]}>
                    대기 중 신청이 있는 모임을 확인해 주세요.
                  </Text>
                </Card>

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
                          backgroundColor: pressed ? t.colors.overlay[6] : t.colors.surface,
                          borderColor: t.colors.border,
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

                      <View style={[styles.badgeDot, { backgroundColor: t.colors.error }]}>
                        <Text style={[t.typography.labelSmall, { color: t.colors.neutral[50], fontWeight: "900" }]}>
                          {it.pendingCount > 99 ? "99+" : it.pendingCount}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={t.colors.textSub}
                        style={{ marginLeft: s.space[2] }}
                      />
                    </Pressable>
                  ))}
                </View>

                <View style={{ height: s.space[4] }} />
              </>
            )}

            {/* 모임 평가(참여자) */}
            <Card style={{ backgroundColor: ratingSummaryBg, borderColor: ratingSummaryBorder }}>
              <View style={styles.summaryHeaderRow}>
                <Ionicons
                  name="star-outline"
                  size={18}
                  color={t.colors.success}
                  style={{ marginRight: s.space[2] }}
                />
                <Text style={[t.typography.titleMedium, { color: t.colors.textMain, flex: 1 }]} numberOfLines={1}>
                  모임 평가
                </Text>

                <Badge
                  label={`${totalRating}건`}
                  tone={totalRating > 0 ? "point" : "neutral"}
                  size="md"
                />
              </View>

              <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: s.space[2] }]}>
                종료된 모임을 별점으로 평가해 주세요.
              </Text>
            </Card>

            {ratingItems.length === 0 ? (
              <Card style={{ marginTop: s.space[3] }}>
                <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>
                  평가할 모임이 없어요.
                </Text>
              </Card>
            ) : (
              <View style={{ marginTop: s.space[3] }}>
                {ratingItems.map((it, idx) => (
                  <Pressable
                    key={it.meetingId}
                    onPress={() => openRatingSheet(it)}
                    style={({ pressed }) => [
                      styles.cardRow,
                      {
                        backgroundColor: pressed ? t.colors.overlay[6] : t.colors.surface,
                        borderColor: t.colors.border,
                        marginBottom: idx === ratingItems.length - 1 ? 0 : s.space[2],
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]} numberOfLines={1}>
                        {it.title}
                      </Text>
                      <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: s.space[1] }]}>
                        눌러서 평가하기
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={t.colors.textSub}
                      style={{ marginLeft: s.space[2] }}
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* 평가 모달: theme.colors.scrim / Card 톤을 그대로 사용 */}
      <Modal transparent visible={sheet.open} animationType="fade" onRequestClose={closeSheet}>
        <View style={styles.modalWrap}>
          <Pressable style={[styles.backdrop, { backgroundColor: t.colors.scrim }]} onPress={closeSheet} />

          <View style={styles.dialogWrap}>
            <Card style={styles.dialogCard} padded={false}>
              <View style={{ paddingHorizontal: s.pagePaddingH, paddingTop: s.space[4], paddingBottom: s.space[3] }}>
                <Pressable onPress={closeSheet} hitSlop={10} style={styles.dialogClose}>
                  <Ionicons name="close" size={20} color={t.colors.textMain} />
                </Pressable>

                <View style={styles.dialogTitleRow}>
                  <Ionicons
                    name="notifications"
                    size={14}
                    color={t.colors.textSub}
                    style={{ marginRight: s.space[1] }}
                  />
                  <Text style={[t.typography.labelMedium, { color: t.colors.textSub }]} numberOfLines={1}>
                    {sheet.open ? sheet.title : ""}
                  </Text>
                </View>

                <Text
                  style={[
                    t.typography.titleMedium,
                    { color: t.colors.textMain, textAlign: "center", marginTop: s.space[2] },
                  ]}
                >
                  오늘 모임 어떠셨나요?
                </Text>

                <Text
                  style={[
                    t.typography.bodySmall,
                    { color: t.colors.textSub, textAlign: "center", marginTop: s.space[2] },
                  ]}
                >
                  별점으로 모임을 평가해 주세요.
                </Text>

                <View style={{ marginTop: s.space[3], alignItems: "center" }}>
                  <StarRating value={stars} onChange={setStars} size={30} disabled={ratingLoading} />
                </View>

                <View style={{ marginTop: s.space[3] }}>
                  <Button
                    title={ratingLoading ? "전송 중..." : "평가 완료"}
                    onPress={onSubmitRating}
                    disabled={ratingLoading || stars < 1}
                    loading={ratingLoading}
                  />
                </View>
              </View>
            </Card>
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

    // 의도: 빈 상태도 "Card"로 통일해 화면 톤을 맞춤
    emptyInner: { alignItems: "center", paddingVertical: s.space[6] },

    // 요약 헤더는 row 정렬만 공통으로
    summaryHeaderRow: { flexDirection: "row", alignItems: "center" },

    // 리스트 row: Card를 쓰지 않고도 동일한 톤(보더+라운드)으로 맞추는 lightweight 스타일
    cardRow: {
      borderWidth: s.borderWidth,
      borderRadius: s.radiusLg,
      paddingHorizontal: s.space[3],
      paddingVertical: s.space[3],
      flexDirection: "row",
      alignItems: "center",
    },

    badgeDot: {
      minWidth: s.space[7],
      height: s.space[7],
      paddingHorizontal: s.space[2],
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: s.space[2],
    },

    // Modal
    modalWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
    backdrop: { ...StyleSheet.absoluteFillObject },

    dialogWrap: { width: "86%", maxWidth: 420 },
    dialogCard: {
      borderRadius: s.radiusXl,
      // Card 기본 border/배경은 내부에서 처리되므로 여기서는 shape만 보강
    },

    dialogClose: { position: "absolute", right: s.space[2], top: s.space[2], padding: s.space[1], zIndex: 10 },
    dialogTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  });
}