// app/(auth)/login.tsx
import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, Image, StyleSheet, Pressable, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useAuthStore } from "@/features/auth/authStore";

export default function LoginPage() {
  const t = useAppTheme();
  const login = useAuthStore((s) => s.login);

  const PH = t.spacing.pagePaddingH;
  const PV = t.spacing.pagePaddingV;
  const R = t.spacing.radiusMd;
  const D = t.spacing.animNormal;

  const GAP_SM = 12;
  const GAP_LG = 24;

  const mockSocialLogin = (provider: "kakao" | "naver") => {
    login({
      id: `${provider}_${Date.now()}`,
      email: `${provider}@mock.local`,
      nickname: provider === "kakao" ? "카카오 사용자" : "네이버 사용자",
    });

    // ✅ 그룹 경로 대신 실제 라우트로 이동(탭 홈)
    router.replace("/");
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
  }, [D, logoOpacity, logoTranslate, blob1, blob2, blob3]);

  const blobStyles = useMemo(() => {
    const mk = (
      v: Animated.Value,
      size: number,
      x0: number,
      x1: number,
      y0: number,
      y1: number,
      baseColor: string
    ) => {
      const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [x0, x1] });
      const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [y0, y1] });
      const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
      const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.14] });

      return [
        styles.blob,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: baseColor,
          transform: [{ translateX }, { translateY }, { scale }],
          opacity,
        },
      ];
    };

    return {
      b1: mk(blob1, 240, -30, 10, -40, -10, t.colors.primary),
      b2: mk(blob2, 210, 220, 175, 70, 110, t.colors.point ?? t.colors.primary),
      b3: mk(blob3, 280, 40, 70, 260, 230, t.colors.primary),
    };
  }, [blob1, blob2, blob3, t.colors.primary, t.colors.point]);

  return (
    <AppLayout style={[styles.page, { backgroundColor: t.colors.background }]} padded={false}>
      <LinearGradient
        colors={["#FBFBFF", "#FFFFFF", "#FFF8F5"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]} pointerEvents="none">
        <Animated.View style={blobStyles.b1 as any} />
        <Animated.View style={blobStyles.b2 as any} />
        <Animated.View style={blobStyles.b3 as any} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.02)" }]} />
      </View>

      <View style={[styles.center, { paddingHorizontal: PH, paddingTop: GAP_LG }]}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ translateY: logoTranslate }] }}>
          <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
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

      <View style={[styles.bottom, { paddingHorizontal: PH, paddingBottom: Math.max(PV, 16) }]}>
        <View style={styles.ctaCard}>
          <Pressable
            onPress={() => mockSocialLogin("kakao")}
            style={({ pressed }) => [
              styles.socialBtn,
              { backgroundColor: "#FEE500", borderRadius: R + 2, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={[styles.socialText, { color: "#191600" }]}>카카오로 시작하기</Text>
          </Pressable>

          <View style={{ height: GAP_SM }} />

          <Pressable
            onPress={() => mockSocialLogin("naver")}
            style={({ pressed }) => [
              styles.socialBtn,
              { backgroundColor: "#03C75A", borderRadius: R + 2, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={[styles.socialText, { color: "#FFFFFF" }]}>네이버로 시작하기</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/id-login")}
            style={({ pressed }) => [{ marginTop: 14, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[t.typography.bodySmall, { textAlign: "center", color: t.colors.textMain }]}>
              다른 방법으로 로그인 →
            </Text>
          </Pressable>

          <Text style={[styles.terms, { color: t.colors.textSub, opacity: 0.55 }]}>
            가입을 진행할 경우 서비스 약관 및 개인정보 처리방침에 동의한 것으로 간주합니다.
          </Text>
        </View>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -10 }],
  },
  logo: {
    width: 110,
    height: 110,
  },
  title: {
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  bottom: { width: "100%" },
  ctaCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  socialBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  socialText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  terms: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 15,
  },
  blob: { position: "absolute" },
});