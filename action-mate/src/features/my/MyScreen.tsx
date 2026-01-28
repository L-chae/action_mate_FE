// src/features/my/MyScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/features/auth/model/authStore";
import { meetingApi } from "@/features/meetings/api/meetingApi";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";
import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import { Card } from "@/shared/ui/Card";

import { calculateMannerTemp } from "@/shared/utils/mannerCalculator";

import { myApi } from "./api/myApi";
import type { MyProfile, MySummary } from "./model/types";

/* ---------------- utils ---------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mannerIconName(temp: number): keyof typeof Ionicons.glyphMap {
  if (temp <= 35.5) return "snow-outline";
  if (temp <= 36.5) return "cloud-outline";
  if (temp <= 38.0) return "sunny-outline";
  return "flame-outline";
}

type PillTone = { text: string; bg: string };
type GradientColors = readonly [string, string];

function extractHttpStatus(e: any): number | undefined {
  const s = e?.response?.status;
  return typeof s === "number" ? s : undefined;
}

function extractBackendMessage(e: any): string | null {
  const msg = e?.response?.data?.message ?? e?.response?.data?.error?.message ?? null;
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  if (typeof e?.message === "string" && e.message.trim()) return e.message.trim();
  return null;
}

/* ---------------- small ui ---------------- */

function MenuRow({
  icon,
  label,
  desc,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc?: string;
  onPress: () => void;
}) {
  const t = useAppTheme();
  const s = t.spacing;

  const pressedBg =
    t.mode === "dark" ? withAlpha(t.colors.textSub, 0.16) : withAlpha(t.colors.textSub, 0.08);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          minHeight: 64,
          paddingHorizontal: s.pagePaddingH,
          paddingVertical: s.space[3],
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: pressed ? pressedBg : "transparent",
        },
      ]}
    >
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", minWidth: 0 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.18 : 0.12),
          }}
        >
          <Ionicons name={icon} size={18} color={t.colors.icon.default} />
        </View>

        <View style={{ width: s.space[3] }} />

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[t.typography.bodyLarge, { color: t.colors.textMain }]} numberOfLines={1}>
            {label}
          </Text>
          {desc ? (
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 2 }]} numberOfLines={1}>
              {desc}
            </Text>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={t.colors.icon.muted} />
    </Pressable>
  );
}

function Divider() {
  const t = useAppTheme();
  return <View style={{ height: 1, backgroundColor: t.colors.divider ?? t.colors.border }} />;
}

/* =========================
   Screen
========================= */

