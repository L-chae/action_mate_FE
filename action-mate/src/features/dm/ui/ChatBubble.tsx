import React from "react";
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

  return (
    <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
      {/* 상대방일 경우 프로필 아이콘 표시 */}
      {!isMe && (
        <View style={[styles.avatar, { backgroundColor: t.colors.neutral[200] }]}>
          <Ionicons name="person" size={16} color={t.colors.neutral[400]} />
        </View>
      )}

      {/* 말풍선 본문 */}
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

      {/* 시간 표시 */}
      <Text style={[t.typography.labelSmall, styles.timeText, { color: t.colors.neutral[400] }]}>
        {new Date(message.createdAt).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
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
  avatar: {
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