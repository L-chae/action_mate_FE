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
  Image,
  NativeSyntheticEvent,
  ImageErrorEventData,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Shared
import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import TopBar from "@/shared/ui/TopBar";

// Feature: DM
import ChatBubble from "./ui/ChatBubble"; // ChatBubble은 이제 순수 스타일만 담당한다고 가정
import { getDMMessages, sendDMMessage, getDMThread, markDMThreadRead } from "./api/dmApi";
import type { DMMessage, DMThread } from "./model/types";

const MY_ID = "me";
const DEFAULT_AVATAR_URI = "https://www.gravatar.com/avatar/?d=mp&s=200";

// 날짜 포맷팅 (YYYY년 M월 D일)
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
};

// 시간 포맷팅 (오전/오후 HH:mm)
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "오후" : "오전";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0시는 12시로 표시
  const minStr = minutes < 10 ? `0${minutes}` : minutes;
  return `${ampm} ${hours}:${minStr}`;
};

type AvatarImageProps = {
  uri?: string | null;
  size?: number;
};

function AvatarImage({ uri, size = 38 }: AvatarImageProps) {
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
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#ccc" }}
      resizeMode="cover"
    />
  );
}

export default function DMThreadScreen() {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const expoRouter = useRouter();

  const params = useLocalSearchParams<{ threadId?: string | string[] }>();
  const threadId = useMemo(() => {
    const raw = params.threadId;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return String(v ?? "").trim();
  }, [params.threadId]);

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
    if (messages.length > 0) {
      // 약간의 지연을 주어 레이아웃 계산 후 스크롤 되도록 함
      setTimeout(() => listRef.current?.scrollToEnd({ animated }), 100);
    }
  }, [messages.length]);

  // 1) 데이터 로드
  useEffect(() => {
    if (!threadId) return;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const [th, msgs] = await Promise.all([getDMThread(threadId), getDMMessages(threadId)]);
        if (!mounted) return;
        setThread(th);
        setMessages(msgs);
        markDMThreadRead(threadId).catch(() => {});
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [threadId]);

  // 메시지 로드 직후 스크롤 하단 이동
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [loading, scrollToBottom]);

  // 2) 키보드 핸들링 (iOS/Android)
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates.height;
      const lift = Platform.OS === "ios" ? Math.max(0, h - insets.bottom) : 0; // Android는 adjustResize 사용 권장, 여기선 iOS 위주 처리
      
      setKeyboardLift(lift);
      Animated.timing(translateY, {
        toValue: -lift,
        duration: Platform.OS === "ios" ? 250 : 0, // Android는 duration 0 처리
        useNativeDriver: true,
      }).start();
      scrollToBottom(true);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardLift(0);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if (!threadId || !text.trim() || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);

    try {
      const newMsg = await sendDMMessage(threadId, content);
      setMessages((prev) => [...prev, newMsg]);
      scrollToBottom(true);
    } catch (e) {
      console.error(e);
      setText(content); // 실패 시 복구
    } finally {
      setSending(false);
    }
  }, [threadId, text, sending, scrollToBottom]);

  const onComposerLayout = (e: LayoutChangeEvent) => {
    setComposerHeight(e.nativeEvent.layout.height);
  };

  const relatedMeetingId = thread?.relatedMeetingId;
  const relatedMeetingTitle = (thread as any)?.relatedMeetingTitle;

  const goMeeting = useCallback(() => {
    if (!relatedMeetingId) return;
    const id = encodeURIComponent(String(relatedMeetingId));
    expoRouter.push(`/meetings/${id}` as any);
  }, [expoRouter, relatedMeetingId]);

  // ✅ 렌더링 로직 (카카오톡/당근 스타일)
  const renderItem = useCallback(({ item, index }: { item: DMMessage; index: number }) => {
    const isMine = String(item.senderId) === MY_ID;
    const prevMsg = messages[index - 1];
    const nextMsg = messages[index + 1];

    // 1. 날짜 구분선: 이전 메시지와 날짜가 다르거나, 첫 메시지일 때
    const currentDate = new Date(item.createdAt).toDateString();
    const prevDate = prevMsg ? new Date(prevMsg.createdAt).toDateString() : null;
    const showDateSeparator = currentDate !== prevDate;

    // 2. 연속된 메시지(Sequence) 확인
    // - 같은 사람이 보냈고, 같은 날짜(시간대)라면 아바타/닉네임 생략
    const isSameSenderAsPrev = prevMsg && String(prevMsg.senderId) === String(item.senderId);
    
    // 타임스탬프 표시 여부 (분 단위까지 같으면 마지막 메시지에만 표시하거나, UI 취향따라 다름)
    // 여기서는 단순화: 연속된 메시지라도 시간은 각각 표시 or 디자인에 따라 생략 가능.
    // 카톡 스타일: 시간은 항상 표시하되 위치를 맞춤.
    
    // 상대방 아바타 표시 조건: 연속된 메시지가 아니거나, 날짜가 바뀌었을 때
    const showProfile = !isMine && (!isSameSenderAsPrev || showDateSeparator);

    return (
      <View style={{ paddingHorizontal: 16 }}>
        {/* 날짜 구분선 */}
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={[t.typography.labelSmall, { color: t.colors.textSub, backgroundColor: t.colors.neutral[100], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: "hidden" }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        )}

        <View style={[styles.messageRow, isMine ? styles.rowMine : styles.rowOther, { marginTop: isSameSenderAsPrev && !showDateSeparator ? 4 : 12 }]}>
          {/* 상대방 프로필 (왼쪽) */}
          {!isMine && (
            <View style={styles.avatarContainer}>
              {showProfile ? (
                <AvatarImage uri={thread?.otherUser?.avatarUrl} size={38} />
              ) : (
                <View style={{ width: 38 }} /> /* 자리 비워둠 */
              )}
            </View>
          )}

          {/* 메시지 내용 영역 */}
          <View style={[styles.contentContainer, isMine ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}>
            {/* 상대방 닉네임 (첫 메시지에만 표시) */}
            {showProfile && !isMine && (
              <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginBottom: 4, marginLeft: 2 }]}>
                {thread?.otherUser?.nickname ?? "알 수 없음"}
              </Text>
            )}

            {/* 말풍선 + 시간 (가로 배치) */}
            <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
              {/* 내 메시지 시간 (왼쪽) */}
              {isMine && (
                <Text style={[styles.timeText, { color: t.colors.textSub, marginRight: 4 }]}>
                  {formatTime(item.createdAt)}
                </Text>
              )}

              {/* 말풍선 본체 */}
              {/* 주의: ChatBubble 컴포넌트 내부에서 아바타를 렌더링하지 않도록 수정 필요 */}
              <View style={{ maxWidth: "80%" }}>
                <ChatBubble message={item} />
              </View>

              {/* 상대 메시지 시간 (오른쪽) */}
              {!isMine && (
                <Text style={[styles.timeText, { color: t.colors.textSub, marginLeft: 4 }]}>
                  {formatTime(item.createdAt)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }, [messages, thread?.otherUser, t]);

  const listContentStyle = useMemo(
    () => ({
      paddingTop: 16,
      paddingBottom: composerHeight + bottomSafe + 20 + keyboardLift,
    }),
    [composerHeight, bottomSafe, keyboardLift]
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AppLayout padded={false}>
        <View style={{ flex: 1, backgroundColor: t.colors.background }}>
          <TopBar title={title} showBorder showBack onPressBack={() => expoRouter.back()} />

          {/* 연결된 모임 카드 */}
          {relatedMeetingId && (
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
                <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, marginTop: 2 }]} numberOfLines={1}>
                  {relatedMeetingTitle ?? "모임 상세 보기"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.colors.textSub} />
            </Pressable>
          )}

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={t.colors.primary} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              renderItem={renderItem}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={listContentStyle}
              onContentSizeChange={() => scrollToBottom(false)}
              keyboardDismissMode="interactive" // 스크롤 시 키보드 내림 (iOS)
            />
          )}

          {/* 입력창 */}
          <Animated.View
            onLayout={onComposerLayout}
            style={[
              styles.inputContainer,
              {
                backgroundColor: t.colors.surface,
                borderTopColor: t.colors.neutral[200],
                paddingBottom: Platform.OS === "ios" ? bottomSafe : 12,
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
    marginBottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  // 날짜 구분선
  dateSeparator: {
    alignItems: "center",
    marginVertical: 16,
  },

  // 메시지 Row 전체 (아바타 + 내용)
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start", // 상단 정렬 (아바타가 말풍선 맨 위에 오도록)
  },
  rowOther: { justifyContent: "flex-start" },
  rowMine: { justifyContent: "flex-end" },

  // 아바타 영역
  avatarContainer: {
    width: 38,
    marginRight: 10,
    alignItems: "center",
  },

  // 내용 영역 (닉네임 + 말풍선/시간 행)
  contentContainer: {
    flex: 1,
  },

  // 말풍선 + 시간 행
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end", // 말풍선 하단에 시간이 오도록
  },
  bubbleRowOther: { justifyContent: "flex-start" },
  bubbleRowMine: { justifyContent: "flex-end" },

  // 시간 텍스트
  timeText: {
    fontSize: 11,
    minWidth: 50, // 시간이 줄바꿈 되지 않도록 최소 너비 확보
    textAlign: "center",
    marginBottom: 2, // 말풍선 바닥 라인과 살짝 띄우기
  },

  // 입력창 관련
  inputContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
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
    marginBottom: 0, // alignSelf나 alignItems로 조정
  },
});