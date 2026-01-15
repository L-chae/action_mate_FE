// src/features/auth/ForgotPasswordScreen.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Animated,
  Alert,
} from "react-native";
import { router } from "expo-router";

import AppLayout from "@/shared/ui/AppLayout";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import {
  requestPasswordReset,
  verifyPasswordResetCode,
  consumePasswordResetCode,
  updatePassword,
} from "@/features/auth/localAuthService";

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

type Step = 1 | 2 | 3;
type FocusKey = "email" | "code" | "newPw" | "confirmPw" | null;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ✅ 중요: 이 컴포넌트를 화면 함수 밖에 둬야 키보드 안 꺼짐!
function LabeledInput({
  t,
  label,
  value,
  onChangeText,
  placeholder,
  focusKey,
  focused,
  setFocused,
  danger,
  activeBg,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  error,
  returnKeyType,
  onSubmitEditing,
}: {
  t: ReturnType<typeof useAppTheme>;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  focusKey: Exclude<FocusKey, null>;
  focused: FocusKey;
  setFocused: (k: FocusKey) => void;
  danger: string;
  activeBg: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  error?: boolean;
  returnKeyType?: any;
  onSubmitEditing?: () => void;
}) {
  const isF = focused === focusKey;

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 6 }]}>
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={t.colors.textSub}
        onFocus={() => setFocused(focusKey)}
        onBlur={() => setFocused(null)}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        style={[
          styles.input,
          isF && styles.inputFocused,
          {
            borderColor: error ? danger : isF ? t.colors.primary : t.colors.border,
            backgroundColor: isF ? activeBg : t.colors.surface,
            color: t.colors.textMain,
          },
        ]}
      />
    </View>
  );
}

