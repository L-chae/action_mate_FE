// src/features/my/components/ProfileEditModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { MyProfile } from "../model/types";

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNickname(profile.nickname ?? "");
    setPhotoUrl(profile.photoUrl ?? "");
    setSaving(false);
  }, [visible, profile.nickname, profile.photoUrl]);

  const trimmed = useMemo(() => nickname.trim(), [nickname]);

  const canSubmit = useMemo(() => {
    if (saving) return false;
    if (trimmed.length === 0) return false;

    const sameNick = trimmed === (profile.nickname ?? "").trim();
    const samePhoto = (photoUrl ?? "") === (profile.photoUrl ?? "");
    return !(sameNick && samePhoto);
  }, [saving, trimmed, profile.nickname, photoUrl, profile.photoUrl]);

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "사진 앨범 접근 권한을 허용해야 프로필 사진을 변경할 수 있어요.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    // expo 버전에 따라 canceled / cancelled 이슈 방지
    const canceled = (result as any).canceled ?? (result as any).cancelled;
    if (canceled) return;

    const uri = (result as any).assets?.[0]?.uri;
    if (uri) setPhotoUrl(uri);
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "카메라 권한을 허용해야 촬영해서 올릴 수 있어요.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    const canceled = (result as any).canceled ?? (result as any).cancelled;
    if (canceled) return;

    const uri = (result as any).assets?.[0]?.uri;
    if (uri) setPhotoUrl(uri);
  };

  const onPressPickPhoto = () => {
    Alert.alert("프로필 사진 변경", "선택 방법을 골라주세요.", [
      { text: "취소", style: "cancel" },
      { text: "사진 촬영", onPress: pickFromCamera },
      { text: "앨범에서 선택", onPress: pickFromLibrary },
    ]);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSave({
        ...profile,
        nickname: trimmed,
        photoUrl: photoUrl || undefined, // 지금은 로컬 uri 저장(추후 업로드 연결 가능)
      });
      onClose();
    } catch (e: any) {
      Alert.alert("저장 실패", e?.message ?? "저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {/* 상단바: X / 타이틀 / 완료 */}
          <View style={styles.topBar}>
            <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <MaterialIcons name="close" size={26} color={t.colors.textMain} />
            </Pressable>

            <Text style={[styles.topTitle, { color: t.colors.textMain }]}>프로필 수정</Text>

            <Pressable
              onPress={submit}
              disabled={!canSubmit}
              hitSlop={12}
              style={({ pressed }) => [
                styles.doneBtn,
                { opacity: !canSubmit ? 0.35 : pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.doneText, { color: t.colors.textMain }]}>{saving ? "저장중" : "완료"}</Text>
            </Pressable>
          </View>

          {/* 본문 */}
          <View style={styles.body}>
            {/* 프로필 이미지 + 카메라 */}
            <View style={styles.avatarArea}>
              <View style={styles.avatarWrap}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: "rgba(0,0,0,0.06)" }]}>
                    <MaterialIcons name="person" size={44} color="rgba(0,0,0,0.45)" />
                  </View>
                )}

                <Pressable
                  onPress={onPressPickPhoto}
                  hitSlop={12}
                  style={({ pressed }) => [
                    styles.cameraBtn,
                    {
                      backgroundColor: t.colors.background,
                      borderColor: t.colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <MaterialIcons name="photo-camera" size={18} color="rgba(0,0,0,0.7)" />
                </Pressable>
              </View>
            </View>

            {/* 닉네임 */}
            <Text style={[styles.label, { color: t.colors.textMain }]}>닉네임</Text>
            <View style={[styles.inputBox, { borderColor: t.colors.border, backgroundColor: t.colors.surface }]}>
              <TextInput
                value={nickname}
                onChangeText={setNickname}
                placeholder="닉네임을 입력하세요"
                placeholderTextColor="rgba(0,0,0,0.35)"
                style={[styles.input, { color: t.colors.textMain }]}
                returnKeyType="done"
                onSubmitEditing={submit}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    height: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
  },
  doneBtn: { paddingHorizontal: 6, paddingVertical: 6 },
  doneText: { fontSize: 16, fontWeight: "700" },

  body: { flex: 1, paddingHorizontal: 18, paddingTop: 10 },

  avatarArea: { alignItems: "center", marginTop: 18, marginBottom: 26 },
  avatarWrap: { width: 92, height: 92, position: "relative" },
  avatarImg: { width: 92, height: 92, borderRadius: 46 },
  avatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBtn: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  label: { fontSize: 14, fontWeight: "700", marginBottom: 10 },

  inputBox: {
    borderWidth: 1,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  input: { fontSize: 16 },
});