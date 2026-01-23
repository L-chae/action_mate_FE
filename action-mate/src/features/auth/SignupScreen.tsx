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
import { authApi } from "@/features/auth/api/authApi"; // ✅ API import 확인
import type { Gender } from "@/features/auth/model/types";

// --- Helpers ---
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

  // ID 중복 확인 상태
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [idCheckResult, setIdCheckResult] = useState<{ valid: boolean; msg: string } | null>(null);

  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    loginId: false,
    password: false,
    nickname: false,
    birthDate: false,
    gender: false,
  });

  // --- Validation ---
  const idOk = useMemo(() => loginId.trim().length > 0, [loginId]);
  const pwOk = useMemo(() => password.length >= 4, [password]);
  const nickOk = useMemo(() => nickname.trim().length >= 2, [nickname]);
  const birthOk = useMemo(() => isValidBirth(birthDate), [birthDate]);
  const genderOk = useMemo(() => gender === "male" || gender === "female", [gender]);

  // 가입 버튼 활성화 조건: 모든 필드 OK + ID 중복확인 통과(valid)
  const canSubmit = useMemo(
    () => idOk && pwOk && nickOk && birthOk && genderOk && !busy && idCheckResult?.valid,
    [idOk, pwOk, nickOk, birthOk, genderOk, busy, idCheckResult]
  );

  const idErr = touched.loginId && !idOk ? "아이디를 입력해주세요." : null;
  const pwErr = touched.password && !pwOk ? "비밀번호는 4자 이상 입력해주세요." : null;
  const nickErr = touched.nickname && !nickOk ? "닉네임은 2글자 이상 입력해주세요." : null;
  const birthErr = touched.birthDate && !birthOk ? "올바른 날짜를 입력해주세요. (예: 1995-06-15)" : null;
  const genderErr = touched.gender && !genderOk ? "성별을 선택해주세요." : null;

  // --- Styles ---
  const headerTitleStyle: TextStyle = { ...(t.typography.titleLarge as TextStyle), color: t.colors.textMain };
  const headerDescStyle: TextStyle = { ...(t.typography.bodyMedium as TextStyle), color: t.colors.textSub, marginTop: 4 };
  const cardStyle: ViewStyle = { backgroundColor: t.colors.surface, borderWidth: t.spacing.borderWidth, borderColor: t.colors.border, borderRadius: t.spacing.radiusLg, padding: t.spacing.space[5] };
  const labelStyle: TextStyle = { ...(t.typography.labelMedium as TextStyle), color: t.colors.textMain, marginBottom: 8, fontWeight: "700" };
  const inputBoxBase: ViewStyle = { height: 56, borderRadius: t.spacing.radiusMd, borderWidth: t.spacing.borderWidth, borderColor: t.colors.border, backgroundColor: t.colors.card, paddingHorizontal: t.spacing.space[4], justifyContent: "center" };
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

  // ✅ [수정됨] 실제 API 연동한 아이디 중복 확인 핸들러
  const handleCheckId = async () => {
    const targetId = loginId.trim();
    if (!targetId) {
      markTouched("loginId");
      return;
    }
    
    // 이미 확인 통과했고, 아이디가 안 바뀌었으면 재요청 방지
    if (idCheckResult?.valid) return;

    setIsCheckingId(true);
    setIdCheckResult(null);

    try {
      // ✅ 실제 API 호출 (authApi.ts에 구현된 함수 사용)
      const isAvailable = await authApi.checkLoginIdAvailability(targetId);
console.log("ID 중복 확인 결과:", isAvailable);
      if (isAvailable) {
        setIdCheckResult({ valid: true, msg: "사용 가능한 아이디입니다." });
      } else {
        setIdCheckResult({ valid: false, msg: "이미 사용 중인 아이디입니다." });
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("오류", error?.message ?? "중복 확인 중 문제가 발생했습니다.");
    } finally {
      setIsCheckingId(false);
    }
  };

  // ✅ [수정됨] 회원가입 핸들러
  const onSignup = async () => {
    if (busy) return;

    setTouched({
      loginId: true, password: true, nickname: true, birthDate: true, gender: true,
    });

    if (!canSubmit) {
      if (idOk && !idCheckResult?.valid) {
        Alert.alert("알림", "아이디 중복 확인을 해주세요.");
      } else {
        Alert.alert("알림", "필수 항목을 확인해주세요.");
      }
      return;
    }

    setBusy(true);
    setErrorMsg(null);

    try {
      // ✅ 실제 API 호출 (성별 변환 등은 authApi 내부에서 처리됨)
      const newUser = await authApi.signup({
        loginId: loginId.trim(),
        password,
        nickname: nickname.trim(),
        gender: gender as Gender,
        birthDate,
      });

      // 스토어 업데이트 (로그인 처리)
      await loginToStore(newUser);

      Alert.alert("환영합니다!", `${newUser.nickname}님 가입이 완료되었습니다.`, [
        { text: "시작하기", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "가입 처리 중 오류가 발생했습니다.");
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

            {/* 1) 아이디 + 중복확인 버튼 */}
            <View style={{ marginBottom: t.spacing.space[5] }}>
              <Text style={labelStyle}>아이디</Text>
              
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={[getBoxStyle("loginId", !!idErr), { flex: 1 }]}>
                  <TextInput
                    value={loginId}
                    onChangeText={(v) => {
                      setLoginId(v);
                      setErrorMsg(null);
                      // 텍스트 변경 시 다시 검사해야 하므로 결과 초기화
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
                  onPress={handleCheckId}
                  disabled={isCheckingId || busy}
                  style={({ pressed }) => ({
                    height: 56,
                    paddingHorizontal: 16,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 12,
                    borderWidth: 1,
                    backgroundColor: t.colors.card,
                    borderColor: t.colors.border,
                    opacity: pressed || isCheckingId ? 0.7 : 1,
                  })}
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
                  <FieldMessage
                    text={idCheckResult.msg}
                    color={idCheckResult.valid ? t.colors.primary : t.colors.error}
                  />
                )
              )}
            </View>

            {/* 2) 비밀번호 */}
            <View style={{ marginBottom: t.spacing.space[5] }}>
              <Text style={labelStyle}>비밀번호</Text>
              <View style={[getBoxStyle("password", !!pwErr), { flexDirection: "row", alignItems: "center", gap: 8 }]}>
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrorMsg(null); }}
                  onFocus={() => setFocused("password")}
                  onBlur={() => { setFocused(null); markTouched("password"); }}
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
              <FieldMessage text={pwErr} />
            </View>

            {/* 3) 닉네임 */}
            <View style={{ marginBottom: t.spacing.space[5] }}>
              <Text style={labelStyle}>닉네임</Text>
              <View style={getBoxStyle("nickname", !!nickErr)}>
                <TextInput
                  ref={nicknameRef}
                  value={nickname}
                  onChangeText={(v) => { setNickname(v); setErrorMsg(null); }}
                  onFocus={() => setFocused("nickname")}
                  onBlur={() => { setFocused(null); markTouched("nickname"); }}
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
                  onFocus={() => { setFocused("birthDate"); scrollToBottomSoon(); }}
                  onBlur={() => { setFocused(null); markTouched("birthDate"); }}
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

            {/* 5) 성별 */}
            <View style={{ marginBottom: t.spacing.space[2] }}>
              <Text style={labelStyle}>성별</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <GenderButton
                  label="남성"
                  selected={gender === "male"}
                  onPress={() => { setGender("male"); setErrorMsg(null); markTouched("gender"); }}
                />
                <GenderButton
                  label="여성"
                  selected={gender === "female"}
                  onPress={() => { setGender("female"); setErrorMsg(null); markTouched("gender"); }}
                />
              </View>
              <FieldMessage text={genderErr} />
            </View>

            {/* 서버 에러 표시 */}
            {errorMsg ? (
              <View style={{ marginTop: 16, padding: 12, borderRadius: 8, backgroundColor: t.colors.overlay[6], borderWidth: 1, borderColor: t.colors.border }}>
                <Text style={[t.typography.bodySmall, { color: t.colors.error, textAlign: "center" }]}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={{ height: 24 }} />

            {/* 가입 완료 버튼 */}
            <Button
              title={busy ? "가입 처리 중..." : "가입 완료"}
              onPress={onSignup}
              loading={busy}
              disabled={!canSubmit} 
              variant="primary"
              size="lg"
            />

            <View style={{ height: 16 }} />

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

const styles = StyleSheet.create({});