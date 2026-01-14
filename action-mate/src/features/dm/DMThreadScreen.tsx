import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  Keyboard,
  Animated,
  EmitterSubscription,
  LayoutChangeEvent,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import { getDMMessages, sendDMMessage } from "./dmService";
import type { DMMessage } from "./types";

export default function DMThreadScreen() {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const { threadId, nickname } = useLocalSearchParams<{ threadId: string; nickname: string }>();

  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList<DMMessage>>(null);

  // ✅ 키보드 높이/리프트(리스트 여백 계산 + 입력창 이동용)
  const [keyboardLift, setKeyboardLift] = useState(0);

  // ✅ 입력창(컴포저) 높이: 메시지가 입력창에 안 가리게 padding 계산
  const [composerHeight, setComposerHeight] = useState(0);

  // ✅ 입력창 translateY 애니메이션 값
  const translateY = useRef(new Animated.Value(0)).current;

  // ✅ 하단 시스템 영역(제스처바/내비바) 겹침 방지
  const bottomSafe = Math.max(insets.bottom, 8);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDMMessages(threadId);
        setMessages(data); // inverted: 최신이 [0]이라고 가정
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [threadId]);

  // ✅ 키보드 이벤트:
  // - 입력창은 translateY로 올리고
  // - 리스트는 paddingTop을 keyboardLift만큼 추가해서 말풍선도 같이 위로 보이게 함
  useEffect(() => {
    let showSub: EmitterSubscription | undefined;
    let hideSub: EmitterSubscription | undefined;

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates?.height ?? 0;

      // iOS는 bottom inset이 중복되는 경우가 있어 보정
      const lift = Platform.OS === "ios" ? Math.max(0, h - insets.bottom) : h;

      setKeyboardLift(lift);

      Animated.timing(translateY, {
        toValue: -lift,
        duration: Platform.OS === "ios" ? 220 : 160,
        useNativeDriver: true,
      }).start();

      // ✅ 키보드 올라올 때 최신 메시지 쪽 유지 (선택)
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    });

    hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardLift(0);
      Animated.timing(translateY, {
        toValue: 0,
        duration: Platform.OS === "ios" ? 220 : 160,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub?.remove();
      hideSub?.remove();
    };
  }, [insets.bottom, translateY]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    const content = text.trim();
    setText("");
    setSending(true);

    try {
      const newMsg = await sendDMMessage(threadId, content);
      setMessages((prev) => [newMsg, ...prev]); // inverted -> 앞에 추가
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
    } catch (e) {
      console.error(e);
      setText(content);
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
              : { backgroundColor: t.colors.neutral[100], borderBottomLeftRadius: 4 },
          ]}
        >
          <Text style={[t.typography.bodyMedium, { color: isMe ? "white" : t.colors.textMain }]}>
            {item.text}
          </Text>
        </View>

        <Text style={[t.typography.labelSmall, styles.timeText, { color: t.colors.neutral[400] }]}>
          {new Date(item.createdAt).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  };

  const onComposerLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h !== composerHeight) setComposerHeight(h);
  };

  // ✅ 핵심:
  // inverted에서는 “아래(최신 메시지 위치)” 공간이 paddingTop으로 생김
  // 키보드가 올라오면 keyboardLift만큼 더 띄워서 말풍선도 같이 위로 올라오게 함
  const listContentStyle = useMemo(() => {
    return {
      paddingHorizontal: 16,
      paddingBottom: 16,
      paddingTop: composerHeight + bottomSafe + 12 + keyboardLift,
    } as const;
  }, [composerHeight, bottomSafe, keyboardLift]);

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
        <View style={{ flex: 1, backgroundColor: t.colors.background }}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={t.colors.primary} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              inverted
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={listContentStyle}
            />
          )}

          {/* ✅ 입력창: absolute + translateY로 키보드 위에 고정 */}
          <Animated.View
            onLayout={onComposerLayout}
            style={[
              styles.inputContainer,
              {
                backgroundColor: t.colors.surface,
                borderTopColor: t.colors.neutral[200],
                paddingBottom: 12 + bottomSafe,
                transform: [{ translateY }],
              },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: t.colors.neutral[50],
                  color: t.colors.textMain,
                  borderColor: t.colors.neutral[200],
                },
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
                { backgroundColor: text.trim() ? t.colors.primary : t.colors.neutral[200] },
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="white" />
              )}
            </Pressable>
          </Animated.View>
        </View>
      </AppLayout>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12 },
  msgRowMe: { flexDirection: "row-reverse" },
  msgRowOther: { flexDirection: "row" },

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

  timeText: { marginHorizontal: 6, marginBottom: 2, fontSize: 10 },

  inputContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 12,
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
