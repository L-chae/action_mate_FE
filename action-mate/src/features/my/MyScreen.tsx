// src/features/my/MyScreen.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Animated,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAuthStore } from "@/features/auth/authStore";

import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Card } from "@/shared/ui/Card";

import MeetingList from "./components/MeetingList";
import ProfileEditModal from "./components/ProfileEditModal";
import HostedMeetingEditModal from "./components/HostedMeetingEditModal";

import { myService } from "./myService";
import type { MyMeetingItem, MyProfile } from "./types";

/** ✅ A안: 0점=32, 5점=42 */
function tempFromRating(rating: number) {
  const r = Math.max(0, Math.min(5, rating));
  const minT = 32;
  const maxT = 42;
  const t = minT + (r / 5) * (maxT - minT);
  return Math.round(t * 10) / 10;
}

function tempIconName(temp: number): keyof typeof MaterialIcons.glyphMap {
  if (temp <= 35.5) return "ac-unit";
  if (temp <= 36.5) return "sentiment-neutral";
  if (temp <= 38.0) return "sentiment-satisfied";
  return "whatshot";
}

type PillTone = { text: string; bg: string };
function pillToneByTemp(temp: number): PillTone {
  if (temp <= 35.5) return { text: "#1F6FEB", bg: "rgba(31,111,235,0.10)" };
  if (temp <= 36.5) return { text: "#B57900", bg: "rgba(255,193,7,0.16)" };
  if (temp <= 38.0) return { text: "#FF7A00", bg: "rgba(255,122,0,0.14)" };
  return { text: "#E53935", bg: "rgba(229,57,53,0.14)" };
}

type GradientColors = readonly [string, string];
function gradientByTemp(temp: number): GradientColors {
  if (temp <= 35.5) return ["#6EA8FF", "#1F6FEB"] as const;
  if (temp <= 36.5) return ["#FFE08A", "#FFC107"] as const;
  if (temp <= 38.0) return ["#FFB36A", "#FF7A00"] as const;
  return ["#FF7B7B", "#E53935"] as const;
}

type LocalSummary = {
  averageRating: number; // 0~5
};

const PREVIEW_COUNT = 3;

export default function MyScreen() {
  const t = useAppTheme();
  const user = useAuthStore((s) => s.user);

  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<MyProfile>({ nickname: "액션메이트" });
  const [summary, setSummary] = useState<LocalSummary>({ averageRating: 1.0 });

  // ✅ 액션메이트(닉네임) 아래에: 회원가입 때 정한 성별/생년월일 표시
  // - 우선순위: authStore(user) → profile(fallback)
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
    // "YYYY-MM-DD" -> "YYYY.MM.DD"
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

    const avg = Number((s as any)?.averageRating ?? (s as any)?.avgRating ?? 1.0);
    setSummary({ averageRating: isFinite(avg) ? avg : 1.0 });

    setHosted(h);
    setJoined(j);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);
  const avgRating = Math.max(0, Math.min(5, summary.averageRating));
  const temp = tempFromRating(avgRating);

  const pillTone = useMemo(() => pillToneByTemp(temp), [temp]);
  const grad = useMemo(() => gradientByTemp(temp), [temp]);
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

  return (
    <AppLayout>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ✅ 헤더: 오른쪽에 설정(톱니) */}
        <View style={styles.headerRow}>
          <View style={{ gap: 4 }}>
            <Text style={t.typography.headlineSmall}>마이페이지</Text>
            <Text style={t.typography.bodySmall}>내 정보 · 모임</Text>
          </View>

          <Pressable
            onPress={() => router.push("/(modals)/settings")}
            hitSlop={10}
            style={({ pressed }) => [
              styles.headerIconBtn,
              {
                opacity: pressed ? 0.85 : 1,
                backgroundColor: t.colors.surface,
                borderColor: t.colors.border,
              },
            ]}
          >
            <MaterialIcons name="settings" size={20} color="rgba(0,0,0,0.75)" />
          </Pressable>
        </View>

        {/* 프로필 카드 */}
        <Card style={{ paddingVertical: 14, paddingHorizontal: 14 }}>
          {/* 상단 row */}
          <View style={styles.topRow}>
            <View style={styles.profileLeft}>
              {/* ✅ 아바타 + 연필(프로필 편집) */}
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
                    <Text style={[t.typography.titleMedium, { color: "#fff" }]}>
                      {profile.nickname?.slice(0, 1) || "A"}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={() => setEditOpen(true)}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.avatarEditBtn,
                    {
                      backgroundColor: t.colors.surface,
                      borderColor: t.colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <MaterialIcons name="edit" size={16} color="rgba(0,0,0,0.75)" />
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

            {/* 별점 */}
            <View style={styles.ratingRight}>
              <Text style={styles.star}>★</Text>
              <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
            </View>
          </View>

          {/* 매너온도 */}
          <View style={styles.mannerWrap}>
            <View style={styles.mannerTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mannerLabel}>매너온도</Text>
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
              <Text style={styles.scaleText}>32</Text>
              <Text style={styles.scaleText}>42</Text>
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
              <View style={[styles.countPill, { backgroundColor: "rgba(0,0,0,0.06)" }]}>
                <Text style={styles.countText}>{hosted.length}</Text>
              </View>
            </View>

            <View style={styles.sectionRight}>
              <Text style={styles.moreText}>{hostedExpanded ? "접기" : "펼치기"}</Text>
              <MaterialIcons
                name={hostedExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={18}
                color="rgba(0,0,0,0.55)"
              />
            </View>
          </Pressable>

          {!hostedExpanded && hostedHasMore ? (
            <Pressable
              onPress={() => setHostedExpanded(true)}
              style={({ pressed }) => [styles.inlineMoreBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.inlineMoreText}>최근 {PREVIEW_COUNT}개만 보여요 · 더보기</Text>
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
              <View style={[styles.countPill, { backgroundColor: "rgba(0,0,0,0.06)" }]}>
                <Text style={styles.countText}>{joined.length}</Text>
              </View>
            </View>

            <View style={styles.sectionRight}>
              <Text style={styles.moreText}>{joinedExpanded ? "접기" : "펼치기"}</Text>
              <MaterialIcons
                name={joinedExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={18}
                color="rgba(0,0,0,0.55)"
              />
            </View>
          </Pressable>

          {!joinedExpanded && joinedHasMore ? (
            <Pressable
              onPress={() => setJoinedExpanded(true)}
              style={({ pressed }) => [styles.inlineMoreBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.inlineMoreText}>최근 {PREVIEW_COUNT}개만 보여요 · 더보기</Text>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 10,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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

  avatarEditBtn: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  nameLine: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },

  tempPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tempPillText: { fontSize: 12, fontWeight: "800" },

  subLine: { marginTop: 4, fontSize: 12, opacity: 0.6 },

  ratingRight: { flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 6 },
  star: { fontSize: 12, color: "#FFC107", marginTop: 1 },
  ratingText: { fontSize: 12, fontWeight: "800", color: "#FFC107" },

  mannerWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  mannerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mannerLabel: { fontSize: 12, fontWeight: "700", opacity: 0.6 },
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
  scaleText: { fontSize: 11, opacity: 0.45 },

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
  countText: { fontSize: 12, fontWeight: "800", opacity: 0.7 },

  moreText: { fontSize: 12, fontWeight: "800", opacity: 0.6 },

  inlineMoreBtn: { marginTop: 2, paddingVertical: 6 },
  inlineMoreText: { fontSize: 12, opacity: 0.55 },
});