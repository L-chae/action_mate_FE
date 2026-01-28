// src/features/auth/SignupScreen.tsx
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
  ActivityIndicator,
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

const formatBirthDate = (text: string) => {
  const nums = String(text ?? "").replace(/[^0-9]/g, "");
  if (nums.length <= 4) return nums;
  if (nums.length <= 6) return `${nums.slice(0, 4)}-${nums.slice(4)}`;
  return `${nums.slice(0, 4)}-${nums.slice(4, 6)}-${nums.slice(6, 8)}`;
};

const isValidBirth = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ""))) return false;
  const [y, m, d] = String(v ?? "").split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

type FieldKey = "loginId" | "password" | "nickname" | "birthDate" | "gender";

function FieldMessage({ text, color }: { text?: string | null; color?: string }) {
  const t = useAppTheme();
  const msg = String(text ?? "").trim();
  if (!msg) return null;
  return <Text style={[t.typography.bodySmall, { color: color ?? t.colors.error, marginTop: t.spacing.space?.[2] ?? 6 }]}>{msg}</Text>;
}

function GenderButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const t = useAppTheme();
  const CONTROL_H = (t.spacing as any)?.controlHeight ?? 56;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          flex: 1,
          height: CONTROL_H,
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

  const CONTROL_H = (t.spacing as any)?.controlHeight ?? 56;

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDate, setBirthDate] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [focused, setFocused] = useState<FieldKey | null>(null);

  const [isCheckingId, setIsCheckingId] = useState(false);
  const [idCheckResult, setIdCheckResult] = useState<{ valid: boolean; msg: string; checkedId: string } | null>(null);

  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    loginId: false,
    password: false,
    nickname: false,
    birthDate: false,
    gender: false,
  });

  const normalizedLoginId = useMemo(() => String(loginId ?? "").trim(), [loginId]);
  const normalizedNickname = useMemo(() => String(nickname ?? "").trim(), [nickname]);

  const idOk = useMemo(() => normalizedLoginId.length > 0, [normalizedLoginId]);
  const pwOk = useMemo(() => String(password ?? "").length >= 4, [password]);
  const nickOk = useMemo(() => normalizedNickname.length >= 2, [normalizedNickname]);
  const birthOk = useMemo(() => isValidBirth(String(birthDate ?? "")), [birthDate]);
  const genderOk = useMemo(() => gender === "male" || gender === "female", [gender]);

  const isIdCheckedForCurrent = useMemo(() => {
    if (!idCheckResult?.valid) return false;
    return String(idCheckResult?.checkedId ?? "") === normalizedLoginId;
  }, [idCheckResult, normalizedLoginId]);

  const canSubmit = useMemo(
    () => idOk && pwOk && nickOk && birthOk && genderOk && !busy && isIdCheckedForCurrent,
    [idOk, pwOk, nickOk, birthOk, genderOk, busy, isIdCheckedForCurrent]
  );

  const idErr = touched.loginId && !idOk ? "아이디를 입력해주세요." : null;
  const pwErr = touched.password && !pwOk ? "비밀번호는 4자 이상 입력해주세요." : null;
  const nickErr = touched.nickname && !nickOk ? "닉네임은 2글자 이상 입력해주세요." : null;
  const birthErr = touched.birthDate && !birthOk ? "올바른 날짜를 입력해주세요. (예: 1995-06-15)" : null;
  const genderErr = touched.gender && !genderOk ? "성별을 선택해주세요." : null;

  const headerTitleStyle: TextStyle = { ...(t.typography.titleLarge as TextStyle), color: t.colors.textMain };
  const headerDescStyle: TextStyle = { ...(t.typography.bodyMedium as TextStyle), color: t.colors.textSub, marginTop: t.spacing.space?.[2] ?? 4 };

  const cardStyle: ViewStyle = {
    backgroundColor: t.colors.surface,
    borderWidth: t.spacing.borderWidth,
    borderColor: t.colors.border,
    borderRadius: t.spacing.radiusLg,
    padding: t.spacing.space?.[5] ?? 20,
  };

  const labelStyle: TextStyle = {
    ...(t.typography.labelMedium as TextStyle),
    color: t.colors.textMain,
    marginBottom: t.spacing.space?.[2] ?? 8,
    fontWeight: "700",
  };

  const inputBoxBase: ViewStyle = {
    height: CONTROL_H,
    borderRadius: t.spacing.radiusMd,
    borderWidth: t.spacing.borderWidth,
    borderColor: t.colors.border,
    backgroundColor: t.colors.card,
    paddingHorizontal: t.spacing.space?.[4] ?? 16,
    justifyContent: "center",
  };

  const inputTextBase: TextStyle = { fontSize: 16, color: t.colors.textMain, padding: 0 };

  const getBoxStyle = (key: FieldKey, hasError: boolean): ViewStyle => {
    const isFocused = focused === key;
    if (hasError) return { ...inputBoxBase, borderColor: t.colors.error, backgroundColor: t.colors.surface };
    if (isFocused) return { ...inputBoxBase, borderColor: t.colors.primary, borderWidth: 1.5 };
    return inputBoxBase;
  };

  const markTouched = (key: FieldKey) => setTouched((p) => ({ ...p, [key]: true }));

  const scrollToBottomSoon = () => {
    requestAnimationFrame(() => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    });
  };

  const handleCheckId = async () => {
    const targetId = normalizedLoginId;
    if (!targetId) {
      markTouched("loginId");
      return;
    }

    if (idCheckResult?.valid && idCheckResult.checkedId === targetId) return;

    setIsCheckingId(true);
    setIdCheckResult(null);

    try {
      const isAvailable = await authApi.checkLoginIdAvailability(targetId); // ✅ boolean(true=사용가능)
      if (isAvailable) setIdCheckResult({ valid: true, msg: "사용 가능한 아이디입니다.", checkedId: targetId });
      else setIdCheckResult({ valid: false, msg: "이미 사용 중인 아이디입니다.", checkedId: targetId });
    } catch (error: any) {
      Alert.alert("오류", String(error?.message ?? "").trim() || "중복 확인 중 문제가 발생했습니다.");
    } finally {
      setIsCheckingId(false);
    }
  };

  const onSignup = async () => {
    if (busy) return;

    setTouched({ loginId: true, password: true, nickname: true, birthDate: true, gender: true });

    if (!canSubmit) {
      if (idOk && !isIdCheckedForCurrent) Alert.alert("알림", "아이디 중복 확인을 해주세요.");
      else Alert.alert("알림", "필수 항목을 확인해주세요.");
      return;
    }

    setBusy(true);
    setErrorMsg(null);

    try {
      await authApi.signup({
        loginId: normalizedLoginId,
        password: String(password ?? ""),
        nickname: normalizedNickname,
        gender: gender as Gender,
        birthDate: String(birthDate ?? ""),
      });

      const user = await authApi.login({
        loginId: normalizedLoginId,
        password: String(password ?? ""),
      });

      if (!user?.loginId) {
        setErrorMsg("회원 정보를 불러올 수 없습니다.");
        return;
      }

      loginToStore(user);

      Alert.alert("환영합니다!", `${user.nickname}님 가입이 완료되었습니다.`, [{ text: "시작하기", onPress: () => router.replace("/(tabs)" as any) }]);
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? "").trim() || "가입 처리 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout padded={false} style={{ backgroundColor: t.colors.background }}>
      <TopBar title="회원가입" showBack onPressBack={() => router.back()} showBorder />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: t.spacing.pagePaddingH ?? (t.spacing.space?.[6] ?? 24),
            paddingVertical: t.spacing.space?.[6] ?? 24,
            paddingBottom: t.spacing.space?.[10] ?? 40,
          }}
        >
          <View style={cardStyle}>
            <View style={{ marginBottom: t.spacing.space?.[6] ?? 24 }}>
              <Text style={headerTitleStyle}>계정 만들기</Text>
              <Text style={headerDescStyle}>필수 정보를 입력하고 시작해보세요.</Text>
            </View>

            <View style={{ marginBottom: t.spacing.space?.[5] ?? 20 }}>
              <Text style={labelStyle}>아이디</Text>

              <View style={{ flexDirection: "row", gap: t.spacing.space?.[2] ?? 8 }}>
                <View style={[getBoxStyle("loginId", !!idErr), { flex: 1 }]}>
                  <TextInput
                    value={String(loginId ?? "")}
                    onChangeText={(v) => {
                      setLoginId(v);
                      setErrorMsg(null);
                      setIdCheckResult(null);
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

                <Pressable
                  onPress={() => void handleCheckId()}
                  disabled={isCheckingId || busy}
                  style={({ pressed }) => ({
                    height: CONTROL_H,
                    paddingHorizontal: t.spacing.space?.[4] ?? 16,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: t.spacing.radiusMd,
                    borderWidth: t.spacing.borderWidth,
                    backgroundColor: t.colors.card,
                    borderColor: t.colors.border,
                    opacity: pressed || isCheckingId ? 0.7 : 1,
                  })}
                >
                  {isCheckingId ? (
                    <ActivityIndicator size="small" color={t.colors.primary} />
                  ) : (
                    <Text style={[t.typography.labelMedium, { color: t.colors.primary, fontWeight: "600" }]}>중복확인</Text>
                  )}
                </Pressable>
              </View>

              {idErr ? (
                <FieldMessage text={idErr} />
              ) : idCheckResult ? (
                <FieldMessage text={idCheckResult.msg} color={idCheckResult.valid ? t.colors.primary : t.colors.error} />
              ) : null}
            </View>

            <View style={{ marginBottom: t.spacing.space?.[5] ?? 20 }}>
              <Text style={labelStyle}>비밀번호</Text>
              <View style={[getBoxStyle("password", !!pwErr), { flexDirection: "row", alignItems: "center", gap: t.spacing.space?.[2] ?? 8 }]}>
                <TextInput
                  ref={passwordRef}
                  value={String(password ?? "")}
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
                  hitSlop={t.spacing.space?.[3] ?? 10}
                  disabled={busy}
                  style={({ pressed }) => [{ opacity: busy ? 0.6 : pressed ? 0.85 : 1, padding: t.spacing.space?.[1] ?? 4 }]}
                >
                  <Text style={[t.typography.labelSmall, { color: t.colors.textSub, fontWeight: "700" }]}>{showPw ? "숨기기" : "보기"}</Text>
                </Pressable>
              </View>
              <FieldMessage text={pwErr} />
            </View>

            <View style={{ marginBottom: t.spacing.space?.[5] ?? 20 }}>
              <Text style={labelStyle}>닉네임</Text>
              <View style={getBoxStyle("nickname", !!nickErr)}>
                <TextInput
                  ref={nicknameRef}
                  value={String(nickname ?? "")}
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
              <FieldMessage text={nickErr} />
            </View>

            <View style={{ marginBottom: t.spacing.space?.[5] ?? 20 }}>
              <Text style={labelStyle}>생년월일</Text>
              <View style={getBoxStyle("birthDate", !!birthErr)}>
                <TextInput
                  ref={birthRef}
                  value={String(birthDate ?? "")}
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
              <FieldMessage text={birthErr} />
            </View>

            <View style={{ marginBottom: t.spacing.space?.[2] ?? 8 }}>
              <Text style={labelStyle}>성별</Text>
              <View style={{ flexDirection: "row", gap: t.spacing.space?.[3] ?? 12 }}>
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
              <FieldMessage text={genderErr} />
            </View>

            {errorMsg ? (
              <View
                style={{
                  marginTop: t.spacing.space?.[4] ?? 16,
                  padding: t.spacing.space?.[3] ?? 12,
                  borderRadius: t.spacing.radiusMd,
                  backgroundColor: t.colors.overlay?.[6] ?? t.colors.surface,
                  borderWidth: t.spacing.borderWidth,
                  borderColor: t.colors.border,
                }}
              >
                <Text style={[t.typography.bodySmall, { color: t.colors.error, textAlign: "center" }]}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={{ height: t.spacing.space?.[6] ?? 24 }} />

            <Button title={busy ? "가입 처리 중..." : "가입 완료"} onPress={() => void onSignup()} loading={busy} disabled={!canSubmit} variant="primary" size="lg" />

            <View style={{ height: t.spacing.space?.[4] ?? 16 }} />

            <Button title="이미 계정이 있어요 · 로그인" onPress={() => router.back()} disabled={busy} variant="ghost" size="md" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({});

/*
요약(3줄)
- /users/exists가 boolean(true=사용가능)인 서버 규칙에 맞춰 “중복확인 결과가 현재 아이디와 일치”할 때만 제출 가능하도록 고정했습니다.
- 입력 높이/패딩/라운드 등 UI 치수는 테마 기반으로 통일해 하드코딩을 줄였습니다.
- 가입 후 즉시 로그인 흐름은 유지하되, user 누락 시에도 안전하게 실패 처리합니다.
*/