export default function MyScreen() {
  const t = useAppTheme();
  const s = t.spacing;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const styles = useMemo(() => makeStyles(t), [t]);

  const logout = useAuthStore((st) => (st as any).logout as (() => Promise<void>) | undefined);
  const user = useAuthStore((st) => ((st as any).user ?? (st as any).me) as any);
  const userAvatarUrl = user?.avatarUrl ?? null;

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [hasNoti, setHasNoti] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const [profile, setProfile] = useState<MyProfile>({
    id: "",
    nickname: "액션메이트",
    avatarUrl: null,
    avatarImageName: null,
  });

  const [summary, setSummary] = useState<MySummary>({
    avgRate: 0,
    orgTime: 0,
  });

  const fillAnim = useRef(new Animated.Value(0)).current;

  /* ---------------- derived ---------------- */

  const displayNickname = useMemo(() => {
    const n = typeof user?.nickname === "string" ? user.nickname.trim() : "";
    if (n) return n;
    const pn = typeof profile?.nickname === "string" ? profile.nickname.trim() : "";
    return pn || "액션메이트";
  }, [user?.nickname, profile?.nickname]);

  const displayAvatarUrl = useMemo(() => {
    if (userAvatarUrl) return userAvatarUrl;
    return profile?.avatarUrl ?? null;
  }, [userAvatarUrl, profile?.avatarUrl]);

  const genderRaw: any = user?.gender;
  const birthRaw: string = user?.birthDate ?? "";

  const genderLabel = useMemo(() => {
    if (!genderRaw) return "";
    if (genderRaw === "male") return "남성";
    if (genderRaw === "female") return "여성";
    return String(genderRaw);
  }, [genderRaw]);

  const birthLabel = useMemo(() => {
    const v = String(birthRaw ?? "").trim();
    if (!v) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.split("-").join(".");
    return v;
  }, [birthRaw]);

  const orgTimeLabel = useMemo(() => {
    const n = Number(summary?.orgTime ?? 0);
    if (!Number.isFinite(n) || n <= 0) return "";
    return `모임 ${n}회`;
  }, [summary?.orgTime]);

  const metaLine = useMemo(() => {
    const parts: string[] = [];
    if (genderLabel) parts.push(genderLabel);
    if (birthLabel) parts.push(birthLabel);
    if (orgTimeLabel) parts.push(orgTimeLabel);
    return parts.join(" · ");
  }, [genderLabel, birthLabel, orgTimeLabel]);

  const hasIdentity = useMemo(() => {
    const id1 = String((user as any)?.loginId ?? user?.id ?? "").trim();
    const id2 = String(profile?.id ?? "").trim();
    return Boolean(id1 || id2);
  }, [user, profile?.id]);

  /* ---------------- load ---------------- */

  const loadAll = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setInitialLoading(true);
        setApiError(null);

        const [pRes, sRes] = await Promise.allSettled([myApi.getProfile(), myApi.getSummary()]);

        // profile
        if (pRes.status === "fulfilled") {
          setProfile(pRes.value);
        } else {
          const st = extractHttpStatus(pRes.reason);
          const msg = extractBackendMessage(pRes.reason) ?? "정보를 불러오지 못했습니다.";
          console.log(`[MyScreen Load Error][profile] status=${String(st ?? "")} msg=${msg}`);

          if (st === 401 || st === 403) {
            try {
              await logout?.();
            } finally {
              router.replace("/(auth)/login");
            }
            return;
          }

          setApiError("정보를 불러오지 못했습니다.");
        }

        // summary
        if (sRes.status === "fulfilled") {
          const avgRate = clamp(Number((sRes.value as any)?.avgRate ?? 0), 0, 5);
          const orgTime = Math.max(0, Number((sRes.value as any)?.orgTime ?? 0));

          setSummary({
            avgRate: Number.isFinite(avgRate) ? avgRate : 0,
            orgTime: Number.isFinite(orgTime) ? orgTime : 0,
          });
        } else {
          const st = extractHttpStatus(sRes.reason);
          const msg = extractBackendMessage(sRes.reason) ?? "요약 정보를 불러오지 못했습니다.";
          console.log(`[MyScreen Load Error][summary] status=${String(st ?? "")} msg=${msg}`);

          setSummary((prev) => ({
            avgRate: Number.isFinite(Number(prev?.avgRate)) ? Number(prev.avgRate) : 0,
            orgTime: Number.isFinite(Number(prev?.orgTime)) ? Number(prev.orgTime) : 0,
          }));
        }
      } catch (e: any) {
        const st = extractHttpStatus(e);
        const msg = extractBackendMessage(e) ?? "정보를 불러오지 못했습니다.";
        console.log(`[MyScreen Load Error][fatal] status=${String(st ?? "")} msg=${msg}`);

        if (st === 401 || st === 403) {
          try {
            await logout?.();
          } finally {
            router.replace("/(auth)/login");
          }
          return;
        }

        setApiError("정보를 불러오지 못했습니다.");
      } finally {
        if (!isRefresh) setInitialLoading(false);
      }
    },
    [logout, router]
  );

  const checkHasNoti = useCallback(async () => {
    try {
      await meetingApi.listMeetings({});
      setHasNoti(false);
    } catch {
      setHasNoti(false);
    }
  }, []);

  useEffect(() => {
    loadAll(false);
    checkHasNoti();
  }, [loadAll, checkHasNoti]);

  useFocusEffect(
    useCallback(() => {
      checkHasNoti();
    }, [checkHasNoti])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadAll(true), checkHasNoti()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadAll, checkHasNoti]);

  /* ---------------- manner ui ---------------- */

  const tempStr = calculateMannerTemp(summary.avgRate);
  const temp = Number(tempStr);
  const ratingDisplay = summary.avgRate ? Number(summary.avgRate).toFixed(1) : "0.0";

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

  const iconName = useMemo(() => mannerIconName(temp), [temp]);

  const ratio = useMemo(() => {
    const r = (temp - 32) / 10;
    return Math.max(0, Math.min(1, r));
  }, [temp]);

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: ratio,
      duration: 850,
      useNativeDriver: false,
    }).start();
  }, [ratio, fillAnim]);

  const widthPct = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  /* ---------------- actions ---------------- */

  const goProfile = useCallback(() => {
    router.push("/settings/profile" as any);
  }, [router]);

  const handleMockWithdraw = useCallback(() => {
    Alert.alert("회원탈퇴", "탈퇴하면 계정 정보가 모두 삭제됩니다.\n정말 탈퇴하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "탈퇴",
        style: "destructive",
        onPress: async () => {
          try {
            await logout?.();
          } finally {
            setAccountModalOpen(false);
            router.replace("/(auth)/login");
          }
        },
      },
    ]);
  }, [logout, router]);

  const sheetBottomPad = Math.max(insets.bottom, s.space[3]);

  /* ---------------- Render Logic for Safety ---------------- */

  if (apiError && !refreshing && !hasIdentity) {
    return (
      <AppLayout padded={false}>
        <TopBar title="마이페이지" showBorder />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: s.pagePaddingH }}>
          <Text style={[t.typography.bodyLarge, { color: t.colors.textSub, marginBottom: 16 }]}>{apiError}</Text>
          <TouchableOpacity
            onPress={() => loadAll(false)}
            style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: t.colors.primary, borderRadius: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  const initialChar = String(displayNickname ?? "액션메이트").trim().charAt(0) || "A";

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: s.space[6] }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {apiError ? (
          <View style={{ marginBottom: s.space[3] }}>
            <Card>
              <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>{apiError}</Text>
            </Card>
          </View>
        ) : null}

        <Card padded={false}>
          <View style={{ paddingHorizontal: s.pagePaddingH, paddingVertical: s.space[4] }}>
            <View style={styles.topRow}>
              <Pressable onPress={goProfile} style={styles.profileLeft} hitSlop={8}>
                <View style={styles.avatarWrap}>
                  {displayAvatarUrl ? (
                    <Image source={{ uri: displayAvatarUrl }} style={[styles.avatar, { borderColor: t.colors.background }]} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: t.colors.primary }]}>
                      <Text style={[t.typography.titleMedium, { color: "#fff" }]}>{initialChar}</Text>
                    </View>
                  )}
                </View>

                <View style={{ width: s.space[3] }} />

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.nameLine}>
                    <Text style={[t.typography.titleMedium, { color: t.colors.textMain, flex: 1 }]} numberOfLines={1}>
                      {displayNickname}
                    </Text>

                    <View style={[styles.tempPill, { backgroundColor: pillTone.bg }]}>
                      <Ionicons name={iconName} size={12} color={pillTone.text} />
                      <View style={{ width: 4 }} />
                      <Text style={[t.typography.labelMedium, { color: pillTone.text }]}>{tempStr}℃</Text>
                    </View>
                  </View>

                  {metaLine ? (
                    <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]} numberOfLines={1}>
                      {metaLine}
                    </Text>
                  ) : (
                    <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]} numberOfLines={1}>
                      프로필을 완성하면 추천이 더 정확해져요
                    </Text>
                  )}
                </View>
              </Pressable>

              <View style={styles.ratingRight}>
                <Ionicons name="star" size={14} color={t.colors.ratingStar} />
                <View style={{ width: 4 }} />
                <Text style={[t.typography.labelMedium, { color: t.colors.ratingStar }]}>{ratingDisplay}</Text>
              </View>
            </View>

            <View style={{ marginTop: s.space[4] }}>
              <View style={[styles.barTrack, { backgroundColor: t.colors.border }]}>
                <Animated.View style={[styles.barFill, { width: widthPct }]}>
                  <LinearGradient colors={grad} style={StyleSheet.absoluteFillObject} />
                </Animated.View>
              </View>

              <View style={styles.barMetaRow}>
                <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>32℃</Text>
                <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>42℃</Text>
              </View>
            </View>
          </View>
        </Card>

        <View style={{ height: s.space[4] }} />

        <Card padded={false} style={{ overflow: "hidden" }}>
          <MenuRow icon="calendar-outline" label="내가 만든 모임" desc="주최한 모임을 확인해요" onPress={() => router.push("/my/hosted" as any)} />
          <Divider />
          <MenuRow icon="people-outline" label="참여한 모임" desc="참여/완료한 모임을 확인해요" onPress={() => router.push("/my/joined" as any)} />
          <Divider />
          <MenuRow icon="settings-outline" label="설정" desc="알림/계정/앱 설정" onPress={() => router.push("/settings" as any)} />
        </Card>

        <View style={{ marginTop: s.space[4], alignItems: "center" }}>
          <Pressable onPress={() => setAccountModalOpen(true)} style={{ opacity: 0.35 }} hitSlop={8}>
            <Text style={[t.typography.labelSmall, { textDecorationLine: "underline", color: t.colors.textSub }]}>
              계정 관리
            </Text>
          </Pressable>
        </View>

        <Modal transparent visible={accountModalOpen} animationType="fade" onRequestClose={() => setAccountModalOpen(false)}>
          <Pressable onPress={() => setAccountModalOpen(false)} style={[StyleSheet.absoluteFillObject, { backgroundColor: t.colors.scrim }]} />

          <View style={[styles.sheetWrap, { paddingBottom: sheetBottomPad }]}>
            <Card padded={false} style={styles.sheetCard}>
              <View style={{ paddingHorizontal: s.pagePaddingH, paddingTop: s.space[4], paddingBottom: s.space[3] }}>
                <Text style={[t.typography.titleMedium, { color: t.colors.textMain, textAlign: "center" }]}>계정 관리</Text>

                <View style={{ height: s.space[3] }} />

                <Pressable onPress={handleMockWithdraw} style={styles.sheetBtn} hitSlop={6}>
                  <Text style={[t.typography.labelLarge, { color: t.colors.error, fontWeight: "800" }]}>회원탈퇴</Text>
                </Pressable>

                <Pressable onPress={() => setAccountModalOpen(false)} style={styles.sheetBtn} hitSlop={6}>
                  <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]}>닫기</Text>
                </Pressable>
              </View>
            </Card>
          </View>
        </Modal>
      </ScrollView>
    </AppLayout>
  );
}

