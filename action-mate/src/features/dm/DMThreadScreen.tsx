// src/features/dm/DMThreadScreen.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageErrorEventData,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Shared
import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import TopBar from "@/shared/ui/TopBar";

// Feature: DM
import ChatBubble from "./ui/ChatBubble";
import { getDMMessages, sendDMMessage, getDMThread, markDMThreadRead } from "./api/dmApi";
import type { DMMessage, DMThread } from "./model/types";

const MY_ID = "me";
const DEFAULT_AVATAR_URI = "https://www.gravatar.com/avatar/?d=mp&s=200";

function formatDate(dateString?: string | null) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatTime(dateString?: string | null) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "오후" : "오전";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minStr = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${ampm} ${hours}:${minStr}`;
}

type AvatarImageProps = {
  uri?: string | null;
  size?: number;
};

function AvatarImage({ uri, size = 38 }: AvatarImageProps) {
  const t = useAppTheme();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const finalUri = !uri || failed ? DEFAULT_AVATAR_URI : uri;

  const onError = useCallback((_e: NativeSyntheticEvent<ImageErrorEventData>) => {
    setFailed(true);
  }, []);

  return (
    <Image
      source={{ uri: finalUri }}
      onError={onError}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: t?.colors?.neutral?.[200] ?? t?.colors?.overlay?.[6] ?? "#ccc",
        },
      ]}
      resizeMode="cover"
    />
  );
}

export default function DMThreadScreen() {
  const t = useAppTheme();
  const s = useMemo(() => createStyles(t), [t]);

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const params = useLocalSearchParams<{ threadId?: string | string[] }>();
  const threadId = useMemo(() => {
    const raw = params?.threadId;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return String(v ?? "").trim();
  }, [params?.threadId]);

  const [thread, setThread] = useState<DMThread | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList<DMMessage> | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const title = thread?.otherUser?.nickname ?? "대화";

  const pagePaddingH = t?.spacing?.pagePaddingH ?? 16;

  // Android는 insets.bottom이 0인 기기/설정이 있어 최소값을 두어 네비게이션 바 중첩 방지
  const androidMinBottom = t?.spacing?.space?.[3] ?? 12;
  const bottomSafe =
    Platform.OS === "android"
      ? Math.max(insets?.bottom ?? 0, androidMinBottom)
      : Math.max(insets?.bottom ?? 0, t?.spacing?.space?.[2] ?? 8);

  // 키보드가 올라온 상태에서는 safe bottom을 크게 잡지 않아도 됨(대부분 네비게이션 바가 숨겨짐)
  const composerBottomPadding = isKeyboardVisible ? (t?.spacing?.space?.[2] ?? 8) : bottomSafe;

  const onPrimary = (t as any)?.colors?.onPrimary ?? (t as any)?.colors?.textOnPrimary ?? "#FFFFFF";

  const scrollToBottom = useCallback(
    (animated: boolean) => {
      if (!listRef.current) return;
      if ((messages?.length ?? 0) <= 0) return;

      setTimeout(() => {
        try {
          listRef.current?.scrollToEnd({ animated });
        } catch {}
      }, 60);
    },
    [messages?.length]
  );

  // 1) 데이터 로드
  useEffect(() => {
    if (!threadId) {
      setLoading(false);
      setThread(null);
      setMessages([]);
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const [th, msgs] = await Promise.all([getDMThread(threadId), getDMMessages(threadId)]);
        if (!mounted) return;

        setThread(th ?? null);
        setMessages(Array.isArray(msgs) ? msgs : []);
        markDMThreadRead(threadId).catch(() => {});
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setThread(null);
        setMessages([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [threadId]);

  // 메시지 로드 직후 하단 이동
  useEffect(() => {
    if (!loading && (messages?.length ?? 0) > 0) scrollToBottom(false);
  }, [loading, messages?.length, scrollToBottom]);

  // 키보드 상태 추적
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      scrollToBottom(true);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToBottom]);

  const handleSend = useCallback(async () => {
    const content = text?.trim?.() ?? "";
    if (!threadId || !content || sending) return;

    setText("");
    setSending(true);

    try {
      const newMsg = await sendDMMessage(threadId, content);
      setMessages((prev) => [...(prev ?? []), newMsg]);
      scrollToBottom(true);
    } catch (e) {
      console.error(e);
      setText(content); // 실패 시 복구
    } finally {
      setSending(false);
    }
  }, [threadId, text, sending, scrollToBottom]);

  const relatedMeetingId = thread?.relatedMeetingId;
  const relatedMeetingTitle = (thread as any)?.relatedMeetingTitle;

  const goMeeting = useCallback(() => {
    if (!relatedMeetingId) return;
    const id = encodeURIComponent(String(relatedMeetingId));
    router.push(`/meetings/${id}` as any);
  }, [router, relatedMeetingId]);

  const listContentStyle = useMemo(
    () => ({
      paddingTop: t?.spacing?.space?.[3] ?? 12,
      paddingBottom: t?.spacing?.space?.[3] ?? 12, // composer는 in-flow이므로 과한 paddingBottom 불필요
    }),
    [t?.spacing?.space]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: DMMessage; index: number }) => {
      const isMine = String(item?.senderId ?? "") === MY_ID;

      const prevMsg = messages?.[index - 1];
      const currentDate = new Date(item?.createdAt ?? "").toDateString();
      const prevDate = prevMsg ? new Date(prevMsg?.createdAt ?? "").toDateString() : null;
      const showDateSeparator = currentDate !== prevDate;

      const isSameSenderAsPrev = !!prevMsg && String(prevMsg?.senderId ?? "") === String(item?.senderId ?? "");
      const showProfile = !isMine && (!isSameSenderAsPrev || showDateSeparator);

      return (
        <View style={[s.messageWrap, { paddingHorizontal: pagePaddingH }]}>
          {showDateSeparator && (
            <View style={s.dateSeparator}>
              <Text
                style={[
                  t?.typography?.labelSmall,
                  s.dateBadge,
                  {
                    color: t?.colors?.textSub,
                    backgroundColor: t?.colors?.neutral?.[100] ?? t?.colors?.overlay?.[6],
                  },
                ]}
              >
                {formatDate(item?.createdAt)}
              </Text>
            </View>
          )}

          <View
            style={[
              s.messageRow,
              isMine ? s.rowMine : s.rowOther,
              { marginTop: isSameSenderAsPrev && !showDateSeparator ? 4 : 12 },
            ]}
          >
            {!isMine && (
              <View style={s.avatarContainer}>
                {showProfile ? (
                  <AvatarImage uri={thread?.otherUser?.avatarUrl} size={38} />
                ) : (
                  <View style={s.avatarSpacer} />
                )}
              </View>
            )}

            <View style={[s.contentContainer, isMine ? s.alignEnd : s.alignStart]}>
              {showProfile && !isMine && (
                <Text style={[t?.typography?.labelSmall, { color: t?.colors?.textSub, marginBottom: 4, marginLeft: 2 }]}>
                  {thread?.otherUser?.nickname ?? "알 수 없음"}
                </Text>
              )}

              <View style={[s.bubbleRow, isMine ? s.bubbleRowMine : s.bubbleRowOther]}>
                {isMine && (
                  <Text style={[s.timeText, { color: t?.colors?.textSub, marginRight: 4 }]}>
                    {formatTime(item?.createdAt)}
                  </Text>
                )}

                <View style={s.bubbleMaxWidth}>
                  <ChatBubble message={item} />
                </View>

                {!isMine && (
                  <Text style={[s.timeText, { color: t?.colors?.textSub, marginLeft: 4 }]}>
                    {formatTime(item?.createdAt)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      );
    },
    [messages, pagePaddingH, s, t, thread?.otherUser]
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AppLayout padded={false}>
        <View style={s.screen}>
          <TopBar title={title} showBorder showBack onPressBack={() => router.back()} />

          {/* ✅ 키보드가 올라오면 composer가 키보드 위로 올라가도록 처리 */}
          <KeyboardAvoidingView
            style={s.flex1}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={35}
          >
            {relatedMeetingId ? (
              <Pressable
                onPress={goMeeting}
                style={({ pressed }) => [
                  s.meetingCard,
                  {
                    borderColor: t?.colors?.neutral?.[200] ?? t?.colors?.border,
                    backgroundColor: t?.colors?.neutral?.[50] ?? t?.colors?.surface,
                    opacity: pressed ? 0.9 : 1,
                    marginHorizontal: pagePaddingH,
                    marginTop: t?.spacing?.space?.[2] ?? 10,
                  },
                ]}
              >
                <View style={s.flex1}>
                  <Text style={[t?.typography?.labelSmall, { color: t?.colors?.textSub }]}>연결된 모임글</Text>
                  <Text style={[t?.typography?.bodyMedium, { color: t?.colors?.textMain, marginTop: 2 }]} numberOfLines={1}>
                    {relatedMeetingTitle ?? "모임 상세 보기"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={t?.colors?.textSub} />
              </Pressable>
            ) : null}

            {loading ? (
              <View style={s.center}>
                <ActivityIndicator color={t?.colors?.primary} />
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages ?? []}
                renderItem={renderItem}
                keyExtractor={(it, idx) => String(it?.id ?? idx)}
                contentContainerStyle={listContentStyle}
                onContentSizeChange={() => scrollToBottom(false)}
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                keyboardShouldPersistTaps="handled"
              />
            )}

            {/* ✅ 입력창: absolute 제거 + safe-area(bottom) padding 적용 */}
            <View
              style={[
                s.composerWrap,
                {
                  backgroundColor: t?.colors?.surface,
                  borderTopColor: t?.colors?.neutral?.[200] ?? t?.colors?.border,
                  paddingBottom: composerBottomPadding,
                  paddingHorizontal: pagePaddingH,
                },
              ]}
            >
              <TextInput
                style={[
                  s.input,
                  {
                    backgroundColor: t?.colors?.neutral?.[50] ?? t?.colors?.background,
                    color: t?.colors?.textMain,
                    borderColor: t?.colors?.neutral?.[200] ?? t?.colors?.border,
                  },
                ]}
                placeholder="메시지를 입력하세요"
                placeholderTextColor={t?.colors?.textSub}
                value={text ?? ""}
                onChangeText={(v) => setText(v ?? "")}
                multiline
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  // multiline 기본은 줄바꿈이므로, submit 케이스만 방어적으로 처리
                  handleSend();
                }}
              />

              <Pressable
                onPress={handleSend}
                disabled={!text?.trim?.() || sending}
                style={({ pressed }) => [
                  s.sendBtn,
                  {
                    backgroundColor: text?.trim?.()
                      ? t?.colors?.primary
                      : t?.colors?.neutral?.[200] ?? t?.colors?.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={onPrimary} />
                ) : (
                  <Ionicons name="arrow-up" size={20} color={onPrimary} />
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </AppLayout>
    </>
  );
}

function createStyles(t: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    flex1: { flex: 1 },
    screen: {
      flex: 1,
      backgroundColor: t?.colors?.background,
    },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },

    meetingCard: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
    },

    // Messages
    messageWrap: {},
    dateSeparator: {
      alignItems: "center",
      marginVertical: 16,
    },
    dateBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      overflow: "hidden",
    },
    messageRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    rowOther: { justifyContent: "flex-start" },
    rowMine: { justifyContent: "flex-end" },

    avatarContainer: {
      width: 38,
      marginRight: 10,
      alignItems: "center",
    },
    avatarSpacer: {
      width: 38,
      height: 1,
    },

    contentContainer: { flex: 1 },
    alignEnd: { alignItems: "flex-end" },
    alignStart: { alignItems: "flex-start" },

    bubbleRow: {
      flexDirection: "row",
      alignItems: "flex-end",
    },
    bubbleRowOther: { justifyContent: "flex-start" },
    bubbleRowMine: { justifyContent: "flex-end" },

    timeText: {
      fontSize: 11,
      minWidth: 50,
      textAlign: "center",
      marginBottom: 2,
    },
    bubbleMaxWidth: {
      maxWidth: "80%",
    },

    // Composer
    composerWrap: {
      flexDirection: "row",
      alignItems: "flex-end",
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
      marginRight: 10,
      borderWidth: 1,
      fontSize: 15,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
  });
}

/**
 * 요약
 * - FlatList ref 타입 오류: callback ref 제거하고 ref={listRef}로 수정(반환값 없도록).
 * - t.colors.white 타입 오류: onPrimary 색을 (colors.onPrimary/textOnPrimary) 우선 사용하고 없으면 fallback 처리.
 * - Android 하단 중첩: 입력창을 absolute 제거 + bottom safe padding 적용, KeyboardAvoidingView로 키보드 위로 상승.
 */
