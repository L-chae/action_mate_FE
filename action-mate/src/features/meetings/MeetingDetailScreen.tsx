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

import { useAuthStore } from "@/features/auth/model/authStore";
import { meetingApi } from "@/features/meetings/api/meetingApi";
import { findDMThreadByMeetingId } from "@/features/dm/api/dmApi";
import type { Comment, MeetingPost, Participant } from "@/features/meetings/model/types";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import NotiButton from "@/shared/ui/NotiButton";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useKeyboardAwareScroll } from "./hooks/useKeyboardAwareScroll";
import { ProfileModal } from "@/features/meetings/ui/ProfileModal";
import { DetailContent } from "./ui/DetailContent";
import { BottomBar } from "./ui/BottomBar";

import * as Location from "expo-location";
import { calculateDistance } from "@/shared/utils/distance";

const TOPBAR_HEIGHT = 56;

type AppTheme = ReturnType<typeof useAppTheme>;

function hexToRgba(hex: string, alpha: number) {
  const a = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  const clean = String(hex || "").replace("#", "").trim();

  const parse = (h: string) => {
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return { r, g, b };
    }
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return { r, g, b };
    }
    return null;
  };

  const rgb = parse(clean);
  if (!rgb || [rgb.r, rgb.g, rgb.b].some((n) => !Number.isFinite(n))) {
    return `rgba(0,0,0,${a})`;
  }
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

const makeStyles = (t: AppTheme) => {
  const baseText = t?.colors?.textMain ?? t?.colors?.icon?.default ?? t?.colors?.primary ?? "#000000";
  const overlay = hexToRgba(baseText, 0.5);
  const handle =
    t?.colors?.neutral?.[200] ??
    t?.colors?.neutral?.[100] ??
    t?.colors?.icon?.default ??
    t?.colors?.textMain;

  return StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    modalOverlay: {
      flex: 1,
      backgroundColor: overlay,
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
      backgroundColor: handle,
      alignSelf: "center",
      marginVertical: 10,
    },
    menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 16, gap: 12 },
    menuDivider: { height: 1, width: "100%" },
  });
};

async function ensureForegroundPermission() {
  try {
    const permNow = await Location.getForegroundPermissionsAsync();
    const grantedNow = !!(permNow as any)?.granted || (permNow as any)?.status === "granted";
    if (grantedNow) return true;

    const perm = await Location.requestForegroundPermissionsAsync();
    return !!(perm as any)?.granted || (perm as any)?.status === "granted";
  } catch {
    return false;
  }
}

