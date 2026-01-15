import React, { useEffect, useRef, useState } from "react";
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

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import { cancelJoin, cancelMeeting, getMeeting, joinMeeting } from "@/features/meetings/meetingService";
import type { MeetingPost, Comment } from "@/features/meetings/types";
import { ProfileDetailModal } from "@/features/meetings/components/ProfileDetailModal";

import { MeetingDetailContent } from "./components/MeetingDetailContent";
import { MeetingBottomBar } from "./components/MeetingBottomBar";
import { useKeyboardAwareScroll } from "./hooks/useKeyboardAwareScroll";

// 목업 댓글
const MOCK_COMMENTS: Comment[] = [
  {
    id: "c1",
    postId: "1",
    authorId: "u9",
    authorNickname: "초보배드민턴",
    content: "라켓 없는데 참여 가능할까요?",
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  {
    id: "c2",
    postId: "1",
    authorId: "u1",
    authorNickname: "민수",
    content: "네! 여분 라켓 있어요. 편하게 오세요 🙂",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

const CURRENT_USER_ID = "me";
const EXTRA_BOTTOM_PADDING = 20;

export default function MeetingDetailScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const meetingId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [post, setPost] = useState<MeetingPost | null>(null);
  const [loading, setLoading] = useState(true);

  const [profileVisible, setProfileVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // 참여바 높이(키보드 보일 때는 0 처리)
  const [bottomBarHeight, setBottomBarHeight] = useState(0);

  // ✅ Android에서 입력창 보이게 “추가 여백”을 만들기 위한 키보드 높이
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // 댓글 상태
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  // refs
  const inputRef = useRef<TextInput | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  // ✅ 스크롤 메트릭
  const contentHeightRef = useRef(0);
  const scrollViewHeightRef = useRef(0);

  // ✅ 내가 “바닥을 보고 있는 상태”면 true
  const stickToBottomRef = useRef(true);

  // 키보드 올라오면 바닥 붙이기 + 보정
  const { isKeyboardVisible } = useKeyboardAwareScroll(() => {
    stickToBottomRef.current = true;
    scrollToBottomSoon(true);
  });

  // ✅ Android: 키보드 높이 추적 (입력창 누를 때 아래 여백 생성)
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ✅ 키보드 보이면 참여바 높이는 0으로 강제(이전 값이 남는 문제 해결)
  useEffect(() => {
    if (isKeyboardVisible) setBottomBarHeight(0);
  }, [isKeyboardVisible]);

  const effectiveBottomBarHeight = isKeyboardVisible ? 0 : bottomBarHeight;

  // ✅ Android에서 키보드가 보일 때만 추가 paddingBottom 부여
  const extraKeyboardPadding =
    Platform.OS === "android" && isKeyboardVisible ? keyboardHeight : 0;

  const contentBottomPadding =
    effectiveBottomBarHeight + EXTRA_BOTTOM_PADDING + extraKeyboardPadding;

  // ✅ paddingBottom 제외한 “진짜 콘텐츠 바닥”으로 이동
  const scrollToBottomWithoutGap = (animated = true) => {
    const contentH = contentHeightRef.current;
    const viewH = scrollViewHeightRef.current;

    const paddingBottom = contentBottomPadding;
    const y = Math.max(0, contentH - viewH - paddingBottom);

    scrollViewRef.current?.scrollTo({ y, animated });
  };

  const scrollToBottomSoon = (animated = true) =>
    setTimeout(() => scrollToBottomWithoutGap(animated), 60);

  // ✅ 스크롤 이벤트로 “바닥 근처인지” 추적
  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;

    const paddingBottom = contentBottomPadding;
    const threshold = 24;

    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height) - paddingBottom;

    stickToBottomRef.current = distanceFromBottom < threshold;
  };

  // ✅ 하단바 높이/키보드 상태/키보드높이가 바뀔 때 바닥 고정
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    requestAnimationFrame(() => scrollToBottomWithoutGap(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentBottomPadding, isKeyboardVisible]);

  // ✅ 입력창을 “키보드 위로 정확히” 올려주는 함수 (RN 내장)
  const scrollComposerToKeyboard = () => {
    const node = findNodeHandle(inputRef.current);
    const responder = (scrollViewRef.current as any)?.getScrollResponder?.();
    if (node && responder?.scrollResponderScrollNativeHandleToKeyboard) {
      // ✅ Android에서 더 여유 있게 (12 -> 28)
      const extraOffset = Platform.OS === "android" ? 28 : 12;
      responder.scrollResponderScrollNativeHandleToKeyboard(node, extraOffset, true);
      return;
    }
    scrollToBottomSoon(true);
  };

  // 데이터 로드
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!meetingId) return;
      try {
        const m = await getMeeting(meetingId);
        if (!alive) return;
        setPost(m);
        setComments(MOCK_COMMENTS.filter((c) => c.postId === String(m.id)));
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [meetingId]);

  const isAuthor = post?.host?.id === CURRENT_USER_ID;
  const membership = post?.myState?.membershipStatus ?? "NONE";
  const canJoin = post?.myState?.canJoin ?? post?.status === "OPEN";

  const TOPBAR_HEIGHT = 56;
  const keyboardVerticalOffset = Platform.OS === "ios" ? TOPBAR_HEIGHT + insets.top : TOPBAR_HEIGHT;

  // ✅ 참여 요청 핸들러 (수정됨)
  const handleJoin = async () => {
    if (!post) return;
    
    try {
      const r = await joinMeeting(post.id);
      const newPost = r.post;
      setPost(newPost);

      // ✅ 변경된 나의 멤버십 상태 확인 후 알림
      const newStatus = newPost.myState?.membershipStatus;

      // 1. 승인제: '승인 대기(PENDING)'
      if (newStatus === "PENDING") {
        Alert.alert(
          "참여 요청 전송됨",
          "호스트에게 참여 요청을 보냈습니다.\n승인이 완료되면 알려드릴게요! 👋",
          [{ text: "확인" }]
        );
      } 
      // 2. 선착순/즉시 참여: '멤버(MEMBER)'
      else if (newStatus === "MEMBER") {
        Alert.alert(
          "환영합니다!", 
          "모임 참여가 완료되었습니다.", 
          [{ text: "확인" }]
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "참여 요청을 처리하는 중 문제가 발생했습니다.");
    }
  };

  // ✅ 참여 취소 / 나가기 핸들러 (신규 추가)
  // 승인 대기 중이면 요청 취소, 멤버라면 나가기 처리
  const handleCancelJoin = () => {
    if (!post) return;

    const isPending = membership === "PENDING";
    const title = isPending ? "요청 취소" : "모임 나가기";
    const message = isPending 
      ? "참여 요청을 취소하시겠습니까?" 
      : "정말로 모임에서 나가시겠습니까?";

    Alert.alert(title, message, [
      { text: "아니요", style: "cancel" },
      {
        text: "네",
        style: "destructive",
        onPress: async () => {
          try {
            const r = await cancelJoin(post.id);
            setPost(r.post);
            
            if (isPending) {
              Alert.alert("알림", "참여 요청이 취소되었습니다.");
            }
          } catch (e) {
            console.error(e);
            Alert.alert("오류", "요청을 처리하지 못했습니다.");
          }
        },
      },
    ]);
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;

    stickToBottomRef.current = true;

    if (editingComment) {
      setComments((prev) =>
        prev.map((c) => (c.id === editingComment.id ? { ...c, content: commentText } : c))
      );
      setEditingComment(null);
    } else {
      const newComment: Comment = {
        id: `new_${Date.now()}`,
        postId: String(post?.id),
        authorId: CURRENT_USER_ID,
        authorNickname: "나",
        content: replyTarget ? `@${replyTarget.authorNickname} ${commentText}` : commentText,
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => [...prev, newComment]);
    }

    setCommentText("");
    setReplyTarget(null);

    Keyboard.dismiss();
    scrollToBottomSoon(true);
    setTimeout(() => scrollToBottomWithoutGap(false), 220);
  };

  const handleReply = (target: Comment) => {
    stickToBottomRef.current = true;
    setReplyTarget(target);
    setEditingComment(null);
    setCommentText("");

    scrollToBottomSoon(true);
    setTimeout(() => inputRef.current?.focus(), 120);
  };

  const handleEditComment = (target: Comment) => {
    stickToBottomRef.current = true;
    setEditingComment(target);
    setReplyTarget(null);
    setCommentText(target.content);

    scrollToBottomSoon(true);
    setTimeout(() => inputRef.current?.focus(), 120);
  };

  const handleDeleteComment = (targetId: string) => {
    Alert.alert("댓글 삭제", "삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          stickToBottomRef.current = true;
          setComments((prev) => prev.filter((c) => c.id !== targetId));
          scrollToBottomSoon(true);
          setTimeout(() => scrollToBottomWithoutGap(false), 220);
        },
      },
    ]);
  };

  const handleCancelInputMode = () => {
    setReplyTarget(null);
    setEditingComment(null);
    setCommentText("");
    Keyboard.dismiss();
  };

  const handleDeletePost = async () => {
    setMenuVisible(false);
    if (!post) return;
    try {
      await cancelMeeting(post.id);
      router.back();
    } catch {
      Alert.alert("오류", "삭제 실패");
    }
  };

  // ✅ Android는 KAV가 “공백 잔상” 남기는 경우가 많아서 iOS만 사용
  const Container = Platform.OS === "ios" ? KeyboardAvoidingView : View;

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

      {post.host && (
        <ProfileDetailModal visible={profileVisible} user={post.host} onClose={() => setProfileVisible(false)} />
      )}

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: Math.max(20, insets.bottom), backgroundColor: t.colors.surface },
            ]}
          >
            <View style={styles.dragHandle} />
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: t.colors.neutral[100] }]}
              onPress={() => {
                setMenuVisible(false);
                router.push({ pathname: "/meetings/edit/[id]", params: { id: post.id } });
              }}
            >
              <Ionicons name="pencil-outline" size={20} color={t.colors.textMain} />
              <Text style={[t.typography.bodyLarge, { color: t.colors.textMain }]}>게시글 수정</Text>
            </Pressable>
            <View style={[styles.menuDivider, { backgroundColor: t.colors.neutral[100] }]} />
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: t.colors.neutral[100] }]}
              onPress={handleDeletePost}
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
          renderRight={() =>
            isAuthor ? (
              <Pressable onPress={() => setMenuVisible(true)} hitSlop={12} style={{ padding: 4 }}>
                <Ionicons name="ellipsis-vertical" size={24} color={t.colors.textMain} />
              </Pressable>
            ) : null
          }
        />

        <Container
          style={{ flex: 1 }}
          {...(Platform.OS === "ios"
            ? {
                behavior: "padding" as const,
                keyboardVerticalOffset,
              }
            : {})}
        >
          <MeetingDetailContent
            t={t}
            post={post}
            comments={comments}
            currentUserId={CURRENT_USER_ID}
            scrollViewRef={scrollViewRef}
            bottomPadding={contentBottomPadding}
            onPressHostProfile={() => setProfileVisible(true)}
            onReply={handleReply}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            onContentHeightChange={(h) => (contentHeightRef.current = h)}
            onScrollViewHeightChange={(h) => (scrollViewHeightRef.current = h)}
            onScroll={handleScroll}
            // 댓글 입력(댓글 섹션 내부)
            commentText={commentText}
            setCommentText={setCommentText}
            inputRef={inputRef}
            replyTarget={replyTarget}
            editingComment={editingComment}
            onCancelInputMode={handleCancelInputMode}
            onSubmitComment={handleSubmitComment}
            onFocusComposer={() => {
              stickToBottomRef.current = true;
              setTimeout(() => scrollComposerToKeyboard(), 40);
            }}
          />

          <MeetingBottomBar
            t={t}
            insetsBottom={insets.bottom}
            isKeyboardVisible={isKeyboardVisible}
            membership={membership}
            canJoin={!!canJoin}
            joinDisabledReason={post.myState?.reason}
            onJoin={handleJoin}
            // ✅ 수정된 취소 핸들러 연결
            onCancelJoin={handleCancelJoin}
            onEnterChat={() => router.push(`/dm/${post.id}` as any)}
            onLayoutHeight={(h) => setBottomBarHeight(h)}
          />
        </Container>
      </AppLayout>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 10 },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E5E5",
    alignSelf: "center",
    marginVertical: 10,
  },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 },
  menuDivider: { height: 1, width: "100%" },
});