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
import { verifyLogin } from "@/features/auth/localAuthService";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ✅ 이메일 형식 검증
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

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
  const loginToStore = useAuthStore((s) => s.login);

  const PH = t.spacing.pagePaddingH;
  const PV = t.spacing.pagePaddingV;
  const R = t.spacing.radiusMd;

  const GAP_XXS = 6;
  const GAP_SM = 12;
  const GAP_MD = 16;
  const GAP_LG = 24;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // ✅ 포커스(hover 느낌)
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const isFocused = (k: "email" | "password") => focused === k;

  // ✅ 이메일 UX용
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPw, setTouchedPw] = useState(false);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const emailOk = useMemo(() => isValidEmail(email), [email]);
  const emailError = touchedEmail && email.trim().length > 0 && !emailOk;

  // ✅ 회원가입이 8자 기준이니까 로그인도 8자로 통일
  const pwOk = password.length >= 8;
  const pwError = touchedPw && password.length > 0 && !pwOk;

  const canSubmit = useMemo(() => emailOk && pwOk && !busy, [emailOk, pwOk, busy]);

  // ✅ 토큰 fallback
  const c = t.colors as any;
  const danger = c.error ?? c.danger ?? c.negative ?? c.red ?? t.colors.primary;
  const activeBg = c.surfaceAlt ?? c.surface2 ?? c.card ?? t.colors.surface ?? t.colors.background;
  const onPrimary = c.onPrimary ?? "#ffffff";

  const onLogin = async () => {
    setTouchedEmail(true);
    setTouchedPw(true);
    setErrorMsg(null);

    if (!emailOk) return;
    if (!pwOk) {
      setErrorMsg("비밀번호는 8자 이상으로 입력해 주세요.");
      return;
    }

    setBusy(true);
    try {
      // ✅ 로컬 저장소 계정 검증
      const user = await verifyLogin(email.trim(), password);
      await loginToStore(user);
      router.replace("/(tabs)");
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
            <Text style={[t.typography.titleLarge, { color: t.colors.textMain, marginTop: GAP_SM }]}>
              아이디로 로그인
            </Text>
            <Text
              style={[
                t.typography.bodySmall,
                { color: t.colors.textSub, marginTop: GAP_XXS, textAlign: "center" },
              ]}
            >
              이메일과 비밀번호를 입력해주세요
            </Text>
          </View>

          <View style={{ height: GAP_LG }} />

          {/* Email */}
          <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginBottom: 8 }]}>
            이메일
          </Text>

          <TextInput
            value={email}
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
            placeholder="example@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            style={[
              styles.input,
              isFocused("email") && styles.inputFocused,
              {
                borderColor: emailError ? danger : isFocused("email") ? t.colors.primary : t.colors.border,
                backgroundColor: isFocused("email") ? activeBg : t.colors.surface,
                color: t.colors.textMain,
                borderRadius: R,
              },
            ]}
            placeholderTextColor={t.colors.textSub}
            returnKeyType="next"
          />

          {emailError && (
            <Text style={[t.typography.bodySmall, { color: danger, marginTop: GAP_XXS }]}>
              올바른 이메일 형식으로 입력해주세요. (예: test@email.com)
            </Text>
          )}

          <View style={{ height: GAP_MD }} />

          {/* Password */}
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
              },
            ]}
          >
            <TextInput
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (errorMsg) setErrorMsg(null);
              }}
              onFocus={() => setFocused("password")}
              onBlur={() => {
                setFocused(null);
                setTouchedPw(true);
              }}
              placeholder="비밀번호 (8자 이상)"
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

            <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={10}>
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
            <Text style={[t.typography.bodySmall, { color: danger, marginTop: GAP_XXS }]}>
              {errorMsg}
            </Text>
          ) : null}

          <View style={{ height: GAP_LG }} />

          {/* Login Button */}
          <PrimaryButton
            title={busy ? "로그인 중..." : "로그인"}
            onPress={() => void onLogin()}
            disabled={!canSubmit}
            radius={R}
            bg={t.colors.primary}
            fg={onPrimary}
          />

          {/* ✅ 회원가입 버튼 크게 */}
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
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={[styles.signUpText, { color: t.colors.primary }]}>회원가입</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/forgot-password")}
            disabled={busy}
            style={{ marginTop: GAP_MD }}
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

  input: {
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 16,
  },

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

  primaryBtn: {
    alignSelf: "stretch",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
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