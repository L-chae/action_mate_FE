// src/features/auth/SignupScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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

// --- Helpers ---
const formatBirthDate = (text: string) => {
  const nums = (text ?? "").replace(/[^0-9]/g, "");
  if (nums.length <= 4) return nums;
  if (nums.length <= 6) return `${nums.slice(0, 4)}-${nums.slice(4)}`;
  return `${nums.slice(0, 4)}-${nums.slice(4, 6)}-${nums.slice(6, 8)}`;
};

const isValidBirth = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v ?? "")) return false;
  const [y, m, d] = (v ?? "").split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

type FieldKey = "loginId" | "password" | "nickname" | "birthDate" | "gender";

function FieldMessage({ text, color }: { text?: string | null; color?: string }) {
  const t = useAppTheme();
  if (!text) return null;
  return (
    <Text style={[t.typography.bodySmall, { color: color ?? t.colors.error, marginTop: 6 }]}>
      {text}
    </Text>
  );
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
  const s = useMemo(() => createStyles(t), [t]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.genderBtnBase,
        {
          borderColor: selected ? t.colors.primary : t.colors.border,
          backgroundColor: selected ? t.colors.primaryLight : t.colors.card,
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

type IdCheckResult = { checkedId: string; valid: boolean; msg: string };

type AppTheme = ReturnType<typeof useAppTheme>;

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background },
    scrollContent: {
      paddingHorizontal: t.spacing.pagePaddingH,
      paddingVertical: t.spacing.space[6],
      paddingBottom: t.spacing.space[10],
    },

    card: {
      backgroundColor: t.colors.surface,
      borderWidth: t.spacing.borderWidth,
      borderColor: t.colors.border,
      borderRadius: t.spacing.radiusLg,
      padding: t.spacing.space[5],
    },

    title: { ...(t.typography.titleLarge as TextStyle), color: t.colors.textMain },
    desc: { ...(t.typography.bodyMedium as TextStyle), color: t.colors.textSub, marginTop: 4 },

    label: {
      ...(t.typography.labelMedium as TextStyle),
      color: t.colors.textMain,
      marginBottom: 8,
      fontWeight: "700",
    },

    row: { flexDirection: "row", gap: 8 },
    rowCenter: { flexDirection: "row", alignItems: "center", gap: 8 },

    inputBoxBase: {
      height: 56,
      borderRadius: t.spacing.radiusMd,
      borderWidth: t.spacing.borderWidth,
      borderColor: t.colors.border,
      backgroundColor: t.colors.card,
      paddingHorizontal: t.spacing.space[4],
      justifyContent: "center",
    },

    inputTextBase: { fontSize: 16, color: t.colors.textMain, padding: 0 } as TextStyle,

    checkBtn: {
      height: 56,
      paddingHorizontal: 16,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: t.colors.card,
      borderColor: t.colors.border,
    },

    serverErrorBox: {
      marginTop: 16,
      padding: 12,
      borderRadius: 8,
      backgroundColor: t.colors.overlay?.[6] ?? t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
    },

    spacer24: { height: 24 },
    spacer16: { height: 16 },

    genderRow: { flexDirection: "row", gap: 12 },

    genderBtnBase: {
      flex: 1,
      height: 56,
      borderRadius: t.spacing.radiusMd,
      borderWidth: t.spacing.borderWidth,
      justifyContent: "center",
      alignItems: "center",
    } as ViewStyle,
  });
}

