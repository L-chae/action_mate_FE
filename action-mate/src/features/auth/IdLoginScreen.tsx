// src/features/auth/IdLoginScreen.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from "react-native";
import { router } from "expo-router";
import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useAuthStore } from "@/features/auth/authStore";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PrimaryButton({
  title,
  onPress,
  disabled,
  radius,
  bg,
  fg,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  radius: number;
  bg: string;
  fg: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const useNative = Platform.OS !== "web";

  const pressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 0.985,
      useNativeDriver: useNative,
      speed: 30,
      bounciness: 0,
    }).start();
  };
  const pressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: useNative,
      speed: 30,
      bounciness: 0,
    }).start();
  };

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[
        styles.primaryBtn,
        {
          backgroundColor: bg,
          borderRadius: radius,
          opacity: disabled ? 0.6 : 1,
          transform: [{ scale }],
        },
      ]}
    >
      <Text style={[styles.primaryText, { color: fg }]}>{title}</Text>
    </AnimatedPressable>
  );
}

export default function IdLoginScreen() {
  const t = useAppTheme();
  const login = useAuthStore((s) => s.login);

  // ✅ spacing.ts 수정 안함: 존재하는 키만 사용
  const PH = t.spacing.pagePaddingH;
  const PV = t.spacing.pagePaddingV;
  const R = t.spacing.radiusMd;

  // ✅ spacing에 간격 토큰이 없으니 화면 로컬 상수만 사용
  const GAP_XXS = 6;
  const GAP_XS = 8;
  const GAP_SM = 12;
  const GAP_MD = 16;
  const GAP_LG = 24;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length >= 4,
    [email, password]
  );

  const onLogin = () => {
    // ✅ (가짜) 로그인 성공 처리: authStore의 login(user) 사용
    login({
      id: "temp-user",
      email: email.trim(),
      nickname: "게스트",
    });

    // ✅ 한 틱 뒤에 이동 (Auth Guard 타이밍 튕김 방지)
    setTimeout(() => {
      router.replace("/(tabs)");
    }, 0);
  };

  return (
    <AppLayout style={[styles.page, { backgroundColor: t.colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: PH,
            paddingTop: GAP_LG,
            paddingBottom: PV,
          }}
        >
          {/* ✅ 브랜드(로고) 영역 */}
          <View style={styles.brand}>
            <Image
              source={require("../../../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text
              style={[
                t.typography.titleLarge,
                { color: t.colors.textMain, marginTop: GAP_SM },
              ]}
            >
              아이디로 로그인
            </Text>
            <Text
              style={[
                t.typography.bodySmall,
                {
                  color: t.colors.textSub,
                  marginTop: GAP_XXS,
                  textAlign: "center",
                },
              ]}
            >
              이메일과 비밀번호를 입력해주세요
            </Text>
          </View>

          <View style={{ height: GAP_LG }} />

          {/* Email */}
          <Text
            style={[
              t.typography.labelSmall,
              { color: t.colors.textSub, marginBottom: GAP_XS },
            ]}
          >
            이메일
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            style={[
              styles.input,
              {
                borderColor: t.colors.border,
                color: t.colors.textMain,
                borderRadius: R,
              },
            ]}
            placeholderTextColor={t.colors.textSub}
            returnKeyType="next"
          />

          <View style={{ height: GAP_MD }} />

          {/* Password */}
          <Text
            style={[
              t.typography.labelSmall,
              { color: t.colors.textSub, marginBottom: GAP_XS },
            ]}
          >
            비밀번호
          </Text>
          <View
            style={[
              styles.pwRow,
              { borderColor: t.colors.border, borderRadius: R },
            ]}
          >
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              secureTextEntry={!showPw}
              style={[styles.pwInput, { color: t.colors.textMain }]}
              placeholderTextColor={t.colors.textSub}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canSubmit) onLogin();
              }}
            />

            <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={10}>
              <Text
                style={[t.typography.labelSmall, { color: t.colors.textSub }]}
              >
                {showPw ? "숨기기" : "보기"}
              </Text>
            </Pressable>
          </View>

          <View style={{ height: GAP_LG }} />

          {/* Login Button */}
          <PrimaryButton
            title="로그인"
            onPress={onLogin}
            disabled={!canSubmit}
            radius={R}
            bg={t.colors.primary}
            fg="#ffffff"
          />

          {/* Links */}
          <View style={{ height: GAP_SM }} />

          <View style={styles.linksRow}>
            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <Text
                style={[t.typography.labelSmall, { color: t.colors.textSub }]}
              >
                뒤로가기
              </Text>
            </Pressable>

            <Text style={{ color: t.colors.border, marginHorizontal: 10 }}>·</Text>

            {/* ✅ (auth) 그룹의 signup으로 이동 */}
            <Pressable onPress={() => router.push("/(auth)/signup")}>
              <Text
                style={[t.typography.labelSmall, { color: t.colors.textSub }]}
              >
                회원가입
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={() => {}} style={{ marginTop: GAP_MD }}>
            <Text
              style={[
                t.typography.labelSmall,
                { color: t.colors.textSub, textAlign: "center" },
              ]}
            >
              비밀번호를 잊으셨나요?
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },

  brand: {
    alignItems: "center",
    justifyContent: "center",
  },

  // ✅ 로고 더 작게 + 가운데
  logo: {
    width: 64,
    height: 64,
  },

  input: {
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 16,
  },

  pwRow: {
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  pwInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },

  primaryBtn: {
    alignSelf: "stretch",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "700",
  },

  linksRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});
