// src/features/auth/SignupScreen.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Pressable,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router } from "expo-router";

import AppLayout from "@/shared/ui/AppLayout";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import { type Gender } from "@/features/auth/store/authStore";
import { createUser } from "@/features/auth/api/authService";

type Form = {
  email: string;
  nickname: string;
  password: string;
  passwordConfirm: string;
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
  if (!isValidEmail(email)) return "이메일 형식에 맞게 입력해 주세요. (예: abc@naver.com)";
  if (!nickname) return "닉네임을 입력해 주세요.";
  if (nickname.length < 2) return "닉네임은 2자 이상으로 입력해 주세요.";
  if (!form.birthDate) return "생년월일을 선택해 주세요.";
  if (!form.password) return "비밀번호를 입력해 주세요.";
  if (form.password.length < 8) return "비밀번호는 8자 이상으로 입력해 주세요.";
  if (form.password !== form.passwordConfirm) return "비밀번호가 일치하지 않습니다. 다시 확인해 주세요.";
  return null;
}

function withAlpha(color: string, alpha: number) {
  const c = color?.trim?.() ?? "";
  if (/^#([0-9a-f]{3})$/i.test(c)) {
    const r = c[1],
      g = c[2],
      b = c[3];
    const rr = parseInt(r + r, 16);
    const gg = parseInt(g + g, 16);
    const bb = parseInt(b + b, 16);
    return `rgba(${rr},${gg},${bb},${alpha})`;
  }
  if (/^#([0-9a-f]{6})$/i.test(c)) {
    const rr = parseInt(c.slice(1, 3), 16);
    const gg = parseInt(c.slice(3, 5), 16);
    const bb = parseInt(c.slice(5, 7), 16);
    return `rgba(${rr},${gg},${bb},${alpha})`;
  }
  return c;
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
  const t = useAppTheme();
  const c = t.colors as any;

  const chipBg = c.surface ?? c.card ?? t.colors.surface ?? t.colors.background;
  const chipActiveBg = c.surfaceAlt ?? c.surface2 ?? c.background ?? chipBg;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: active ? t.colors.primary : t.colors.border,
          backgroundColor: active ? chipActiveBg : chipBg,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[t.typography.labelMedium, { color: active ? t.colors.textMain : t.colors.textSub }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function SignupScreen() {
  const t = useAppTheme();
  const c = t.colors as any;

  const danger = c.error ?? c.danger ?? c.negative ?? c.red ?? t.colors.primary;

  const scrimToken = c.scrim ?? c.backdrop ?? c.overlay ?? c.dim ?? c.modalDim ?? t.colors.textMain;
  const scrim = withAlpha(scrimToken, 0.35);

  const activeBg = c.surfaceAlt ?? c.surface2 ?? c.card ?? t.colors.surface ?? t.colors.background;

  const [form, setForm] = useState<Form>({
    email: "",
    nickname: "",
    password: "",
    passwordConfirm: "",
    gender: "none",
    birthDate: null,
  });

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState({ email: false, passwordConfirm: false });

  const [focused, setFocused] = useState<keyof Form | "birthDate" | null>(null);
  const isFocused = (key: keyof Form | "birthDate") => focused === key;

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

  const canSubmit = useMemo(() => !validate(form) && !busy, [form, busy]);

  const onChange = (key: keyof Form) => (v: string) => {
    setForm((prev) => ({ ...prev, [key]: v as any }));
    if (error) setError(null);
  };

  const setGender = (g: Gender) => {
    setForm((prev) => ({ ...prev, gender: g }));
    if (error) setError(null);
  };

  const defaultBirth = useMemo(() => new Date(2000, 0, 1), []);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [tempBirth, setTempBirth] = useState<Date>(defaultBirth);

  const openBirthPicker = () => {
    if (busy) return;
    setFocused("birthDate");
    const base = form.birthDate ?? defaultBirth;
    setTempBirth(base);
    if (Platform.OS === "ios") setShowIosPicker(true);
    else setShowAndroidPicker(true);
  };

  const onAndroidBirthChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowAndroidPicker(false);
    if (event.type === "dismissed") {
      setFocused(null);
      return;
    }
    if (selected) setForm((p) => ({ ...p, birthDate: selected }));
    setFocused(null);
  };

  const birthText = form.birthDate ? formatYMD(form.birthDate) : "생년월일을 선택해 주세요.";
  const birthBorderError = !!error && error.includes("생년월일");
  const birthActive = isFocused("birthDate") || showIosPicker || showAndroidPicker;

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

  const goToEmailLogin = () => router.replace("/(auth)/email-login");

  const onSubmit = async () => {
    if (busy) return;

    setTouched({ email: true, passwordConfirm: true });

    const msg = validate(form);
    if (msg) {
      setError(msg);
      runShake();
      return;
    }

    setBusy(true);
    try {
      await createUser({
        email: form.email.trim(),
        nickname: form.nickname.trim(),
        password: form.password,
        gender: form.gender,
        birthDate: form.birthDate ? formatYMD(form.birthDate) : "",
      });

      Alert.alert("회원가입 완료", "이메일 로그인으로 이동할게요.");
      goToEmailLogin();
    } catch (e: any) {
      setError(e?.message ?? "회원가입에 실패했어요.");
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
            <Text style={[t.typography.titleLarge, styles.headerTitle, { color: t.colors.textMain }]}>
              회원가입
            </Text>
            <Text style={[t.typography.bodySmall, styles.headerSubtitle, { color: t.colors.textSub }]}>
              정보를 입력해서 계정을 만들어 주세요.
            </Text>
          </View>

          <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
            <Card>
              <Text style={[t.typography.labelMedium, styles.label, { color: t.colors.textSub }]}>이메일</Text>
              <TextInput
                value={form.email}
                onChangeText={onChange("email")}
                onFocus={() => setFocused("email")}
                onBlur={() => {
                  setFocused(null);
                  setTouched((p) => ({ ...p, email: true }));
                }}
                placeholder="example@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
                style={[
                  styles.input,
                  isFocused("email") && styles.inputFocused,
                  {
                    borderColor: emailError ? danger : isFocused("email") ? t.colors.primary : t.colors.border,
                    color: t.colors.textMain,
                    backgroundColor: isFocused("email") ? activeBg : t.colors.surface,
                  },
                ]}
                placeholderTextColor={t.colors.textSub}
                editable={!busy}
              />
              {emailError ? (
                <Text style={[t.typography.bodySmall, { color: danger, marginTop: 6 }]}>{emailError}</Text>
              ) : null}

              <Text style={[t.typography.labelMedium, styles.label, { marginTop: 12, color: t.colors.textSub }]}>
                닉네임
              </Text>
              <TextInput
                value={form.nickname}
                onChangeText={onChange("nickname")}
                onFocus={() => setFocused("nickname")}
                onBlur={() => setFocused(null)}
                placeholder="닉네임"
                autoCapitalize="none"
                style={[
                  styles.input,
                  isFocused("nickname") && styles.inputFocused,
                  {
                    borderColor: isFocused("nickname") ? t.colors.primary : t.colors.border,
                    color: t.colors.textMain,
                    backgroundColor: isFocused("nickname") ? activeBg : t.colors.surface,
                  },
                ]}
                placeholderTextColor={t.colors.textSub}
                editable={!busy}
              />

              <Text style={[t.typography.labelMedium, styles.label, { marginTop: 12, color: t.colors.textSub }]}>
                성별
              </Text>
              <View style={styles.chipRow}>
                <GenderChip label="남성" active={form.gender === "male"} onPress={() => setGender("male")} />
                <GenderChip label="여성" active={form.gender === "female"} onPress={() => setGender("female")} />
                <GenderChip label="선택 안 함" active={form.gender === "none"} onPress={() => setGender("none")} />
              </View>

              <Text style={[t.typography.labelMedium, styles.label, { marginTop: 12, color: t.colors.textSub }]}>
                생년월일
              </Text>
              <Pressable
                onPress={openBirthPicker}
                disabled={busy}
                style={[
                  styles.input,
                  styles.birthBox,
                  birthActive && styles.inputFocused,
                  {
                    borderColor: birthBorderError ? danger : birthActive ? t.colors.primary : t.colors.border,
                    backgroundColor: birthActive ? activeBg : t.colors.surface,
                    opacity: busy ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[t.typography.bodySmall, { color: form.birthDate ? t.colors.textMain : t.colors.textSub }]}>
                  {birthText}
                </Text>
              </Pressable>

              {showAndroidPicker && Platform.OS !== "ios" && (
                <DateTimePicker
                  value={tempBirth}
                  mode="date"
                  display="default"
                  locale="ko-KR"
                  onChange={onAndroidBirthChange}
                />
              )}

              {Platform.OS === "ios" && (
                <Modal
                  transparent
                  animationType="fade"
                  visible={showIosPicker}
                  onRequestClose={() => {
                    setShowIosPicker(false);
                    setFocused(null);
                  }}
                >
                  <View style={[styles.modalDim, { backgroundColor: scrim }]}>
                    <View style={[styles.modalCard, { backgroundColor: t.colors.surface }]}>
                      <Text style={[t.typography.labelMedium, styles.modalTitle, { color: t.colors.textMain }]}>
                        생년월일 선택
                      </Text>

                      <DateTimePicker
                        value={tempBirth}
                        mode="date"
                        display="spinner"
                        locale="ko-KR"
                        onChange={(_, selected) => selected && setTempBirth(selected)}
                      />

                      <View style={styles.modalRow}>
                        <Button
                          title="취소"
                          variant="ghost"
                          onPress={() => {
                            setShowIosPicker(false);
                            setFocused(null);
                          }}
                        />
                        <Button
                          title="완료"
                          onPress={() => {
                            setForm((p) => ({ ...p, birthDate: tempBirth }));
                            setShowIosPicker(false);
                            setFocused(null);
                          }}
                        />
                      </View>
                    </View>
                  </View>
                </Modal>
              )}

              <Text style={[t.typography.labelMedium, styles.label, { marginTop: 12, color: t.colors.textSub }]}>
                비밀번호
              </Text>
              <TextInput
                value={form.password}
                onChangeText={onChange("password")}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                placeholder="8자 이상"
                secureTextEntry
                style={[
                  styles.input,
                  isFocused("password") && styles.inputFocused,
                  {
                    borderColor: isFocused("password") ? t.colors.primary : t.colors.border,
                    color: t.colors.textMain,
                    backgroundColor: isFocused("password") ? activeBg : t.colors.surface,
                  },
                ]}
                placeholderTextColor={t.colors.textSub}
                editable={!busy}
              />

              <Text style={[t.typography.labelMedium, styles.label, { marginTop: 12, color: t.colors.textSub }]}>
                비밀번호 확인
              </Text>
              <TextInput
                value={form.passwordConfirm}
                onChangeText={onChange("passwordConfirm")}
                onFocus={() => setFocused("passwordConfirm")}
                onBlur={() => {
                  setFocused(null);
                  setTouched((p) => ({ ...p, passwordConfirm: true }));
                }}
                placeholder="비밀번호를 다시 입력해 주세요"
                secureTextEntry
                style={[
                  styles.input,
                  isFocused("passwordConfirm") && styles.inputFocused,
                  {
                    borderColor: pwMismatchError ? danger : isFocused("passwordConfirm") ? t.colors.primary : t.colors.border,
                    color: t.colors.textMain,
                    backgroundColor: isFocused("passwordConfirm") ? activeBg : t.colors.surface,
                  },
                ]}
                placeholderTextColor={t.colors.textSub}
                editable={!busy}
              />
              {pwMismatchError ? (
                <Text style={[t.typography.bodySmall, { color: danger, marginTop: 6 }]}>{pwMismatchError}</Text>
              ) : null}

              {error ? (
                <Text style={[t.typography.bodySmall, { color: danger, marginTop: 10 }]}>{error}</Text>
              ) : null}

              <View style={{ marginTop: 14 }}>
                <Button
                  title={busy ? "처리 중..." : "회원가입"}
                  onPress={() => void onSubmit()}
                  disabled={!canSubmit}
                />
              </View>

              <View style={styles.bottomRow}>
                <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>이미 계정이 있으신가요?</Text>
                <Button
                  title="로그인"
                  variant="ghost"
                  onPress={goToEmailLogin}
                  disabled={busy}
                />
              </View>
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
  headerTitle: { textAlign: "center", letterSpacing: -0.2 },
  headerSubtitle: { textAlign: "center", marginTop: 6, lineHeight: 18 },

  label: { marginBottom: 6 },

  input: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    justifyContent: "center",
  },
  inputFocused: { borderWidth: 2 },

  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  birthBox: { alignItems: "flex-start" },

  bottomRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  modalDim: { flex: 1, justifyContent: "center", padding: 18 },
  modalCard: { borderRadius: 16, padding: 14 },
  modalTitle: { textAlign: "center", marginBottom: 8 },
  modalRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 10 },
});
