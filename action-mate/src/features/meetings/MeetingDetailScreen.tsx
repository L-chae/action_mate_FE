// FILE: src/features/meetings/MeetingDetailScreen.tsx
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
import { getMeetingCommentsMock } from "@/features/meetings/api/meetingMockData";
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

const COMMENTS_CACHE: Record<string, Comment[]> = {};

function toIsoFromNowMinusMs(msAgo: number): string {
  const ms = Number.isFinite(msAgo) ? msAgo : 0;
  const t = Date.now() - Math.max(0, ms);
  return new Date(t).toISOString();
}

function sortByCreatedAtAsc(list: Comment[]): Comment[] {
  const arr = Array.isArray(list) ? list : [];
  return [...arr].sort((a: any, b: any) => {
    const ta = Date.parse(String(a?.createdAt ?? "")) || 0;
    const tb = Date.parse(String(b?.createdAt ?? "")) || 0;
    return ta - tb;
  });
}

function dedupeAndFixParents(list: Comment[]): Comment[] {
  const input = Array.isArray(list) ? list : [];
  const seen = new Set<string>();
  const deduped: Comment[] = [];

  for (const c of input) {
    const id = String((c as any)?.id ?? "").trim();
    if (!id) continue;

    if (seen.has(id)) {
      // ✅ 중복 key 방지: 동일 id는 1개만 유지(서비스 데이터 가정)
      continue;
    }
    seen.add(id);
    deduped.push(c);
  }

  const idSet = new Set(deduped.map((c) => String((c as any)?.id ?? "").trim()).filter(Boolean));

  return deduped.map((c: any) => {
    const pidRaw = c?.parentId;
    if (pidRaw == null) return c as Comment;

    const pid = String(pidRaw).trim();
    if (!pid || !idSet.has(pid)) {
      // ✅ 부모가 없으면 답글 관계 끊기(렌더 안정성)
      return { ...(c ?? {}), parentId: undefined } as Comment;
    }
    return c as Comment;
  });
}

function ensureUniqueIdsFallback(list: Comment[]): Comment[] {
  const arr = Array.isArray(list) ? list : [];
  const seen = new Set<string>();
  return arr.map((c, idx) => {
    const id = String((c as any)?.id ?? "").trim();
    if (!id) return { ...(c as any), id: `c_${Date.now()}_${idx}` } as any;

    if (!seen.has(id)) {
      seen.add(id);
      return c;
    }

    // ✅ 혹시라도 남은 중복은 suffix로 강제 유니크
    const nextId = `${id}__${idx}`;
    seen.add(nextId);
    return { ...(c as any), id: nextId } as any;
  });
}

