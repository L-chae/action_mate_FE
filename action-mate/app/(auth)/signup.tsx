// app/(auth)/signup.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { router } from "expo-router";

import AppLayout from "@/shared/ui/AppLayout";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type Form = {
  email: string;
  nickname: string;
  password: string;
  passwordConfirm: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validate(form: Form) {
  const email = form.email.trim();
  const nickname = form.nickname.trim();

  if (!email) return "이메일을 입력해 주세요.";
  if (!isValidEmail(email)) return "이메일 형식에 맞게 입력해 주세요. (예: abc@naver.com)";
  if (!nickname) return "닉네임을 입력해 주세요.";
  if (nickname.length < 2) return "닉네임은 2자 이상으로 입력해 주세요.";
  if (!form.password) return "비밀번호를 입력해 주세요.";
  if (form.password.length < 8) return "비밀번호는 8자 이상으로 입력해 주세요.";
  if (form.password !== form.passwordConfirm) return "비밀번호가 일치하지 않습니다. 다시 확인해 주세요.";
  return null;
}

export default function SignupPage() {
  const t = useAppTheme();

  const [form, setForm] = useState<Form>({
    email: "",
    nickname: "",
    password: "",
    passwordConfirm: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    email: false,
    passwordConfirm: false,
  });

  const shake = useRef(new Animated.Value(0)).current;

  const emailError =
    touched.email && form.email.trim().length > 0 && !isValidEmail(form.email)
      ? "이메일 형식에 맞게 입력해 주세요. (예: abc@naver.com)"
      : null;

  const pwMismatchError =
    touched.passwordConfirm &&
    form.passwordConfirm.length > 0 &&
    form.password.length > 0 &&
    form.password !== form.passwordConfirm
      ? "비밀번호가 일치하지 않습니다. 다시 확인해 주세요."
      : null;

  const canSubmit = useMemo(() => !validate(form), [form]);

  const onChange = (key: keyof Form) => (v: string) => {
    setForm((prev) => ({ ...prev, [key]: v }));
    if (error) setError(null);
  };

  const runShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const shakeX = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-6, 6],
  });

  const onSubmit = () => {
    setTouched({ email: true, passwordConfirm: true });

    const msg = validate(form);
    if (msg) {
      setError(msg);
      runShake();
      return;
    }

    // ✅ 회원가입 완료(가정) -> 로그인 페이지로 이동
    router.replace("/(auth)/login");
  };

  return (
    <AppLayout>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.container}
      >
        {/* ✅ 상단 타이틀/설명 가운데 정렬 */}
        <View style={styles.header}>
          <Text style={[t.typography.titleLarge, styles.headerTitle, { color: t.colors.textMain }]}>
            회원가입
          </Text>
          <Text style={[t.typography.bodySmall, styles.headerSubtitle, { color: t.colors.textSub }]}>
            정보를 입력해서 계정을 만들어 주세요.
          </Text>
        </View>

        <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
          <Card>
            <Text style={[t.typography.labelMedium, styles.label]}>이메일</Text>
            <TextInput
              value={form.email}
              onChangeText={onChange("email")}
              onBlur={() => setTouched((p) => ({ ...p, email: true }))}
              placeholder="example@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.input,
                {
                  borderColor: emailError ? t.colors.error : t.colors.border,
                  color: t.colors.textMain,
                  backgroundColor: t.colors.surface,
                },
              ]}
              placeholderTextColor={t.colors.textSub}
            />
            {emailError ? (
              <Text style={[t.typography.bodySmall, { color: t.colors.error, marginTop: 6 }]}>
                {emailError}
              </Text>
            ) : null}

            <Text style={[t.typography.labelMedium, styles.label, { marginTop: 12 }]}>
              닉네임
            </Text>
            <TextInput
              value={form.nickname}
              onChangeText={onChange("nickname")}
              placeholder="닉네임"
              autoCapitalize="none"
              style={[
                styles.input,
                {
                  borderColor: t.colors.border,
                  color: t.colors.textMain,
                  backgroundColor: t.colors.surface,
                },
              ]}
              placeholderTextColor={t.colors.textSub}
            />

            <Text style={[t.typography.labelMedium, styles.label, { marginTop: 12 }]}>
              비밀번호
            </Text>
            <TextInput
              value={form.password}
              onChangeText={onChange("password")}
              placeholder="8자 이상"
              secureTextEntry
              style={[
                styles.input,
                {
                  borderColor: t.colors.border,
                  color: t.colors.textMain,
                  backgroundColor: t.colors.surface,
                },
              ]}
              placeholderTextColor={t.colors.textSub}
            />

            <Text style={[t.typography.labelMedium, styles.label, { marginTop: 12 }]}>
              비밀번호 확인
            </Text>
            <TextInput
              value={form.passwordConfirm}
              onChangeText={onChange("passwordConfirm")}
              onBlur={() => setTouched((p) => ({ ...p, passwordConfirm: true }))}
              placeholder="비밀번호를 다시 입력해 주세요"
              secureTextEntry
              style={[
                styles.input,
                {
                  borderColor: pwMismatchError ? t.colors.error : t.colors.border,
                  color: t.colors.textMain,
                  backgroundColor: t.colors.surface,
                },
              ]}
              placeholderTextColor={t.colors.textSub}
            />
            {pwMismatchError ? (
              <Text style={[t.typography.bodySmall, { color: t.colors.error, marginTop: 6 }]}>
                {pwMismatchError}
              </Text>
            ) : null}

            {error ? (
              <Text style={[t.typography.bodySmall, { color: t.colors.error, marginTop: 10 }]}>
                {error}
              </Text>
            ) : null}

            <View style={{ marginTop: 14 }}>
              <Button title="회원가입" onPress={onSubmit} disabled={!canSubmit} />
            </View>

            <View style={styles.bottomRow}>
              <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>
                이미 계정이 있으신가요?
              </Text>
              <Button title="로그인" variant="ghost" onPress={() => router.replace("/(auth)/login")} />
            </View>
          </Card>
        </Animated.View>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 14 },

  // ✅ 헤더 중앙 정렬
  header: {
    alignItems: "center",
    marginBottom: 14,
  },
  headerTitle: {
    textAlign: "center",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

  label: { marginBottom: 6 },
  input: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  bottomRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
});
