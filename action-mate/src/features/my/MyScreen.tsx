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
} from "react-native";

import { useAuthStore } from "@/features/auth/model/authStore";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";
import AppLayout from "@/shared/ui/AppLayout";
import { Card } from "@/shared/ui/Card";
import TopBar from "@/shared/ui/TopBar";

import HostedMeetingEditModal from "./ui/HostedMeetingEditModal";
import MeetingList from "./ui/MeetingList";
import ProfileEditModal from "./ui/ProfileEditModal";

import { myApi } from "./api/myApi";
import type { MyMeetingItem, MyProfile } from "./model/types";

const PREVIEW_COUNT = 3;
const WHITE = "#FFFFFF";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function tempIconName(temp: number): keyof typeof MaterialIcons.glyphMap {
  if (temp <= 35.5) return "ac-unit";
  if (temp <= 36.5) return "sentiment-neutral";
  if (temp <= 38.0) return "sentiment-satisfied";
  return "whatshot";
}

type LocalSummary = {
  praiseCount: number;
  temperature: number;
};

type PillTone = { text: string; bg: string };
type GradientColors = readonly [string, string];

export default function MyScreen() {
  const t = useAppTheme();
  const user = useAuthStore((s) => s.user);

  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<MyProfile>({ nickname: "액션메이트" });
  const [summary, setSummary] = useState<LocalSummary>({ praiseCount: 0, temperature: 36.5 });

  // authStore(user) → profile(fallback)
  const genderRaw: any = (user as any)?.gender ?? (profile as any)?.gender;
  const birthRaw: string =
    (user as any)?.birthDate ??
    (profile as any)?.birthDate ??
    (profile as any)?.birth_date ??
    (profile as any)?.birthday ??
    "";

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

  const [hosted, setHosted] = useState<MyMeetingItem[]>([]);
  const [joined, setJoined] = useState<MyMeetingItem[]>([]);

  const [editOpen, setEditOpen] = useState(false);

  const [editMeetingOpen, setEditMeetingOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MyMeetingItem | null>(null);

  const [hostedExpanded, setHostedExpanded] = useState(false);
  const [joinedExpanded, setJoinedExpanded] = useState(false);

  const fillAnim = useRef(new Animated.Value(0)).current;

  const loadAll = useCallback(async () => {
    try {
      const [p, s, h, j] = await Promise.all([
        myApi.getProfile(),
        myApi.getSummary(),
        myApi.getHostedMeetings(),
        myApi.getJoinedMeetings(),
      ]);

      setProfile(p);

      const praiseCount = Number((s as any)?.praiseCount ?? 0);
      const temperature = clamp(Number((s as any)?.temperature ?? 36.5), 32, 42);

      setSummary({
        praiseCount: Number.isFinite(praiseCount) ? praiseCount : 0,
        temperature: Number.isFinite(temperature) ? temperature : 36.5,
      });

      setHosted(h);
      setJoined(j);
    } catch (e) {
      console.error("MyScreen load error:", e);
    }
  }, []);

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

  // UI 계산
  const temp = clamp(summary.temperature, 32, 42);

  const rating = useMemo(() => {
    const r = ((temp - 32) / 10) * 5;
    return clamp(Number(r.toFixed(1)), 0, 5);
  }, [temp]);

  const pillTone: PillTone = useMemo(() => {
    // 의미상 bg는 info/warning/primary/error의 soft 버전이므로 withAlpha 유지 (brand 색 기준)
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

  const hostedPreview = useMemo(
    () => (hostedExpanded ? hosted : hosted.slice(0, PREVIEW_COUNT)),
    [hosted, hostedExpanded]
  );
  const joinedPreview = useMemo(
    () => (joinedExpanded ? joined : joined.slice(0, PREVIEW_COUNT)),
    [joined, joinedExpanded]
  );

  const hostedHasMore = hosted.length > PREVIEW_COUNT;
  const joinedHasMore = joined.length > PREVIEW_COUNT;

  // ✅ theme semantic token 사용
  const iconDefault = t.colors.icon.default;
  const iconMuted = t.colors.icon.muted;
  const soft06 = t.colors.overlay[6];
  const soft45 = t.colors.overlay[45];
  const soft55 = t.colors.overlay[55];

  // theme 기반 스타일(간격/폰트 일부를 테마로)
  const s = useMemo(() => {
    return {
      scrollContent: {
        paddingBottom: t.spacing.space[7], // 28
        paddingHorizontal: t.spacing.pagePaddingH,
        paddingTop: t.spacing.pagePaddingV,
      },
      cardPadding: {
        paddingVertical: t.spacing.space[3], // 12(기존 14 근사치)
        paddingHorizontal: t.spacing.space[3], // 12(기존 14 근사치)
      },
      subLine: { marginTop: t.spacing.space[1] }, // 4
      mannerWrap: {
        marginTop: t.spacing.space[3], // 12
        paddingTop: t.spacing.space[3], // 12
        borderTopWidth: t.spacing.borderWidth,
        borderTopColor: t.colors.divider,
      },
      barTrack: { marginTop: t.spacing.space[2] }, // 8~10 근사치
      scaleRow: { marginTop: t.spacing.space[2] }, // 8
      sectionHeader: {
        marginTop: t.spacing.space[3], // 12~14 근사치
        marginBottom: t.spacing.space[2], // 8
        paddingHorizontal: 2,
      },
      inlineMoreBtn: { marginTop: 2, paddingVertical: t.spacing.space[2] }, // 8(기존 6 근사치)
    } as const;
  }, [t]);

  return (
    <AppLayout padded={false}>
      <TopBar
        title="마이페이지"
        showBorder
        showNoti={false}
        renderRight={() => <MaterialIcons name="settings" size={22} color={iconDefault} />}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContentBase, s.scrollContent]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 프로필 카드 */}
        <Card style={s.cardPadding}>
          <View style={styles.topRow}>
            <View style={styles.profileLeft}>
              <View style={styles.avatarWrap}>
                {profile.photoUrl ? (
                  <Image
                    source={{ uri: profile.photoUrl }}
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
                    <Text style={[t.typography.titleMedium, { color: WHITE }]}>
                      {profile.nickname?.slice(0, 1) || "A"}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={() => setEditOpen(true)}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.avatarEditBtnBase,
                    Platform.select({
                      ios: {
                        shadowColor: "#000",
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

              <View style={{ marginLeft: t.spacing.space[3], flex: 1, minWidth: 0 }}>
                <View style={styles.nameLine}>
                  <Text style={t.typography.titleMedium} numberOfLines={1}>
                    {profile.nickname}
                  </Text>

                  <View style={[styles.tempPill, { backgroundColor: pillTone.bg }]}>
                    <Text style={[t.typography.labelMedium, { color: pillTone.text }]}>
                      {temp.toFixed(1)}℃
                    </Text>
                  </View>
                </View>

                {metaLine ? (
                  <Text style={[t.typography.bodySmall, s.subLine]}>{metaLine}</Text>
                ) : null}
              </View>
            </View>

            {/* 별점(온도 환산) */}
            <View style={styles.ratingRight}>
              <Text style={[styles.star, { color: t.colors.ratingStar }]}>★</Text>
              <Text style={[t.typography.labelMedium, { color: t.colors.ratingStar }]}>
                {rating.toFixed(1)}
              </Text>
            </View>
          </View>

          {/* 매너온도 */}
          <View style={s.mannerWrap}>
            <View style={styles.mannerTop}>
              <View style={{ flex: 1 }}>
                <Text style={t.typography.labelSmall}>매너온도</Text>
                <Text style={[styles.mannerTemp, { color: pillTone.text }]}>{temp.toFixed(1)}℃</Text>
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
          <Pressable
            onPress={() => setHostedExpanded((v) => !v)}
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
                {hostedExpanded ? "접기" : "펼치기"}
              </Text>
              <MaterialIcons
                name={hostedExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={18}
                color={iconMuted}
              />
            </View>
          </Pressable>

          {!hostedExpanded && hostedHasMore ? (
            <Pressable
              onPress={() => setHostedExpanded(true)}
              style={({ pressed }) => [s.inlineMoreBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[t.typography.bodySmall, { color: soft55 }]}>
                최근 {PREVIEW_COUNT}개만 보여요 · 더보기
              </Text>
            </Pressable>
          ) : null}
        </View>

        <MeetingList
          items={hostedPreview}
          emptyText="아직 내가 만든 모임이 없어요."
          editable
          onEdit={(item) => {
            setEditingMeeting(item);
            setEditMeetingOpen(true);
          }}
        />

        {/* 참여한 모임 */}
        <View style={s.sectionHeader}>
          <Pressable
            onPress={() => setJoinedExpanded((v) => !v)}
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
                {joinedExpanded ? "접기" : "펼치기"}
              </Text>
              <MaterialIcons
                name={joinedExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={18}
                color={iconMuted}
              />
            </View>
          </Pressable>

          {!joinedExpanded && joinedHasMore ? (
            <Pressable
              onPress={() => setJoinedExpanded(true)}
              style={({ pressed }) => [s.inlineMoreBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[t.typography.bodySmall, { color: soft55 }]}>
                최근 {PREVIEW_COUNT}개만 보여요 · 더보기
              </Text>
            </Pressable>
          ) : null}
        </View>

        <MeetingList items={joinedPreview} emptyText="아직 참여한 모임이 없어요." />

        {/* 모달 */}
        <HostedMeetingEditModal
          visible={editMeetingOpen}
          meeting={editingMeeting}
          onClose={() => setEditMeetingOpen(false)}
          onSave={async (patch) => {
            if (!editingMeeting) return;
            setRefreshing(true);
            try {
              const updated = await myApi.updateHostedMeeting(editingMeeting.id, patch);
              setHosted((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
              setEditingMeeting(updated);
            } finally {
              setRefreshing(false);
            }
          }}
        />

        <ProfileEditModal
          visible={editOpen}
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={async (next) => {
            setRefreshing(true);
            try {
              const saved = await myApi.updateProfile(next);
              setProfile(saved);
            } finally {
              setRefreshing(false);
            }
          }}
        />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scrollContentBase: {
    // theme 기반 padding은 s.scrollContent에서 붙임
  },

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

  nameLine: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },

  tempPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },

  ratingRight: { flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 6 },
  star: { fontSize: 12, marginTop: 1 },

  mannerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mannerTemp: { marginTop: 6, fontSize: 20, fontWeight: "900" },

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