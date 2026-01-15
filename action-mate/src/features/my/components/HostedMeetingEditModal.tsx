import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/Button";
import type { MyMeetingItem } from "../types";

type Props = {
  visible: boolean;
  meeting: MyMeetingItem | null;
  onClose: () => void;
  onSave: (patch: Partial<MyMeetingItem>) => Promise<void> | void;
};

export default function HostedMeetingEditModal({ visible, meeting, onClose, onSave }: Props) {
  const t = useAppTheme();
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [dateText, setDateText] = useState("");

  useEffect(() => {
    if (!visible || !meeting) return;
    setTitle(meeting.title ?? "");
    setPlace(meeting.place ?? "");
    setDateText(meeting.dateText ?? "");
  }, [visible, meeting]);

  if (!meeting) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: t.colors.overlay }]} onPress={onClose} />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: t.colors.background,
            borderColor: t.colors.border,
            borderWidth: t.spacing.borderWidth,
            borderTopLeftRadius: t.spacing.radiusXl,
            borderTopRightRadius: t.spacing.radiusXl,
            padding: t.spacing.pagePaddingH,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={t.typography.titleLarge}>모임 정보 수정</Text>
          <Pressable onPress={onClose}>
            <Text style={t.typography.labelLarge}>닫기</Text>
          </Pressable>
        </View>

        <View style={{ gap: 12 }}>
          <View>
            <Text style={t.typography.labelSmall}>모임 제목</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="예) 러닝 5km 같이 뛰어요"
              placeholderTextColor={t.colors.placeholder}
              style={[
                styles.input,
                { borderColor: t.colors.border, color: t.colors.textMain, borderRadius: t.spacing.radiusLg, borderWidth: t.spacing.borderWidth },
              ]}
            />
          </View>

          <View>
            <Text style={t.typography.labelSmall}>장소</Text>
            <TextInput
              value={place}
              onChangeText={setPlace}
              placeholder="예) 한강공원"
              placeholderTextColor={t.colors.placeholder}
              style={[
                styles.input,
                { borderColor: t.colors.border, color: t.colors.textMain, borderRadius: t.spacing.radiusLg, borderWidth: t.spacing.borderWidth },
              ]}
            />
          </View>

          <View>
            <Text style={t.typography.labelSmall}>시간(표시 텍스트)</Text>
            <TextInput
              value={dateText}
              onChangeText={setDateText}
              placeholder="예) 1/18(일) 10:00"
              placeholderTextColor={t.colors.placeholder}
              style={[
                styles.input,
                { borderColor: t.colors.border, color: t.colors.textMain, borderRadius: t.spacing.radiusLg, borderWidth: t.spacing.borderWidth },
              ]}
            />
          </View>

          <Button
            title="저장"
            onPress={async () => {
              await onSave({
                title: title.trim() || meeting.title,
                place: place.trim() || meeting.place,
                dateText: dateText.trim() || meeting.dateText,
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
