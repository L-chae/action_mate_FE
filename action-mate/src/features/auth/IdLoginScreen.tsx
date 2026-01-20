import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ScrollView,
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
import { seedMockUsers } from "@/features/auth/api/authApi.local";

/**
 * ✅ 목표
 * - 회원가입 화면(카드 + 인풋박스 + 테마 토큰)과 동일한 패턴/톤 유지
 * - 실서비스 UX: 포커스/에러/disabled/submit 흐름 정리
 * - 타입 변경 반영: authApi.login({ loginId, password })
 */

type FieldKey = "loginId" | "password";

function FieldError({ text }: { text?: string | null }) {
  const t = useAppTheme();
  if (!text) return null;
  return (
    <Text style={[t.typography.bodySmall, { color: t.colors.error, marginTop: 6 }]}>
      {text}
    </Text>
  );
}

export default function IdLoginScreen() {
  const t = useAppTheme();
  const loginToStore = useAuthStore((s) => s.login);

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [busy, setBusy] = useState(false);
  const [seedReady, setSeedReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<FieldKey | null>(null);

  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    loginId: false,
    password: false,
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await seedMockUsers();
      } finally {
        if (alive) setSeedReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ 검증 최소화: 공백만 아니면 OK
  const idOk = useMemo(() => loginId.trim().length > 0, [loginId]);
  const pwOk = useMemo(() => password.length >= 4, [password]);

  const canSubmit = useMemo(() => idOk && pwOk && seedReady && !busy, [idOk, pwOk, seedReady, busy]);

  const idErr = touched.loginId && !idOk ? "아이디를 입력해주세요." : null;
  const pwErr = touched.password && !pwOk ? "비밀번호는 4자 이상 입력해주세요." : null;

  const markTouched = (k: FieldKey) => setTouched((p) => ({ ...p, [k]: true }));

  // --- Theme-consistent styles (회원가입 화면과 동일 패턴) ---
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

  const dividerStyle: ViewStyle = {
    width: 1,
    height: 14,
    backgroundColor: t.colors.divider,
    marginHorizontal: t.spacing.space[4],
  };

  const onLogin = async () => {
    if (busy) return;

    setTouched({ loginId: true, password: true });
    if (!idOk || !pwOk) return;

    if (!seedReady) {
      setErrorMsg("초기 데이터를 준비 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setBusy(true);
    setErrorMsg(null);

    try {
      const user = await authApi.login({ loginId: loginId.trim(), password });
      await loginToStore(user);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "로그인에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  const onQuickLogin = async () => {
    if (busy) return;
    if (!seedReady) {
      setErrorMsg("초기 데이터를 준비 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setBusy(true);
    setErrorMsg(null);

    try {
      const user = await authApi.login({ loginId: "user01", password: "1234" });
      await loginToStore(user);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "퀵 로그인에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout padded={false} style={{ backgroundColor: t.colors.background }}>
      <TopBar title="" showBack onPressBack={() => router.back()} />

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
            {/* 헤더/브랜드 */}
            <View style={{ alignItems: "center" }}>
              <Image source={require("../../../assets/images/logo.png")} style={{ width: 80, height: 80, resizeMode: "contain" }} />
              <Text style={[t.typography.titleLarge, { color: t.colors.textMain, marginTop: t.spacing.space[3] }]}>
                아이디로 로그인
              </Text>
              <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]}>
                당신의 취미 메이트를 찾아보세요!
              </Text>

              {!seedReady ? (
                <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: t.spacing.space[3] }]}>
                  초기 데이터 준비 중...
                </Text>
              ) : null}
            </View>

            <View style={{ height: t.spacing.space[7] }} />

            {/* 아이디 */}
            <View style={{ marginBottom: t.spacing.space[5] }}>
              <Text style={labelStyle}>아이디</Text>
              <View style={getInputBox("loginId", !!idErr)}>
                <TextInput
                  value={loginId}
                  onChangeText={(v) => {
                    setLoginId(v);
                    setErrorMsg(null);
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
                  editable={!busy}
                  style={inputTextBase}
                  returnKeyType="next"
                />
              </View>
              <FieldError text={idErr} />
            </View>

            {/* 비밀번호 */}
            <View style={{ marginBottom: t.spacing.space[2] }}>
              <Text style={labelStyle}>비밀번호</Text>
              <View style={[getInputBox("password", !!pwErr), styles.pwRow]}>
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setErrorMsg(null);
                  }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => {
                    setFocusedField(null);
                    markTouched("password");
                  }}
                  secureTextEntry={!showPw}
                  placeholder="비밀번호 입력"
                  placeholderTextColor={t.colors.placeholder}
                  autoCapitalize="none"
                  editable={!busy}
                  style={[inputTextBase, { flex: 1 }]}
                  returnKeyType="done"
                  onSubmitEditing={onLogin}
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

            {/* 서버/인증 에러 */}
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
                <Text style={[t.typography.bodySmall, { color: t.colors.error, textAlign: "center" }]}>
                  {errorMsg}
                </Text>
              </View>
            ) : null}

            <View style={{ height: t.spacing.space[6] }} />

            <Button
              title={!seedReady ? "준비 중..." : busy ? "로그인 중..." : "로그인"}
              onPress={onLogin}
              disabled={!canSubmit}
              loading={busy}
              variant="primary"
              size="lg"
            />

            <View style={{ height: t.spacing.space[3] }} />

            <Button
              title="⚡️ user01 (테스트 계정)"
              onPress={onQuickLogin}
              disabled={busy || !seedReady}
              variant="secondary"
              size="lg"
            />

            {/* 하단 링크 */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginTop: t.spacing.space[6],
              }}
            >
              <Pressable
                onPress={() => router.push("/(auth)/signup")}
                disabled={busy}
                hitSlop={10}
                style={({ pressed }) => [{ opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}
              >
                <Text style={[t.typography.bodyMedium, { color: t.colors.primary, fontWeight: "700" }]}>
                  회원가입
                </Text>
              </Pressable>

              <View style={dividerStyle} />

              <Pressable
                onPress={() => router.push("/(auth)/reset-password")}
                disabled={busy}
                hitSlop={10}
                style={({ pressed }) => [{ opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}
              >
                <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>비밀번호 찾기</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: t.spacing.space[6] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  pwRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});