function normalizeLoadedComments(meetingKey: string, raw: unknown): Comment[] {
  const key = String(meetingKey ?? "").trim() || "unknown_meeting";
  const list = Array.isArray(raw) ? (raw as any[]) : [];

  const normalized = list.map((c, idx) => {
    const idRaw = String(c?.id ?? c?.commentId ?? `${key}_c_${idx}`).trim();
    const content = String(c?.content ?? c?.text ?? c?.message ?? "").trim() || "내용이 없습니다.";
    const createdAt =
      String(c?.createdAt ?? c?.created_at ?? "").trim() || toIsoFromNowMinusMs((list.length - idx) * 3 * 60_000);

    const a = c?.author ?? c?.user ?? {};
    const authorId = String(a?.id ?? c?.authorId ?? "unknown");
    const authorNickname = String(a?.nickname ?? c?.authorNickname ?? c?.nickname ?? "알 수 없음");
    const authorAvatar = (a?.avatarUrl ?? c?.authorProfileImage ?? c?.profileImage ?? null) as any;

    const parentIdRaw = c?.parentId ?? c?.parent_id ?? undefined;
    const parentId = parentIdRaw == null ? undefined : String(parentIdRaw);

    // ✅ meeting scope prefix (meeting별 id 충돌 방지)
    const scopedId = idRaw.includes(key) ? idRaw : `${key}_${idRaw}`;

    return {
      ...(c ?? {}),
      id: scopedId,
      content,
      createdAt,
      parentId,
      author: {
        ...(a ?? {}),
        id: authorId,
        nickname: authorNickname,
        avatarUrl: authorAvatar,
      } as any,
      authorNickname,
      authorProfileImage: authorAvatar,
    } as Comment;
  });

  const fixed = dedupeAndFixParents(sortByCreatedAtAsc(normalized));
  return ensureUniqueIdsFallback(fixed);
}

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
    t?.colors?.textMain ??
    "#999999";

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

  const meetingKey = useMemo(() => {
    const key = String(meetingId ?? post?.id ?? "").trim();
    return key || "unknown_meeting";
  }, [meetingId, post?.id]);

  const setCommentsWithCache = useCallback(
    (updater: (prev: Comment[]) => Comment[]) => {
      setComments((prev) => {
        const next = updater(Array.isArray(prev) ? prev : []);
        const safeNext = Array.isArray(next) ? next : [];
        COMMENTS_CACHE[meetingKey] = safeNext;
        return safeNext;
      });
    },
    [meetingKey]
  );

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
        if (Number.isFinite(myLat) && Number.isFinite(myLng)) setDist(myLat, myLng);
      } catch {
        // ignore
      }

      try {
        const cur = await Location.getCurrentPositionAsync({ accuracy: pickAccuracy("normal") } as any);
        const myLat = Number(cur?.coords?.latitude);
        const myLng = Number(cur?.coords?.longitude);
        if (Number.isFinite(myLat) && Number.isFinite(myLng)) setDist(myLat, myLng);
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

      // ✅ meetingId별 댓글: 중복 id/키 문제 방지(dedupe + fallback unique)
      const resolvedKey = String((m as any)?.id ?? meetingId ?? "").trim() || "unknown_meeting";
      const cached = COMMENTS_CACHE[resolvedKey];

      if (Array.isArray(cached)) {
        setComments(cached);
      } else {
        const raw = getMeetingCommentsMock(resolvedKey);
        const normalized = normalizeLoadedComments(resolvedKey, raw);
        COMMENTS_CACHE[resolvedKey] = normalized;
        setComments(normalized);
      }

      const hostId = m.host?.id ? String(m.host.id) : "";
      if (m.myState?.membershipStatus === "HOST" || hostId === String(currentUserId)) {
        const parts = await meetingApi.getParticipants(String(m.id));
        setParticipants(Array.isArray(parts) ? parts : []);
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
            nickname: existingThread.otherUser?.nickname ?? "상대",
            meetingTitle: post.title,
          },
        } as any);
      } else {
        router.push({
          pathname: "/dm/[threadId]",
          params: {
            threadId: `new_${post.id}_${post.host?.id ?? "host"}`,
            meetingId: post.id,
            meetingTitle: post.title,
            nickname: post.host?.nickname ?? "상대",
            opponentId: post.host?.id ?? "",
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
      setCommentsWithCache((prev: Comment[]) =>
        prev.map((c: Comment) =>
          String((c as any).id) === String((editingComment as any).id)
            ? ({ ...(c as any), content: commentText } as any)
            : c
        )
      );
      setEditingComment(null);
    } else {
      const replyNickname =
        (replyTarget as any)?.author?.nickname ?? (replyTarget as any)?.authorNickname ?? "알 수 없음";

      const newComment: Comment = {
        id: `new_${meetingKey}_${Date.now()}`,
        content: replyTarget ? `@${replyNickname} ${commentText}` : commentText,
        createdAt: toIsoFromNowMinusMs(0),
        parentId: (replyTarget as any)?.id,
        author: {
          id: currentUserId,
          nickname: me?.nickname || "나",
          avatarUrl: (me as any)?.avatarUrl,
        } as any,
        authorNickname: me?.nickname || "나",
        authorProfileImage: (me as any)?.avatarUrl,
      } as any;

      setCommentsWithCache((prev: Comment[]) => ensureUniqueIdsFallback(sortByCreatedAtAsc([...prev, newComment])));
    }

    setCommentText("");
    setReplyTarget(null);
    Keyboard.dismiss();
    scrollToBottomSoon(true);
  }, [commentText, editingComment, replyTarget, currentUserId, me, scrollToBottomSoon, meetingKey, setCommentsWithCache]);

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

      {displayHost ? (
        <ProfileModal visible={profileVisible} user={displayHost} onClose={() => setProfileVisible(false)} />
      ) : null}

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
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
                router.push(`/meetings/edit/${(post as any)?.id}` as any);
              }}
            >
              <Ionicons name="pencil-outline" size={20} color={t.colors.textMain} />
              <Text style={t.typography.bodyLarge}>게시글 수정</Text>
            </Pressable>

            <View style={[s.menuDivider, { backgroundColor: t.colors.neutral?.[100] ?? t.colors.border }]} />

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
                        await meetingApi.cancelMeeting(String((post as any)?.id));
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
                {pendingCount > 0 ? (
                  <View style={{ marginRight: 10 }}>
                    <NotiButton
                      color={t.colors.icon?.default ?? t.colors.textMain}
                      backgroundColor={t.colors.background}
                      count={pendingCount}
                      size={24}
                      onPress={() => router.push(`/meetings/manage/${(post as any)?.id}` as any)}
                    />
                  </View>
                ) : null}
                <Pressable onPress={() => setMenuVisible(true)} hitSlop={12} style={{ padding: 4 }}>
                  <Ionicons name="ellipsis-vertical" size={24} color={t.colors.icon?.default ?? t.colors.textMain} />
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
              setCommentsWithCache((prev: Comment[]) =>
                prev.filter((c: Comment) => String((c as any).id) !== String(id))
              );
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
            onManage={() => router.push(`/meetings/manage/${(post as any)?.id}` as any)}
            onLayoutHeight={setBottomBarHeight}
          />
        </KeyboardAvoidingView>
      </AppLayout>
    </>
  );
}

// 3줄 요약
// - 댓글 정규화 단계에서 중복 id를 dedupe하고, 남은 중복은 suffix로 강제 유니크 처리해 key 경고를 제거했습니다.
// - parentId가 실제로 존재하지 않으면 자동으로 해제해 렌더 안정성을 확보했습니다.
// - meetingId별 댓글 로드는 그대로 유지하며, 캐시에도 정제된 댓글만 저장되도록 보강했습니다.