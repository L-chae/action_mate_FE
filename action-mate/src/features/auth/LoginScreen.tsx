// src/features/auth/LoginScreen.tsx
import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, Image, StyleSheet, Pressable, Animated } from "react-native";
import { router } from "expo-router";
import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SocialButton({
  title,
  bg,
  fg,
  radius,
  onPress,
}: {
  title: string;
  bg: string;
  fg: string;
  radius: number;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.985,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[
        styles.socialBtn,
        {
          backgroundColor: bg,
          borderRadius: radius,
          transform: [{ scale }],
        },
      ]}
    >
      <Text style={[styles.socialText, { color: fg }]} numberOfLines={1}>
        {title}
      </Text>
    </AnimatedPressable>
  );
}

export default function LoginScreen() {
  const t = useAppTheme();

  // ✅ spacing.ts 수정 안함: 존재하는 키만 사용
  const PH = t.spacing.pagePaddingH;
  const PV = t.spacing.pagePaddingV;
  const R = t.spacing.radiusMd;

  // ✅ spacing에 간격 토큰이 없으니 화면 로컬 상수로만 사용
  const GAP_SM = 12;
  const GAP_MD = 16;
  const GAP_LG = 24;

  // ---- stagger ----
  const aLogo = useRef(new Animated.Value(0)).current;
  const aTitle = useRef(new Animated.Value(0)).current;
  const aDesc = useRef(new Animated.Value(0)).current;
  const aCta = useRef(new Animated.Value(0)).current;

  // ---- background blobs ----
  const blob1 = useRef(new Animated.Value(0)).current;
  const blob2 = useRef(new Animated.Value(0)).current;
  const blob3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(110, [
      Animated.timing(aLogo, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(aTitle, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(aDesc, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(aCta, { toValue: 1, duration: 360, useNativeDriver: true }),
    ]).start();

    const mkLoop = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 2600, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 2600, useNativeDriver: true }),
        ])
      );

    const l1 = mkLoop(blob1, 0);
    const l2 = mkLoop(blob2, 250);
    const l3 = mkLoop(blob3, 500);

    l1.start();
    l2.start();
    l3.start();

    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [aLogo, aTitle, aDesc, aCta, blob1, blob2, blob3]);

  const blobStyles = useMemo(() => {
    const mk = (
      v: Animated.Value,
      size: number,
      x0: number,
      x1: number,
      y0: number,
      y1: number,
      color: string
    ) => {
      const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [x0, x1] });
      const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [y0, y1] });
      const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
      const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.26] });

      return [
        styles.blob,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ translateX }, { translateY }, { scale }],
          opacity,
        },
      ];
    };

    const c1 = t.colors.primary;
    const c2 = t.colors.point ?? t.colors.primary;

    return {
      b1: mk(blob1, 240, -30, 10, -40, -10, c1),
      b2: mk(blob2, 200, 220, 180, 90, 120, c2),
      b3: mk(blob3, 260, 40, 70, 340, 300, c1),
    };
  }, [blob1, blob2, blob3, t.colors.primary, t.colors.point]);

  const fadeUp = (v: Animated.Value) => ({
    opacity: v,
    transform: [
      {
        translateY: v.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  });

  return (
    <AppLayout style={[styles.page, { backgroundColor: t.colors.background }]}>
      {/* animated background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={blobStyles.b1 as any} />
        <Animated.View style={blobStyles.b2 as any} />
        <Animated.View style={blobStyles.b3 as any} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.02)" }]} />
      </View>

      {/* center */}
      <View style={[styles.center, { paddingHorizontal: PH, paddingTop: GAP_LG }]}>
        <Animated.View style={fadeUp(aLogo)}>
          <Image
            source={require("../../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={fadeUp(aTitle)}>
          <Text style={[t.typography.titleLarge, { color: t.colors.textMain, marginTop: GAP_LG, textAlign: "center" }]}>
            내가 찾던 모든 모임
          </Text>
        </Animated.View>

        <Animated.View style={fadeUp(aDesc)}>
          <Text style={[t.typography.bodySmall, { color: t.colors.textSub, textAlign: "center", marginTop: GAP_SM }]}>
            부담없이 만나는 원데이 모임부터{"\n"}지속형 모임과 챌린지 모임까지
          </Text>
        </Animated.View>
      </View>

      {/* bottom */}
      <Animated.View style={[styles.bottom, { paddingHorizontal: PH, paddingBottom: PV }, fadeUp(aCta)]}>
        <SocialButton
          title="카카오톡으로 5초만에 시작하기"
          bg="#FEE500"
          fg="#191600"
          radius={R}
          onPress={() => router.replace("/(tabs)")}
        />

        <View style={{ height: GAP_SM }} />

        <SocialButton
          title="네이버로 시작하기"
          bg="#03C75A"
          fg="#FFFFFF"
          radius={R}
          onPress={() => router.replace("/(tabs)")}
        />

        {/* ✅ 여기: 다른 방법으로 로그인 -> 아이디 로그인 */}
        <Pressable onPress={() => router.push("/id-login")} style={{ marginTop: GAP_MD }}>
          <Text style={[t.typography.labelSmall, { color: t.colors.textSub, textAlign: "center" }]}>
            다른 방법으로 로그인
          </Text>
        </Pressable>

        <Text style={[t.typography.labelSmall, { color: t.colors.textSub, textAlign: "center", marginTop: GAP_SM, opacity: 0.85 }]}>
          가입을 진행할 경우 서비스 약관 및 개인정보 처리방침에 동의한 것으로 간주합니다.
        </Text>
      </Animated.View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "space-between",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -18 }],
  },
  logo: {
    width: 120,
    height: 120,
  },
  bottom: {
    width: "100%",
    alignSelf: "stretch",
    overflow: "hidden",
  },
  socialBtn: {
    alignSelf: "stretch",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  socialText: {
    fontSize: 16,
    fontWeight: "700",
  },
  blob: {
    position: "absolute",
  },
});
