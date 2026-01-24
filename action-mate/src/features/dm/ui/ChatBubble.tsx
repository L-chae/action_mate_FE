// src/features/dm/ui/ChatBubble.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { DMMessage } from "../model/types";

interface ChatBubbleProps {
  message: DMMessage;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const t = useAppTheme();
  const isMe = message.senderId === "me";

  // ✅ 렌더마다 Date 파싱/포맷 비용을 줄이기 위해 메모이제이션
  const timeText = useMemo(() => {
    const d = new Date(message.createdAt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }, [message.createdAt]);

  return (
    <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
      {!isMe && (
        <View style={[styles.avatarUrl, { backgroundColor: t.colors.neutral[200] }]}>
          <Ionicons name="person" size={16} color={t.colors.neutral[400]} />
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isMe
            ? { backgroundColor: t.colors.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: t.colors.neutral[100], borderBottomLeftRadius: 4 },
        ]}
      >
        <Text style={[t.typography.bodyMedium, { color: isMe ? "white" : t.colors.textMain }]}>
          {message.text}
        </Text>
      </View>

      <Text style={[t.typography.labelSmall, styles.timeText, { color: t.colors.neutral[400] }]}>
        {timeText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  msgRowMe: {
    flexDirection: "row-reverse",
  },
  msgRowOther: {
    flexDirection: "row",
  },
  avatarUrl: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: "70%",
  },
  timeText: {
    marginHorizontal: 6,
    marginBottom: 2,
    fontSize: 10,
  },
});