/* ---------------- styles ---------------- */

function makeStyles(t: ReturnType<typeof useAppTheme>) {
  const s = t.spacing;

  return StyleSheet.create({
    scrollContent: {
      paddingHorizontal: s.pagePaddingH,
      paddingTop: s.space[4],
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    profileLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      minWidth: 0,
    },

    avatarWrap: { width: 56, height: 56 },
    avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 1 },
    avatarFallback: { alignItems: "center", justifyContent: "center", borderWidth: 0 },

    nameLine: {
      flexDirection: "row",
      alignItems: "center",
      minWidth: 0,
    },

    tempPill: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      marginLeft: s.space[2],
    },

    ratingRight: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: s.space[3],
    },

    barTrack: { height: 6, borderRadius: 999, overflow: "hidden" },
    barFill: { height: "100%" },
    barMetaRow: {
      marginTop: s.space[2],
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    sheetWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: s.pagePaddingH,
    },

    sheetCard: {
      borderRadius: s.radiusXl,
      overflow: "hidden",
    },

    sheetBtn: {
      height: 46,
      borderRadius: s.radiusMd,
      alignItems: "center",
      justifyContent: "center",
      marginTop: s.space[2],
      backgroundColor: t.colors.overlay[6],
    },
  });
}

// 3줄 요약
// - TransformError 원인은 이전 코드에 있던 라벨 블록/특수 문법 때문에 TSX 파서가 깨진 것이며, 해당 문법을 제거해 정상 컴파일됩니다.
// - MyScreen의 “알 수 없는 오류”는 화면 문제가 아니라 myApi.getProfile/getSummary가 실패하는데 메시지가 뭉개져서 생기는 현상입니다(이제 status/msg로 분리 로깅).
// - 401/403이면 즉시 세션 정리 후 로그인 화면으로 이동해 무한 에러 루프를 방지합니다.
