import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import TopBar from "@/shared/ui/TopBar";

import { getDMMessages, sendDMMessage, getDMThread, markDMThreadRead } from "./api/dmService";
import type { DMMessage, DMThread } from "./model/dm.types";

export default function DMThreadScreen() {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();

  // ✅ threadId만 받으면 됨 (나머지는 thread에서 가져오기)
  const { threadId } = useLocalSearchParams<{ threadId: string }>();

  const [thread, setThread] = useState<DMThread | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList<DMMessage>>(null);

  const [keyboardLift, setKeyboardLift] = useState(0);
  const [composerHeight, setComposerHeight] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const bottomSafe = Math.max(insets.bottom, 8);

  const title = thread?.otherUser?.nickname ?? "대화";

  const scrollToBottom = useCallback((animated: boolean) => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        const [th, msgs] = await Promise.all([
          getDMThread(threadId),
          getDMMessages(threadId),
        ]);

        if (!mounted) return;

        setThread(th);
        setMessages(msgs);

        // ✅ 들어오면 읽음 처리 (상대가 보낸 것)
        await markDMThreadRead(threadId);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) {
          setLoading(false);
          scrollToBottom(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [threadId, scrollToBottom]);

  useEffect(() => {
    let showSub: EmitterSubscription | undefined;
    let hideSub: EmitterSubscription | undefined;

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates?.height ?? 0;
      const lift = Platform.OS === "ios" ? Math.max(0, h - insets.bottom) : h;

      setKeyboardLift(lift);

      Animated.timing(translateY, {
        toValue: -lift,
        duration: Platform.OS === "ios" ? 220 : 160,
        useNativeDriver: true,
      }).start();

      scrollToBottom(true);
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
  }, [insets.bottom, translateY, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || sending) return;

    const content = text.trim();
    setText("");
    setSending(true);

    try {
      const newMsg = await sendDMMessage(threadId, content);
      setMessages((prev) => [...prev, newMsg]);
      scrollToBottom(true);
    } catch (e) {
      console.error(e);
      setText(content);
    } finally {
      setSending(false);
    }
  }, [text, sending, threadId, scrollToBottom]);

  const renderMessage = useCallback(
    ({ item }: { item: DMMessage }) => {
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
            {new Date(item.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      );
    },
    [t.colors.neutral, t.colors.primary, t.colors.textMain, t.typography.bodyMedium, t.typography.labelSmall]
  );

  const onComposerLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h !== composerHeight) setComposerHeight(h);
  };

  const listContentStyle = useMemo(() => {
    return {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: composerHeight + bottomSafe + 12 + keyboardLift,
    } as const;
  }, [composerHeight, bottomSafe, keyboardLift]);

  const relatedMeetingId = thread?.relatedMeetingId;
  const relatedMeetingTitle = thread?.relatedMeetingTitle;

  const goMeeting = useCallback(() => {
    if (!relatedMeetingId) return;
    router.push(`/meetings/${relatedMeetingId}`);
  }, [relatedMeetingId]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <AppLayout padded={false}>
        <View style={{ flex: 1, backgroundColor: t.colors.background }}>
          <TopBar
            title={title}
            showBorder
            showBack
            onPressBack={() => router.back()}
            showNoti={false}
            showMenu={false}
          />

          {/* ✅ 상단 카드: 모임글로 이동 (thread 기반) */}
          {relatedMeetingId ? (
            <Pressable
              onPress={goMeeting}
              style={({ pressed }) => [
                styles.meetingCard,
                {
                  borderColor: t.colors.neutral[200],
                  backgroundColor: t.colors.neutral[50],
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>연결된 모임글</Text>
                <Text
                  style={[t.typography.bodyMedium, { color: t.colors.textMain, marginTop: 2 }]}
                  numberOfLines={1}
                >
                  {relatedMeetingTitle ?? "모임 상세로 이동"}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={t.colors.textSub} />
            </Pressable>
          ) : null}

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
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={listContentStyle}
              onContentSizeChange={() => scrollToBottom(false)}
            />
          )}

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

  meetingCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

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
