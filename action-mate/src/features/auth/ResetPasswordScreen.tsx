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
} from "react-native";
import { router } from "expo-router";

import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { authApi } from "@/features/auth/api/authApi";

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function ResetPasswordScreen() {
  const t = useAppTheme();

  const PH = t.spacing.pagePaddingH;
  const PV = t.spacing.pagePaddingV;
  const R = t.spacing.radiusMd;

  const GAP_SM = 12;
  const GAP_MD = 16;
  const GAP_LG = 24;

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  // ✅ 여기 타입이 string | null 이라면, set 할 때 undefined 제거 필요
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const emailOk = useMemo(() => isValidEmail(email), [email]);
  const canSubmit = useMemo(() => emailOk && !busy, [emailOk, busy]);

  const c = t.colors as any;
  const danger = c.error ?? c.danger ?? c.negative ?? c.red ?? t.colors.primary;

  const onRequest = async () => {
    if (busy) return;

    setErrorMsg(null);
    setInfoMsg(null);

    if (!emailOk) {
      setErrorMsg("올바른 이메일 형식으로 입력해주세요.");
      return;
    }

    setBusy(true);
    try {
      const result = await authApi.requestPasswordReset(email.trim());

      // ✅ TS2345 방지: undefined -> null 로 정규화
      // (result.code가 optional이거나, requestPasswordReset이 mock/remote에 따라 undefined가 될 수 있는 상황 대비)
      setInfoMsg(result?.code ?? "인증코드를 발송했어요.");

      // 예: 다음 화면으로 이동
      // router.push({ pathname: "/(auth)/verify-reset", params: { email: email.trim() } });
    } catch (e: any) {
      // ✅ TS2345 방지: e?.message가 undefined일 수 있으니 null fallback
      setErrorMsg(e?.message ?? "요청에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout style={[styles.page, { backgroundColor: t.colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, paddingHorizontal: PH, paddingTop: GAP_LG, paddingBottom: PV }}>
          <Text style={[t.typography.titleLarge, { color: t.colors.textMain }]}>비밀번호 재설정</Text>
          <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 6 }]}>
            가입한 이메일로 인증코드를 요청합니다.
          </Text>

          <View style={{ height: GAP_LG }} />

          <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginBottom: 8 }]}>이메일</Text>
          <TextInput
            value={email}
            editable={!busy}
            onChangeText={(v) => {
              setEmail(v);
              if (errorMsg) setErrorMsg(null);
              if (infoMsg) setInfoMsg(null);
            }}
            placeholder="example@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            style={[
              styles.input,
              {
                borderColor: !emailOk && email.trim().length > 0 ? danger : t.colors.border,
                backgroundColor: t.colors.surface,
                color: t.colors.textMain,
                borderRadius: R,
              },
            ]}
            placeholderTextColor={t.colors.textSub}
          />

          {errorMsg ? (
            <Text style={[t.typography.bodySmall, { color: danger, marginTop: 8 }]}>{errorMsg}</Text>
          ) : null}

          {infoMsg ? (
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 8 }]}>{infoMsg}</Text>
          ) : null}

          <View style={{ height: GAP_LG }} />

          <Pressable
            disabled={!canSubmit}
            onPress={() => void onRequest()}
            style={[
              styles.primaryBtn,
              {
                borderRadius: R,
                backgroundColor: t.colors.primary,
                opacity: canSubmit ? 1 : 0.6,
              },
            ]}
          >
            <Text style={[styles.primaryText, { color: "#fff" }]}>{busy ? "요청 중..." : "인증코드 요청"}</Text>
          </Pressable>

          <View style={{ height: GAP_MD }} />

          <Pressable onPress={() => router.back()} disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>
            <Text style={[t.typography.labelSmall, { color: t.colors.textSub, textAlign: "center" }]}>
              돌아가기
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  input: { borderWidth: 1, paddingVertical: 14, paddingHorizontal: 14, fontSize: 16 },
  primaryBtn: { alignSelf: "stretch", paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 16, fontWeight: "700" },
});