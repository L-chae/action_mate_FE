// src/features/dm/ui/ChatBubble.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { DMMessage } from "../model/types";

interface ChatBubbleProps {
  message: DMMessage;
}

const MY_ID = "me";

export default function ChatBubble({ message }: ChatBubbleProps) {
  const t = useAppTheme();
  // id 비교 시 타입 안전성을 위해 String 변환 추천
  const isMe = String(message.senderId) === MY_ID;

  return (
    <View
      style={[
        styles.bubble,
        isMe
          ? { 
              backgroundColor: t.colors.primary, 
              borderBottomRightRadius: 4 // 말풍선 꼬리 느낌 (오른쪽 아래 각지게)
            }
          : { 
              backgroundColor: t.colors.neutral[100], 
              borderBottomLeftRadius: 4 // 말풍선 꼬리 느낌 (왼쪽 아래 각지게)
            },
      ]}
    >
      <Text
        style={[
          t.typography.bodyMedium,
          { color: isMe ? "white" : t.colors.textMain },
        ]}
      >
        {message.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18, // 기본적으로 둥글게
    // maxWidth는 Parent(Screen)에서 이미 제한하고 있으므로(80% 등),
    // 여기서는 내용물에 맞춰 늘어나도록 둠.
  },
});