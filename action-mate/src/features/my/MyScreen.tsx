// src/features/my/MyScreen.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
  Pressable,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { useAuthStore } from "@/features/auth/authStore";

import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Card } from "@/shared/ui/Card";
import { withAlpha } from "@/shared/theme/colors";
import TopBar from "@/shared/ui/TopBar";

import MeetingList from "./components/MeetingList";
import ProfileEditModal from "./components/ProfileEditModal";
import HostedMeetingEditModal from "./components/HostedMeetingEditModal";

import { myService } from "./myService";
import type { MyMeetingItem, MyProfile } from "./types";

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

// ✅ myService.getMySummary()가 { praiseCount, temperature } 형태라고 가정
type LocalSummary = {
  praiseCount: number;
  temperature: number; // 32~42
};

type PillTone = { text: string; bg: string };
type GradientColors = readonly [string, string];

export default function MyScreen() {
  const t = useAppTheme();
  const user = useAuthStore((s) => s.user);

  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<MyProfile>({ nickname: "액션메이트" });
  const [summary, setSummary] = useState<LocalSummary>({ praiseCount: 0, temperature: 36.5 });

  // ✅ authStore(user) → profile(fallback)
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
    const [p, s, h, j] = await Promise.all([
      myService.getMyProfile(),
      myService.getMySummary(),
      myService.getMyHostedMeetings(),
      myService.getMyJoinedMeetings(),
    ]);

    setProfile(p);

    // ✅ Summary: praise/temperature 기반
    const praiseCount = Number((s as any)?.praiseCount ?? 0);
    const temperature = clamp(Number((s as any)?.temperature ?? 36.5), 32, 42);

    setSummary({
      praiseCount: Number.isFinite(praiseCount) ? praiseCount : 0,
      temperature: Number.isFinite(temperature) ? temperature : 36.5,
    });

    setHosted(h);
    setJoined(j);
  }, []);

  // ✅ 최초 1회
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ✅ 상세 → 뒤로 돌아올 때마다 갱신(핵심!)
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

  // -----------------------
  // ✅ UI 계산 값들
  // -----------------------
  const temp = clamp(summary.temperature, 32, 42);

  // (선택) 기존 별점 UI를 유지하고 싶으면 온도→별점으로 환산
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

  const iconDefault = withAlpha(t.colors.textMain, 0.75);
  const iconMuted = withAlpha(t.colors.textMain, 0.55);
  const soft06 = withAlpha(t.colors.textMain, 0.06);
  const soft45 = withAlpha(t.colors.textMain, 0.45);
  const soft55 = withAlpha(t.colors.textMain, 0.55);

  return (
    <AppLayout padded={false}>
      <TopBar
        title="마이페이지"
        showBorder
        showNoti={false}
        renderRight={() => (
          <Pressable
            onPress={() => router.push("/(modals)/settings")}
            hitSlop={10}
            style={({ pressed }) => [{ padding: 4, opacity: pressed ? 0.85 : 1 }]}
          >
            <MaterialIcons name="settings" size={22} color={iconDefault} />
          </Pressable>
        )}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: t.spacing.pagePaddingH,
            paddingTop: t.spacing.pagePaddingV,
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 프로필 카드 */}
        <Card style={{ paddingVertical: 14, paddingHorizontal: 14 }}>
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

              <View style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
                <View style={styles.nameLine}>
                  <Text style={t.typography.titleMedium} numberOfLines={1}>
                    {profile.nickname}
                  </Text>

                  <View style={[styles.tempPill, { backgroundColor: pillTone.bg }]}>
                    <Text style={[styles.tempPillText, { color: pillTone.text }]}>
                      {temp.toFixed(1)}℃
                    </Text>
                  </View>
                </View>

                {metaLine ? (
                  <Text style={[styles.subLine, { color: t.colors.textSub }]}>{metaLine}</Text>
                ) : null}
              </View>
            </View>

            {/* 별점(온도 환산) */}
            <View style={styles.ratingRight}>
              <Text style={[styles.star, { color: t.colors.point }]}>★</Text>
              <Text style={[styles.ratingText, { color: t.colors.point }]}>{rating.toFixed(1)}</Text>
            </View>
          </View>

          {/* 매너온도 */}
          <View style={[styles.mannerWrap, { borderTopColor: t.colors.divider }]}>
            <View style={styles.mannerTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.mannerLabel, { color: t.colors.textSub }]}>매너온도</Text>
                <Text style={[styles.mannerTemp, { color: pillTone.text }]}>{temp.toFixed(1)}℃</Text>
              </View>

              <View style={[styles.tempBadge, { backgroundColor: pillTone.bg }]}>
                <MaterialIcons name={iconName} size={18} color={pillTone.text} />
              </View>
            </View>

            <View style={[styles.barTrack, { backgroundColor: t.colors.border }]}>
              <Animated.View style={[styles.barFill, { width: widthPct }]}>
                <LinearGradient
                  colors={grad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
            </View>

            <View style={styles.scaleRow}>
              <Text style={[styles.scaleText, { color: soft45 }]}>32</Text>
              <Text style={[styles.scaleText, { color: soft45 }]}>42</Text>
            </View>
          </View>
        </Card>

        {/* 내가 만든 모임 */}
        <View style={styles.sectionHeader}>
          <Pressable
            onPress={() => setHostedExpanded((v) => !v)}
            style={({ pressed }) => [styles.sectionHeaderRow, { opacity: pressed ? 0.9 : 1 }]}
          >
            <View style={styles.sectionLeft}>
              <Text style={styles.sectionTitle}>내가 만든 모임</Text>

              <View style={[styles.countPill, { backgroundColor: soft06 }]}>
                <Text style={[styles.countText, { color: soft55 }]}>{hosted.length}</Text>
              </View>
            </View>

            <View style={styles.sectionRight}>
              <Text style={[styles.moreText, { color: t.colors.textSub }]}>
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
              style={({ pressed }) => [styles.inlineMoreBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.inlineMoreText, { color: soft55 }]}>
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
        <View style={styles.sectionHeader}>
          <Pressable
            onPress={() => setJoinedExpanded((v) => !v)}
            style={({ pressed }) => [styles.sectionHeaderRow, { opacity: pressed ? 0.9 : 1 }]}
          >
            <View style={styles.sectionLeft}>
              <Text style={styles.sectionTitle}>참여한 모임</Text>

              <View style={[styles.countPill, { backgroundColor: soft06 }]}>
                <Text style={[styles.countText, { color: soft55 }]}>{joined.length}</Text>
              </View>
            </View>

            <View style={styles.sectionRight}>
              <Text style={[styles.moreText, { color: t.colors.textSub }]}>
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
              style={({ pressed }) => [styles.inlineMoreBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.inlineMoreText, { color: soft55 }]}>
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
              const updated = await myService.updateMyHostedMeeting(editingMeeting.id, patch);
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
              const saved = await myService.updateMyProfile(next);
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
  scrollContent: {
    paddingBottom: 28,
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
  tempPillText: { fontSize: 12, fontWeight: "800" },

  subLine: { marginTop: 4, fontSize: 12 },

  ratingRight: { flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 6 },
  star: { fontSize: 12, marginTop: 1 },
  ratingText: { fontSize: 12, fontWeight: "800" },

  mannerWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  mannerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mannerLabel: { fontSize: 12, fontWeight: "700" },
  mannerTemp: { marginTop: 6, fontSize: 20, fontWeight: "900" },

  tempBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  barTrack: { marginTop: 10, height: 6, borderRadius: 999, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999, overflow: "hidden" },

  scaleRow: { marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  scaleText: { fontSize: 11 },

  sectionHeader: { marginTop: 14, marginBottom: 8, paddingHorizontal: 2 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  sectionLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "900" },

  countPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  countText: { fontSize: 12, fontWeight: "800" },

  moreText: { fontSize: 12, fontWeight: "800" },

  inlineMoreBtn: { marginTop: 2, paddingVertical: 6 },
  inlineMoreText: { fontSize: 12 },
});
