// MeetingDetailScreen.tsx (최종본)
import React, { useEffect, useRef, useState, useCallback } from "react";
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

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useKeyboardAwareScroll } from "./hooks/useKeyboardAwareScroll";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingPost, Comment, Participant } from "@/features/meetings/model/types";

import { ProfileModal } from "@/features/meetings/ui/ProfileModal";
import { DetailContent } from "./ui/DetailContent";
import { BottomBar } from "./ui/BottomBar";
import NotiButton from "@/shared/ui/NotiButton";

import MannerEvaluationModal from "@/features/meetings/ui/MannerEvaluationModal";

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
const TOPBAR_HEIGHT = 56;

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

  const [participants, setParticipants] = useState<Participant[]>([]);

  // ✅ Manner Evaluation
  const [evalVisible, setEvalVisible] = useState(false);
  const [evalParticipants, setEvalParticipants] = useState<Participant[]>([]);

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

  const { isKeyboardVisible } = useKeyboardAwareScroll(() => {
    stickToBottomRef.current = true;
    scrollToBottomSoon(true);
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

  const membership = post?.myState?.membershipStatus ?? "NONE";
  const isAuthor = post?.host?.id === CURRENT_USER_ID;
  const canJoin = post?.myState?.canJoin ?? post?.status === "OPEN";

  const pendingCount = participants.filter((p) => p.status === "PENDING").length;

  const effectiveBottomBarHeight = isKeyboardVisible ? 0 : bottomBarHeight;
  const contentBottomPadding =
    effectiveBottomBarHeight +
    20 +
    (Platform.OS === "android" && isKeyboardVisible ? keyboardHeight : 0);

  const keyboardVerticalOffset =
    Platform.OS === "ios" ? TOPBAR_HEIGHT + insets.top : TOPBAR_HEIGHT;

  const scrollToBottomWithoutGap = (animated = true) => {
    const y = Math.max(
      0,
      contentHeightRef.current - scrollViewHeightRef.current - contentBottomPadding
    );
    scrollViewRef.current?.scrollTo({ y, animated });
  };
  const scrollToBottomSoon = (animated = true) =>
    setTimeout(() => scrollToBottomWithoutGap(animated), 60);

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
        Platform.OS === "android" ? 28 : 12,
        true
      );
    } else {
      scrollToBottomSoon(true);
    }
  };

  const loadInitialData = useCallback(async () => {
    if (!meetingId) return;
    try {
      const m = await meetingApi.getMeeting(meetingId);
      setPost(m);
      setComments(MOCK_COMMENTS.filter((c) => c.postId === String(m.id)));

      if (m.myState?.membershipStatus === "HOST" || m.host?.id === CURRENT_USER_ID) {
        const parts = await meetingApi.getParticipants(m.id);
        setParticipants(parts);
      } else {
        setParticipants([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [loadInitialData])
  );

  // ✅ 모임 종료 후 평가 모달 트리거
  useEffect(() => {
    if (!post) return;

    const isEnded = post.status === "ENDED";
    const isJoined = membership === "MEMBER" || membership === "HOST";
    const hasEvaluated = Boolean((post as any).hasEvaluated);

    if (!isEnded || !isJoined || hasEvaluated || evalVisible) return;

    (async () => {
      try {
        const parts = await meetingApi.getParticipants(post.id);

        const filtered = parts
          .filter((p) => p.userId !== CURRENT_USER_ID) // ✅ 나는 제외
          .filter((p) => p.status !== "REJECTED");

        setEvalParticipants(filtered);
        setEvalVisible(true);
      } catch (e) {
        console.log("getParticipants for evaluation failed:", e);
      }
    })();
  }, [post, membership, evalVisible]);

  const handleCancelInputMode = () => {
    setReplyTarget(null);
    setEditingComment(null);
    setCommentText("");
    Keyboard.dismiss();
  };

  const handleJoin = async () => {
    if (!post) return;
    try {
      const r = await meetingApi.joinMeeting(post.id);
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
    const isPending = membership === "PENDING";
    Alert.alert(isPending ? "요청 취소" : "모임 나가기", "정말 처리하시겠습니까?", [
      { text: "아니요", style: "cancel" },
      {
        text: "네",
        style: "destructive",
        onPress: async () => {
          try {
            const r = await meetingApi.cancelJoin(post.id);
            setPost(r.post);
          } catch {
            Alert.alert("오류", "요청 처리에 실패했습니다.");
          }
        },
      },
    ]);
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;

    if (editingComment) {
      setComments((prev) => prev.map((c) => (c.id === editingComment.id ? { ...c, content: commentText } : c)));
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

      {post.host && (
        <ProfileModal
          visible={profileVisible}
          user={post.host}
          onClose={() => setProfileVisible(false)}
        />
      )}

      {/* ✅ 종료 모임 평가 모달 */}
      <MannerEvaluationModal
        visible={evalVisible}
        hostId={post.host?.id}   // ✅ 이거 없어서 호스트 표시가 안 뜸
        participants={evalParticipants.map((p) => ({
          id: p.userId,
          nickname: p.nickname,
          photoUrl: p.avatarUrl,
        }))}
        onSubmit={async (evaluations) => {
          await meetingApi.submitMannerEvaluation(post.id, evaluations);
          setPost((prev) => (prev ? ({ ...prev, hasEvaluated: true } as any) : prev));
          setEvalVisible(false);
        }}
        onClose={() => setEvalVisible(false)}
        disableClose={true}
      />

      {/* 관리 메뉴 모달 */}
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
              onPress={async () => {
                setMenuVisible(false);
                try {
                  await meetingApi.cancelMeeting(post.id);
                  router.back();
                } catch {
                  Alert.alert("오류", "삭제 실패");
                }
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
            post={post}
            comments={comments}
            currentUserId={CURRENT_USER_ID}
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
            onEnterChat={() => router.push(`/dm/${post.id}` as any)}
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
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 16 },
  menuDivider: { height: 1, width: "100%" },
});
