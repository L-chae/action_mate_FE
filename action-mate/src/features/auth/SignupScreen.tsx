import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { router } from "expo-router";
import AppLayout from "@/shared/ui/AppLayout";
import { useAuthStore } from "@/features/auth/authStore";

type Form = {
  email: string;
  password: string;
  passwordConfirm: string;
  nickname: string;
};

function isValidEmail(email: string) {
  // 너무 빡세지 않게, 실사용용 가벼운 검증
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validate(form: Form) {
  const email = form.email.trim();
  const nickname = form.nickname.trim();

  if (!email) return "이메일을 입력해줘.";
  if (!isValidEmail(email)) return "이메일 형식이 올바르지 않아.";
  if (!nickname) return "닉네임을 입력해줘.";
  if (nickname.length < 2) return "닉네임은 2자 이상이 좋아.";
  if (!form.password) return "비밀번호를 입력해줘.";
  if (form.password.length < 8) return "비밀번호는 8자 이상으로 해줘.";
  if (form.password !== form.passwordConfirm) return "비밀번호가 서로 달라.";
  return null;
}

export default function SignUpScreen() {
  const login = useAuthStore((s) => s.login);

  const [form, setForm] = useState<Form>({
    email: "",
    password: "",
    passwordConfirm: "",
    nickname: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 간단 애니메이션(로그인 화면이 Animated 쓰고 있어서 맞춰줌)
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const canSubmit = useMemo(() => !validate(form) && !isSubmitting, [form, isSubmitting]);

  const runShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const onChange = (key: keyof Form) => (v: string) => {
    setForm((prev) => ({ ...prev, [key]: v }));
    if (error) setError(null);
  };

  const onSubmit = async () => {
    const msg = validate(form);
    if (msg) {
      setError(msg);
      runShake();
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // ✅ 여기서 나중에 실제 API 호출로 교체하면 됨
      // const res = await authApi.signup(form)
      // login(res.user)

      // 일단 “회원가입 성공”이라고 가정하고 로그인 처리까지 해줌(개발 편의)
      login({
        id: String(Date.now()),
        email: form.email.trim(),
        nickname: form.nickname.trim(),
      });

      router.replace("/(tabs)"); // 너 프로젝트 라우팅에 맞게 수정 가능
    } catch (e: any) {
      setError(e?.message ?? "회원가입 중 문제가 생겼어.");
      runShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const shakeX = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-6, 6],
  });

  return (
    <AppLayout>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>회원가입</Text>
          <Text style={styles.subtitle}>Action-Mate에 오신 걸 환영해!</Text>
        </View>

        <Animated.View style={[styles.card, { transform: [{ translateX: shakeX }] }]}>
          <Text style={styles.label}>이메일</Text>
          <TextInput
            value={form.email}
            onChangeText={onChange("email")}
            placeholder="example@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor="#A3A3A3"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>닉네임</Text>
          <TextInput
            value={form.nickname}
            onChangeText={onChange("nickname")}
            placeholder="닉네임"
            autoCapitalize="none"
            style={styles.input}
            placeholderTextColor="#A3A3A3"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>비밀번호</Text>
          <TextInput
            value={form.password}
            onChangeText={onChange("password")}
            placeholder="8자 이상"
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#A3A3A3"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>비밀번호 확인</Text>
          <TextInput
            value={form.passwordConfirm}
            onChangeText={onChange("passwordConfirm")}
            placeholder="비밀번호 다시 입력"
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#A3A3A3"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.primaryBtn,
              (!canSubmit || pressed) && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {isSubmitting ? "가입 중..." : "회원가입"}
            </Text>
          </Pressable>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>이미 계정이 있어?</Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.bottomLink}>로그인</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 14 },
  header: { marginBottom: 14 },
  title: { fontSize: 28, fontWeight: "800", color: "#111" },
  subtitle: { marginTop: 6, fontSize: 14, color: "#666" },

  card: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEE",
  },

  label: { fontSize: 13, fontWeight: "700", color: "#222", marginBottom: 6 },
  input: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E7E7E7",
    backgroundColor: "#FAFAFA",
    color: "#111",
  },

  error: { marginTop: 10, color: "#D92D20", fontSize: 13, fontWeight: "700" },

  primaryBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6D28D9", // 보라 톤
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  bottomRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  bottomText: { color: "#666" },
  bottomLink: { color: "#6D28D9", fontWeight: "800" },
});