export default function SignupScreen() {
  const t = useAppTheme();
  const s = useMemo(() => createStyles(t), [t]);
  const loginToStore = useAuthStore((st) => st.login);

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

  // ID 중복 확인 상태
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [idCheckResult, setIdCheckResult] = useState<IdCheckResult | null>(null);

  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    loginId: false,
    password: false,
    nickname: false,
    birthDate: false,
    gender: false,
  });

  const latestLoginIdRef = useRef<string>("");
  const checkSeqRef = useRef<number>(0);

  useEffect(() => {
    latestLoginIdRef.current = loginId ?? "";
  }, [loginId]);

  // --- Validation ---
  const idOk = useMemo(() => (loginId ?? "").trim().length > 0, [loginId]);
  const pwOk = useMemo(() => (password ?? "").length >= 4, [password]);
  const nickOk = useMemo(() => (nickname ?? "").trim().length >= 2, [nickname]);
  const birthOk = useMemo(() => isValidBirth(birthDate ?? ""), [birthDate]);
  const genderOk = useMemo(() => gender === "male" || gender === "female", [gender]);

  const canSubmit = useMemo(() => {
    const idCheckedForCurrent = idCheckResult?.checkedId === (loginId ?? "").trim();
    return !!(
      idOk &&
      pwOk &&
      nickOk &&
      birthOk &&
      genderOk &&
      !busy &&
      idCheckedForCurrent &&
      idCheckResult?.valid === true
    );
  }, [idOk, pwOk, nickOk, birthOk, genderOk, busy, idCheckResult, loginId]);

  const idErr = touched.loginId && !idOk ? "아이디를 입력해주세요." : null;
  const pwErr = touched.password && !pwOk ? "비밀번호는 4자 이상 입력해주세요." : null;
  const nickErr = touched.nickname && !nickOk ? "닉네임은 2글자 이상 입력해주세요." : null;
  const birthErr = touched.birthDate && !birthOk ? "올바른 날짜를 입력해주세요. (예: 1995-06-15)" : null;
  const genderErr = touched.gender && !genderOk ? "성별을 선택해주세요." : null;

  const getBoxStyle = (key: FieldKey, hasError: boolean): ViewStyle => {
    const isFocused = focused === key;
    if (hasError)
      return { ...s.inputBoxBase, borderColor: t.colors.error, backgroundColor: t.colors.surface };
    if (isFocused) return { ...s.inputBoxBase, borderColor: t.colors.primary, borderWidth: 1.5 };
    return s.inputBoxBase;
  };

  const markTouched = (key: FieldKey) => setTouched((p) => ({ ...p, [key]: true }));

  const scrollToBottomSoon = () => {
    requestAnimationFrame(() => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    });
  };

  const invalidateIdCheck = () => {
    setIdCheckResult(null);
    checkSeqRef.current += 1; // in-flight 결과 무효화
  };

  // 아이디 중복 확인
  const handleCheckId = async () => {
    const targetId = (latestLoginIdRef.current ?? "").trim();
    if (!targetId) {
      markTouched("loginId");
      return;
    }

    // 현재 입력값과 동일한 아이디로 "사용 가능"이 이미 확정이면 재요청 방지
    if (idCheckResult?.valid === true && idCheckResult.checkedId === targetId) return;

    const seq = (checkSeqRef.current += 1);

    setIsCheckingId(true);
    setIdCheckResult(null);

    try {
      const isAvailable = await authApi.checkLoginIdAvailability(targetId);

      // 입력값이 바뀌었거나 더 최신 요청이 있으면 UI 반영 금지(오표시 방지)
      const latestId = (latestLoginIdRef.current ?? "").trim();
      if (checkSeqRef.current !== seq) return;
      if (latestId !== targetId) return;

      if (isAvailable) {
        setIdCheckResult({ checkedId: targetId, valid: true, msg: "사용 가능한 아이디입니다." });
      } else {
        setIdCheckResult({ checkedId: targetId, valid: false, msg: "이미 사용 중인 아이디입니다." });
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("오류", error?.message ?? "중복 확인 중 문제가 발생했습니다.");
    } finally {
      if (checkSeqRef.current === seq) setIsCheckingId(false);
    }
  };

  const onSignup = async () => {
    if (busy) return;

    setTouched({ loginId: true, password: true, nickname: true, birthDate: true, gender: true });

    const currentId = (loginId ?? "").trim();
    const checkedForCurrent = idCheckResult?.checkedId === currentId;

    if (!canSubmit) {
      if (idOk && (!checkedForCurrent || idCheckResult?.valid !== true)) {
        Alert.alert("알림", "아이디 중복 확인을 해주세요.");
      } else {
        Alert.alert("알림", "필수 항목을 확인해주세요.");
      }
      return;
    }

    setBusy(true);
    setErrorMsg(null);

    const normalizedLoginId = currentId;
    const normalizedNickname = (nickname ?? "").trim();

    try {
      await authApi.signup({
        loginId: normalizedLoginId,
        password: password ?? "",
        nickname: normalizedNickname,
        gender: gender as Gender,
        birthDate: birthDate ?? "",
      });

      const user = await authApi.login({
        loginId: normalizedLoginId,
        password: password ?? "",
      });

      loginToStore(user);

      Alert.alert("환영합니다!", `${user?.nickname ?? "회원"}님 가입이 완료되었습니다.`, [
        { text: "시작하기", onPress: () => router.replace("/(tabs)" as any) },
      ]);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "가입 처리 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const idHintColor = idCheckResult?.valid ? t.colors.primary : t.colors.error;

  return (
    <AppLayout padded={false} style={s.root}>
      <TopBar title="회원가입" showBack onPressBack={() => router.back()} showBorder />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.scrollContent}
        >
          <View style={s.card}>
            <View style={{ marginBottom: t.spacing.space[6] }}>
              <Text style={s.title}>계정 만들기</Text>
              <Text style={s.desc}>필수 정보를 입력하고 시작해보세요.</Text>
            </View>

            {/* 1) 아이디 + 중복확인 버튼 */}
            <View style={{ marginBottom: t.spacing.space[5] }}>
              <Text style={s.label}>아이디</Text>

              <View style={s.row}>
                <View style={[getBoxStyle("loginId", !!idErr), { flex: 1 }]}>
                  <TextInput
                    value={loginId}
                    onChangeText={(v) => {
                      setLoginId(v ?? "");
                      setErrorMsg(null);
                      invalidateIdCheck();
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
                    style={s.inputTextBase}
                  />
                </View>

                <Pressable
                  onPress={() => void handleCheckId()}
                  disabled={!idOk || isCheckingId || busy}
                  style={({ pressed }) => [
                    s.checkBtn,
                    { opacity: !idOk || busy ? 0.45 : pressed || isCheckingId ? 0.7 : 1 },
                  ]}
                >
                  {isCheckingId ? (
                    <ActivityIndicator size="small" color={t.colors.primary} />
                  ) : (
                    <Text style={[t.typography.labelMedium, { color: t.colors.primary, fontWeight: "600" }]}>
                      중복확인
                    </Text>
                  )}
                </Pressable>
              </View>

              {idErr ? (
                <FieldMessage text={idErr} />
              ) : (
                idCheckResult && (
                  <FieldMessage text={idCheckResult.msg} color={idHintColor} />
                )
              )}
            </View>

            {/* 2) 비밀번호 */}
            <View style={{ marginBottom: t.spacing.space[5] }}>
              <Text style={s.label}>비밀번호</Text>
              <View style={[getBoxStyle("password", !!pwErr), s.rowCenter]}>
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v ?? "");
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
                  style={[s.inputTextBase, { flex: 1 }]}
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
              <FieldMessage text={pwErr} />
            </View>

            {/* 3) 닉네임 */}
            <View style={{ marginBottom: t.spacing.space[5] }}>
              <Text style={s.label}>닉네임</Text>
              <View style={getBoxStyle("nickname", !!nickErr)}>
                <TextInput
                  ref={nicknameRef}
                  value={nickname}
                  onChangeText={(v) => {
                    setNickname(v ?? "");
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
                  style={s.inputTextBase}
                />
              </View>
              <FieldMessage text={nickErr} />
            </View>

            {/* 4) 생년월일 */}
            <View style={{ marginBottom: t.spacing.space[5] }}>
              <Text style={s.label}>생년월일</Text>
              <View style={getBoxStyle("birthDate", !!birthErr)}>
                <TextInput
                  ref={birthRef}
                  value={birthDate}
                  onChangeText={(text) => {
                    const formatted = formatBirthDate(text ?? "");
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
                  style={s.inputTextBase}
                />
              </View>
              <FieldMessage text={birthErr} />
            </View>

            {/* 5) 성별 */}
            <View style={{ marginBottom: t.spacing.space[2] }}>
              <Text style={s.label}>성별</Text>
              <View style={s.genderRow}>
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

            {/* 서버 에러 표시 */}
            {errorMsg ? (
              <View style={s.serverErrorBox}>
                <Text style={[t.typography.bodySmall, { color: t.colors.error, textAlign: "center" }]}>
                  {errorMsg}
                </Text>
              </View>
            ) : null}

            <View style={s.spacer24} />

            {/* 가입 완료 버튼 */}
            <Button
              title={busy ? "가입 처리 중..." : "가입 완료"}
              onPress={() => void onSignup()}
              loading={busy}
              disabled={!canSubmit}
              variant="primary"
              size="lg"
            />

            <View style={s.spacer16} />

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