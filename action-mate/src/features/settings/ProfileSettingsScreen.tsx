// src/features/settings/ProfileSettingsScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import { Button } from "@/shared/ui/Button";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";

import { useAuthStore } from "@/features/auth/model/authStore";
import type { Gender, User } from "@/features/auth/model/types";

// --- 타입 및 유틸리티 ---
type FieldKey = "nickname" | "birthDate";
type FieldRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  placeholder?: string;
  helperText?: string;
  errorText?: string;
  maxLength?: number;
  editable?: boolean;
  keyboardType?: "default" | "number-pad" | "email-address";
  onChangeText: (v: string) => void;
  onBlur?: () => void;
};

type ReadOnlyRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

function normalizeNickname(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function validateNickname(nickname: string) {
  const v = normalizeNickname(nickname);
  if (!v) return { ok: false as const, message: "닉네임을 입력해 주세요." };
  if (v.length < 2) return { ok: false as const, message: "닉네임은 2자 이상이어야 합니다." };
  if (v.length > 20) return { ok: false as const, message: "닉네임은 20자 이하로 입력해 주세요." };
  if (!/^[\p{L}\p{N}_\-\s]+$/u.test(v))
    return { ok: false as const, message: "닉네임에 사용할 수 없는 문자가 포함되어 있어요." };
  return { ok: true as const, value: v };
}

const formatBirthDate = (text: string) => {
  const nums = text.replace(/[^0-9]/g, "");
  if (nums.length <= 4) return nums;
  if (nums.length <= 6) return `${nums.slice(0, 4)}-${nums.slice(4)}`;
  return `${nums.slice(0, 4)}-${nums.slice(4, 6)}-${nums.slice(6, 8)}`;
};

const isValidBirth = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

function normalizeBirthForSave(v: string) {
  const s = v.trim();
  if (/^\d{8}$/.test(s)) return formatBirthDate(s);
  return s;
}

function genderLabel(g: Gender | "none" | null | undefined) {
  if (g === "male") return "남성";
  if (g === "female") return "여성";
  return "선택 안 함";
}

// FieldRow 컴포넌트
function FieldRow({
  icon,
  label,
  value,
  placeholder,
  helperText,
  errorText,
  maxLength = 20,
  editable = true,
  keyboardType = "default",
  onChangeText,
  onBlur,
}: FieldRowProps) {
  const t = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.16 : 0.1) },
          ]}
        >
          <Ionicons name={icon} size={18} color={t.colors.icon.default} />
        </View>
        <Text
          style={[t.typography.bodyLarge, { color: t.colors.textMain, fontWeight: "700" }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textSub}
        onChangeText={onChangeText}
        onBlur={onBlur}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={maxLength}
        editable={editable}
        keyboardType={keyboardType}
        style={[
          styles.input,
          t.typography.bodyLarge,
          {
            color: t.colors.textMain,
            borderColor: errorText ? t.colors.error : t.colors.border,
            backgroundColor: t.colors.background,
            opacity: editable ? 1 : 0.7,
          },
        ]}
      />

      <View style={styles.metaRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {errorText ? (
            <Text style={[t.typography.bodySmall, { color: t.colors.error }]} numberOfLines={2}>
              {errorText}
            </Text>
          ) : helperText ? (
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]} numberOfLines={2}>
              {helperText}
            </Text>
          ) : null}
        </View>
        <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
          {value.length}/{maxLength}
        </Text>
      </View>
    </View>
  );
}

// ✅ 읽기 전용 Row (아이디 표시용) - "비활성화" 느낌 + 포커스/수정 불가
function ReadOnlyRow({ icon, label, value }: ReadOnlyRowProps) {
  const t = useAppTheme();
  const disabledBg = withAlpha(t.colors.textSub, t.mode === "dark" ? 0.14 : 0.08);

  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.16 : 0.1) },
          ]}
        >
          <Ionicons name={icon} size={18} color={t.colors.icon.default} />
        </View>
        <Text
          style={[t.typography.bodyLarge, { color: t.colors.textMain, fontWeight: "700" }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      <TextInput
        value={value || "-"}
        editable={false}
        focusable={false} // Android 포커스 방지
        selectTextOnFocus={false}
        caretHidden
        style={[
          styles.input,
          t.typography.bodyLarge,
          {
            color: t.colors.textSub,
            borderColor: t.colors.border,
            backgroundColor: disabledBg,
            opacity: 0.85,
          },
        ]}
      />
    </View>
  );
}

