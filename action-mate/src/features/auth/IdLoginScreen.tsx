// ✅ 파일 경로: src/features/auth/IdLoginScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { router } from "expo-router";
import { useForm, Controller } from "react-hook-form";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import { Button } from "@/shared/ui/Button";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useAuthStore } from "@/features/auth/model/authStore";
import { authApi } from "@/features/auth/api/authApi";
import type { LoginInput } from "@/features/auth/model/types";

// ----------------------------------------------------------------------
// ✅ 재사용 가능한 에러 메시지 컴포넌트
// ----------------------------------------------------------------------
function FieldError({ text }: { text?: string }) {
  const t = useAppTheme();
  if (!text) return null;
  return (
    <Text style={[t.typography.bodySmall, { color: t.colors.error, marginTop: 6 }]}>
      {text}
    </Text>
  );
}

type FieldKey = "loginId" | "password";

export default function IdLoginScreen() {
  const t = useAppTheme();
  const loginToStore = useAuthStore((s) => s.login);

  const [showPw, setShowPw] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<FieldKey | null>(null);

  // ✅ React Hook Form 설정
  const {
    control,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting, isValid },
    setValue,
  } = useForm<LoginInput>({
    mode: "onChange",
    defaultValues: {
      loginId: "",
      password: "",
    },
  });

  // ✅ 로그인 핸들러
  const onValidSubmit = async (data: LoginInput) => {
    setGlobalError(null);

    try {
      const user = await authApi.login({
        loginId: data.loginId.trim(),
        password: data.password,
      });
console.log('user',user);
      // store 업데이트(동기)
      loginToStore(user);

      // 라우팅 타입 이슈를 피하려면 as any로 안전하게 처리
      router.replace("/(tabs)" as any);
    } catch (e: any) {
      setGlobalError(e?.message ?? "로그인에 실패했어요.");
    }
  };

  // ✅ 개발용 퀵 로그인 (__DEV__에서만 보이게)
  const onQuickLogin = () => {
    setValue("loginId", "user01", { shouldValidate: true });
    setValue("password", "1234", { shouldValidate: true });
    handleSubmit(onValidSubmit)();
  };

  // 입력 박스 스타일 (포커스/에러에 따른 UI 의도만 유지)
  const inputBoxStyle = (hasError: boolean, isFocused: boolean): ViewStyle => ({
    height: 56,
    borderRadius: t.spacing.radiusMd,
    borderWidth: isFocused ? 1.5 : t.spacing.borderWidth,
    borderColor: hasError ? t.colors.error : isFocused ? t.colors.primary : t.colors.border,
    backgroundColor: hasError ? t.colors.surface : t.colors.card,
    paddingHorizontal: t.spacing.space[4],
    justifyContent: "center",
  });

  const inputBase: TextStyle = {
    fontSize: 16,
    padding: 0, // Android 기본 패딩 제거
    color: t.colors.textMain,
  };

  return (
    <AppLayout padded={false} style={{ backgroundColor: t.colors.background }}>
      <TopBar title="" showBack onPressBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
            {/* 1) 로고 영역 */}
            <View style={styles.header}>
              <Image source={require("../../../assets/images/logo.png")} style={styles.logo} />
              <Text style={[t.typography.titleLarge, { color: t.colors.textMain, marginTop: 12 }]}>
                아이디로 로그인
              </Text>
              <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]}>
                당신의 취미 메이트를 찾아보세요!
              </Text>
            </View>

            <View style={{ height: 32 }} />

            {/* 2) 아이디 */}
            <View style={styles.fieldGap}>
              <Text style={[t.typography.labelMedium, styles.label, { color: t.colors.textSub }]}>
                아이디
              </Text>

              <Controller
                control={control}
                name="loginId"
                rules={{ required: "아이디를 입력해주세요." }}
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
                  const focused = focusedField === "loginId";
                  return (
                    <>
                      <View style={inputBoxStyle(!!error, focused)}>
                        <TextInput
                          value={value}
                          onChangeText={onChange}
                          onBlur={() => {
                            onBlur();
                            setFocusedField(null);
                          }}
                          onFocus={() => {
                            setGlobalError(null);
                            setFocusedField("loginId");
                          }}
                          placeholder="아이디 입력"
                          placeholderTextColor={t.colors.placeholder}
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="next"
                          onSubmitEditing={() => setFocus("password")}
                          style={inputBase}
                          editable={!isSubmitting}
                        />
                      </View>
                      <FieldError text={error?.message} />
                    </>
                  );
                }}
              />
            </View>

            {/* 3) 비밀번호 */}
            <View style={styles.fieldGap}>
              <Text style={[t.typography.labelMedium, styles.label, { color: t.colors.textSub }]}>
                비밀번호
              </Text>

              <Controller
                control={control}
                name="password"
                rules={{
                  required: "비밀번호를 입력해주세요.",
                  minLength: { value: 4, message: "4자 이상 입력해주세요." },
                }}
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
                  const focused = focusedField === "password";
                  return (
                    <>
                      <View style={[inputBoxStyle(!!error, focused), styles.pwContainer]}>
                        <TextInput
                          value={value}
                          onChangeText={onChange}
                          onBlur={() => {
                            onBlur();
                            setFocusedField(null);
                          }}
                          onFocus={() => {
                            setGlobalError(null);
                            setFocusedField("password");
                          }}
                          secureTextEntry={!showPw}
                          placeholder="비밀번호 입력"
                          placeholderTextColor={t.colors.placeholder}
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="done"
                          onSubmitEditing={handleSubmit(onValidSubmit)}
                          style={[inputBase, { flex: 1 }]}
                          editable={!isSubmitting}
                        />

                        <Pressable
                          onPress={() => setShowPw((p) => !p)}
                          hitSlop={10}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.7 : 1,
                            padding: 4,
                          })}
                          disabled={isSubmitting}
                        >
                          <Text style={[t.typography.labelSmall, { color: t.colors.textSub, fontWeight: "700" }]}>
                            {showPw ? "숨기기" : "보기"}
                          </Text>
                        </Pressable>
                      </View>
                      <FieldError text={error?.message} />
                    </>
                  );
                }}
              />
            </View>

            {/* 4) 글로벌 에러 */}
            {globalError && (
              <View style={[styles.errorBox, { backgroundColor: t.colors.overlay[6], borderColor: t.colors.border }]}>
                <Text style={[t.typography.bodySmall, { color: t.colors.error, textAlign: "center" }]}>
                  {globalError}
                </Text>
              </View>
            )}

            <View style={{ height: 24 }} />

            {/* 5) 로그인 버튼 */}
            <Button
              title={isSubmitting ? "로그인 중..." : "로그인"}
              onPress={handleSubmit(onValidSubmit)}
              disabled={isSubmitting || !isValid}
              loading={isSubmitting}
              variant="primary"
              size="lg"
            />

            {/* 6) 개발용 퀵 로그인 */}
            {__DEV__ && (
              <View style={{ marginTop: 12 }}>
                <Button
                  title="⚡️ user01 (Dev Only)"
                  onPress={onQuickLogin}
                  disabled={isSubmitting}
                  variant="secondary"
                  size="lg"
                />
              </View>
            )}

            {/* 7) 하단 링크 */}
            <View style={styles.footerLinks}>
              <Pressable onPress={() => router.push("/(auth)/signup" as any)} hitSlop={10} disabled={isSubmitting}>
                <Text style={[t.typography.bodyMedium, { color: t.colors.primary, fontWeight: "700" }]}>
                  회원가입
                </Text>
              </Pressable>
              <View style={[styles.divider, { backgroundColor: t.colors.divider }]} />
              <Pressable
                onPress={() => router.push("/(auth)/reset-password" as any)}
                hitSlop={10}
                disabled={isSubmitting}
              >
                <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>비밀번호 찾기</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
  },
  header: {
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
  fieldGap: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: "700",
  },
  pwContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  footerLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  divider: {
    width: 1,
    height: 14,
    marginHorizontal: 16,
  },
});