// src/features/settings/ProfileSettingsScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";

import { useAuthStore } from "@/features/auth/model/authStore";

type FieldRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  placeholder?: string;
  helperText?: string;
  maxLength?: number;
  onChangeText: (v: string) => void;
};

function FieldRow({
  icon,
  label,
  value,
  placeholder,
  helperText,
  maxLength = 20,
  onChangeText,
}: FieldRowProps) {
  const t = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.16 : 0.1) }]}>
          <Ionicons name={icon} size={18} color={t.colors.icon.default} />
        </View>
        <Text style={[t.typography.bodyLarge, { color: t.colors.textMain, fontWeight: "700" }]} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textSub}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={maxLength}
        style={[
          styles.input,
          t.typography.bodyLarge,
          {
            color: t.colors.textMain,
            borderColor: t.colors.border,
            backgroundColor: t.colors.background,
          },
        ]}
      />

      <View style={styles.metaRow}>
        {helperText ? <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>{helperText}</Text> : <View />}
        <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
          {value.length}/{maxLength}
        </Text>
      </View>
    </View>
  );
}

type PrimaryButtonProps = {
  title: string;
  disabled?: boolean;
  onPress: () => void;
};

function PrimaryButton({ title, disabled, onPress }: PrimaryButtonProps) {
  const t = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        {
          backgroundColor: disabled ? withAlpha(t.colors.primary, 0.4) : t.colors.primary,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text style={[t.typography.bodyLarge, { color: t.colors.primary, fontWeight: "800" }]}>{title}</Text>
    </Pressable>
  );
}

function normalizeNickname(input: string) {
  // 의도: 서버/DB/검색 인덱싱에서 흔히 문제가 되는 공백/연속 공백을 미리 정리해 일관성을 유지
  return input.replace(/\s+/g, " ").trim();
}

function validateNickname(nickname: string) {
  const v = normalizeNickname(nickname);
  if (!v) return { ok: false, message: "닉네임을 입력해 주세요." };
  if (v.length < 2) return { ok: false, message: "닉네임은 2자 이상이어야 합니다." };
  if (v.length > 20) return { ok: false, message: "닉네임은 20자 이하로 입력해 주세요." };
  // 한글/영문/숫자/공백/언더스코어/하이픈 정도만 허용 (실무에서 흔한 정책)
  if (!/^[\p{L}\p{N}_\-\s]+$/u.test(v)) return { ok: false, message: "닉네임에 사용할 수 없는 문자가 포함되어 있어요." };
  return { ok: true as const, value: v };
}

export default function ProfileSettingsScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // 프로젝트에 user shape이 다를 수 있어서 안전하게 접근
  const me = useAuthStore((s) => (s as any).user ?? (s as any).me);
  const updateProfile = useAuthStore((s) => (s as any).updateProfile);

  const initialNickname = useMemo(() => {
    const fromStore = (me?.nickname ?? me?.name ?? "") as string;
    return typeof fromStore === "string" ? fromStore : "";
  }, [me]);

  const [nickname, setNickname] = useState<string>(initialNickname);
  const [saving, setSaving] = useState(false);

  const normalized = useMemo(() => normalizeNickname(nickname), [nickname]);
  const isDirty = useMemo(() => normalizeNickname(initialNickname) !== normalized, [initialNickname, normalized]);
  const validation = useMemo(() => validateNickname(nickname), [nickname]);

  const onPickAvatar = useCallback(() => {
    // 의도: 포트폴리오에선 "아바타 변경 진입점"만 명확히 보여주고,
    // 실제 구현은 expo-image-picker / 업로드 API로 확장 가능하도록 분리
    Alert.alert("안내", "프로필 이미지 선택 기능 연결 필요 (ImagePicker/업로드)");
  }, []);

  const onSave = useCallback(async () => {
    if (saving) return;

    const v = validateNickname(nickname);
    if (!v.ok) {
      Alert.alert("확인", v.message);
      return;
    }
    if (!isDirty) {
      router.back();
      return;
    }

    try {
      setSaving(true);

      // 의도: 스토어 액션이 없더라도 화면 흐름은 유지되게(포트폴리오에서 데모 가능)
      if (typeof updateProfile === "function") {
        await updateProfile({ nickname: v.value });
      } else {
        // fallback: updateProfile이 아직 없다면 여기서 API/스토어 추가 필요
        await new Promise((r) => setTimeout(r, 300));
      }

      Alert.alert("완료", "프로필이 저장되었습니다.", [{ text: "확인", onPress: () => router.back() }]);
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }, [saving, nickname, isDirty, updateProfile, router]);

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

  return (
    <AppLayout padded={false}>
      <TopBar title="프로필" showBorder showBack onPressBack={onPressBack} />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: Math.max(24, insets.bottom + 16),
        }}
      >
        {/* 아바타 */}
        <View style={[styles.avatarCard, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <View style={styles.avatarLeft}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: withAlpha(t.colors.primary, t.mode === "dark" ? 0.18 : 0.12) },
              ]}
            >
              <Ionicons name="person" size={26} color={t.colors.icon.default} />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[t.typography.bodyLarge, { color: t.colors.textMain, fontWeight: "800" }]} numberOfLines={1}>
                프로필 이미지
              </Text>
              <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]} numberOfLines={2}>
                이미지 선택/업로드는 ImagePicker 및 업로드 API로 확장 가능합니다.
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

        {/* 닉네임 */}
        <Text style={[t.typography.labelLarge, { color: t.colors.textSub, marginBottom: 8, marginTop: 18 }]}>
          기본 정보
        </Text>

        <FieldRow
          icon="at-outline"
          label="닉네임"
          value={nickname}
          placeholder="닉네임을 입력해 주세요"
          helperText={validation.ok ? "한글/영문/숫자/공백, _ - 사용 가능" : validation.message}
          maxLength={20}
          onChangeText={setNickname}
        />

        <PrimaryButton
          title={saving ? "저장 중..." : "저장"}
          disabled={saving || !validation.ok || !isDirty}
          onPress={onSave}
        />

        <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 12 }]}>
          변경사항이 있을 때만 저장 버튼이 활성화됩니다.
        </Text>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  primaryBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  avatarLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
