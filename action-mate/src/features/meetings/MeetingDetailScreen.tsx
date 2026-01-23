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
  StyleSheet,
  Text,
  View,
  TextInput,
  findNodeHandle,
  ScrollView,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { useAuthStore } from "@/features/auth/model/authStore";
import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingPost, Comment, Participant } from "@/features/meetings/model/types";

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

function sortByCreatedAtAsc(a: Comment, b: Comment) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/**
 * ✅ 무한 depth 댓글 트리 정렬 (부모 → 자식 → 손자 …)
 * - 루트부터 createdAt 오름차순
 * - 각 children도 오름차순
 * - DFS(preorder)로 펼쳐서 "항상 답글이 바로 아래로"
 */
function buildThreadedCommentsDeep(list: Comment[]) {
  const byId = new Map<string, Comment>();
  const childrenMap = new Map<string, Comment[]>();
  const roots: Comment[] = [];

  for (const c of list) byId.set(String(c.id), c);

  for (const c of list) {
    const pid = (c as any)?.parentId ? String((c as any).parentId) : "";
    if (!pid) {
      roots.push(c);
      continue;
    }
    const arr = childrenMap.get(pid) ?? [];
    arr.push(c);
    childrenMap.set(pid, arr);
  }

  roots.sort(sortByCreatedAtAsc);
  for (const [, arr] of childrenMap) arr.sort(sortByCreatedAtAsc);

  const out: Comment[] = [];
  const visit = (node: Comment) => {
    out.push(node);
    const kids = childrenMap.get(String(node.id));
    if (kids && kids.length) {
      for (const child of kids) visit(child);
    }
  };

  for (const r of roots) visit(r);
  return { threaded: out, byId };
}

export default function MeetingDetailScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const meetingId = Array.isArray(params.id) ? params.id[0] : params.id;

  const me = useAuthStore((s) => s.user);
  const currentUserId = me?.id ? String(me.id) : "guest";

  const [post, setPost] = useState<MeetingPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileVisible, setProfileVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ✅ raw 저장 → 화면용은 threaded로 계산
  const [commentsRaw, setCommentsRaw] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  const inputRef = useRef<TextInput | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  // ✅ 댓글 y 위치 저장 (ScrollView content 기준)
  const commentYRef = useRef<Record<string, number>>({});

  // --- Keyboard Logic ---
  const { isKeyboardVisible } = useKeyboardAwareScroll(() => {});

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

  // ✅ 트리 정렬 + byId(부모 닉네임 표시용)
  const { threaded: comments, byId: commentById } = useMemo(
    () => buildThreadedCommentsDeep(commentsRaw),
    [commentsRaw]
  );

  const scrollComposerToKeyboard = () => {
    const node = findNodeHandle(inputRef.current);
    const responder = (scrollViewRef.current as any)?.getScrollResponder?.();
    if (node && responder?.scrollResponderScrollNativeHandleToKeyboard) {
      responder.scrollResponderScrollNativeHandleToKeyboard(
        node,
        Platform.OS === "android" ? 20 : 12,
        true
      );
    }
  };

  /**
   * ✅ y가 잡히면 그때 이동 (레이아웃 지연 때문에 재시도)
   * - y가 없으면 "현재 위치 유지" → 맨 위로 튐 방지
   */
  const scrollToCommentIfPossible = (id: string, animated = true) => {
    const key = String(id);
    let tries = 0;

    const tick = () => {
      tries += 1;
      const y = commentYRef.current[key];
      if (Number.isFinite(y)) {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, (y as number) - 12), animated });
        return;
      }
      if (tries < 10) {
        setTimeout(tick, 60);
      }
    };

    requestAnimationFrame(() => setTimeout(tick, 30));
  };

  // --- Data Loading ---
  const loadInitialData = useCallback(async () => {
    if (!meetingId) return;
    try {
      const m = await meetingApi.getMeeting(meetingId as string);
      setPost(m);

      // ✅ 지금은 mock
      setCommentsRaw(MOCK_COMMENTS);

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

  // --- Handlers ---
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

  /**
   * ✅ 댓글/답글/답글의답글 제출
   * - replyTarget이 어떤 depth든 parentId = replyTarget.id
   * - buildThreadedCommentsDeep가 "그 답글 바로 아래"로 붙여줌
   * - submit 후: 맨 위로 튐 방지 + 새 댓글 y 잡히면 그쪽으로만 이동
   */
  const handleSubmitComment = () => {
    const text = commentText.trim();
    if (!text) return;

    // 수정
    if (editingComment) {
      const editedId = String(editingComment.id);
      setCommentsRaw((prev) =>
        prev.map((c) => (String(c.id) === editedId ? { ...c, content: text } : c))
      );

      setEditingComment(null);
      setCommentText("");
      setReplyTarget(null);
      Keyboard.dismiss();
      return;
    }

    const newId = `new_${Date.now()}`;
    const parentId = replyTarget?.id ? String(replyTarget.id) : undefined;

    const newComment: Comment = {
      id: newId,
      content: text,
      createdAt: new Date().toISOString(),
      ...(parentId ? { parentId } : {}),
      author: {
        id: currentUserId,
        nickname: me?.nickname || "나",
        avatarUrl: me?.avatarUrl,
      } as any,
    };

    setCommentsRaw((prev) => [...prev, newComment]);

    setCommentText("");
    setReplyTarget(null);

    // ✅ 키보드 내려도 위치가 튀지 않도록 "강제 scroll" 금지
    // 대신: 새 댓글 위치 y가 잡히면 그때만 이동
    scrollToCommentIfPossible(newId, true);
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
          <View
            style={[
              styles.modalContent,
              {
                paddingBottom: Math.max(20, insets.bottom),
                backgroundColor: t.colors.surface,
              },
            ]}
          >
            <View
              style={[
                styles.dragHandle,
                { backgroundColor: t.colors.neutral?.[200] ?? t.colors.border },
              ]}
            />
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
          keyboardVerticalOffset={Platform.OS === "ios" ? TOPBAR_HEIGHT + insets.top : 0}
          style={{ flex: 1 }}
        >
          <DetailContent
            t={t}
            post={displayPost || post}
            comments={comments}             
            commentById={commentById}        
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
            onDeleteComment={(id) =>
              setCommentsRaw((prev) => prev.filter((c) => String(c.id) !== String(id)))
            }
            commentText={commentText}
            setCommentText={setCommentText}
            inputRef={inputRef}
            replyTarget={replyTarget}
            editingComment={editingComment}
            onCancelInputMode={handleCancelInputMode}
            onSubmitComment={handleSubmitComment}
            onFocusComposer={() => setTimeout(scrollComposerToKeyboard, 40)}
            onCommentLayout={(id, y) => {
              commentYRef.current[String(id)] = y;
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
    alignSelf: "center",
    marginVertical: 10,
  },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 16, gap: 12 },
  menuDivider: { height: 1, width: "100%" },
});
