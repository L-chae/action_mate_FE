// src/features/auth/LoginScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, StyleSheet, Pressable, Animated, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as KakaoLogin from "@react-native-seoul/kakao-login";

import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useAuthStore } from "@/features/auth/model/authStore";
import type { Gender, User } from "@/features/auth/model/types";
import { setAuthTokens } from "@/shared/api/authToken";

const IS_MOCK_AUTH = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK === "true";

function mapKakaoGenderToGender(v?: unknown): Gender {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("female") || s.includes("woman") || s.includes("f")) return "female";
  if (s.includes("male") || s.includes("man") || s.includes("m")) return "male";
  return "male";
}

function buildKakaoUser(profile: any): User {
  const kakaoId = String(profile?.id ?? "");
  const loginId = kakaoId ? `kakao_${kakaoId}` : `kakao_${Date.now()}`;

  return {
    id: loginId,
    loginId,
    nickname: String(profile?.nickname ?? "카카오 사용자"),
    gender: mapKakaoGenderToGender(profile?.gender),
    birthDate: "1990-01-01",
    avatarUrl: profile?.profileImageUrl ? String(profile.profileImageUrl) : null,
    avatarImageName: profile?.profileImageUrl ? String(profile.profileImageUrl) : null,
  } as User;
}

export default function LoginScreen() {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const loginToStore = useAuthStore((s) => s.login);

  const PH = t.spacing.pagePaddingH ?? (t.spacing.space?.[6] ?? 24);
  const PV = t.spacing.pagePaddingV ?? (t.spacing.space?.[6] ?? 24);
  const R = t.spacing.radiusMd;
  const D = t.spacing.animNormal;

  const GAP_SM = t.spacing.space?.[3] ?? 12;
  const GAP_LG = t.spacing.space?.[6] ?? 24;

  const bottomPad = Math.max(PV, t.spacing.space?.[4] ?? 16) + insets.bottom + (t.spacing.space?.[4] ?? 16);

  const kakaoBg = (t.colors as any)?.kakaoYellow ?? "#FEE500";
  const kakaoText = (t.colors as any)?.kakaoText ?? "#191600";

  const baseUnit = t.spacing.space?.[10] ?? 40;
  const LOGO_SIZE = Math.round(baseUnit * 2.75);

  const [busy, setBusy] = useState(false);

  const handleKakaoLogin = async () => {
    if (busy) return;
    setBusy(true);

    try {
      if (!IS_MOCK_AUTH) {
        Alert.alert("안내", "카카오 로그인은 서버 연동이 필요합니다.\n현재는 '이메일로 로그인'을 사용해주세요.");
        return;
      }

      await KakaoLogin.login();
      const profile = await KakaoLogin.getProfile();

      const user = buildKakaoUser(profile);

      await setAuthTokens({
        accessToken: `mock_access_${Date.now()}`,
        refreshToken: `mock_refresh_${Date.now()}`,
      });

      loginToStore(user);
      router.replace("/(tabs)" as any);
    } catch (e: any) {
      if (e?.code === "E_CANCELLED_OPERATION") return;
      Alert.alert("로그인 실패", String(e?.message ?? "").trim() || "카카오 로그인 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslate = useRef(new Animated.Value(10)).current;
  const blob1 = useRef(new Animated.Value(0)).current;
  const blob2 = useRef(new Animated.Value(0)).current;
  const blob3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: D * 2, useNativeDriver: true }),
      Animated.timing(logoTranslate, { toValue: 0, duration: D * 2, useNativeDriver: true }),
    ]).start();

    const loop = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 2800, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 2800, useNativeDriver: true }),
        ])
      );

    const a = loop(blob1, 0);
    const b = loop(blob2, 300);
    const c = loop(blob3, 600);
    a.start();
    b.start();
    c.start();
    return () => {
      a.stop();
      b.stop();
      c.stop();
    };
  }, [D, blob1, blob2, blob3, logoOpacity, logoTranslate]);

  const blobStyles = useMemo(() => {
    const mk = (v: Animated.Value, size: number, x0: number, x1: number, y0: number, y1: number, color: string) => ({
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      position: "absolute" as const,
      transform: [
        { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [x0, x1] }) },
        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y0, y1] }) },
        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
      ],
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.14] }),
    });

    const s1 = Math.round(baseUnit * 6);
    const s2 = Math.round(baseUnit * 5.25);
    const s3 = Math.round(baseUnit * 7);

    return {
      b1: mk(blob1, s1, -Math.round(baseUnit * 0.75), Math.round(baseUnit * 0.25), -baseUnit, -Math.round(baseUnit * 0.25), t.colors.primary),
      b2: mk(blob2, s2, Math.round(baseUnit * 5.5), Math.round(baseUnit * 4.4), Math.round(baseUnit * 1.75), Math.round(baseUnit * 2.75), t.colors.point ?? t.colors.primary),
      b3: mk(blob3, s3, baseUnit, Math.round(baseUnit * 1.75), Math.round(baseUnit * 6.5), Math.round(baseUnit * 5.75), t.colors.primary),
    };
  }, [baseUnit, blob1, blob2, blob3, t]);

  return (
    <AppLayout style={[styles.page, { backgroundColor: t.colors.background }]} padded={false}>
      <LinearGradient
        colors={[t.colors.primaryLight, t.colors.background, t.colors.surface]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]} pointerEvents="none">
        <Animated.View style={blobStyles.b1} />
        <Animated.View style={blobStyles.b2} />
        <Animated.View style={blobStyles.b3} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.neutral?.[900] ?? "#000", opacity: 0.02 }]} />
      </View>

      <View style={[styles.center, { paddingHorizontal: PH, paddingTop: GAP_LG }]}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ translateY: logoTranslate }] }}>
          <Image source={require("../../../assets/images/logo.png")} style={{ width: LOGO_SIZE, height: LOGO_SIZE }} resizeMode="contain" />
        </Animated.View>

        <Animated.View style={{ opacity: logoOpacity, transform: [{ translateY: logoTranslate }] }}>
          <Text style={[t.typography.titleLarge, styles.title, { color: t.colors.textMain, marginTop: GAP_LG }]}>내가 찾던 모든 모임</Text>
          <Text style={[t.typography.bodySmall, styles.subtitle, { color: t.colors.textSub, marginTop: t.spacing.space?.[3] ?? 10 }]}>
            원데이부터 정기모임까지, 가볍게 시작해요.
          </Text>
        </Animated.View>
      </View>

      <View style={[styles.bottom, { paddingHorizontal: PH, paddingBottom: bottomPad }]}>
        <View
          style={[
            styles.ctaCard,
            {
              backgroundColor: t.colors.surface,
              borderColor: t.colors.border,
              borderRadius: t.spacing.radiusLg,
              padding: t.spacing.space?.[4] ?? 16,
            },
          ]}
        >
          <SocialButton
            text="카카오로 시작하기"
            textColor={kakaoText}
            bgColor={kakaoBg}
            onPress={() => void handleKakaoLogin()}
            busy={busy}
            radius={t.spacing.radiusLg}
            height={(t.spacing as any)?.controlHeight ?? 56}
          />

          <View style={{ height: GAP_SM }} />

          <SocialButton
            text="이메일로 로그인"
            textColor={t.colors.backgroundLight}
            bgColor={t.colors.primary}
            onPress={() => router.push("/(auth)/id-login" as any)}
            busy={busy}
            radius={t.spacing.radiusLg}
            height={(t.spacing as any)?.controlHeight ?? 56}
          />

          <View style={[styles.signupRow, { marginTop: t.spacing.space?.[4] ?? 14, gap: t.spacing.space?.[2] ?? 6 }]}>
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>계정이 없으신가요?</Text>
            <Pressable onPress={() => router.push("/(auth)/signup" as any)} disabled={busy} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[t.typography.bodySmall, styles.signupLink, { color: t.colors.primary }]}>회원가입</Text>
            </Pressable>
          </View>

          <Text style={[styles.terms, { color: t.colors.textSub, marginTop: t.spacing.space?.[3] ?? 12 }]}>
            가입을 진행할 경우 서비스 약관 및 개인정보 처리방침에 동의한 것으로 간주합니다.
          </Text>
        </View>
      </View>
    </AppLayout>
  );
}