export default function ForgotPasswordScreen() {
  const t = useAppTheme();
  const c = t.colors as any;

  const danger = c.error ?? c.danger ?? c.negative ?? c.red ?? t.colors.primary;
  const activeBg = c.surfaceAlt ?? c.surface2 ?? c.card ?? t.colors.surface ?? t.colors.background;

  const [step, setStep] = useState<Step>(1);
  const [focused, setFocused] = useState<FocusKey>(null);

  const [email, setEmail] = useState("");
  const [touchedEmail, setTouchedEmail] = useState(false);

  // ✅ DEV에서만 보여줄 테스트 코드
  const [devCode, setDevCode] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [touchedCode, setTouchedCode] = useState(false);

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [touchedPw, setTouchedPw] = useState(false);

  const [busy, setBusy] = useState(false);

  const shake = useRef(new Animated.Value(0)).current;
  const runShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };
  const shakeX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });

  const emailOk = useMemo(() => isValidEmail(email), [email]);
  const emailError = touchedEmail && email.trim().length > 0 && !emailOk;

  const codeOk = useMemo(() => code.trim().length === 6, [code]);
  const codeError = touchedCode && code.trim().length > 0 && !codeOk;

  const pwLenOk = useMemo(() => newPw.length >= 8, [newPw]);
  const pwMatchOk = useMemo(() => newPw.length > 0 && newPw === confirmPw, [newPw, confirmPw]);
  const pwError =
    touchedPw && (newPw.length > 0 || confirmPw.length > 0) && (!pwLenOk || !pwMatchOk);

  const step1Can = emailOk && !busy;
  const step2Can = codeOk && !busy;
  const step3Can = pwLenOk && pwMatchOk && !busy;

  const sendResetCode = async () => {
    setTouchedEmail(true);
    if (!emailOk) {
      runShake();
      return;
    }

    setBusy(true);
    try {
      await delay(200);

      const res = await requestPasswordReset(email.trim());
      setDevCode(__DEV__ ? res.code : null);

      setStep(2);
      setCode("");
      setTouchedCode(false);

      Alert.alert(
        "인증코드를 보냈어요",
        __DEV__ ? `테스트 코드: ${res.code}` : "입력한 이메일로 인증코드를 전송했어요."
      );
    } catch (e: any) {
      Alert.alert("전송 실패", e?.message ?? "인증코드를 보낼 수 없어요.");
      runShake();
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setTouchedCode(true);
    if (!codeOk) {
      runShake();
      return;
    }

    setBusy(true);
    try {
      await delay(150);

      await verifyPasswordResetCode(email.trim(), code.trim());

      setStep(3);
      setNewPw("");
      setConfirmPw("");
      setTouchedPw(false);
    } catch (e: any) {
      Alert.alert("인증 실패", e?.message ?? "인증코드가 올바르지 않아요.");
      runShake();
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    setTouchedPw(true);
    if (!pwLenOk || !pwMatchOk) {
      runShake();
      return;
    }

    setBusy(true);
    try {
      await delay(200);

      // ✅ 비번 업데이트 + 코드 소모(재사용 방지)
      await updatePassword(email.trim(), newPw);
      await consumePasswordResetCode(email.trim());

      Alert.alert("비밀번호가 변경됐어요", "새 비밀번호로 로그인해 주세요.");
      router.replace("/(auth)/id-login");
    } catch (e: any) {
      Alert.alert("변경 실패", e?.message ?? "비밀번호를 변경할 수 없어요.");
      runShake();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout style={[styles.page, { backgroundColor: t.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[t.typography.titleLarge, { color: t.colors.textMain }]}>
              비밀번호 찾기
            </Text>
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 6 }]}>
              {step === 1
                ? "가입한 이메일로 인증코드를 받을게요."
                : step === 2
                ? "이메일로 받은 6자리 코드를 입력해요."
                : "새 비밀번호를 설정해요."}
            </Text>
          </View>

          <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
            <Card>
              {step === 1 && (
                <>
                  <LabeledInput
                    t={t}
                    label="이메일"
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      if (!touchedEmail) setTouchedEmail(true);
                    }}
                    placeholder="example@email.com"
                    focusKey="email"
                    focused={focused}
                    setFocused={setFocused}
                    danger={danger}
                    activeBg={activeBg}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={emailError}
                    returnKeyType="done"
                    onSubmitEditing={() => (step1Can ? void sendResetCode() : setTouchedEmail(true))}
                  />

                  {emailError && (
                    <Text style={[t.typography.bodySmall, { color: danger, marginTop: 6 }]}>
                      올바른 이메일 형식으로 입력해 주세요.
                    </Text>
                  )}

                  <View style={{ marginTop: 16 }}>
                    <Button
                      title={busy ? "전송 중..." : "인증코드 보내기"}
                      onPress={() => void sendResetCode()}
                      disabled={!step1Can}
                    />
                  </View>

                  <View style={styles.bottomRow}>
                    <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>
                      로그인으로 돌아갈까요?
                    </Text>
                    <Button
                      title="로그인"
                      variant="ghost"
                      onPress={() => router.replace("/(auth)/id-login")}
                    />
                  </View>
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>
                    보낸 이메일: <Text style={{ color: t.colors.textMain }}>{email.trim()}</Text>
                  </Text>

                  <LabeledInput
                    t={t}
                    label="인증코드"
                    value={code}
                    onChangeText={(v) => {
                      const only = v.replace(/[^\d]/g, "").slice(0, 6);
                      setCode(only);
                      if (!touchedCode) setTouchedCode(true);
                    }}
                    placeholder="6자리 숫자"
                    focusKey="code"
                    focused={focused}
                    setFocused={setFocused}
                    danger={danger}
                    activeBg={activeBg}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    error={codeError}
                    returnKeyType="done"
                    onSubmitEditing={() => (step2Can ? void verifyCode() : setTouchedCode(true))}
                  />

                  {codeError && (
                    <Text style={[t.typography.bodySmall, { color: danger, marginTop: 6 }]}>
                      6자리 숫자를 입력해 주세요.
                    </Text>
                  )}

                  {/* DEV에서만 힌트 */}
                  {__DEV__ && devCode ? (
                    <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 6 }]}>
                      테스트 코드: <Text style={{ color: t.colors.textMain }}>{devCode}</Text>
                    </Text>
                  ) : null}

                  <View style={{ marginTop: 16 }}>
                    <Button
                      title={busy ? "확인 중..." : "인증하기"}
                      onPress={() => void verifyCode()}
                      disabled={!step2Can}
                    />
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <Button
                      title={busy ? "재전송 중..." : "인증코드 재전송"}
                      variant="ghost"
                      onPress={() => void sendResetCode()}
                      disabled={busy}
                    />
                  </View>

                  <View style={{ marginTop: 6 }}>
                    <Button
                      title="이메일 다시 입력"
                      variant="ghost"
                      onPress={() => {
                        setStep(1);
                        setCode("");
                        setTouchedCode(false);
                        setDevCode(null);
                      }}
                      disabled={busy}
                    />
                  </View>
                </>
              )}

              {step === 3 && (
                <>
                  <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>
                    새 비밀번호는 <Text style={{ color: t.colors.textMain }}>8자 이상</Text>으로 설정해 주세요.
                  </Text>

                  <LabeledInput
                    t={t}
                    label="새 비밀번호"
                    value={newPw}
                    onChangeText={setNewPw}
                    placeholder="새 비밀번호 (8자 이상)"
                    focusKey="newPw"
                    focused={focused}
                    setFocused={setFocused}
                    danger={danger}
                    activeBg={activeBg}
                    secureTextEntry
                    error={touchedPw && newPw.length > 0 && !pwLenOk}
                    returnKeyType="next"
                    onSubmitEditing={() => {}}
                  />

                  <LabeledInput
                    t={t}
                    label="새 비밀번호 확인"
                    value={confirmPw}
                    onChangeText={(v) => {
                      setConfirmPw(v);
                      if (!touchedPw) setTouchedPw(true);
                    }}
                    placeholder="한 번 더 입력해 주세요"
                    focusKey="confirmPw"
                    focused={focused}
                    setFocused={setFocused}
                    danger={danger}
                    activeBg={activeBg}
                    secureTextEntry
                    error={touchedPw && confirmPw.length > 0 && !pwMatchOk}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      setTouchedPw(true);
                      if (step3Can) void resetPassword();
                    }}
                  />

                  {pwError && (
                    <Text style={[t.typography.bodySmall, { color: danger, marginTop: 6 }]}>
                      비밀번호는 8자 이상이어야 하고, 두 비밀번호가 동일해야 해요.
                    </Text>
                  )}

                  <View style={{ marginTop: 16 }}>
                    <Button
                      title={busy ? "변경 중..." : "비밀번호 변경"}
                      onPress={() => void resetPassword()}
                      disabled={!step3Can}
                    />
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <Pressable
                      onPress={() => {
                        setStep(2);
                        setTouchedPw(false);
                      }}
                      disabled={busy}
                      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                    >
                      <Text style={[t.typography.labelSmall, { color: t.colors.textSub, textAlign: "center" }]}>
                        인증코드 단계로 돌아가기
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </Card>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  container: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 28 },

  header: { alignItems: "center", marginBottom: 14 },

  input: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    justifyContent: "center",
    fontSize: 16,
  },
  inputFocused: {
    borderWidth: 2,
  },

  bottomRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
});
