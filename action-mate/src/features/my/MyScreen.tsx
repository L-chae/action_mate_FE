// src/features/my/MyScreen.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuthStore } from "@/features/auth/model/authStore";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";
import AppLayout from "@/shared/ui/AppLayout";
import { Card } from "@/shared/ui/Card";
import TopBar from "@/shared/ui/TopBar";

import MeetingList from "./ui/MeetingList";

import { myApi } from "./api/myApi";
import type { MyMeetingItem, MyProfile, MySummary } from "./model/types";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingPost } from "@/features/meetings/model/types";

const PREVIEW_COUNT = 3;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function tempIconName(temp: number): keyof typeof MaterialIcons.glyphMap {
  if (temp <= 35.5) return "ac-unit";
  if (temp <= 36.5) return "sentiment-neutral";
  if (temp <= 38.0) return "sentiment-satisfied";
  return "whatshot";
}

type PillTone = { text: string; bg: string };
type GradientColors = readonly [string, string];

export default function MyScreen() {
  const t = useAppTheme();
  const router = useRouter();

  const user = useAuthStore((s) => (s as any).user ?? (s as any).me);
  const userAvatarUrl = user?.avatarUrl;
  const currentUserId = user?.id ? String(user.id) : "me";

  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState<MyProfile>({
    id: "",
    nickname: "액션메이트",
  });

  const [summary, setSummary] = useState<MySummary>({
    praiseCount: 0,
    mannerTemperature: 36.5,
  });

  const [hosted, setHosted] = useState<MyMeetingItem[]>([]);
  const [joined, setJoined] = useState<MyMeetingItem[]>([]);

  const [hostedExpanded, setHostedExpanded] = useState(false);
  const [joinedExpanded, setJoinedExpanded] = useState(false);
  const [hasNoti, setHasNoti] = useState(false);

  const fillAnim = useRef(new Animated.Value(0)).current;

  // ----------------------------------------------------------------------
  // 표시용 데이터 계산
  // ----------------------------------------------------------------------
  const displayNickname = useMemo(() => {
    const n = user?.nickname?.trim();
    if (n) return n;
    return profile.nickname?.trim() || "액션메이트";
  }, [user?.nickname, profile.nickname]);

  const displayAvatarUrl = useMemo(() => {
    if (userAvatarUrl) return userAvatarUrl;
    return profile.avatarUrl;
  }, [userAvatarUrl, profile.avatarUrl]);

  const genderRaw: any = user?.gender;
  const birthRaw: string = user?.birthDate ?? "";

  const genderLabel = useMemo(() => {
    if (!genderRaw) return "";
    if (genderRaw === "male") return "남성";
    if (genderRaw === "female") return "여성";
    if (genderRaw === "none") return "선택 안 함";
    return String(genderRaw);
  }, [genderRaw]);

  const birthLabel = useMemo(() => {
    const s = String(birthRaw ?? "").trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.split("-").join(".");
    return s;
  }, [birthRaw]);

  const metaLine = useMemo(() => {
    const parts: string[] = [];
    if (genderLabel) parts.push(genderLabel);
    if (birthLabel) parts.push(birthLabel);
    return parts.join(" · ");
  }, [genderLabel, birthLabel]);

  // ----------------------------------------------------------------------
  // 알림 dot 체크
  // ----------------------------------------------------------------------
  const checkHasNoti = useCallback(
    async (cached?: MeetingPost[]) => {
      try {
        const all = cached ?? (await meetingApi.listMeetings({}).catch(() => [] as MeetingPost[]));

        const hostMeetings = all.filter((m: MeetingPost) => {
          const hostId = (m as any)?.host?.id;
          return String(hostId ?? "") === String(currentUserId);
        });

        if (hostMeetings.length === 0) {
          setHasNoti(false);
          return;
        }

        // TODO: 실제 알림 조건 생기면 여기서 판단
        setHasNoti(false);
      } catch (e) {
        console.error("checkHasNoti error:", e);
        setHasNoti(false);
      }
    },
    [currentUserId]
  );

  // ----------------------------------------------------------------------
  // Data Load (✅ hosted/joined에 joinMode/status/capacity 등 보강)
  // ----------------------------------------------------------------------
  const loadAll = useCallback(async () => {
    try {
      const [p, s, h, j, allMeetings] = await Promise.all([
        myApi.getProfile(),
        myApi.getSummary(),
        myApi.getHostedMeetings(),
        myApi.getJoinedMeetings(),
        meetingApi.listMeetings({}).catch(() => [] as MeetingPost[]),
      ]);

      setProfile(p);

      const praiseCount = Number(s?.praiseCount ?? 0);
      const rawTemp = s?.mannerTemperature ?? 36.5;
      const mannerTemperature = clamp(Number(rawTemp), 32, 42);

      setSummary({
        praiseCount: Number.isFinite(praiseCount) ? praiseCount : 0,
        mannerTemperature: Number.isFinite(mannerTemperature) ? mannerTemperature : 36.5,
      });

      // ✅ id -> MeetingPost 맵
      const byId = new Map<string, MeetingPost>();
      for (const post of allMeetings) byId.set(String((post as any).id), post);

      // ✅ (선택) listMeetings에 없는 애들(예: 종료/필터) 보강 시도: 가능한 상세 API가 있으면 사용
      const fetchDetailIfPossible = async (id: string): Promise<MeetingPost | null> => {
        const api: any = meetingApi as any;
        const candidates = [
          api.getMeeting,
          api.getMeetingDetail,
          api.getMeetingById,
          api.fetchMeeting,
          api.readMeeting,
          api.detailMeeting,
        ].filter((fn) => typeof fn === "function");

        for (const fn of candidates) {
          try {
            const res = await fn(id);
            if (res) return res as MeetingPost;
          } catch {
            // ignore
          }
        }
        return null;
      };

      const needIds = Array.from(
        new Set(
          [...h, ...j]
            .map((it) => String((it as any)?.id ?? ""))
            .filter((id) => id && !byId.has(id))
        )
      );

      // 너무 많은 호출 방지 (필요 시 조절)
      if (needIds.length > 0) {
        const details = await Promise.all(needIds.slice(0, 20).map((id) => fetchDetailIfPossible(id)));
        for (const d of details) {
          if (d) byId.set(String((d as any).id), d);
        }
      }

      const enrich = (arr: MyMeetingItem[]) =>
        arr.map((it) => {
          const id = String((it as any).id);
          const post = byId.get(id);
          if (!post) return it;

          // ✅ MeetingList가 어떤 키를 보든 잡히게 다 심어줌
          return {
            ...it,
            meeting: post,
            joinMode: (post as any).joinMode,
            status: (post as any).status,
            capacity: (post as any).capacity,
            location: (post as any).location,
            distanceText: (post as any).distanceText,
            meetingTimeText: (post as any).meetingTimeText,
            content: (post as any).content,
          } as any;
        });

      const hostedEnriched = enrich(h);
      const joinedEnriched = enrich(j);

      setHosted(hostedEnriched);
      setJoined(joinedEnriched);

      // ✅ 알림dot 재사용
      checkHasNoti(allMeetings);
    } catch (e) {
      console.error("MyScreen load error:", e);
    }
  }, [checkHasNoti]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  // ----------------------------------------------------------------------
  // UI calc
  // ----------------------------------------------------------------------
  const temp = clamp(summary.mannerTemperature, 32, 42);

  const rating = useMemo(() => {
    const r = ((temp - 32) / 10) * 5;
    return clamp(Number(r.toFixed(1)), 0, 5);
  }, [temp]);

  const pillTone: PillTone = useMemo(() => {
    const soft = (hex: string, a: number) => withAlpha(hex, a);
    if (temp <= 35.5) return { text: t.colors.info, bg: soft(t.colors.info, 0.12) };
    if (temp <= 36.5) return { text: t.colors.warning, bg: soft(t.colors.warning, 0.16) };
    if (temp <= 38.0) return { text: t.colors.primary, bg: soft(t.colors.primary, 0.14) };
    return { text: t.colors.error, bg: soft(t.colors.error, 0.14) };
  }, [temp, t.colors]);

  const grad: GradientColors = useMemo(() => {
    const start = (hex: string) => withAlpha(hex, 0.55);
    if (temp <= 35.5) return [start(t.colors.info), t.colors.info] as const;
    if (temp <= 36.5) return [start(t.colors.warning), t.colors.warning] as const;
    if (temp <= 38.0) return [start(t.colors.primary), t.colors.primary] as const;
    return [start(t.colors.error), t.colors.error] as const;
  }, [temp, t.colors]);

  const iconName = useMemo(() => tempIconName(temp), [temp]);

  const ratio = useMemo(() => {
    const r = (temp - 32) / 10;
    return Math.max(0, Math.min(1, r));
  }, [temp]);

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: ratio,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [ratio, fillAnim]);

  const widthPct = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const hostedHasMore = hosted.length > PREVIEW_COUNT;
  const joinedHasMore = joined.length > PREVIEW_COUNT;

  // ✅ 3개 이하로 바뀌면 확장 상태 자동 해제
  useEffect(() => {
    if (!hostedHasMore && hostedExpanded) setHostedExpanded(false);
  }, [hostedHasMore, hostedExpanded]);

  useEffect(() => {
    if (!joinedHasMore && joinedExpanded) setJoinedExpanded(false);
  }, [joinedHasMore, joinedExpanded]);

  const hostedPreview = useMemo(
    () => (hostedExpanded ? hosted : hosted.slice(0, PREVIEW_COUNT)),
    [hosted, hostedExpanded]
  );
  const joinedPreview = useMemo(
    () => (joinedExpanded ? joined : joined.slice(0, PREVIEW_COUNT)),
    [joined, joinedExpanded]
  );

  // ----------------------------------------------------------------------
  // Style & Rendering
  // ----------------------------------------------------------------------
  const iconDefault = t.colors.icon.default;
  const iconMuted = t.colors.icon.muted;
  const soft06 = t.colors.overlay[6];
  const soft45 = t.colors.overlay[45];
  const soft55 = t.colors.overlay[55];

  const onPrimaryText = (t.colors as any).onPrimary ?? "#FFFFFF";

  const s = useMemo(() => {
    return {
      scrollContent: {
        paddingBottom: t.spacing.space[7],
        paddingHorizontal: t.spacing.pagePaddingH,
        paddingTop: t.spacing.pagePaddingV,
      } as ViewStyle,
      cardPadding: {
        paddingVertical: t.spacing.space[3],
        paddingHorizontal: t.spacing.space[3],
      } as ViewStyle,
      subLine: { marginTop: t.spacing.space[1] } as TextStyle,
      mannerWrap: {
        marginTop: t.spacing.space[3],
        paddingTop: t.spacing.space[3],
        borderTopWidth: t.spacing.borderWidth,
        borderTopColor: t.colors.divider,
      } as ViewStyle,
      barTrack: { marginTop: t.spacing.space[2] } as ViewStyle,
      scaleRow: { marginTop: t.spacing.space[2] } as ViewStyle,
      sectionHeader: {
        marginTop: t.spacing.space[3],
        marginBottom: t.spacing.space[2],
        paddingHorizontal: 2,
      } as ViewStyle,
    } as const;
  }, [t]);

  return (
    <AppLayout padded={false}>
      <TopBar
        title="마이페이지"
        showBorder
        showNoti
        showNotiDot={hasNoti}
        onPressNoti={() => router.push("/notifications")}
        showSettings
        onPressSettings={() => router.push("/settings" as any)}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContentBase, s.scrollContent]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 프로필 카드 */}
        <Card style={s.cardPadding}>
          <View style={styles.topRow}>
            <View style={styles.profileLeft}>
              <Pressable
                onPress={() => router.push("/settings/profile" as any)}
                hitSlop={10}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={styles.avatarWrap}>
                  {displayAvatarUrl ? (
                    <Image
                      key={displayAvatarUrl}
                      source={{ uri: displayAvatarUrl }}
                      style={[
                        styles.avatar,
                        { borderColor: t.colors.background, backgroundColor: t.colors.border },
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        styles.avatarFallback,
                        { borderColor: t.colors.background, backgroundColor: t.colors.primary },
                      ]}
                    >
                      <Text style={[t.typography.titleMedium, { color: onPrimaryText }]}>
                        {displayNickname?.slice(0, 1) || "A"}
                      </Text>
                    </View>
                  )}

                  <Pressable
                    onPress={() => router.push("/settings/profile" as any)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.avatarEditBtnBase,
                      Platform.select({
                        ios: {
                          shadowColor: (t.colors.shadow?.color ?? "#000") as any,
                          shadowOpacity: 0.12,
                          shadowRadius: 8,
                          shadowOffset: { width: 0, height: 3 },
                        },
                        android: { elevation: t.shadow.elevationSm },
                        default: {},
                      }),
                      {
                        backgroundColor: t.colors.surface,
                        borderColor: t.colors.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <MaterialIcons name="edit" size={16} color={iconDefault} />
                  </Pressable>
                </View>
              </Pressable>

              <View style={{ marginLeft: t.spacing.space[3], flex: 1, minWidth: 0 }}>
                <View style={styles.nameLine}>
                  <Text style={[t.typography.titleMedium, styles.nameText]} numberOfLines={1}>
                    {displayNickname}
                  </Text>

                  <View style={[styles.tempPill, { backgroundColor: pillTone.bg }]}>
                    <Text style={[t.typography.labelMedium, { color: pillTone.text }]}>
                      {temp.toFixed(1)}℃
                    </Text>
                  </View>
                </View>

                {metaLine ? <Text style={[t.typography.bodySmall, s.subLine]}>{metaLine}</Text> : null}
              </View>
            </View>

            {/* 별점 */}
            <View style={styles.ratingRight}>
              <Text style={[styles.star, { color: t.colors.ratingStar }]}>★</Text>
              <Text style={[t.typography.labelMedium, { color: t.colors.ratingStar }]}>
                {rating.toFixed(1)}
              </Text>
            </View>
          </View>

          {/* 매너온도 바 */}
          <View style={s.mannerWrap}>
            <View style={styles.mannerTop}>
              <View style={{ flex: 1 }}>
                <Text style={t.typography.labelSmall}>매너온도</Text>
                <Text style={[styles.mannerTemperature, { color: pillTone.text }]}>
                  {temp.toFixed(1)}℃
                </Text>
              </View>

              <View style={[styles.tempBadge, { backgroundColor: pillTone.bg }]}>
                <MaterialIcons name={iconName} size={18} color={pillTone.text} />
              </View>
            </View>

            <View style={[styles.barTrack, s.barTrack, { backgroundColor: t.colors.border }]}>
              <Animated.View style={[styles.barFill, { width: widthPct }]}>
                <LinearGradient
                  colors={grad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
            </View>

            <View style={[styles.scaleRow, s.scaleRow]}>
              <Text style={[t.typography.labelSmall, { color: soft45 }]}>32</Text>
              <Text style={[t.typography.labelSmall, { color: soft45 }]}>42</Text>
            </View>
          </View>
        </Card>

        {/* 내가 만든 모임 */}
        <View style={s.sectionHeader}>
          {hostedHasMore ? (
            <Pressable
              onPress={() => setHostedExpanded((v) => !v)}
              hitSlop={6}
              style={({ pressed }) => [styles.sectionHeaderRow, { opacity: pressed ? 0.9 : 1 }]}
            >
              <View style={styles.sectionLeft}>
                <Text style={t.typography.titleMedium}>내가 만든 모임</Text>
                <View style={[styles.countPill, { backgroundColor: soft06 }]}>
                  <Text style={[t.typography.labelMedium, { color: soft55 }]}>{hosted.length}</Text>
                </View>
              </View>

              <View style={styles.sectionRight}>
                <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                  {hostedExpanded ? "접기" : "더보기"}
                </Text>
                <MaterialIcons
                  name={hostedExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size={18}
                  color={iconMuted}
                />
              </View>
            </Pressable>
          ) : (
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionLeft}>
                <Text style={t.typography.titleMedium}>내가 만든 모임</Text>
                <View style={[styles.countPill, { backgroundColor: soft06 }]}>
                  <Text style={[t.typography.labelMedium, { color: soft55 }]}>{hosted.length}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <MeetingList items={hostedPreview} emptyText="아직 내가 만든 모임이 없어요." editable />

        {/* 참여한 모임 */}
        <View style={s.sectionHeader}>
          {joinedHasMore ? (
            <Pressable
              onPress={() => setJoinedExpanded((v) => !v)}
              hitSlop={6}
              style={({ pressed }) => [styles.sectionHeaderRow, { opacity: pressed ? 0.9 : 1 }]}
            >
              <View style={styles.sectionLeft}>
                <Text style={t.typography.titleMedium}>참여한 모임</Text>
                <View style={[styles.countPill, { backgroundColor: soft06 }]}>
                  <Text style={[t.typography.labelMedium, { color: soft55 }]}>{joined.length}</Text>
                </View>
              </View>

              <View style={styles.sectionRight}>
                <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                  {joinedExpanded ? "접기" : "더보기"}
                </Text>
                <MaterialIcons
                  name={joinedExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size={18}
                  color={iconMuted}
                />
              </View>
            </Pressable>
          ) : (
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionLeft}>
                <Text style={t.typography.titleMedium}>참여한 모임</Text>
                <View style={[styles.countPill, { backgroundColor: soft06 }]}>
                  <Text style={[t.typography.labelMedium, { color: soft55 }]}>{joined.length}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ✅ 참여한 모임: 종료/취소/마감 상태는 홈처럼 딤 처리 */}
        <MeetingList
          items={joinedPreview}
          emptyText="아직 참여한 모임이 없어요."
          dimEnded
        />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scrollContentBase: {},

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  profileLeft: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },

  avatarWrap: { width: 56, height: 56, position: "relative" },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 3 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },

  avatarEditBtnBase: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  // ✅ 줄바꿈/깨짐 방지 (닉네임 + 알약 한 줄 유지)
  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  nameText: { flexShrink: 1 },

  tempPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },

  ratingRight: { flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 6 },
  star: { fontSize: 14, marginTop: 1 },

  mannerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mannerTemperature: { marginTop: 6, fontSize: 20, fontWeight: "900" },

  tempBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  barTrack: { height: 6, borderRadius: 999, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999, overflow: "hidden" },

  scaleRow: { flexDirection: "row", justifyContent: "space-between" },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  sectionLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionRight: { flexDirection: "row", alignItems: "center", gap: 4 },

  countPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
});
