import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import AppLayout from "../../shared/ui/AppLayout";
import { Card } from "../../shared/ui/Card";
import { useAppTheme } from "../../shared/hooks/useAppTheme";
import { listMessages, sendMessage } from "./chatService";
import type { Message } from "./types";

export default function ChatRoomScreen() {
  const t = useAppTheme();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    listMessages(String(roomId)).then(setMessages);
  }, [roomId]);

  return (
    <>
      <Stack.Screen options={{ title: "모임방", headerShown: true }} />
      <AppLayout padded={false}>
        <View style={{ padding: t.spacing.pagePaddingH, paddingTop: 10 }}>
          <Card style={{ padding: 12 }}>
            <Text style={t.typography.bodySmall}>
              📌 장소/시간/호스트 메모는 나중에 고정영역으로 연결
            </Text>
          </Card>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: t.spacing.pagePaddingH, paddingBottom: 110, gap: 8 }}
          renderItem={({ item }) => <Bubble item={item} />}
        />

        {/* 입력창 */}
        <View style={[styles.inputBar, { borderColor: t.colors.border, backgroundColor: t.colors.surface }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="메시지 입력..."
            placeholderTextColor={t.colors.textSub}
            style={[styles.input, { color: t.colors.textMain }]}
          />
          <Pressable
            onPress={async () => {
              if (!text.trim()) return;
              await sendMessage(String(roomId), text.trim());
              setMessages((prev) => [
                ...prev,
                { id: String(Date.now()), roomId: String(roomId), sender: "ME", content: text.trim(), createdAtText: "지금" },
              ]);
              setText("");
            }}
            style={({ pressed }) => [
              styles.send,
              { backgroundColor: t.colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[t.typography.labelMedium, { color: "#fff" }]}>전송</Text>
          </Pressable>
        </View>
      </AppLayout>
    </>
  );
}

function Bubble({ item }: { item: Message }) {
  const t = useAppTheme();
  const isMe = item.sender === "ME";
  const isSystem = item.sender === "SYSTEM";

  if (isSystem) {
    return (
      <View style={{ alignItems: "center" }}>
        <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>{item.content}</Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: isMe ? "flex-end" : "flex-start" }}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isMe ? t.colors.primary : t.colors.surface,
            borderColor: t.colors.border,
          },
        ]}
      >
        <Text style={[t.typography.bodyMedium, { color: isMe ? "#fff" : t.colors.textMain }]}>
          {item.content}
        </Text>
      </View>
      <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginTop: 4 }]}>
        {item.createdAtText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  inputBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  send: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
});
