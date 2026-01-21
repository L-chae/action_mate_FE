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
import { useRouter } from "expo-router";
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
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ 섹션 1: 호스트 참여 신청
  const [hostItems, setHostItems] = useState<HostNotiItem[]>([]);

  // ✅ 섹션 2: 참여자 모임 평가(제목만)
  const [ratingItems, setRatingItems] = useState<RatingNotiItem[]>([]);

  // ✅ 평가 모달 상태
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
      const all = await meetingApi.listMeetings(undefined);

      // =========================
      // 1) 참여 신청(호스트용)
      // =========================
      const hostMeetings = all.filter((m: MeetingPost) => m.host?.id === CURRENT_USER_ID);

      const hostResults = await Promise.all(
        hostMeetings.map(async (m) => {
          try {
            const parts: Participant[] = await meetingApi.getParticipants(m.id);
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
      // - 리스트: 제목만
      // - 누르면 "가운데 모달"로 평가
      // 조건: ENDED + 내가 MEMBER + 아직 평가 안함
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
            subtitle: m.locationText || undefined,
          } as RatingNotiItem;
        })
      );

      setRatingItems(ratingResults.filter(Boolean) as RatingNotiItem[]);
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "알림 정보를 불러오지 못했습니다.");
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

      await meetingApi.submitMeetingRating({ meetingId: sheet.meetingId, stars });

      await AsyncStorage.setItem(ratingDoneKey(sheet.meetingId), "1");

      setRatingItems((prev) => prev.filter((it) => it.meetingId !== sheet.meetingId));

      setRatingLoading(false);
      setSheet({ open: false });
      setStars(0);

      Alert.alert("평가 완료", "소중한 평가가 반영됐어요!");
    } catch (e: any) {
      setRatingLoading(false);
      Alert.alert("평가 실패", e?.message ?? "잠시 후 다시 시도해 주세요.");
    }
  }, [sheet, stars]);

  return (
    <AppLayout padded={false}>
      <TopBar
        title="알림"
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
        ) : empty ? (
          <View style={[styles.emptyBox, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
            <Ionicons name="checkmark-circle-outline" size={28} color={t.colors.textSub} />
            <Text style={[t.typography.titleSmall, { marginTop: 10, color: t.colors.textMain }]}>
              지금 확인할 알림이 없어요
            </Text>
            <Text
              style={[
                t.typography.bodySmall,
                { marginTop: 6, color: t.colors.textSub, textAlign: "center" },
              ]}
            >
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
                      borderColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.30 : 0.22),
                    },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="notifications-outline" size={18} color={t.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={[t.typography.titleMedium, { color: t.colors.textMain, flex: 1 }]} numberOfLines={1}>
                      참여 신청
                    </Text>
                  </View>

                  <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 8 }]}>
                    대기 중 신청 {totalPending}건
                  </Text>
                </View>

                <View style={{ marginTop: 12, gap: 10 }}>
                  {hostItems.map((it) => (
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
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]} numberOfLines={1}>
                          {it.title}
                        </Text>
                        <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]}>
                          대기 {it.pendingCount}명
                        </Text>
                      </View>

                      <View style={[styles.badge, { backgroundColor: t.colors.error }]}>
                        <Text style={{ color: "white", fontSize: 12, fontWeight: "900" }}>
                          {it.pendingCount > 99 ? "99+" : it.pendingCount}
                        </Text>
                      </View>

                      <Ionicons name="chevron-forward" size={20} color={t.colors.textSub} style={{ marginLeft: 8 }} />
                    </Pressable>
                  ))}
                </View>

                <View style={{ height: 18 }} />
              </>
            )}

            {/* ✅ 모임 평가 */}
            <View
              style={[
                styles.summary,
                {
                  backgroundColor: withAlpha(t.colors.success, t.mode === "dark" ? 0.18 : 0.08),
                  borderColor: withAlpha(t.colors.success, t.mode === "dark" ? 0.30 : 0.22),
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="star-outline" size={18} color={t.colors.success} style={{ marginRight: 8 }} />
                <Text style={[t.typography.titleMedium, { color: t.colors.textMain, flex: 1 }]} numberOfLines={1}>
                  모임 평가
                </Text>
              </View>

              <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 8 }]}>
                평가할 모임 {totalRating}건
              </Text>
            </View>

            {ratingItems.length === 0 ? (
              <View style={[styles.sectionEmpty, { borderColor: t.colors.border, backgroundColor: t.colors.surface }]}>
                <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>평가할 모임이 없어요.</Text>
              </View>
            ) : (
              <View style={{ marginTop: 12, gap: 10 }}>
                {ratingItems.map((it) => (
                  <Pressable
                    key={it.meetingId}
                    onPress={() => openRatingSheet(it)}
                    style={({ pressed }) => [
                      styles.cardRow,
                      {
                        backgroundColor: t.colors.surface,
                        borderColor: t.colors.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]} numberOfLines={1}>
                        {it.title}
                      </Text>
                      <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]}>
                        눌러서 평가하기
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color={t.colors.textSub} style={{ marginLeft: 8 }} />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* =======================================================
          ✅ 평가 모달: 가운데 카드 (스샷처럼)
         ======================================================= */}
      <Modal transparent visible={sheet.open} animationType="fade" onRequestClose={closeSheet}>
        <View style={styles.modalWrap}>
          {/* backdrop */}
          <Pressable
            style={[
              styles.backdrop,
              { backgroundColor: withAlpha("#000", t.mode === "dark" ? 0.65 : 0.45) as any },
            ]}
            onPress={closeSheet}
          />

          {/* dialog */}
          <View
            style={[
              styles.dialog,
              {
                backgroundColor: t.colors.surface,
                borderColor: t.colors.border,
              },
            ]}
          >
            {/* close */}
            <Pressable onPress={closeSheet} hitSlop={10} style={styles.dialogClose}>
              <Ionicons name="close" size={20} color={t.colors.textMain} />
            </Pressable>

            {/* title row */}
            <View style={styles.dialogTitleRow}>
              <Ionicons name="notifications" size={14} color={t.colors.textSub} style={{ marginRight: 6 }} />
              <Text style={[t.typography.labelMedium, { color: t.colors.textSub }]} numberOfLines={1}>
                {sheet.open ? sheet.title : ""}
              </Text>
            </View>

            <Text style={[t.typography.titleMedium, { color: t.colors.textMain, textAlign: "center", marginTop: 6 }]}>
              오늘 모임 어떠셨나요?
            </Text>

            <Text
              style={[
                t.typography.bodySmall,
                { color: t.colors.textSub, textAlign: "center", marginTop: 8 },
              ]}
            >
              별점으로 모임을 평가해 주세요.
            </Text>

            <View style={{ marginTop: 12, alignItems: "center" }}>
              <StarRating value={stars} onChange={setStars} size={30} disabled={ratingLoading} />
            </View>

            <View style={{ marginTop: 14 }}>
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

  sectionEmpty: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
  },

  cardRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  badge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  // ===== Modal (Centered dialog) =====
  modalWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  dialog: {
    width: "86%",
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },

  dialogClose: {
    position: "absolute",
    right: 10,
    top: 10,
    padding: 6,
    zIndex: 10,
  },

  dialogTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
});
