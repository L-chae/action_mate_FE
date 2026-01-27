// src/features/auth/ResetPasswordScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
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

type FieldKey = "loginId";

function FieldError({ text }: { text?: string | null }) {
  const t = useAppTheme();
  const msg = String(text ?? "").trim();
  if (!msg) return null;
  return <Text style={[t.typography.bodySmall, { color: t.colors.error, marginTop: t.spacing.space?.[2] ?? 6 }]}>{msg}</Text>;
}

function FieldInfo({ text }: { text?: string | null }) {
  const t = useAppTheme();
  const msg = String(text ?? "").trim();
  if (!msg) return null;
  return <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: t.spacing.space?.[2] ?? 6 }]}>{msg}</Text>;
}

export default function ResetPasswordScreen() {
  const t = useAppTheme();

  const [loginId, setLoginId] = useState("");
  const [busy, setBusy] = useState(false);

  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({ loginId: false });
  const [focusedField, setFocusedField] = useState<FieldKey | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const CONTROL_H = (t.spacing as any)?.controlHeight ?? 56;

  const idOk = useMemo(() => String(loginId ?? "").trim().length > 0, [loginId]);
  const canSubmit = useMemo(() => idOk && !busy, [idOk, busy]);

  const idErr = touched.loginId && !idOk ? "아이디를 입력해주세요." : null;
  const markTouched = (k: FieldKey) => setTouched((p) => ({ ...p, [k]: true }));

  const cardStyle: ViewStyle = {
    backgroundColor: t.colors.surface,
    borderWidth: t.spacing.borderWidth,
    borderColor: t.colors.border,
    borderRadius: t.spacing.radiusLg,
    padding: t.spacing.space?.[5] ?? 20,
  };

  const labelStyle: TextStyle = {
    ...(t.typography.labelMedium as TextStyle),
    color: t.colors.textSub,
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

  const inputTextBase: TextStyle = {
    fontSize: 16,
    color: t.colors.textMain,
    padding: 0,
  };

  const getInputBox = (k: FieldKey, isError: boolean): ViewStyle => {
    const isFocused = focusedField === k;
    if (isError) return { ...inputBoxBase, borderColor: t.colors.error, backgroundColor: t.colors.surface };
    if (isFocused) return { ...inputBoxBase, borderColor: t.colors.primary, borderWidth: 1.5 };
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
      const result = await authApi.requestPasswordReset(String(loginId ?? "").trim() as any);
      setInfoMsg(String(result?.code ?? "").trim() || "인증코드를 발송했어요.");
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? "").trim() || "요청에 실패했어요.");
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
            paddingHorizontal: t.spacing.pagePaddingH ?? (t.spacing.space?.[6] ?? 24),
            paddingVertical: t.spacing.space?.[6] ?? 24,
          }}
        >
          <View style={cardStyle}>
            <Text style={[t.typography.titleLarge, { color: t.colors.textMain }]}>비밀번호 재설정</Text>
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: t.spacing.space?.[2] ?? 6 }]}>
              가입한 아이디로 인증코드를 요청합니다.
            </Text>

            <View style={{ height: t.spacing.space?.[6] ?? 24 }} />

            <Text style={labelStyle}>아이디</Text>
            <View style={getInputBox("loginId", !!idErr)}>
              <TextInput
                value={String(loginId ?? "")}
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

            <View style={{ height: t.spacing.space?.[6] ?? 24 }} />

            <Button
              title={busy ? "요청 중..." : "인증코드 요청"}
              onPress={onRequest}
              disabled={!canSubmit}
              loading={busy}
              variant="primary"
              size="lg"
            />

            <View style={{ height: t.spacing.space?.[4] ?? 16 }} />

            <Pressable
              onPress={() => router.back()}
              disabled={busy}
              hitSlop={t.spacing.space?.[3] ?? 10}
              style={({ pressed }) => [{ opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}
            >
              <Text style={[t.typography.labelSmall, { color: t.colors.textSub, textAlign: "center", fontWeight: "700" }]}>돌아가기</Text>
            </Pressable>
          </View>

          <View style={{ height: t.spacing.space?.[6] ?? 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

/*
요약(3줄)
- 입력/버튼 높이 등 UI 치수는 테마 기반(controlHeight/spacing)으로 통일했습니다.
- requestPasswordReset 미지원(remote)도 에러 메시지로 안전하게 노출되도록 처리했습니다.
- 포커스/터치 상태 기반 검증 흐름은 유지했습니다.
*/
