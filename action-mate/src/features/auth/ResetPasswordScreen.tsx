// src/features/auth/ResetPasswordScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { router } from "expo-router";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import { Button } from "@/shared/ui/Button";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { authApi } from "@/features/auth/api/authApi";

/**
 * ✅ 현재 앱 정책 반영
 * - "email" 개념 제거 → 아이디(loginId) 기반으로 재설정 요청
 * - authApi.requestPasswordReset(loginId) 사용 (파라미터 이름이 email이어도 값은 loginId)
 * - 화면/스타일은 로그인/회원가입과 동일한 "카드 + 인풋박스" 패턴 유지
 *
 * ⚠️ 목업에서 requestPasswordReset 미지원이면 에러 메시지로 안내됩니다.
 */

type FieldKey = "loginId";

function FieldError({ text }: { text?: string | null }) {
  const t = useAppTheme();
  if (!text) return null;
  return (
    <Text style={[t.typography.bodySmall, { color: t.colors.error, marginTop: 6 }]}>
      {text}
    </Text>
  );
}

function FieldInfo({ text }: { text?: string | null }) {
  const t = useAppTheme();
  if (!text) return null;
  return (
    <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 6 }]}>
      {text}
    </Text>
  );
}

export default function ResetPasswordScreen() {
  const t = useAppTheme();

  const [loginId, setLoginId] = useState("");
  const [busy, setBusy] = useState(false);

  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({ loginId: false });
  const [focusedField, setFocusedField] = useState<FieldKey | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // ✅ 최소 검증: 공백만 아니면 OK
  const idOk = useMemo(() => loginId.trim().length > 0, [loginId]);
  const canSubmit = useMemo(() => idOk && !busy, [idOk, busy]);

  const idErr = touched.loginId && !idOk ? "아이디를 입력해주세요." : null;

  const markTouched = (k: FieldKey) => setTouched((p) => ({ ...p, [k]: true }));

  // --- Theme-consistent styles (로그인/회원가입과 동일 패턴) ---
  const cardStyle: ViewStyle = {
    backgroundColor: t.colors.surface,
    borderWidth: t.spacing.borderWidth,
    borderColor: t.colors.border,
    borderRadius: t.spacing.radiusLg,
    padding: t.spacing.space[5],
  };

  const labelStyle: TextStyle = {
    ...(t.typography.labelMedium as TextStyle),
    color: t.colors.textSub,
    marginBottom: t.spacing.space[2],
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

  const getInputBox = (k: FieldKey, isError: boolean): ViewStyle => {
    const isFocused = focusedField === k;

    if (isError) {
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

  const onRequest = async () => {
    if (busy) return;

    setTouched({ loginId: true });
    if (!idOk) return;

    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      // ✅ API 시그니처가 email이어도 값은 loginId를 전달 (도메인 정책: 아이디 기반)
      const result = await authApi.requestPasswordReset(loginId.trim() as any);

      // code optional -> string 정규화
      setInfoMsg(result?.code ?? "인증코드를 발송했어요.");

      // 다음 단계 화면이 있다면 여기서 이동
      // router.push({ pathname: "/(auth)/verify-reset", params: { loginId: loginId.trim() } });
    } catch (e: any) {
      setErrorMsg(e?.message ?? "요청에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout padded={false} style={{ backgroundColor: t.colors.background }}>
      <TopBar title="비밀번호 재설정" showBack onPressBack={() => router.back()} showBorder />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: t.spacing.pagePaddingH,
            paddingVertical: t.spacing.space[6],
          }}
        >
          <View style={cardStyle}>
            <Text style={[t.typography.titleLarge, { color: t.colors.textMain }]}>비밀번호 재설정</Text>
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 6 }]}>
              가입한 아이디로 인증코드를 요청합니다.
            </Text>

            <View style={{ height: t.spacing.space[6] }} />

            <Text style={labelStyle}>아이디</Text>
            <View style={getInputBox("loginId", !!idErr)}>
              <TextInput
                value={loginId}
                editable={!busy}
                onChangeText={(v) => {
                  setLoginId(v);
                  if (errorMsg) setErrorMsg(null);
                  if (infoMsg) setInfoMsg(null);
                }}
                onFocus={() => setFocusedField("loginId")}
                onBlur={() => {
                  setFocusedField(null);
                  markTouched("loginId");
                }}
                placeholder="아이디 입력"
                placeholderTextColor={t.colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                style={inputTextBase}
                returnKeyType="done"
                onSubmitEditing={onRequest}
              />
            </View>

            <FieldError text={idErr ?? errorMsg} />
            <FieldInfo text={idErr ? null : infoMsg} />

            <View style={{ height: t.spacing.space[6] }} />

            <Button
              title={busy ? "요청 중..." : "인증코드 요청"}
              onPress={onRequest}
              disabled={!canSubmit}
              loading={busy}
              variant="primary"
              size="lg"
            />

            <View style={{ height: t.spacing.space[4] }} />

            <Pressable onPress={() => router.back()} disabled={busy} hitSlop={10} style={({ pressed }) => [{ opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}>
              <Text style={[t.typography.labelSmall, { color: t.colors.textSub, textAlign: "center", fontWeight: "700" }]}>
                돌아가기
              </Text>
            </Pressable>
          </View>

          <View style={{ height: t.spacing.space[6] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({});