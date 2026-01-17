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
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import AppLayout from "@/shared/ui/AppLayout";
import { useAuthStore, type Gender } from "@/features/auth/store/authStore";

type Form = {
  email: string;
  password: string;
  passwordConfirm: string;
  nickname: string;

  // ✅ 추가
  gender: Gender; // "male" | "female" | "none"
  birthDate: Date | null;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function validate(form: Form) {
  const email = form.email.trim();
  const nickname = form.nickname.trim();

  if (!email) return "이메일을 입력해 주세요.";
  if (!isValidEmail(email)) return "이메일 형식이 올바르지 않습니다.";
  if (!nickname) return "닉네임을 입력해 주세요.";
  if (nickname.length < 2) return "닉네임은 2자 이상으로 입력해 주세요.";
  if (!form.birthDate) return "생년월일을 선택해 주세요."; // ✅ 추가
  if (!form.password) return "비밀번호를 입력해 주세요.";
  if (form.password.length < 8) return "비밀번호는 8자 이상으로 입력해 주세요.";
  if (form.password !== form.passwordConfirm) return "비밀번호가 서로 다릅니다.";
  return null;
}

function GenderChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function SignUpScreen() {
  const login = useAuthStore((s) => s.login);

  const [form, setForm] = useState<Form>({
    email: "",
    password: "",
    passwordConfirm: "",
    nickname: "",
    gender: "none",
    birthDate: null,
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 흔들림 애니메이션
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const canSubmit = useMemo(
    () => !validate(form) && !isSubmitting,
    [form, isSubmitting]
  );

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
    setForm((prev) => ({ ...prev, [key]: v as any }));
    if (error) setError(null);
  };

  const setGender = (g: Gender) => {
    setForm((prev) => ({ ...prev, gender: g }));
    if (error) setError(null);
  };

  // ✅ 생년월일 Picker (iOS: 모달, Android: 다이얼로그)
  const defaultBirth = useMemo(() => new Date(2000, 0, 1), []);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [tempBirth, setTempBirth] = useState<Date>(defaultBirth);

  const openBirthPicker = () => {
    const base = form.birthDate ?? defaultBirth;
    setTempBirth(base);
    if (Platform.OS === "ios") setShowIosPicker(true);
    else setShowAndroidPicker(true);
  };

  const birthText = form.birthDate ? formatYMD(form.birthDate) : "생년월일을 선택해 주세요.";

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

      // ✅ 목업: 가입 성공 가정 + 로그인 처리
      await login({
        id: String(Date.now()),
        email: form.email.trim(),
        nickname: form.nickname.trim(),
        gender: form.gender,
        birthDate: formatYMD(form.birthDate!),
      });

      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message ?? "회원가입 중 문제가 발생했습니다.");
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
          <Text style={styles.subtitle}>Action-Mate에 오신 것을 환영합니다!</Text>
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
            placeholder="닉네임을 입력해 주세요."
            autoCapitalize="none"
            style={styles.input}
            placeholderTextColor="#A3A3A3"
          />

          {/* ✅ 성별 */}
          <Text style={[styles.label, { marginTop: 12 }]}>성별</Text>
          <View style={styles.chipRow}>
            <GenderChip label="남성" active={form.gender === "male"} onPress={() => setGender("male")} />
            <GenderChip label="여성" active={form.gender === "female"} onPress={() => setGender("female")} />
            <GenderChip label="선택 안 함" active={form.gender === "none"} onPress={() => setGender("none")} />
          </View>

          {/* ✅ 생년월일 */}
          <Text style={[styles.label, { marginTop: 12 }]}>생년월일</Text>
          <Pressable onPress={openBirthPicker} style={styles.birthBox}>
            <Text style={{ color: form.birthDate ? "#111" : "#A3A3A3", fontWeight: "700" }}>
              {birthText}
            </Text>
          </Pressable>

          {/* Android DatePicker */}
          {showAndroidPicker && Platform.OS !== "ios" && (
            <DateTimePicker
              value={tempBirth}
              mode="date"
              display="default"
              onChange={(event, selected) => {
                setShowAndroidPicker(false);
                if (event?.type === "dismissed") return;
                if (selected) setForm((p) => ({ ...p, birthDate: selected }));
              }}
            />
          )}

          {/* iOS Modal DatePicker */}
          {Platform.OS === "ios" && (
            <Modal
              transparent
              animationType="fade"
              visible={showIosPicker}
              onRequestClose={() => setShowIosPicker(false)}
            >
              <View style={styles.modalDim}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>생년월일 선택</Text>

                  <DateTimePicker
                    value={tempBirth}
                    mode="date"
                    display="spinner"
                    onChange={(_, selected) => {
                      if (selected) setTempBirth(selected);
                    }}
                  />

                  <View style={styles.modalRow}>
                    <Pressable
                      onPress={() => setShowIosPicker(false)}
                      style={[styles.modalBtn, styles.modalBtnGhost]}
                    >
                      <Text style={styles.modalBtnTextGhost}>취소</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setForm((p) => ({ ...p, birthDate: tempBirth }));
                        setShowIosPicker(false);
                      }}
                      style={[styles.modalBtn, styles.modalBtnPrimary]}
                    >
                      <Text style={styles.modalBtnTextPrimary}>완료</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          <Text style={[styles.label, { marginTop: 12 }]}>비밀번호</Text>
          <TextInput
            value={form.password}
            onChangeText={onChange("password")}
            placeholder="8자 이상으로 입력해 주세요."
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#A3A3A3"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>비밀번호 확인</Text>
          <TextInput
            value={form.passwordConfirm}
            onChangeText={onChange("passwordConfirm")}
            placeholder="비밀번호를 다시 입력해 주세요."
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
              {isSubmitting ? "가입 중입니다..." : "회원가입"}
            </Text>
          </Pressable>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>이미 계정이 있으신가요?</Text>
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

  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E7E7E7",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    borderColor: "#6D28D9",
    backgroundColor: "rgba(109, 40, 217, 0.08)",
  },
  chipText: { color: "#666", fontSize: 12.5, fontWeight: "800" },
  chipTextActive: { color: "#6D28D9" },

  birthBox: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E7E7E7",
    backgroundColor: "#FAFAFA",
    justifyContent: "center",
  },

  error: { marginTop: 10, color: "#D92D20", fontSize: 13, fontWeight: "700" },

  primaryBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6D28D9",
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

  modalDim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
    color: "#111",
  },
  modalRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalBtnGhost: {
    backgroundColor: "#F2F2F2",
  },
  modalBtnPrimary: {
    backgroundColor: "#111",
  },
  modalBtnTextGhost: {
    color: "#111",
    fontWeight: "800",
  },
  modalBtnTextPrimary: {
    color: "#fff",
    fontWeight: "800",
  },
});