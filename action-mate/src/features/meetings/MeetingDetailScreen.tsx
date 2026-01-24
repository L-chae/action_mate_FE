// src/features/meetings/MeetingDetailScreen.tsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  findNodeHandle,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

// ✅ Store & API
import { useAuthStore } from "@/features/auth/model/authStore";
import { meetingApi } from "@/features/meetings/api/meetingApi";
import { findDMThreadByMeetingId } from "@/features/dm/api/dmApi"; // ✅ [추가] 채팅방 조회 API
import type { MeetingPost, Comment, Participant } from "@/features/meetings/model/types";

// ✅ UI & Hooks
import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import NotiButton from "@/shared/ui/NotiButton";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useKeyboardAwareScroll } from "./hooks/useKeyboardAwareScroll";
import { ProfileModal } from "@/features/meetings/ui/ProfileModal";
import { DetailContent } from "./ui/DetailContent";
import { BottomBar } from "./ui/BottomBar";

// Mock Data
const MOCK_COMMENTS: Comment[] = [
  {
    id: "c1",
    content: "라켓 없는데 참여 가능할까요?",
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    author: { id: "u9", nickname: "초보배드민턴", avatarUrl: undefined } as any,
  },
  {
    id: "c2",
    content: "네! 여분 라켓 있어요. 편하게 오세요 🙂",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    parentId: "c1",
    author: { id: "u1", nickname: "민수", avatarUrl: undefined } as any,
  },
];

const TOPBAR_HEIGHT = 56;

export default function MeetingDetailScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const meetingId = Array.isArray(params.id) ? params.id[0] : params.id;

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
  const contentHeightRef = useRef(0);
  const scrollViewHeightRef = useRef(0);
  const stickToBottomRef = useRef(true);
  
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

  const isAuthor = post?.host?.id === currentUserId || post?.host?.id === "me";
  const membership = post?.myState?.membershipStatus ?? "NONE";
  const canJoin = post?.myState?.canJoin ?? post?.status === "OPEN";
  const pendingCount = participants.filter((p) => p.status === "PENDING").length;

  const contentBottomPadding =
    (isKeyboardVisible ? 0 : bottomBarHeight) +
    20 +
    (Platform.OS === "android" && isKeyboardVisible ? keyboardHeight : 0);

  const keyboardVerticalOffset = Platform.OS === "ios" ? TOPBAR_HEIGHT + insets.top : 0;

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

  const scrollToBottomSoon = (animated = true) => {
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated });
      }
    }, 100);
  };

  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height) - contentBottomPadding;
    stickToBottomRef.current = distanceFromBottom < 24;
  };

  const scrollComposerToKeyboard = () => {
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
  };

  const loadInitialData = useCallback(async () => {
    if (!meetingId) return;
    try {
      const m = await meetingApi.getMeeting(meetingId as string);
      setPost(m);
      setComments(MOCK_COMMENTS);

      if (m.myState?.membershipStatus === "HOST" || m.host?.id === currentUserId) {
        const parts = await meetingApi.getParticipants(String(m.id) as any);
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
      loadInitialData();
    }, [loadInitialData])
  );

  const handleCancelInputMode = () => {
    setReplyTarget(null);
    setEditingComment(null);
    setCommentText("");
    Keyboard.dismiss();
  };

  const handleJoin = async () => {
    if (!post) return;
    try {
      const r = await meetingApi.joinMeeting(String(post.id) as any);
      setPost(r.post);
      if (r.post.myState?.membershipStatus === "PENDING") {
        Alert.alert("신청 완료", "호스트 승인 후 참여가 확정됩니다.");
      }
    } catch {
      Alert.alert("오류", "참여 신청에 실패했습니다.");
    }
  };

  const handleCancelJoin = () => {
    if (!post) return;
    Alert.alert(membership === "PENDING" ? "요청 취소" : "모임 나가기", "정말 처리하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "확인",
        style: "destructive",
        onPress: async () => {
          try {
            const r = await meetingApi.cancelJoin(String(post.id) as any);
            setPost(r.post);
          } catch {
            Alert.alert("오류", "요청 처리에 실패했습니다.");
          }
        },
      },
    ]);
  };

  // ✅ [추가] 대화방 입장 로직
  const handleEnterChat = useCallback(async () => {
    if (!post) return;

    // 1. 호스트 본인은 채팅 목록으로 (1:N 채팅이므로 특정 방 지정 불가)
    if (post.myState?.membershipStatus === "HOST") {
      router.push("/(tabs)/dm");
      return;
    }

    try {
      // 2. 멤버: 이미 있는 방이 있는지 확인
      const existingThread = await findDMThreadByMeetingId(post.id);

      if (existingThread) {
        // [CASE A] 기존 방 이동
        router.push({
          pathname: "/dm/[threadId]",
          params: {
            threadId: existingThread.id,
            nickname: existingThread.otherUser.nickname,
            meetingTitle: post.title,
          },
        } as any);
      } else {
        // [CASE B] 새 방 생성 (임시 ID로 진입)
        // DMThreadScreen에서 메시지 전송 시 실제 방이 생성됨
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

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;

    if (editingComment) {
      setComments((prev) =>
        prev.map((c) => (c.id === editingComment.id ? { ...c, content: commentText } : c))
      );
      setEditingComment(null);
    } else {
      const newComment: Comment = {
        id: `new_${Date.now()}`,
        content: replyTarget ? `@${replyTarget.author.nickname} ${commentText}` : commentText,
        createdAt: new Date().toISOString(),
        parentId: replyTarget?.id,
        author: {
          id: currentUserId,
          nickname: me?.nickname || "나",
          avatarUrl: me?.avatarUrl,
        } as any,
      };

      setComments((prev) => [...prev, newComment]);
    }

    setCommentText("");
    setReplyTarget(null);
    Keyboard.dismiss();
    scrollToBottomSoon(true);
  };

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

      {/* 프로필 모달 */}
      {displayHost && (
        <ProfileModal
          visible={profileVisible}
          user={displayHost}
          onClose={() => setProfileVisible(false)}
        />
      )}

      {/* 메뉴 모달 */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View
            style={[
              styles.modalContent,
              {
                paddingBottom: Math.max(20, insets.bottom),
                backgroundColor: t.colors.surface,
              },
            ]}
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
                        await meetingApi.cancelMeeting(String(post.id) as any);
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
          </View>
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
          keyboardVerticalOffset={keyboardVerticalOffset}
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
            onReply={(c) => {
              setReplyTarget(c);
              inputRef.current?.focus();
            }}
            onEditComment={(c) => {
              setEditingComment(c);
              setCommentText(c.content);
              inputRef.current?.focus();
            }}
            onDeleteComment={(id) => setComments((prev) => prev.filter((c) => c.id !== id))}
            onContentHeightChange={(h) => (contentHeightRef.current = h)}
            onScrollViewHeightChange={(h) => (scrollViewHeightRef.current = h)}
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
              setTimeout(scrollComposerToKeyboard, 40);
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
            // ✅ [연결] 채팅 입장 함수 연결
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