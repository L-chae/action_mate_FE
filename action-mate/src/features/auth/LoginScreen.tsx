// src/features/auth/LoginScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, StyleSheet, Pressable, Animated, ActivityIndicator, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as KakaoLogin from "@react-native-seoul/kakao-login";

import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useAuthStore } from "@/features/auth/model/authStore";

export default function LoginScreen() {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);

  // UI Constants
  const PH = t.spacing.pagePaddingH;
  const PV = t.spacing.pagePaddingV;
  const R = t.spacing.radiusMd;
  const D = t.spacing.animNormal;
  const GAP_SM = t.spacing.space[3];
  const GAP_LG = t.spacing.space[6];
  const bottomPad = Math.max(PV, t.spacing.space[4]) + insets.bottom + t.spacing.space[4];

  const [busy, setBusy] = useState(false);

  // 2. 카카오 로그인 핸들러
  const handleKakaoLogin = async () => {
    if (busy) return;
    setBusy(true);

    try {
      const token = await KakaoLogin.login();
      console.log("Kakao Token:", token);

      const profile = await KakaoLogin.getProfile();
      console.log("Kakao Profile:", profile);

      await login({
        id: `kakao_${profile.id}`,
        email: profile.email || `kakao_no_email@local`,
        nickname: profile.nickname || "카카오(test)",
        gender: profile.gender?.toLowerCase() || "none",
        profileImage: profile.profileImageUrl,
      } as any);

      router.replace("/(tabs)");

    } catch (e: any) {
      if (e.code === 'E_CANCELLED_OPERATION') {
        console.log("로그인 취소");
      } else {
        console.error("로그인 실패:", e);
      }
    } finally {
      setBusy(false);
    }
  };

  // 3. 애니메이션 로직
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

    const a = loop(blob1, 0); const b = loop(blob2, 300); const c = loop(blob3, 600);
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [D]);

  const blobStyles = useMemo(() => {
    const mk = (v: Animated.Value, size: number, x0: number, x1: number, y0: number, y1: number, color: string) => ({
      width: size, height: size, borderRadius: size / 2, backgroundColor: color, position: "absolute" as const,
      transform: [
        { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [x0, x1] }) },
        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y0, y1] }) },
        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
      ],
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.14] }),
    });
    return {
      b1: mk(blob1, 240, -30, 10, -40, -10, t.colors.primary),
      b2: mk(blob2, 210, 220, 175, 70, 110, t.colors.point ?? t.colors.primary),
      b3: mk(blob3, 280, 40, 70, 260, 230, t.colors.primary),
    };
  }, [t]);

  return (
    <AppLayout style={[styles.page, { backgroundColor: t.colors.background }]} padded={false}>
      {/* 배경 */}
      <LinearGradient colors={[t.colors.primaryLight, t.colors.background, t.colors.surface]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]} pointerEvents="none">
        <Animated.View style={blobStyles.b1} /><Animated.View style={blobStyles.b2} /><Animated.View style={blobStyles.b3} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.neutral[900], opacity: 0.02 }]} />
      </View>

      {/* 로고 영역 */}
      <View style={[styles.center, { paddingHorizontal: PH, paddingTop: GAP_LG }]}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ translateY: logoTranslate }] }}>
          <Image source={require("../../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ translateY: logoTranslate }] }}>
          <Text style={[t.typography.titleLarge, styles.title, { color: t.colors.textMain, marginTop: GAP_LG }]}>
            내가 찾던 모든 모임
          </Text>
          <Text style={[t.typography.bodySmall, styles.subtitle, { color: t.colors.textSub, marginTop: 10 }]}>
            원데이부터 정기모임까지, 가볍게 시작해요.
          </Text>
        </Animated.View>
      </View>

      {/* 하단 버튼 영역 */}
      <View style={[styles.bottom, { paddingHorizontal: PH, paddingBottom: bottomPad }]}>
        <View style={[styles.ctaCard, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          
          {/* ✅ 수정됨: SocialButton을 직접 사용 */}
          <SocialButton
            text="카카오로 시작하기"
            textColor="#191600"
            bgColor="#FEE500"
            onPress={handleKakaoLogin}
            busy={busy}
            radius={R + 2}
          />

          <View style={{ height: GAP_SM }} />

          {/* 이메일 로그인 버튼 */}
          <SocialButton
            text="이메일로 로그인"
            textColor={t.colors.backgroundLight}
            bgColor={t.colors.primary}
            onPress={() => router.push("/(auth)/id-login")}
            busy={busy}
            radius={R + 2}
          />

          <View style={styles.signupRow}>
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>계정이 없으신가요?</Text>
            <Pressable onPress={() => router.push("/(auth)/signup")} disabled={busy} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[t.typography.bodySmall, styles.signupLink, { color: t.colors.primary }]}>회원가입</Text>
            </Pressable>
          </View>

          <Text style={[styles.terms, { color: t.colors.textSub }]}>
            가입을 진행할 경우 서비스 약관 및 개인정보 처리방침에 동의한 것으로 간주합니다.
          </Text>
        </View>
      </View>
    </AppLayout>
  );
}

// ✅ 재사용 컴포넌트 추가
interface SocialButtonProps {
  text: string;
  textColor: string;
  bgColor: string;
  onPress: () => void;
  busy: boolean;
  radius: number;
}

const SocialButton = ({ text, textColor, bgColor, onPress, busy, radius }: SocialButtonProps) => (
  <Pressable
    onPress={onPress}
    disabled={busy}
    style={({ pressed }) => [
      styles.socialBtn,
      { backgroundColor: bgColor, borderRadius: radius, opacity: busy ? 0.6 : pressed ? 0.9 : 1 },
    ]}
  >
    {busy ? <ActivityIndicator color={textColor} /> : <Text style={[styles.socialText, { color: textColor }]}>{text}</Text>}
  </Pressable>
);

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "space-between", overflow: "hidden" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 110, height: 110 },
  title: { textAlign: "center", letterSpacing: -0.3 },
  subtitle: { textAlign: "center", lineHeight: 18, letterSpacing: -0.1 },
  bottom: { width: "100%" },
  ctaCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  socialBtn: { width: "100%", alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  socialText: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },
  signupRow: { marginTop: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  signupLink: { fontWeight: "800" },
  terms: { marginTop: 12, textAlign: "center", fontSize: 11, lineHeight: 15, opacity: 0.6 },
});