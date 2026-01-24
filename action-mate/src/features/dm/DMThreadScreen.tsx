// src/features/dm/DMThreadScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import TopBar from "@/shared/ui/TopBar";

import ChatBubble from "./ui/ChatBubble";
import { getDMMessages, getDMThread, markDMThreadRead, sendDMMessage } from "./api/dmApi";
import type { DMMessage, DMThread } from "./model/types";

const TOP_BAR_HEIGHT = 56;
const MIN_BOTTOM_PADDING = 12;

function toStrParam(v: string | string[] | undefined): string {
  const s = Array.isArray(v) ? v[0] : v;
  return String(s ?? "").trim();
}

export default function DMThreadScreen() {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const isIOS = Platform.OS === "ios";

  const params = useLocalSearchParams<{
    threadId?: string;
    nickname?: string;
    meetingId?: string;
    meetingTitle?: string;
  }>();

  const threadId = useMemo(() => toStrParam(params.threadId), [params.threadId]);
  const paramNickname = useMemo(() => toStrParam(params.nickname), [params.nickname]);
  const paramMeetingId = useMemo(() => toStrParam(params.meetingId), [params.meetingId]);
  const paramMeetingTitle = useMemo(() => toStrParam(params.meetingTitle), [params.meetingTitle]);

  const [thread, setThread] = useState<DMThread | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // ✅ Android edge-to-edge + resize(=adjustResize)에서 키보드가 떠도 insets.bottom이 남는 케이스가 있어
  // 입력바에 insets.bottom을 계속 더하면 "키보드와 입력바 사이 공백"이 생김.
  // → 키보드가 보이는 동안(Android)은 insets.bottom을 제거하고 최소 패딩만 둔다.
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const listRef = useRef<FlatList<DMMessage>>(null);
  const requestSeqRef = useRef(0);
  const didInitialScrollRef = useRef(false);

  const title = useMemo(() => thread?.otherUser?.nickname || paramNickname || "대화", [thread, paramNickname]);

  const relatedMeetingId = useMemo(() => {
    const v = thread?.relatedMeetingId || paramMeetingId;
    return v ? String(v) : undefined;
  }, [thread, paramMeetingId]);

  const relatedMeetingTitle = useMemo(() => {
    return (
      thread?.relatedMeetingTitle ||
      thread?.relatedMeeting?.title ||
      (paramMeetingTitle ? paramMeetingTitle : undefined)
    );
  }, [thread, paramMeetingTitle]);

  // iOS만 KAV 사용(가장 안정). Android는 app.config의 resize에 맡김.
  const keyboardVerticalOffset = useMemo(() => {
    return Math.max(0, insets.top) + TOP_BAR_HEIGHT;
  }, [insets.top]);

  const scrollToBottom = useCallback((animated: boolean) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    const showEvent = isIOS ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = isIOS ? "keyboardWillHide" : "keyboardDidHide";

    const subShow = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      setTimeout(() => scrollToBottom(true), 80);
    });

    const subHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [isIOS, scrollToBottom]);

  useEffect(() => {
    if (!threadId) {
      setThread(null);
      setMessages([]);
      setLoading(false);
      didInitialScrollRef.current = false;
      return;
    }

    const seq = ++requestSeqRef.current;
    didInitialScrollRef.current = false;

    const isNew = threadId.startsWith("new_");
    if (isNew) {
      setThread(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        const [th, msgs] = await Promise.all([getDMThread(threadId), getDMMessages(threadId)]);
        if (cancelled) return;
        if (requestSeqRef.current !== seq) return;

        setThread(th);
        setMessages(msgs);

        markDMThreadRead(threadId).catch(() => {});
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled && requestSeqRef.current === seq) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => {
    if (loading) return;
    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      scrollToBottom(false);
    }
  }, [loading, scrollToBottom]);

  const goMeeting = useCallback(() => {
    if (!relatedMeetingId) return;
    router.push(
      {
        pathname: "/meetings/[id]",
        params: { id: relatedMeetingId },
      } as any
    );
  }, [router, relatedMeetingId]);

  const handleSend = useCallback(async () => {
    if (!threadId) return;
    if (sending) return;

    const content = text.trim();
    if (!content) return;

    const optimisticId = `local_${Date.now()}`;

    const optimistic: DMMessage = {
      id: optimisticId as any,
      threadId: threadId as any,
      type: "TEXT",
      text: content,
      senderId: "me",
      createdAt: new Date().toISOString() as any,
      isRead: true,
    };

    setText("");
    setSending(true);
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom(true);

    try {
      const saved = await sendDMMessage(threadId, content);

      setMessages((prev) => {
        const idx = prev.findIndex((m) => String(m.id) === optimisticId);
        if (idx === -1) return [...prev, saved];
        const next = prev.slice();
        next[idx] = saved;
        return next;
      });

      scrollToBottom(true);
    } catch (e) {
      console.error(e);
      setMessages((prev) => prev.filter((m) => String(m.id) !== optimisticId));
      setText(content);
    } finally {
      setSending(false);
    }
  }, [threadId, sending, text, scrollToBottom]);

  const renderMessage = useCallback(({ item }: { item: DMMessage }) => <ChatBubble message={item} />, []);
  const keyExtractor = useCallback((item: DMMessage) => String(item.id), []);

  const meetingCardStyle = useMemo(
    () => [
      styles.meetingCard,
      { borderColor: t.colors.neutral[200], backgroundColor: t.colors.neutral[50] },
    ],
    [t]
  );

  const inputContainerStyle = useMemo(() => {
    const baseBottom = Math.max(insets.bottom, MIN_BOTTOM_PADDING);
    // ✅ Android에서 키보드가 보이면 insets.bottom 제거(공백 방지)
    const paddingBottom = isIOS ? baseBottom : keyboardVisible ? MIN_BOTTOM_PADDING : baseBottom;

    return [
      styles.inputContainer,
      {
        backgroundColor: t.colors.surface,
        borderTopColor: t.colors.neutral[200],
        paddingBottom,
      },
    ];
  }, [t, insets.bottom, keyboardVisible, isIOS]);

  const content = (
    <View style={styles.body}>
      {relatedMeetingId ? (
        <Pressable onPress={goMeeting} style={({ pressed }) => [meetingCardStyle, { opacity: pressed ? 0.9 : 1 }]}>
          <View style={styles.flex}>
            <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>연결된 모임글</Text>
            <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, marginTop: 2 }]} numberOfLines={1}>
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
          keyExtractor={keyExtractor}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          initialNumToRender={16}
          maxToRenderPerBatch={24}
          windowSize={10}
          removeClippedSubviews={Platform.OS === "android"}
        />
      )}

      <View style={inputContainerStyle}>
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
          textAlignVertical="center"
          scrollEnabled
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || sending}
          style={[styles.sendBtn, { backgroundColor: text.trim() ? t.colors.primary : t.colors.neutral[200] }]}
        >
          {sending ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="arrow-up" size={20} color="white" />}
        </Pressable>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AppLayout padded={false}>
        <View style={[styles.root, { backgroundColor: t.colors.background }]}>
          {/* ✅ TopBar는 키보드 보정 컨테이너 밖에 고정 (Android에서 밀려 사라지는 현상 방지) */}
          <View style={styles.topBarWrap}>
            <TopBar title={title} showBorder showBack onPressBack={() => router.back()} />
          </View>

          {isIOS ? (
            <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={keyboardVerticalOffset}>
              {content}
            </KeyboardAvoidingView>
          ) : (
            // ✅ Android: softwareKeyboardLayoutMode="resize"에 맡김 (KAV로 중복 보정 금지)
            <View style={styles.flex}>{content}</View>
          )}
        </View>
      </AppLayout>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  // ✅ resize/키보드 상황에서 FlatList가 레이아웃을 뚫고 튀는 케이스 방지
  body: { flex: 1, minHeight: 0 },

  topBarWrap: { flexShrink: 0 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  meetingCard: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  list: { flex: 1, minHeight: 0 },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
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