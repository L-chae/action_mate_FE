import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/Button";
import type { MyProfile } from "../types";

type Props = {
  visible: boolean;
  profile: MyProfile;
  onClose: () => void;
  onSave: (next: MyProfile) => Promise<void> | void;
};

export default function ProfileEditModal({ visible, profile, onClose, onSave }: Props) {
  const t = useAppTheme();
  const [nickname, setNickname] = useState(profile.nickname ?? "");
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl ?? "");

  useEffect(() => {
    if (!visible) return;
    setNickname(profile.nickname ?? "");
    setPhotoUrl(profile.photoUrl ?? "");
  }, [visible, profile.nickname, profile.photoUrl]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: t.colors.overlay }]} onPress={onClose} />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: t.colors.background,
            borderColor: t.colors.border,
            borderTopLeftRadius: t.spacing.radiusXl,
            borderTopRightRadius: t.spacing.radiusXl,
            borderWidth: t.spacing.borderWidth,
            padding: t.spacing.pagePaddingH,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={t.typography.titleLarge}>프로필 설정/수정</Text>
          <Pressable onPress={onClose}>
            <Text style={t.typography.labelLarge}>닫기</Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          <View>
            <Text style={t.typography.labelSmall}>닉네임</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임을 입력하세요"
              placeholderTextColor={t.colors.placeholder}
              style={[
                styles.input,
                {
                  borderColor: t.colors.border,
                  color: t.colors.textMain,
                  borderRadius: t.spacing.radiusLg,
                  borderWidth: t.spacing.borderWidth,
                },
              ]}
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text style={t.typography.labelSmall}>프로필 사진 URL (선택)</Text>
            <TextInput
              value={photoUrl}
              onChangeText={setPhotoUrl}
              placeholder="https://..."
              placeholderTextColor={t.colors.placeholder}
              style={[
                styles.input,
                {
                  borderColor: t.colors.border,
                  color: t.colors.textMain,
                  borderRadius: t.spacing.radiusLg,
                  borderWidth: t.spacing.borderWidth,
                },
              ]}
              autoCapitalize="none"
            />
          </View>

          <Button
            title="저장"
            onPress={async () => {
              await onSave({
                nickname: nickname.trim() || "액션메이트",
                photoUrl: photoUrl.trim() || undefined,
              });
              onClose();
            }}
          />
        </View>

        <View style={{ height: 10 }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  input: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14 },
});
