import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  Pressable,
  StyleSheet,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { router } from "expo-router";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import { Button } from "@/shared/ui/Button";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useAuthStore } from "@/features/auth/model/authStore";
import { authApi } from "@/features/auth/api/authApi";
import type { Gender } from "@/features/auth/model/types";

/**
 * ✅ 이번 TS 에러 원인/해결
 * - RN Text의 style은 StyleProp<TextStyle>인데,
 *   `[t.typography.titleLarge, {...}] as const` 처럼 "readonly tuple"로 굳으면
 *   TS가 StyleProp로 못 받는 경우가 있습니다(특히 strict/tsconfig 조합에서).
 *
 * ✅ 해결
 * - `as const` 제거
 * - 스타일 배열은 `const x: TextStyle = {...}` (단일 객체)로 만들거나
 *   `<Text style={[...]} />`에서 배열을 "readonly"로 만들지 않게 유지
 */

// --- Helpers: 생년월일 자동 포맷팅 (YYYYMMDD -> YYYY-MM-DD) ---
const formatBirthDate = (text: string) => {
  const nums = text.replace(/[^0-9]/g, "");
  if (nums.length <= 4) return nums;
  if (nums.length <= 6) return `${nums.slice(0, 4)}-${nums.slice(4)}`;
  return `${nums.slice(0, 4)}-${nums.slice(4, 6)}-${nums.slice(6, 8)}`;
};

const isValidBirth = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

type FieldKey = "loginId" | "password" | "nickname" | "birthDate" | "gender";

function FieldError({ text }: { text?: string | null }) {
  const t = useAppTheme();
  if (!text) return null;
  return <Text style={[t.typography.bodySmall, { color: t.colors.error, marginTop: 6 }]}>{text}</Text>;
}

function GenderButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          flex: 1,
          height: 56,
          borderRadius: t.spacing.radiusMd,
          borderWidth: t.spacing.borderWidth,
          borderColor: selected ? t.colors.primary : t.colors.border,
          backgroundColor: selected ? t.colors.primaryLight : t.colors.card,
          justifyContent: "center",
          alignItems: "center",
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text
        style={[
          t.typography.labelLarge,
          {
            color: selected ? t.colors.primary : t.colors.textSub,
            fontWeight: selected ? "700" : "600",
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function SignupScreen() {
  const t = useAppTheme();
  const loginToStore = useAuthStore((s) => s.login);

  const scrollRef = useRef<ScrollView>(null);

  const passwordRef = useRef<TextInput>(null);
  const nicknameRef = useRef<TextInput>(null);
  const birthRef = useRef<TextInput>(null);

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDate, setBirthDate] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [focused, setFocused] = useState<FieldKey | null>(null);

  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    loginId: false,
    password: false,
    nickname: false,
    birthDate: false,
    gender: false,
  });

  // --- Validation (최소) ---
  const idOk = useMemo(() => loginId.trim().length > 0, [loginId]);
  const pwOk = useMemo(() => password.length >= 4, [password]);
  const nickOk = useMemo(() => nickname.trim().length >= 2, [nickname]);
  const birthOk = useMemo(() => isValidBirth(birthDate), [birthDate]);
  const genderOk = useMemo(() => gender === "male" || gender === "female", [gender]);

  const canSubmit = useMemo(
    () => idOk && pwOk && nickOk && birthOk && genderOk && !busy,
    [idOk, pwOk, nickOk, birthOk, genderOk, busy]
  );

  // --- Errors (touched 기반 노출) ---
  const idErr = touched.loginId && !idOk ? "아이디를 입력해주세요." : null;
  const pwErr = touched.password && !pwOk ? "비밀번호는 4자 이상 입력해주세요." : null;
  const nickErr = touched.nickname && !nickOk ? "닉네임은 2글자 이상 입력해주세요." : null;
  const birthErr = touched.birthDate && !birthOk ? "올바른 날짜를 입력해주세요. (예: 1995-06-15)" : null;
  const genderErr = touched.gender && !genderOk ? "성별을 선택해주세요." : null;

  // --- Styles (✅ readonly tuple 방지 위해 'as const' / readonly 제거) ---
  const headerTitleStyle: TextStyle = {
    ...(t.typography.titleLarge as TextStyle),
    color: t.colors.textMain,
  };
  const headerDescStyle: TextStyle = {
    ...(t.typography.bodyMedium as TextStyle),
    color: t.colors.textSub,
    marginTop: 4,
  };

  const cardStyle: ViewStyle = {
    backgroundColor: t.colors.surface,
    borderWidth: t.spacing.borderWidth,
    borderColor: t.colors.border,
    borderRadius: t.spacing.radiusLg,
    padding: t.spacing.space[5],
  };

  const labelStyle: TextStyle = {
    ...(t.typography.labelMedium as TextStyle),
    color: t.colors.textMain,
    marginBottom: 8,
    fontWeight: "700",
  };

  const inputBoxBase: ViewStyle = {
    height: 56,
    borderRadius: t.spacing.radiusMd,
    borderWidth: t.spacing.borderWidth,
    borderColor: t.colors.border,
    backgroundColor: t.colors.card,
    paddingHorizontal: t.spacing.space[4],
    justifyContent: "center",
  };

  const inputTextBase: TextStyle = {
    fontSize: 16,
    color: t.colors.textMain,
    padding: 0,
  };

  const getBoxStyle = (key: FieldKey, hasError: boolean): ViewStyle => {
    const isFocused = focused === key;
    if (hasError) {
      return {
        ...inputBoxBase,
        borderColor: t.colors.error,
        backgroundColor: t.colors.surface,
      };
    }
    if (isFocused) {
      return {
        ...inputBoxBase,
        borderColor: t.colors.primary,
        borderWidth: 1.5,
      };
    }
    return inputBoxBase;
  };

  const markTouched = (key: FieldKey) => setTouched((p) => ({ ...p, [key]: true }));

  const scrollToBottomSoon = () => {
    requestAnimationFrame(() => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    });
  };

  const onSignup = async () => {
    if (busy) return;

    setTouched({
      loginId: true,
      password: true,
      nickname: true,
      birthDate: true,
      gender: true,
    });

    if (!canSubmit) {
      Alert.alert("알림", "필수 항목을 확인해주세요.");
      return;
    }

    setBusy(true);
    setErrorMsg(null);

    try {
      const newUser = await authApi.signup({
        loginId: loginId.trim(),
        password,
        nickname: nickname.trim(),
        gender: gender as Gender,
        birthDate,
      });

      await loginToStore(newUser);

      Alert.alert("환영합니다!", `${newUser.nickname}님 가입이 완료되었습니다.`, [
        { text: "시작하기", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout padded={false} style={{ backgroundColor: t.colors.background }}>
      <TopBar title="회원가입" showBack onPressBack={() => router.back()} showBorder />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: t.spacing.pagePaddingH,
            paddingVertical: t.spacing.space[6],
            paddingBottom: t.spacing.space[10],
          }}
        >
          <View style={cardStyle}>
            <View style={{ marginBottom: t.spacing.space[6] }}>
              <Text style={headerTitleStyle}>계정 만들기</Text>
              <Text style={headerDescStyle}>필수 정보를 입력하고 시작해보세요.</Text>
            </View>

            {/* 1) 아이디 */}
            <View style={{ marginBottom: t.spacing.space[5] }}>
              <Text style={labelStyle}>아이디</Text>
              <View style={getBoxStyle("loginId", !!idErr)}>
                <TextInput
                  value={loginId}
                  onChangeText={(v) => {
                    setLoginId(v);
                    setErrorMsg(null);
                  }}
                  onFocus={() => setFocused("loginId")}
                  onBlur={() => {
                    setFocused(null);
                    markTouched("loginId");
                  }}
                  placeholder="아이디 입력"
                  placeholderTextColor={t.colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!busy}
                  style={inputTextBase}
                />
              </View>
              <FieldError text={idErr} />
            </View>

            {/* 2) 비밀번호 */}
            <View style={{ marginBottom: t.spacing.space[5] }}>
              <Text style={labelStyle}>비밀번호</Text>
              <View style={[getBoxStyle("password", !!pwErr), { flexDirection: "row", alignItems: "center", gap: 8 }]}>
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setErrorMsg(null);
                  }}
                  onFocus={() => setFocused("password")}
                  onBlur={() => {
                    setFocused(null);
                    markTouched("password");
                  }}
                  placeholder="4자 이상 입력"
                  placeholderTextColor={t.colors.placeholder}
                  secureTextEntry={!showPw}
                  returnKeyType="next"
                  onSubmitEditing={() => nicknameRef.current?.focus()}
                  editable={!busy}
                  style={[inputTextBase, { flex: 1 }]}
                />

                <Pressable
                  onPress={() => setShowPw((p) => !p)}
                  hitSlop={10}
                  disabled={busy}
                  style={({ pressed }) => [{ opacity: busy ? 0.6 : pressed ? 0.85 : 1, padding: 4 }]}
                >
                  <Text style={[t.typography.labelSmall, { color: t.colors.textSub, fontWeight: "700" }]}>
                    {showPw ? "숨기기" : "보기"}
                  </Text>
                </Pressable>
              </View>
              <FieldError text={pwErr} />
            </View>

            {/* 3) 닉네임 */}
            <View style={{ marginBottom: t.spacing.space[5] }}>
              <Text style={labelStyle}>닉네임</Text>
              <View style={getBoxStyle("nickname", !!nickErr)}>
                <TextInput
                  ref={nicknameRef}
                  value={nickname}
                  onChangeText={(v) => {
                    setNickname(v);
                    setErrorMsg(null);
                  }}
                  onFocus={() => setFocused("nickname")}
                  onBlur={() => {
                    setFocused(null);
                    markTouched("nickname");
                  }}
                  placeholder="예: 테니스왕"
                  placeholderTextColor={t.colors.placeholder}
                  returnKeyType="next"
                  onSubmitEditing={() => birthRef.current?.focus()}
                  editable={!busy}
                  style={inputTextBase}
                />
              </View>
              <FieldError text={nickErr} />
            </View>

            {/* 4) 생년월일 */}
            <View style={{ marginBottom: t.spacing.space[5] }}>
              <Text style={labelStyle}>생년월일</Text>
              <View style={getBoxStyle("birthDate", !!birthErr)}>
                <TextInput
                  ref={birthRef}
                  value={birthDate}
                  onChangeText={(text) => {
                    const formatted = formatBirthDate(text);
                    setBirthDate(formatted);
                    setErrorMsg(null);
                    if (formatted.length === 10) markTouched("birthDate");
                  }}
                  onFocus={() => {
                    setFocused("birthDate");
                    scrollToBottomSoon();
                  }}
                  onBlur={() => {
                    setFocused(null);
                    markTouched("birthDate");
                  }}
                  placeholder="예: 19950615 (숫자만 입력)"
                  placeholderTextColor={t.colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={10}
                  editable={!busy}
                  style={inputTextBase}
                />
              </View>
              <FieldError text={birthErr} />
            </View>

            {/* 5) 성별 */}
            <View style={{ marginBottom: t.spacing.space[2] }}>
              <Text style={labelStyle}>성별</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <GenderButton
                  label="남성"
                  selected={gender === "male"}
                  onPress={() => {
                    setGender("male");
                    setErrorMsg(null);
                    markTouched("gender");
                  }}
                />
                <GenderButton
                  label="여성"
                  selected={gender === "female"}
                  onPress={() => {
                    setGender("female");
                    setErrorMsg(null);
                    markTouched("gender");
                  }}
                />
              </View>
              <FieldError text={genderErr} />
            </View>

            {/* 서버 에러 */}
            {errorMsg ? (
              <View
                style={{
                  marginTop: t.spacing.space[4],
                  padding: t.spacing.space[4],
                  borderRadius: t.spacing.radiusMd,
                  backgroundColor: t.colors.overlay[6],
                  borderWidth: t.spacing.borderWidth,
                  borderColor: t.colors.border,
                }}
              >
                <Text style={[t.typography.bodySmall, { color: t.colors.error, textAlign: "center" }]}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={{ height: t.spacing.space[6] }} />

            <Button
              title={busy ? "가입 처리 중..." : "가입 완료"}
              onPress={onSignup}
              loading={busy}
              disabled={!canSubmit}
              variant="primary"
              size="lg"
            />

            <View style={{ height: t.spacing.space[4] }} />

            <Button
              title="이미 계정이 있어요 · 로그인"
              onPress={() => router.back()}
              disabled={busy}
              variant="ghost"
              size="md"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

// ✅ 정적 스타일만 유지 (theme 사용 금지)
const styles = StyleSheet.create({});