function pickAccuracy(kind: "quick" | "normal") {
  const A = (Location as any)?.Accuracy;
  if (!A) return undefined;
  if (kind === "quick") return A?.Lowest ?? A?.Low ?? A?.Balanced ?? undefined;
  return A?.Balanced ?? A?.High ?? undefined;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function normalizeCommentsFromMeeting(m: any): Comment[] {
  const raw = m?.comments ?? m?.commentList ?? m?.comment ?? [];
  return Array.isArray(raw) ? (raw as Comment[]) : [];
}

export default function MeetingDetailScreen() {
  const t = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const meetingId: string | undefined = useMemo(() => {
    const raw = (params as any)?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const me = useAuthStore((st) => st.user);
  const currentUserId = me?.id ? String(me.id) : "guest";

  const [post, setPost] = useState<MeetingPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileVisible, setProfileVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [distanceText, setDistanceText] = useState("");

  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  const inputRef = useRef<TextInput | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const stickToBottomRef = useRef(true);

  const scrollToBottomSoon = useCallback((animated = true) => {
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
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const targetLat = Number((post as any)?.location?.latitude ?? (post as any)?.location?.lat);
    const targetLng = Number((post as any)?.location?.longitude ?? (post as any)?.location?.lng);

    if (!Number.isFinite(targetLat) || !Number.isFinite(targetLng)) {
      setDistanceText("");
      return;
    }

    let canceled = false;

    const setDist = (myLat: number, myLng: number) => {
      try {
        const dist = calculateDistance(myLat, myLng, targetLat, targetLng);
        if (!canceled) setDistanceText(String(dist ?? ""));
      } catch {
        if (!canceled) setDistanceText("");
      }
    };

    (async () => {
      const ok = await ensureForegroundPermission();
      if (!ok) {
        if (!canceled) setDistanceText("");
        return;
      }

      try {
        const last = await Location.getLastKnownPositionAsync({
          maxAge: 2 * 60 * 1000,
          requiredAccuracy: 1500,
        } as any);

        const myLat = Number(last?.coords?.latitude);
        const myLng = Number(last?.coords?.longitude);
        if (Number.isFinite(myLat) && Number.isFinite(myLng)) {
          setDist(myLat, myLng);
        }
      } catch {
        // ignore
      }

      try {
        const cur = await Location.getCurrentPositionAsync({
          accuracy: pickAccuracy("normal"),
        } as any);

        const myLat = Number(cur?.coords?.latitude);
        const myLng = Number(cur?.coords?.longitude);
        if (Number.isFinite(myLat) && Number.isFinite(myLng)) {
          setDist(myLat, myLng);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      canceled = true;
    };
  }, [(post as any)?.location?.latitude, (post as any)?.location?.longitude]);

  const isAuthor = useMemo(() => {
    const hostId = post?.host?.id;
    if (!hostId) return false;
    return String(hostId) === String(currentUserId) || String(hostId) === "me";
  }, [post?.host?.id, currentUserId]);

  const membership = post?.myState?.membershipStatus ?? "NONE";
  const canJoin = post?.myState?.canJoin ?? post?.status === "OPEN";

  const pendingCount = useMemo(() => participants.filter((p) => p.status === "PENDING").length, [participants]);

  const contentBottomPadding = useMemo(() => {
    return (isKeyboardVisible ? 0 : bottomBarHeight) + 20 + (Platform.OS === "android" && isKeyboardVisible ? keyboardHeight : 0);
  }, [bottomBarHeight, isKeyboardVisible, keyboardHeight]);

  const displayHost = useMemo(() => {
    if (!post?.host) return null;
    if (isAuthor && me) {
      return { ...post.host, nickname: me.nickname, avatarUrl: (me as any)?.avatarUrl };
    }
    return post.host;
  }, [post?.host, isAuthor, me]);

  const displayPost = useMemo(() => {
    if (!post) return null;
    return { ...post, host: displayHost ?? post.host };
  }, [post, displayHost]);

  const displayPostWithDistance = useMemo(() => {
    const base = displayPost ?? post;
    const dist = String(distanceText ?? "").trim();
    if (!base || !dist) return base;

    const loc = (base as any)?.location;
    const nextLoc: any = loc ? { ...loc, distanceText: dist } : { distanceText: dist };

    return { ...(base as any), distanceText: dist, location: nextLoc } as MeetingPost;
  }, [displayPost, post, distanceText]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height) - contentBottomPadding;
      stickToBottomRef.current = distanceFromBottom < 24;
    },
    [contentBottomPadding]
  );

  const syncFromServer = useCallback(
    async (id: string) => {
      const m = await meetingApi.getMeeting(id);
      setPost(m);
      setComments(normalizeCommentsFromMeeting(m));
      return m;
    },
    []
  );

  const loadInitialData = useCallback(async () => {
    if (!meetingId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // ✅ 생성 직후 조회가 가끔 늦게 반영되는 서버 대비: 짧은 재시도
      const retries = [0, 350, 800];
      let lastErr: unknown = null;

      for (let i = 0; i < retries.length; i += 1) {
        if (retries[i] > 0) await sleep(retries[i]);
        try {
          const m = await syncFromServer(meetingId);
          const hostId = m.host?.id ? String(m.host.id) : "";
          if (m.myState?.membershipStatus === "HOST" || hostId === String(currentUserId)) {
            const parts = await meetingApi.getParticipants(String(m.id));
            setParticipants(parts);
          } else {
            setParticipants([]);
          }
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (lastErr) throw lastErr;
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "모임 정보를 불러오지 못했습니다.");
      setPost(null);
      setComments([]);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  }, [meetingId, currentUserId, syncFromServer]);

  useFocusEffect(
    useCallback(() => {
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

  const handleSubmitComment = useCallback(async () => {
    if (!post) return;
    const text = commentText.trim();
    if (!text) return;

    const postId = String((post as any).id ?? meetingId ?? "");
    if (!postId) return;

    // ✅ 서버 저장이 안 되는 원인: 기존 코드는 setComments만 하고 API 호출이 없음.
    // - 프로젝트에서 댓글 API가 준비돼있다면 meetingApi에 create/update/deleteComment를 구현하고 여기서 호출됨.
    // - 아직 없다면 아래 fallback(로컬 표시)만 동작하며, 재진입/새로고침 시 사라짐.
    const api: any = meetingApi as any;

    try {
      if (editingComment) {
        const updateFn: undefined | ((args: { postId: string; commentId: string; content: string }) => Promise<any>) =
          api?.updateComment;

        if (!updateFn) {
          Alert.alert("알림", "현재 서버에 댓글 수정 API가 없어 저장되지 않습니다.");
          setComments((prev) =>
            prev.map((c) => (String((c as any).id) === String((editingComment as any).id) ? { ...c, content: text } : c))
          );
        } else {
          await updateFn({ postId, commentId: String((editingComment as any).id), content: text });
          await syncFromServer(postId);
        }

        setEditingComment(null);
        setCommentText("");
        setReplyTarget(null);
        Keyboard.dismiss();
        scrollToBottomSoon(true);
        return;
      }

      const parentId = replyTarget ? String((replyTarget as any).id) : undefined;
      const createFn:
        | undefined
        | ((args: { postId: string; content: string; parentId?: string }) => Promise<any>) = api?.createComment;

      if (!createFn) {
        Alert.alert("알림", "현재 서버에 댓글 생성 API가 없어 저장되지 않습니다.");
        const replyNickname = (replyTarget as any)?.author?.nickname ?? (replyTarget as any)?.authorNickname ?? "알 수 없음";
        const localNew: Comment = {
          id: `new_${Date.now()}`,
          content: replyTarget ? `@${replyNickname} ${text}` : text,
          createdAt: new Date().toISOString(),
          parentId,
          author: { id: currentUserId, nickname: me?.nickname || "나", avatarUrl: (me as any)?.avatarUrl } as any,
        };
        setComments((prev) => [...prev, localNew]);
      } else {
        await createFn({ postId, content: text, parentId });
        await syncFromServer(postId);
      }

      setCommentText("");
      setReplyTarget(null);
      Keyboard.dismiss();
      scrollToBottomSoon(true);
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "댓글 저장에 실패했습니다.");
    }
  }, [post, meetingId, commentText, editingComment, replyTarget, currentUserId, me, syncFromServer, scrollToBottomSoon]);

  if (loading) {
    return (
      <AppLayout>
        <View style={s.center}>
          <ActivityIndicator size="large" color={t.colors.primary} />
        </View>
      </AppLayout>
    );
  }

  if (!post) {
    return (
      <AppLayout>
        <View style={s.center}>
          <Text style={[t.typography.bodyLarge, { color: t.colors.textSub }]}>모임을 찾을 수 없습니다.</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {displayHost && <ProfileModal visible={profileVisible} user={displayHost} onClose={() => setProfileVisible(false)} />}

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable
            style={[s.modalContent, { paddingBottom: Math.max(20, insets.bottom), backgroundColor: t.colors.surface }]}
            onPress={() => {}}
          >
            <View style={s.dragHandle} />

            <Pressable
              style={s.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push(`/meetings/edit/${(post as any).id}` as any);
              }}
            >
              <Ionicons name="pencil-outline" size={20} color={t.colors.textMain} />
              <Text style={t.typography.bodyLarge}>게시글 수정</Text>
            </Pressable>

            <View style={[s.menuDivider, { backgroundColor: t.colors.neutral[100] }]} />

            <Pressable
              style={s.menuItem}
              onPress={() => {
                setMenuVisible(false);
                Alert.alert("모임 삭제", "정말로 삭제하시겠습니까?", [
                  { text: "취소", style: "cancel" },
                  {
                    text: "삭제",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await meetingApi.cancelMeeting(String((post as any).id));
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
                      onPress={() => router.push(`/meetings/manage/${(post as any).id}` as any)}
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
            post={displayPostWithDistance || displayPost || post}
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
              setCommentText((c as any)?.content ?? "");
              inputRef.current?.focus();
            }}
            onDeleteComment={async (id: string) => {
              const postId = String((post as any).id ?? meetingId ?? "");
              const api: any = meetingApi as any;
              const delFn: undefined | ((args: { postId: string; commentId: string }) => Promise<any>) = api?.deleteComment;

              try {
                if (!delFn) {
                  Alert.alert("알림", "현재 서버에 댓글 삭제 API가 없어 저장되지 않습니다.");
                  setComments((prev) => prev.filter((c) => String((c as any).id) !== String(id)));
                } else {
                  await delFn({ postId, commentId: String(id) });
                  await syncFromServer(postId);
                }
              } catch {
                Alert.alert("오류", "댓글 삭제에 실패했습니다.");
              }
            }}
            onContentHeightChange={() => {}}
            onScrollViewHeightChange={() => {}}
            onScroll={handleScroll}
            commentText={commentText}
            setCommentText={setCommentText}
            inputRef={inputRef}
            replyTarget={replyTarget}
            editingComment={editingComment}
            onCancelInputMode={() => {
              setReplyTarget(null);
              setEditingComment(null);
              setCommentText("");
              Keyboard.dismiss();
            }}
            onSubmitComment={handleSubmitComment}
            onFocusComposer={() => {
              stickToBottomRef.current = true;
              setTimeout(() => {
                const node = findNodeHandle(inputRef.current);
                const responder = (scrollViewRef.current as any)?.getScrollResponder?.();
                if (node && responder?.scrollResponderScrollNativeHandleToKeyboard) {
                  responder.scrollResponderScrollNativeHandleToKeyboard(node, Platform.OS === "android" ? 20 : 12, true);
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
            joinDisabledReason={(post as any)?.myState?.reason}
            insetsBottom={insets.bottom}
            isKeyboardVisible={isKeyboardVisible}
            onJoin={handleJoin}
            onCancelJoin={handleCancelJoin}
            onEnterChat={handleEnterChat}
            onManage={() => router.push(`/meetings/manage/${(post as any).id}` as any)}
            onLayoutHeight={setBottomBarHeight}
          />
        </KeyboardAvoidingView>
      </AppLayout>
    </>
  );
}

/*
1) 댓글이 서버에 저장되지 않던 원인: 기존 로직은 setComments만 하고 API 호출이 없었음(여기서 create/update/deleteComment 호출 지점 추가).
2) 생성 직후 상세 조회가 실패하는 케이스 대비: getMeeting 짧은 재시도(0/350/800ms)로 안정화.
3) 댓글 API가 아직 없다면 alert로 안내 + 로컬 표시만 되며, 서버 저장은 meetingApi에 댓글 엔드포인트 구현이 필요.
*/