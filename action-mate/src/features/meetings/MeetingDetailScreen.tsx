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
  const baseText =
    t?.colors?.textMain ?? t?.colors?.icon?.default ?? t?.colors?.primary ?? "#000000";
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
    const showSub = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ✅ 거리 표시가 늦게 나오는 문제 개선:
  // 1) lastKnown 위치로 즉시 1차 계산(빠름)
  // 2) current 위치로 2차 보정(정확)
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

      // ✅ 빠른 1차: 마지막으로 알고 있는 위치(대부분 즉시 반환)
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

      // ✅ 정확한 2차: 현재 위치(느릴 수 있으나 도착하면 덮어씀)
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

  // ✅ DetailContent가 어디서든 안정적으로 쓸 수 있도록:
  // - post.distanceText + location.distanceText 모두 채움
  // - 주소 라인 결합은 DetailContent에서도 처리하지만, 여기서도 보강
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
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height) - contentBottomPadding;
      stickToBottomRef.current = distanceFromBottom < 24;
    },
    [contentBottomPadding]
  );

  const loadInitialData = useCallback(async () => {
    if (!meetingId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const m = await meetingApi.getMeeting(meetingId);
      setPost(m);

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
          String((c as any).id) === String((editingComment as any).id) ? { ...c, content: commentText } : c
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
        parentId: (replyTarget as any)?.id,
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
        <View style={s.center}>
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
        <Pressable style={s.modalOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable
            style={[
              s.modalContent,
              { paddingBottom: Math.max(20, insets.bottom), backgroundColor: t.colors.surface },
            ]}
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
            onDeleteComment={(id: string) => {
              setComments((prev: Comment[]) => prev.filter((c: Comment) => String((c as any).id) !== String(id)));
            }}
            onContentHeightChange={() => {}}
            onScrollViewHeightChange={() => {}}
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
요약:
1) lastKnown 위치로 먼저 거리 계산해 “즉시 표시”하고, current 위치로 뒤에서 “정확 보정”합니다.
2) post.distanceText + post.location.distanceText를 함께 채워 DetailContent 어디서든 거리 표기가 안정적입니다.
3) 권한/좌표 실패 시 빈 값 처리 + 언마운트 setState 방지로 크래시/잔상 노출을 막습니다.
*/
