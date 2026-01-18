import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/Button";
import type { MyMeetingItem } from "../model/types";

type Props = {
  visible: boolean;
  meeting: MyMeetingItem | null;
  onClose: () => void;
  onSave: (patch: Partial<MyMeetingItem>) => Promise<void> | void;
};

export default function HostedMeetingEditModal({ visible, meeting, onClose, onSave }: Props) {
  const t = useAppTheme();
  const s = useMemo(() => createStyles(t), [t]);

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

  const handleSave = async () => {
    await onSave({
      title: title.trim() || meeting.title,
      place: place.trim() || meeting.place,
      dateText: dateText.trim() || meeting.dateText,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* ✅ scrim 사용 (overlay 객체 아님) */}
      <Pressable style={s.backdrop} onPress={onClose} />

      <View style={s.sheet}>
        <View style={s.header}>
          <Text style={t.typography.titleLarge}>모임 정보 수정</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={t.typography.labelLarge}>닫기</Text>
          </Pressable>
        </View>

        <View style={s.form}>
          <View>
            <Text style={t.typography.labelSmall}>모임 제목</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="예) 러닝 5km 같이 뛰어요"
              placeholderTextColor={t.colors.placeholder}
              style={s.input}
            />
          </View>

          <View>
            <Text style={t.typography.labelSmall}>장소</Text>
            <TextInput
              value={place}
              onChangeText={setPlace}
              placeholder="예) 한강공원"
              placeholderTextColor={t.colors.placeholder}
              style={s.input}
            />
          </View>

          <View>
            <Text style={t.typography.labelSmall}>시간(표시 텍스트)</Text>
            <TextInput
              value={dateText}
              onChangeText={setDateText}
              placeholder="예) 1/18(일) 10:00"
              placeholderTextColor={t.colors.placeholder}
              style={s.input}
            />
          </View>

          <Button title="저장" onPress={handleSave} />
        </View>

        <View style={s.bottomSpacer} />
      </View>
    </Modal>
  );
}

function createStyles(t: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    backdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.colors.scrim, // ✅ 모달 뒤 dim
    },

    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.colors.background,
      borderColor: t.colors.border,
      borderWidth: t.spacing.borderWidth,
      borderTopLeftRadius: t.spacing.radiusXl,
      borderTopRightRadius: t.spacing.radiusXl,
      padding: t.spacing.pagePaddingH,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: t.spacing.space[4], // 16
    },

    form: {
      gap: t.spacing.space[3], // 12
    },

    input: {
      marginTop: t.spacing.space[2], // 8
      paddingHorizontal: t.spacing.space[4], // 16
      paddingVertical: t.spacing.space[3], // 12
      fontSize: 14,
      borderRadius: t.spacing.radiusLg,
      borderWidth: t.spacing.borderWidth,
      borderColor: t.colors.border,
      color: t.colors.textMain,
      backgroundColor: t.colors.surface, // ✅ 입력 배경을 surface로
    },

    bottomSpacer: {
      height: t.spacing.space[2], // 8
    },
  });
}