// SegmentedGender 컴포넌트
function SegmentedGender({
  value,
  onChange,
  disabled,
}: {
  value: Gender | "none";
  onChange: (v: Gender | "none") => void;
  disabled?: boolean;
}) {
  const t = useAppTheme();
  const btnBase = {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
  const mkStyle = (active: boolean) => ({
    ...btnBase,
    borderColor: active ? t.colors.primary : t.colors.border,
    backgroundColor: active
      ? withAlpha(t.colors.primary, t.mode === "dark" ? 0.18 : 0.12)
      : t.colors.background,
  });
  const mkText = (active: boolean) => ({
    color: active ? t.colors.primary : t.colors.textSub,
    fontWeight: active ? ("800" as const) : ("500" as const),
  });

  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.16 : 0.1) },
          ]}
        >
          <Ionicons name="male-female-outline" size={18} color={t.colors.icon.default} />
        </View>
        <Text
          style={[t.typography.bodyLarge, { color: t.colors.textMain, fontWeight: "700" }]}
          numberOfLines={1}
        >
          성별
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          disabled={disabled}
          onPress={() => onChange("male")}
          style={({ pressed }) => [
            mkStyle(value === "male"),
            { opacity: disabled ? 0.6 : pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={[t.typography.bodyMedium, mkText(value === "male")]}>남성</Text>
        </Pressable>

        <Pressable
          disabled={disabled}
          onPress={() => onChange("female")}
          style={({ pressed }) => [
            mkStyle(value === "female"),
            { opacity: disabled ? 0.6 : pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={[t.typography.bodyMedium, mkText(value === "female")]}>여성</Text>
        </Pressable>

        <Pressable
          disabled={disabled}
          onPress={() => onChange("none")}
          style={({ pressed }) => [
            mkStyle(value === "none"),
            { opacity: disabled ? 0.6 : pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={[t.typography.bodyMedium, mkText(value === "none")]}>선택 안 함</Text>
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>현재: {genderLabel(value)}</Text>
      </View>
    </View>
  );
}

// === [메인 스크린] ===
export default function ProfileSettingsScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  // ✅ 아이디(읽기 전용 표시용)
  const loginId = useMemo(() => {
    const u: any = user ?? {};
    return String(u.email ?? u.loginId ?? u.username ?? u.id ?? "").trim();
  }, [user]);

  const initial = useMemo(() => {
    return {
      nickname: user?.nickname ?? "",
      birthDate: user?.birthDate ?? "",
      gender: user?.gender === "male" || user?.gender === "female" ? user.gender : "none",
      avatar: user?.avatar ?? null,
    } as const;
  }, [user]);

  const [nickname, setNickname] = useState<string>(initial.nickname);
  const [birthDate, setBirthDate] = useState<string>(initial.birthDate);
  const [gender, setGender] = useState<Gender | "none">(initial.gender);
  const [avatar, setAvatar] = useState<string | null>(initial.avatar);

  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    nickname: false,
    birthDate: false,
  });

  const normalizedNick = useMemo(() => normalizeNickname(nickname), [nickname]);
  const normalizedBirth = useMemo(() => normalizeBirthForSave(birthDate), [birthDate]);

  const nickValidation = useMemo(() => validateNickname(nickname), [nickname]);
  const birthOk = useMemo(() => {
    const v = normalizeBirthForSave(birthDate);
    if (!v.trim()) return false;
    return isValidBirth(v);
  }, [birthDate]);

  const isDirty = useMemo(() => {
    const aNick = normalizeNickname(initial.nickname);
    const aBirth = normalizeBirthForSave(initial.birthDate);
    const avatarChanged = initial.avatar !== avatar;

    return (
      aNick !== normalizedNick ||
      aBirth !== normalizedBirth ||
      initial.gender !== gender ||
      avatarChanged
    );
  }, [initial, normalizedNick, normalizedBirth, gender, avatar]);

  const canSave = useMemo(() => {
    return !saving && isDirty && nickValidation.ok && birthOk;
  }, [saving, isDirty, nickValidation.ok, birthOk]);

  const onPickAvatar = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("권한 필요", "사진을 선택하려면 갤러리 접근 권한이 필요합니다.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  }, []);

  const onSave = useCallback(async () => {
    if (saving || !user) return;

    setTouched({ nickname: true, birthDate: true });

    const v = validateNickname(nickname);
    if (!v.ok) {
      Alert.alert("확인", v.message);
      return;
    }
    const bd = normalizeBirthForSave(birthDate);
    if (!isValidBirth(bd)) {
      Alert.alert("확인", "생년월일을 올바르게 입력해 주세요.");
      return;
    }

    if (!isDirty) {
      router.back();
      return;
    }

    const safeGender: Gender | undefined = gender === "none" ? undefined : gender;

    const patchData: Partial<User> = {
      nickname: v.value,
      birthDate: bd,
      gender: safeGender,
      avatar: avatar,
    };

    const optimisticUser: User = {
      ...user,
      ...patchData,
    };

    try {
      setSaving(true);

      await setUser(optimisticUser);
      await updateProfile(patchData);

      Alert.alert("완료", "프로필이 저장되었습니다.", [{ text: "확인", onPress: () => router.back() }]);
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [saving, nickname, birthDate, gender, avatar, isDirty, user, setUser, updateProfile, router]);

  const onPressBack = useCallback(() => {
    if (!isDirty) {
      router.back();
      return;
    }
    Alert.alert("변경사항이 있어요", "저장하지 않고 나갈까요?", [
      { text: "취소", style: "cancel" },
      { text: "나가기", style: "destructive", onPress: () => router.back() },
    ]);
  }, [isDirty, router]);

  const nickError = useMemo(() => {
    if (!touched.nickname) return undefined;
    return nickValidation.ok ? undefined : nickValidation.message;
  }, [touched.nickname, nickValidation]);

  const birthError = useMemo(() => {
    if (!touched.birthDate) return undefined;
    const bd = normalizeBirthForSave(birthDate);
    if (!bd.trim()) return "생년월일을 입력해 주세요.";
    return isValidBirth(bd) ? undefined : "올바른 날짜를 입력해 주세요.";
  }, [touched.birthDate, birthDate]);

  return (
    <AppLayout padded={false}>
      <TopBar title="프로필" showBorder showBack onPressBack={onPressBack} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: Math.max(24, insets.bottom + 16),
          }}
        >
          {/* 아바타 카드 */}
          <View style={[styles.avatarCard, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
            <View style={styles.avatarLeft}>
              <View
                style={[
                  styles.avatarCircle,
                  {
                    backgroundColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.18 : 0.12),
                    overflow: "hidden",
                  },
                ]}
              >
                {avatar ? (
                  <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Ionicons name="person" size={26} color={t.colors.icon.default} />
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[t.typography.bodyLarge, { color: t.colors.textMain, fontWeight: "800" }]} numberOfLines={1}>
                  프로필 이미지
                </Text>
                <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]} numberOfLines={2}>
                  탭하여 이미지를 변경해 보세요.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onPickAvatar}
              style={({ pressed }) => [
                styles.ghostBtn,
                {
                  borderColor: t.colors.border,
                  opacity: pressed ? 0.9 : 1,
                  backgroundColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.12 : 0.08),
                },
              ]}
            >
              <Text style={[t.typography.labelLarge, { color: t.colors.textMain, fontWeight: "700" }]}>변경</Text>
            </Pressable>
          </View>

          {/* ✅ 기본 정보 타이틀 */}
          <Text style={[t.typography.labelLarge, { color: t.colors.textSub, marginBottom: 8, marginTop: 18 }]}>
            기본 정보
          </Text>

          {/* ✅ 아이디: 기본 정보 아래로 이동 */}
          <ReadOnlyRow icon="key-outline" label="아이디" value={loginId} />

          <View style={{ height: 12 }} />

          <FieldRow
            icon="at-outline"
            label="닉네임"
            value={nickname}
            placeholder="닉네임을 입력해 주세요"
            helperText="한글/영문/숫자/공백, _ - 사용 가능"
            errorText={nickError}
            maxLength={20}
            editable={!saving}
            onChangeText={(v) => setNickname(v)}
            onBlur={() => setTouched((p) => ({ ...p, nickname: true }))}
          />

          <View style={{ height: 12 }} />

          <FieldRow
            icon="calendar-outline"
            label="생년월일"
            value={birthDate}
            placeholder="예: 19950615"
            helperText="숫자만 입력하면 자동으로 1995-06-15 형태로 변환됩니다."
            errorText={birthError}
            maxLength={10}
            editable={!saving}
            keyboardType="number-pad"
            onChangeText={(v) => setBirthDate(formatBirthDate(v))}
            onBlur={() => setTouched((p) => ({ ...p, birthDate: true }))}
          />

          <View style={{ height: 12 }} />

          <SegmentedGender value={gender} onChange={setGender} disabled={saving} />

          <View style={{ height: 18 }} />

          <Button
            title={saving ? "저장 중..." : "저장"}
            onPress={onSave}
            disabled={!canSave}
            loading={saving}
            variant="primary"
            size="lg"
          />

          <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 12 }]}>
            변경사항이 있을 때만 저장 버튼이 활성화됩니다.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  metaRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },

  avatarCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  avatarLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 },
  avatarCircle: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  ghostBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
});
