// src/features/auth/EmailLoginScreen.tsx
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
import { useAuthStore } from "@/features/auth/model/authStore";
import { authApi } from "@/features/auth/api/authApi";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * ShortOrg 서버 스펙은 로그인 식별자가 "id" (loginId) 입니다.
 * UI는 "이메일/아이디" 모두 허용하도록 검증을 완화합니다.
 *
 * - 이메일 형식이면 OK
 * - 아니면 3~20자 영문/숫자/._- 로 구성된 아이디면 OK (너무 느슨하면 서버/UX에서 혼란)
 */
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidLoginId = (v: string) => /^[a-zA-Z0-9._-]{3,20}$/.test(v.trim());
const isValidEmailOrId = (v: string) => {
  const s = v.trim();
  return isValidEmail(s) || isValidLoginId(s);
};

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

export default function EmailLoginScreen() {
  const t = useAppTheme();
  const loginToStore = useAuthStore((s) => s.login);

  const PH = t.spacing.pagePaddingH;
  const PV = t.spacing.pagePaddingV;
  const R = t.spacing.radiusMd;

  const GAP_XXS = 6;
  const GAP_SM = 12;
  const GAP_MD = 16;
  const GAP_LG = 24;

  // ✅ "email" 변수명을 그대로 쓰되, 실제로는 email 또는 id 모두 허용
  const [email, setEmail] = useState(""); // = loginId/email 입력값
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const isFocused = (k: "email" | "password") => focused === k;

  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPw, setTouchedPw] = useState(false);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ 이메일 또는 아이디 허용
  const loginOk = useMemo(() => isValidEmailOrId(email), [email]);
  const loginError = touchedEmail && email.trim().length > 0 && !loginOk;

  // ✅ 8자 정책으로 통일 (Signup/문구/검증)
  const pwOk = password.length >= 4;
  const pwError = touchedPw && password.length > 0 && !pwOk;

  const canSubmit = useMemo(() => loginOk && pwOk && !busy, [loginOk, pwOk, busy]);

  const c = t.colors as any;
  const danger = c.error ?? c.danger ?? c.negative ?? c.red ?? t.colors.primary;
  const activeBg = c.surfaceAlt ?? c.surface2 ?? c.card ?? t.colors.surface ?? t.colors.background;
  const onPrimary = c.onPrimary ?? "#ffffff";

  const goTabs = () => router.replace("/(tabs)");

  const onLogin = async () => {
    if (busy) return;

    setTouchedEmail(true);
    setTouchedPw(true);
    setErrorMsg(null);

    if (!loginOk) return;

    if (!pwOk) {
      setErrorMsg("비밀번호는 4자 이상으로 입력해 주세요.");
      return;
    }

    setBusy(true);
    try {
      // ✅ authApi.verifyLogin은 서버에 { id, password }로 매핑되도록 remote 구현해둔 상태
      const user = await authApi.verifyLogin(email.trim(), password);
      await loginToStore(user);
      goTabs();
    } catch (e: any) {
      setErrorMsg(e?.message ?? "로그인에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout style={[styles.page, { backgroundColor: t.colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, paddingHorizontal: PH, paddingTop: GAP_LG, paddingBottom: PV }}>
          <View style={styles.brand}>
            <Image
              source={require("../../../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[t.typography.titleLarge, { color: t.colors.textMain, marginTop: GAP_SM }]}>
              아이디로 로그인
            </Text>
            <Text
              style={[
                t.typography.bodySmall,
                { color: t.colors.textSub, marginTop: GAP_XXS, textAlign: "center" },
              ]}
            >
              이메일 또는 아이디와 비밀번호를 입력해주세요
            </Text>
          </View>

          <View style={{ height: GAP_LG }} />

          <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginBottom: 8 }]}>
            이메일 / 아이디
          </Text>

          <TextInput
            value={email}
            editable={!busy}
            onChangeText={(v) => {
              setEmail(v);
              if (!touchedEmail) setTouchedEmail(true);
              if (errorMsg) setErrorMsg(null);
            }}
            onFocus={() => setFocused("email")}
            onBlur={() => {
              setFocused(null);
              setTouchedEmail(true);
            }}
            placeholder="example@email.com 또는 user123"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="username" // ✅ 이메일/아이디 공용
            autoComplete="username"
            style={[
              styles.input,
              isFocused("email") && styles.inputFocused,
              {
                borderColor: loginError ? danger : isFocused("email") ? t.colors.primary : t.colors.border,
                backgroundColor: isFocused("email") ? activeBg : t.colors.surface,
                color: t.colors.textMain,
                borderRadius: R,
              },
            ]}
            placeholderTextColor={t.colors.textSub}
            returnKeyType="next"
          />

          {loginError && (
            <Text style={[t.typography.bodySmall, { color: danger, marginTop: GAP_XXS }]}>
              이메일 형식 또는 3~20자 아이디(영문/숫자/._-)로 입력해주세요.
            </Text>
          )}

          <View style={{ height: GAP_MD }} />

          <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginBottom: 8 }]}>
            비밀번호
          </Text>

          <View
            style={[
              styles.pwRow,
              isFocused("password") && styles.inputFocused,
              {
                borderColor: pwError ? danger : isFocused("password") ? t.colors.primary : t.colors.border,
                borderRadius: R,
                backgroundColor: isFocused("password") ? activeBg : t.colors.surface,
                opacity: busy ? 0.8 : 1,
              },
            ]}
          >
            <TextInput
              value={password}
              editable={!busy}
              onChangeText={(v) => {
                setPassword(v);
                if (!touchedPw) setTouchedPw(true);
                if (errorMsg) setErrorMsg(null);
              }}
              onFocus={() => setFocused("password")}
              onBlur={() => {
                setFocused(null);
                setTouchedPw(true);
              }}
              placeholder="비밀번호 (4자 이상)"
              secureTextEntry={!showPw}
              style={[styles.pwInput, { color: t.colors.textMain }]}
              placeholderTextColor={t.colors.textSub}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canSubmit) void onLogin();
                else {
                  setTouchedEmail(true);
                  setTouchedPw(true);
                }
              }}
            />

            <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={10} disabled={busy}>
              <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                {showPw ? "숨기기" : "보기"}
              </Text>
            </Pressable>
          </View>

          {pwError && (
            <Text style={[t.typography.bodySmall, { color: danger, marginTop: GAP_XXS }]}>
              비밀번호는 8자 이상으로 입력해 주세요.
            </Text>
          )}

          {errorMsg ? (
            <Text style={[t.typography.bodySmall, { color: danger, marginTop: GAP_XXS }]}>{errorMsg}</Text>
          ) : null}

          <View style={{ height: GAP_LG }} />

          <PrimaryButton
            title={busy ? "로그인 중..." : "로그인"}
            onPress={() => void onLogin()}
            disabled={!canSubmit}
            radius={R}
            bg={t.colors.primary}
            fg={onPrimary}
          />

          <View style={{ height: GAP_SM }} />

          <Pressable
            onPress={() => router.push("/(auth)/signup")}
            disabled={busy}
            style={({ pressed }) => [
              styles.signUpBtn,
              {
                borderRadius: R,
                borderColor: t.colors.primary,
                backgroundColor: t.colors.background,
                opacity: pressed ? 0.88 : busy ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.signUpText, { color: t.colors.primary }]}>회원가입</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/reset-password")}
            disabled={busy}
            style={{ marginTop: GAP_MD, opacity: busy ? 0.6 : 1 }}
          >
            <Text style={[t.typography.labelSmall, { color: t.colors.textSub, textAlign: "center" }]}>
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

  brand: { alignItems: "center", justifyContent: "center" },
  logo: { width: 64, height: 64 },

  input: { borderWidth: 1, paddingVertical: 14, paddingHorizontal: 14, fontSize: 16 },
  inputFocused: { borderWidth: 2 },

  pwRow: {
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  pwInput: { flex: 1, fontSize: 16, paddingVertical: 4 },

  primaryBtn: { alignSelf: "stretch", paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 16, fontWeight: "700" },

  signUpBtn: {
    alignSelf: "stretch",
    minHeight: 52,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  signUpText: { fontSize: 16, fontWeight: "700" },
});