// src/features/meetings/MeetingDetailScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  findNodeHandle,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

// ✅ Store & API
import { useAuthStore } from "@/features/auth/model/authStore";
import { meetingApi } from "@/features/meetings/api/meetingApi";
import { findDMThreadByMeetingId } from "@/features/dm/api/dmApi";
import type { Comment, MeetingPost, Participant } from "@/features/meetings/model/types";

// ✅ MOCK (댓글 표시용)
import { MEETING_COMMENTS_MOCK } from "@/features/meetings/mocks/meetingMockData";

// ✅ UI & Hooks
import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import NotiButton from "@/shared/ui/NotiButton";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useKeyboardAwareScroll } from "./hooks/useKeyboardAwareScroll";
import { ProfileModal } from "@/features/meetings/ui/ProfileModal";
import { DetailContent } from "./ui/DetailContent";
import { BottomBar } from "./ui/BottomBar";

const TOPBAR_HEIGHT = 56;

export default function MeetingDetailScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  // params 파싱은 “문자열 id”로 표준화 (이후 로직의 조건/캐스팅 최소화 목적)
  const meetingId: string | undefined = useMemo(() => {
    const raw = (params as any)?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const me = useAuthStore((s) => s.user);
  const currentUserId = me?.id ? String(me.id) : "guest";

  // --- State ---
  const [post, setPost] = useState<MeetingPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileVisible, setProfileVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  const inputRef = useRef<TextInput | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  // “바닥 고정” 여부 판단은 렌더에 영향 없으므로 ref로 유지 (불필요한 렌더 방지 목적)
  const stickToBottomRef = useRef(true);

  const scrollToBottomSoon = useCallback((animated = true) => {
    // 레이아웃 반영 직후 스크롤이 필요한 케이스가 많아 타이머를 최소로 사용
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    }, 80);
  }, []);

  const { isKeyboardVisible } = useKeyboardAwareScroll({
    onShow: () => {
      stickToBottomRef.current = true;
      scrollToBottomSoon(true);
    },
  });

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isAuthor = useMemo(() => {
    const hostId = post?.host?.id;
    if (!hostId) return false;
    return String(hostId) === String(currentUserId) || String(hostId) === "me";
  }, [post?.host?.id, currentUserId]);

  const membership = post?.myState?.membershipStatus ?? "NONE";
  const canJoin = post?.myState?.canJoin ?? post?.status === "OPEN";

  const pendingCount = useMemo(
    () => participants.filter((p) => p.status === "PENDING").length,
    [participants]
  );

  const contentBottomPadding = useMemo(() => {
    return (
      (isKeyboardVisible ? 0 : bottomBarHeight) +
      20 +
      (Platform.OS === "android" && isKeyboardVisible ? keyboardHeight : 0)
    );
  }, [bottomBarHeight, isKeyboardVisible, keyboardHeight]);

  const keyboardVerticalOffset = useMemo(() => {
    return Platform.OS === "ios" ? TOPBAR_HEIGHT + insets.top : 0;
  }, [insets.top]);

  const displayHost = useMemo(() => {
    if (!post?.host) return null;
    if (isAuthor && me) {
      return { ...post.host, nickname: me.nickname, avatarUrl: me.avatarUrl };
    }
    return post.host;
  }, [post?.host, isAuthor, me]);

  const displayPost = useMemo(() => {
    if (!post) return null;
    return { ...post, host: displayHost ?? post.host };
  }, [post, displayHost]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height) - contentBottomPadding;
      stickToBottomRef.current = distanceFromBottom < 24;
    },
    [contentBottomPadding]
  );

  const scrollComposerToKeyboard = useCallback(() => {
    const node = findNodeHandle(inputRef.current);
    const responder = (scrollViewRef.current as any)?.getScrollResponder?.();
    if (node && responder?.scrollResponderScrollNativeHandleToKeyboard) {
      responder.scrollResponderScrollNativeHandleToKeyboard(
        node,
        Platform.OS === "android" ? 20 : 12,
        true
      );
    } else {
      scrollToBottomSoon(true);
    }
  }, [scrollToBottomSoon]);

  const loadInitialData = useCallback(async () => {
    // ✅ meetingId 없을 때 로딩만 걸어두지 않도록 방어
    if (!meetingId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const m = await meetingApi.getMeeting(meetingId);
      setPost(m);

      // ✅ 목업 댓글 주입 (API 연결 전 UI 확인용)
      // - 화면에 “댓글/대댓글”이 즉시 보이도록
      // - 필요하면 meetingId별로 분기해서 다른 댓글 세트로 바꿔도 됨
      setComments(MEETING_COMMENTS_MOCK);

      const hostId = m.host?.id ? String(m.host.id) : "";
      if (m.myState?.membershipStatus === "HOST" || hostId === String(currentUserId)) {
        const parts = await meetingApi.getParticipants(String(m.id));
        setParticipants(parts);
      } else {
        setParticipants([]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "모임 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [meetingId, currentUserId]);

  useFocusEffect(
    useCallback(() => {
      // ✅ 다른 모임으로 들어왔을 때 입력 모드가 남아있지 않도록 초기화
      setReplyTarget(null);
      setEditingComment(null);
      setCommentText("");
      loadInitialData();
    }, [loadInitialData])
  );

  const handleCancelInputMode = useCallback(() => {
    setReplyTarget(null);
    setEditingComment(null);
    setCommentText("");
    Keyboard.dismiss();
  }, []);

  const handleJoin = useCallback(async () => {
    if (!post) return;
    try {
      const r = await meetingApi.joinMeeting(String(post.id));
      setPost(r.post);
      if (r.post.myState?.membershipStatus === "PENDING") {
        Alert.alert("신청 완료", "호스트 승인 후 참여가 확정됩니다.");
      }
    } catch {
      Alert.alert("오류", "참여 신청에 실패했습니다.");
    }
  }, [post]);

  const handleCancelJoin = useCallback(() => {
    if (!post) return;
    Alert.alert(membership === "PENDING" ? "요청 취소" : "모임 나가기", "정말 처리하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "확인",
        style: "destructive",
        onPress: async () => {
          try {
            const r = await meetingApi.cancelJoin(String(post.id));
            setPost(r.post);
          } catch {
            Alert.alert("오류", "요청 처리에 실패했습니다.");
          }
        },
      },
    ]);
  }, [post, membership]);

  const handleEnterChat = useCallback(async () => {
    if (!post) return;

    if (post.myState?.membershipStatus === "HOST") {
      router.push("/(tabs)/dm");
      return;
    }

    try {
      const existingThread = await findDMThreadByMeetingId(post.id);

      if (existingThread) {
        router.push({
          pathname: "/dm/[threadId]",
          params: {
            threadId: existingThread.id,
            nickname: existingThread.otherUser.nickname,
            meetingTitle: post.title,
          },
        } as any);
      } else {
        router.push({
          pathname: "/dm/[threadId]",
          params: {
            threadId: `new_${post.id}_${post.host?.id}`,
            meetingId: post.id,
            meetingTitle: post.title,
            nickname: post.host?.nickname,
            opponentId: post.host?.id,
          },
        } as any);
      }
    } catch (e) {
      console.error("채팅방 입장 실패:", e);
      Alert.alert("알림", "채팅방 연결에 실패했습니다.");
    }
  }, [post, router]);

  const handleSubmitComment = useCallback(() => {
    if (!commentText.trim()) return;

    if (editingComment) {
      setComments((prev: Comment[]) =>
        prev.map((c: Comment) =>
          String(c.id) === String(editingComment.id) ? { ...c, content: commentText } : c
        )
      );
      setEditingComment(null);
    } else {
      const replyNickname =
        (replyTarget as any)?.author?.nickname ?? (replyTarget as any)?.authorNickname ?? "알 수 없음";

      const newComment: Comment = {
        id: `new_${Date.now()}`,
        content: replyTarget ? `@${replyNickname} ${commentText}` : commentText,
        createdAt: new Date().toISOString(),
        parentId: replyTarget?.id,
        author: {
          id: currentUserId,
          nickname: me?.nickname || "나",
          avatarUrl: (me as any)?.avatarUrl,
        } as any,
      };

      setComments((prev: Comment[]) => [...prev, newComment]);
    }

    setCommentText("");
    setReplyTarget(null);
    Keyboard.dismiss();
    scrollToBottomSoon(true);
  }, [commentText, editingComment, replyTarget, currentUserId, me, scrollToBottomSoon]);

  if (loading || !post) {
    return (
      <AppLayout>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={t.colors.primary} />
        </View>
      </AppLayout>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {displayHost && (
        <ProfileModal
          visible={profileVisible}
          user={displayHost}
          onClose={() => setProfileVisible(false)}
        />
      )}

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable
            style={[
              styles.modalContent,
              { paddingBottom: Math.max(20, insets.bottom), backgroundColor: t.colors.surface },
            ]}
            onPress={() => {
              // overlay 닫힘 방지용 (의도: 컨텐츠 터치 시 모달 유지)
            }}
          >
            <View style={styles.dragHandle} />

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push(`/meetings/edit/${post.id}` as any);
              }}
            >
              <Ionicons name="pencil-outline" size={20} color={t.colors.textMain} />
              <Text style={t.typography.bodyLarge}>게시글 수정</Text>
            </Pressable>

            <View style={[styles.menuDivider, { backgroundColor: t.colors.neutral[100] }]} />

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                Alert.alert("모임 삭제", "정말로 삭제하시겠습니까?", [
                  { text: "취소", style: "cancel" },
                  {
                    text: "삭제",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await meetingApi.cancelMeeting(String(post.id));
                        router.back();
                      } catch {
                        Alert.alert("오류", "삭제 실패");
                      }
                    },
                  },
                ]);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={t.colors.error} />
              <Text style={[t.typography.bodyLarge, { color: t.colors.error }]}>게시글 삭제</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <AppLayout padded={false}>
        <TopBar
          title="모임 상세"
          showBorder
          showBack
          onPressBack={() => router.back()}
          showNoti={false}
          renderRight={() =>
            isAuthor ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {pendingCount > 0 && (
                  <View style={{ marginRight: 10 }}>
                    <NotiButton
                      color={t.colors.icon.default}
                      backgroundColor={t.colors.background}
                      count={pendingCount}
                      size={24}
                      onPress={() => router.push(`/meetings/manage/${post.id}` as any)}
                    />
                  </View>
                )}
                <Pressable onPress={() => setMenuVisible(true)} hitSlop={12} style={{ padding: 4 }}>
                  <Ionicons name="ellipsis-vertical" size={24} color={t.colors.icon.default} />
                </Pressable>
              </View>
            ) : null
          }
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? TOPBAR_HEIGHT + insets.top : 0}
          style={{ flex: 1 }}
        >
          <DetailContent
            t={t}
            post={displayPost || post}
            comments={comments}
            currentUserId={currentUserId}
            scrollViewRef={scrollViewRef}
            bottomPadding={contentBottomPadding}
            onPressHostProfile={() => setProfileVisible(true)}
            onReply={(c: Comment) => {
              setReplyTarget(c);
              inputRef.current?.focus();
            }}
            onEditComment={(c: Comment) => {
              setEditingComment(c);
              setCommentText(c.content);
              inputRef.current?.focus();
            }}
            onDeleteComment={(id: string) => {
              setComments((prev: Comment[]) =>
                prev.filter((c: Comment) => String(c.id) !== String(id))
              );
            }}
            onContentHeightChange={() => {
              // DetailContent 내부 API 유지
            }}
            onScrollViewHeightChange={() => {
              // DetailContent 내부 API 유지
            }}
            onScroll={handleScroll}
            commentText={commentText}
            setCommentText={setCommentText}
            inputRef={inputRef}
            replyTarget={replyTarget}
            editingComment={editingComment}
            onCancelInputMode={handleCancelInputMode}
            onSubmitComment={handleSubmitComment}
            onFocusComposer={() => {
              stickToBottomRef.current = true;
              setTimeout(() => {
                const node = findNodeHandle(inputRef.current);
                const responder = (scrollViewRef.current as any)?.getScrollResponder?.();
                if (node && responder?.scrollResponderScrollNativeHandleToKeyboard) {
                  responder.scrollResponderScrollNativeHandleToKeyboard(
                    node,
                    Platform.OS === "android" ? 20 : 12,
                    true
                  );
                } else {
                  scrollToBottomSoon(true);
                }
              }, 40);
            }}
          />

          <BottomBar
            t={t}
            membership={membership}
            pendingCount={pendingCount}
            canJoin={!!canJoin}
            joinDisabledReason={post.myState?.reason}
            insetsBottom={insets.bottom}
            isKeyboardVisible={isKeyboardVisible}
            onJoin={handleJoin}
            onCancelJoin={handleCancelJoin}
            onEnterChat={handleEnterChat}
            onManage={() => router.push(`/meetings/manage/${post.id}` as any)}
            onLayoutHeight={setBottomBarHeight}
          />
        </KeyboardAvoidingView>
      </AppLayout>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E5E5",
    alignSelf: "center",
    marginVertical: 10,
  },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 16, gap: 12 },
  menuDivider: { height: 1, width: "100%" },
});
