// src/features/auth/IdLoginScreen.tsx
import React, { useMemo, useState } from "react";
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

function FieldError({ text }: { text?: string }) {
  const t = useAppTheme();
  const msg = String(text ?? "").trim();
  if (!msg) return null;
  return <Text style={[t.typography.bodySmall, { color: t.colors.error, marginTop: t.spacing.space?.[2] ?? 6 }]}>{msg}</Text>;
}

type FieldKey = "loginId" | "password";

export default function IdLoginScreen() {
  const t = useAppTheme();
  const loginToStore = useAuthStore((s) => s.login);

  const [showPw, setShowPw] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<FieldKey | null>(null);

  const PH = t.spacing.pagePaddingH ?? (t.spacing.space?.[6] ?? 24);
  const PV = t.spacing.pagePaddingV ?? (t.spacing.space?.[6] ?? 24);
  const CARD_PAD = t.spacing.space?.[6] ?? 24;
  const GAP_LG = t.spacing.space?.[6] ?? 24;
  const GAP_MD = t.spacing.space?.[5] ?? 20;
  const LOGO_SIZE = t.spacing.space?.[8] ?? 80;

  const CONTROL_H = (t.spacing as any)?.controlHeight ?? 56;

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting, isValid },
    setValue,
  } = useForm<LoginInput>({
    mode: "onChange",
    defaultValues: { loginId: "", password: "" },
  });

  const inputBoxStyle = useMemo(
    () =>
      (hasError: boolean, isFocused: boolean): ViewStyle => ({
        height: CONTROL_H,
        borderRadius: t.spacing.radiusMd,
        borderWidth: isFocused ? 1.5 : t.spacing.borderWidth,
        borderColor: hasError ? t.colors.error : isFocused ? t.colors.primary : t.colors.border,
        backgroundColor: hasError ? t.colors.surface : t.colors.card,
        paddingHorizontal: t.spacing.space?.[4] ?? 16,
        justifyContent: "center",
      }),
    [CONTROL_H, t]
  );

  const inputBase: TextStyle = useMemo(
    () => ({
      fontSize: 16,
      padding: 0,
      color: t.colors.textMain,
    }),
    [t]
  );

  const onValidSubmit = async (data: LoginInput) => {
    setGlobalError(null);
    try {
      const user = await authApi.login({
        loginId: String(data?.loginId ?? "").trim(),
        password: String(data?.password ?? ""),
      });

      if (!user?.loginId) {
        setGlobalError("회원 정보를 불러올 수 없습니다.");
        return;
      }

      loginToStore(user);
      router.replace("/(tabs)" as any);
    } catch (e: any) {
      setGlobalError(String(e?.message ?? "").trim() || "로그인에 실패했어요.");
    }
  };

  const onQuickLogin = () => {
    setValue("loginId", "user01", { shouldValidate: true });
    setValue("password", "1234", { shouldValidate: true });
    handleSubmit(onValidSubmit)();
  };

  return (
    <AppLayout padded={false} style={{ backgroundColor: t.colors.background }}>
      <TopBar title="" showBack onPressBack={() => router.back()} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: PH,
              paddingVertical: PV,
            },
          ]}
        >
          <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border, borderRadius: t.spacing.radiusLg, padding: CARD_PAD }]}>
            <View style={styles.header}>
              <Image source={require("../../../assets/images/logo.png")} style={{ width: LOGO_SIZE, height: LOGO_SIZE, resizeMode: "contain" }} />
              <Text style={[t.typography.titleLarge, { color: t.colors.textMain, marginTop: t.spacing.space?.[3] ?? 12 }]}>아이디로 로그인</Text>
              <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: t.spacing.space?.[2] ?? 4 }]}>당신의 취미 메이트를 찾아보세요!</Text>
            </View>

            <View style={{ height: GAP_LG }} />

            <View style={{ marginBottom: GAP_MD }}>
              <Text style={[t.typography.labelMedium, styles.label, { color: t.colors.textSub }]}>아이디</Text>

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
                          value={String(value ?? "")}
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

            <View style={{ marginBottom: GAP_MD }}>
              <Text style={[t.typography.labelMedium, styles.label, { color: t.colors.textSub }]}>비밀번호</Text>

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
                          value={String(value ?? "")}
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
                          style={[inputBase, styles.flex1]}
                          editable={!isSubmitting}
                        />

                        <Pressable
                          onPress={() => setShowPw((p) => !p)}
                          hitSlop={t.spacing.space?.[3] ?? 10}
                          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: t.spacing.space?.[1] ?? 4 }]}
                          disabled={isSubmitting}
                        >
                          <Text style={[t.typography.labelSmall, { color: t.colors.textSub, fontWeight: "700" }]}>{showPw ? "숨기기" : "보기"}</Text>
                        </Pressable>
                      </View>
                      <FieldError text={error?.message} />
                    </>
                  );
                }}
              />
            </View>

            {globalError ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: t.colors.overlay?.[6] ?? t.colors.surface,
                    borderColor: t.colors.border,
                    marginTop: t.spacing.space?.[4] ?? 16,
                  },
                ]}
              >
                <Text style={[t.typography.bodySmall, { color: t.colors.error, textAlign: "center" }]}>{globalError}</Text>
              </View>
            ) : null}

            <View style={{ height: t.spacing.space?.[5] ?? 24 }} />

            <Button
              title={isSubmitting ? "로그인 중..." : "로그인"}
              onPress={handleSubmit(onValidSubmit)}
              disabled={isSubmitting || !isValid}
              loading={isSubmitting}
              variant="primary"
              size="lg"
            />

            {__DEV__ ? (
              <View style={{ marginTop: t.spacing.space?.[3] ?? 12 }}>
                <Button title="⚡️ user01 (Dev Only)" onPress={onQuickLogin} disabled={isSubmitting} variant="secondary" size="lg" />
              </View>
            ) : null}

            <View style={[styles.footerLinks, { marginTop: t.spacing.space?.[6] ?? 24 }]}>
              <Pressable onPress={() => router.push("/(auth)/signup" as any)} hitSlop={t.spacing.space?.[3] ?? 10} disabled={isSubmitting}>
                <Text style={[t.typography.bodyMedium, { color: t.colors.primary, fontWeight: "700" }]}>회원가입</Text>
              </Pressable>

              <View style={{ width: 1, height: t.spacing.space?.[4] ?? 14, marginHorizontal: t.spacing.space?.[4] ?? 16, backgroundColor: t.colors.divider }} />

              <Pressable onPress={() => router.push("/(auth)/reset-password" as any)} hitSlop={t.spacing.space?.[3] ?? 10} disabled={isSubmitting}>
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
  flex: { flex: 1 },
  flex1: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    borderWidth: 1,
  },
  header: {
    alignItems: "center",
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
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  footerLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});

/*
요약(3줄)
- 테마 기반 spacing 적용으로 하드코딩을 최소화하고, 입력/에러 UI는 기존 패턴을 유지했습니다.
- 로그인 결과가 비정상(User 누락)이어도 앱이 죽지 않도록 방어 처리했습니다.
- 라우팅 타입 이슈는 기존처럼 안전 캐스팅을 유지했습니다.
*/