interface SocialButtonProps {
  text: string;
  textColor: string;
  bgColor: string;
  onPress: () => void;
  busy: boolean;
  radius: number;
  height: number;
}

const SocialButton = ({ text, textColor, bgColor, onPress, busy, radius, height }: SocialButtonProps) => (
  <Pressable
    onPress={onPress}
    disabled={busy}
    style={({ pressed }) => [
      styles.socialBtn,
      {
        height,
        backgroundColor: bgColor,
        borderRadius: radius,
        opacity: busy ? 0.6 : pressed ? 0.9 : 1,
      },
    ]}
  >
    {busy ? <ActivityIndicator color={textColor} /> : <Text style={[styles.socialText, { color: textColor }]}>{text}</Text>}
  </Pressable>
);

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "space-between", overflow: "hidden" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { textAlign: "center", letterSpacing: -0.3 },
  subtitle: { textAlign: "center", lineHeight: 18, letterSpacing: -0.1 },
  bottom: { width: "100%" },
  ctaCard: {
    borderWidth: 1,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  socialBtn: { width: "100%", alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  socialText: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },
  signupRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  signupLink: { fontWeight: "800" },
  terms: { textAlign: "center", fontSize: 11, lineHeight: 15, opacity: 0.6 },
});

/*
요약(3줄)
- 버튼/로고/블롭 크기를 테마 spacing 기반으로 계산해 하드코딩을 줄였습니다.
- 카카오 색상은 테마 확장값이 있으면 사용하고 없으면 fallback으로 안전 처리했습니다.
- 라우팅은 타입 이슈 방지를 위해 안전 캐스팅을 유지했습니다.
*/
