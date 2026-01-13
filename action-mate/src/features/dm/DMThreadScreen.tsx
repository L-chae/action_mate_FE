import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import { getDMMessages, sendDMMessage } from "./dmService";
import type { DMMessage } from "./types";

export default function DMThreadScreen() {
  const t = useAppTheme();
  const { threadId, nickname } = useLocalSearchParams<{ threadId: string; nickname: string }>();

  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // 메시지 로드
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDMMessages(threadId);
        setMessages(data); // 서비스에서 이미 역순(최신이 [0])으로 온다고 가정하거나, 여기서 reverse
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [threadId]);

  // 메시지 전송
  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText(""); // UI 즉시 초기화
    setSending(true);

    try {
      const newMsg = await sendDMMessage(threadId, content);
      setMessages((prev) => [newMsg, ...prev]); // 최신 메시지를 앞에 추가 (Inverted List)
    } catch (e) {
      console.error(e);
      setText(content); // 실패 시 복구
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: DMMessage }) => {
    const isMe = item.senderId === "me";

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        {!isMe && (
           <View style={[styles.avatar, { backgroundColor: t.colors.neutral[200] }]}>
             <Ionicons name="person" size={16} color={t.colors.neutral[400]} />
           </View>
        )}
        
        <View
          style={[
            styles.bubble,
            isMe 
              ? { backgroundColor: t.colors.primary, borderBottomRightRadius: 4 } 
              : { backgroundColor: t.colors.neutral[100], borderBottomLeftRadius: 4 }
          ]}
        >
          <Text style={[
            t.typography.bodyMedium, 
            { color: isMe ? "white" : t.colors.textMain }
          ]}>
            {item.text}
          </Text>
        </View>
        
        <Text style={[t.typography.labelSmall, styles.timeText, { color: t.colors.neutral[400] }]}>
          {new Date(item.createdAt).toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: nickname || "대화", 
          headerBackTitle: " ", 
          headerStyle: { backgroundColor: t.colors.background },
          headerShadowVisible: false,
        }} 
      />

      <AppLayout padded={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={t.colors.primary} />
            </View>
          ) : (
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              inverted // ✅ 최신 메시지가 아래에 오도록 역순 렌더링
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
              style={{ flex: 1, backgroundColor: t.colors.background }}
            />
          )}

          {/* 입력창 */}
          <View style={[styles.inputContainer, { backgroundColor: t.colors.surface, borderTopColor: t.colors.neutral[200] }]}>
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: t.colors.neutral[50], 
                  color: t.colors.textMain,
                  borderColor: t.colors.neutral[200]
                }
              ]}
              placeholder="메시지를 입력하세요"
              placeholderTextColor={t.colors.textSub}
              value={text}
              onChangeText={setText}
              multiline
            />
            <Pressable 
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={[
                styles.sendBtn, 
                { backgroundColor: text.trim() ? t.colors.primary : t.colors.neutral[200] }
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="white" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </AppLayout>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});