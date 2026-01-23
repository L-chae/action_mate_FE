// ✅ 파일 경로: src/features/my/MyScreen.tsx

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
  Modal,
  Alert,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuthStore } from "@/features/auth/model/authStore";
import { meetingApi } from "@/features/meetings/api/meetingApi";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";
import AppLayout from "@/shared/ui/AppLayout";
import { Card } from "@/shared/ui/Card";
import TopBar from "@/shared/ui/TopBar";

import { myApi } from "./api/myApi";
import type { MyProfile, MySummary } from "./model/types";

/* ---------------- utils ---------------- */

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

/* ---------------- small ui ---------------- */

function MenuRow({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        { backgroundColor: pressed ? t.colors.overlay[6] : "transparent" },
      ]}
    >
      <Text style={[t.typography.bodyLarge, { color: t.colors.textMain }]}>{label}</Text>
      <MaterialIcons name="chevron-right" size={22} color={t.colors.icon.muted} />
    </Pressable>
  );
}

function Divider() {
  const t = useAppTheme();
  return <View style={{ height: 1, backgroundColor: t.colors.border }} />;
}

/* =========================
   Screen
========================= */

export default function MyScreen() {
  const t = useAppTheme();
  const router = useRouter();

  const logout = useAuthStore((s) => (s as any).logout); // ✅ 목업 탈퇴용
  const user = useAuthStore((s) => (s as any).user ?? (s as any).me);
  const userAvatarUrl = user?.avatarUrl;

  const [refreshing, setRefreshing] = useState(false);
  const [hasNoti, setHasNoti] = useState(false);

  // ✅ 강하게 숨김: 계정 관리 모달
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const [profile, setProfile] = useState<MyProfile>({
    id: "",
    nickname: "액션메이트",
  });

  const [summary, setSummary] = useState<MySummary>({
    praiseCount: 0,
    mannerTemperature: 36.5,
  });

  const fillAnim = useRef(new Animated.Value(0)).current;

  /* ---------------- derived ---------------- */

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

  /* ---------------- load ---------------- */

  const loadAll = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([myApi.getProfile(), myApi.getSummary()]);
      setProfile(p);

      const praiseCount = Number(s?.praiseCount ?? 0);
      const rawTemp = s?.mannerTemperature ?? 36.5;
      const mannerTemperature = clamp(Number(rawTemp), 32, 42);

      setSummary({
        praiseCount: Number.isFinite(praiseCount) ? praiseCount : 0,
        mannerTemperature: Number.isFinite(mannerTemperature)
          ? mannerTemperature
          : 36.5,
      });
    } catch (e) {
      console.error("MyScreen load error:", e);
    }
  }, []);

  const checkHasNoti = useCallback(async () => {
    try {
      await meetingApi.listMeetings({});
      setHasNoti(false);
    } catch {
      setHasNoti(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    checkHasNoti();
  }, [loadAll, checkHasNoti]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
      checkHasNoti();
    }, [loadAll, checkHasNoti])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadAll(), checkHasNoti()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadAll, checkHasNoti]);

  /* ---------------- manner ui ---------------- */

  const temp = clamp(summary.mannerTemperature, 32, 42);

  const rating = useMemo(() => {
    const r = ((temp - 32) / 10) * 5;
    return clamp(Number(r.toFixed(1)), 0, 5);
  }, [temp]);

  const pillTone: PillTone = useMemo(() => {
    const soft = (hex: string, a: number) => withAlpha(hex, a);
    if (temp <= 35.5) return { text: t.colors.info, bg: soft(t.colors.info, 0.12) };
    if (temp <= 36.5)
      return { text: t.colors.warning, bg: soft(t.colors.warning, 0.16) };
    if (temp <= 38.0)
      return { text: t.colors.primary, bg: soft(t.colors.primary, 0.14) };
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

  /* ---------------- mock withdraw ---------------- */

  const handleMockWithdraw = useCallback(() => {
    Alert.alert(
      "회원탈퇴",
      "탈퇴하면 계정 정보가 모두 삭제됩니다.\n정말 탈퇴하시겠어요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴",
          style: "destructive",
          onPress: async () => {
            logout?.(); // ✅ 목업 탈퇴
            setAccountModalOpen(false);
            router.replace("/(auth)/login"); // ✅ 로그인 화면으로 이동
          },
        },
      ]
    );
  }, [logout, router]);

  /* ---------------- styles ---------------- */

  const s = useMemo(
    () =>
      ({
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
      }) as const,
    [t]
  );

  /* ================= render ================= */

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
          {/* 상단 */}
          <View style={styles.topRow}>
            <View style={styles.profileLeft}>
              <Pressable onPress={() => router.push("/settings/profile" as any)}>
                <View style={styles.avatarUrlWrap}>
                  {displayAvatarUrl ? (
                    <Image
                      source={{ uri: displayAvatarUrl }}
                      style={[styles.avatarUrl, { borderColor: t.colors.background }]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarUrl,
                        styles.avatarUrlFallback,
                        { backgroundColor: t.colors.primary },
                      ]}
                    >
                      <Text style={[t.typography.titleMedium, { color: "#fff" }]}>
                        {displayNickname[0]}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>

              <View style={{ marginLeft: t.spacing.space[3], flex: 1 }}>
                <View style={styles.nameLine}>
                  <Text style={t.typography.titleMedium}>{displayNickname}</Text>
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

            <View style={styles.ratingRight}>
              <Text style={[styles.star, { color: t.colors.ratingStar }]}>★</Text>
              <Text style={[t.typography.labelMedium, { color: t.colors.ratingStar }]}>
                {rating.toFixed(1)}
              </Text>
            </View>
          </View>

          {/* 매너온도 바 */}
          <View style={{ marginTop: t.spacing.space[3] }}>
            <View style={[styles.barTrack, { backgroundColor: t.colors.border }]}>
              <Animated.View style={[styles.barFill, { width: widthPct }]}>
                <LinearGradient colors={grad} style={StyleSheet.absoluteFillObject} />
              </Animated.View>
            </View>
          </View>
        </Card>

        {/* 메뉴 */}
        <View style={{ marginTop: t.spacing.space[4] }}>
          <Card padded={false}>
            <MenuRow label="내가 만든 모임" onPress={() => router.push("/my/hosted" as any)} />
            <Divider />
            <MenuRow label="참여한 모임" onPress={() => router.push("/my/joined" as any)} />
            <Divider />
            <MenuRow label="설정" onPress={() => router.push("/settings" as any)} />
          </Card>
        </View>

        {/* 강하게 숨김 링크 */}
        <View style={{ marginTop: t.spacing.space[4], alignItems: "center" }}>
          <Pressable onPress={() => setAccountModalOpen(true)} style={{ opacity: 0.35 }}>
            <Text style={[t.typography.labelSmall, { textDecorationLine: "underline" }]}>
              계정 관리
            </Text>
          </Pressable>
        </View>

        {/* 계정 관리 모달 */}
        <Modal transparent visible={accountModalOpen} animationType="fade">
          <Pressable
            onPress={() => setAccountModalOpen(false)}
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.45)" }]}
          />
          <View style={[styles.sheet, { backgroundColor: t.colors.surface }]}>
            <Text style={t.typography.titleMedium}>계정 관리</Text>

            <Pressable onPress={handleMockWithdraw} style={[styles.sheetBtn]}>
              <Text style={[t.typography.labelLarge, { color: t.colors.error }]}>회원탈퇴</Text>
            </Pressable>

            <Pressable onPress={() => setAccountModalOpen(false)} style={styles.sheetBtn}>
              <Text style={t.typography.labelLarge}>닫기</Text>
            </Pressable>
          </View>
        </Modal>
      </ScrollView>
    </AppLayout>
  );
}

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  scrollContentBase: {},

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileLeft: { flexDirection: "row", alignItems: "center", flex: 1 },

  avatarUrlWrap: { width: 56, height: 56 },
  avatarUrl: { width: 56, height: 56, borderRadius: 28 },
  avatarUrlFallback: { alignItems: "center", justifyContent: "center" },

  nameLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  tempPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },

  ratingRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  star: { fontSize: 12 },

  barTrack: { height: 6, borderRadius: 999, overflow: "hidden" },
  barFill: { height: "100%" },

  menuRow: {
    height: 60,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetBtn: {
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
});
