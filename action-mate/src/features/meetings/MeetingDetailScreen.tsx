import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  FlatList,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import {
  cancelJoin,
  cancelMeeting,
  getMeeting,
  joinMeeting,
  updateHostMemo,
} from "./meetingService";
import type { MeetingPost } from "./types";
import { ProfileDetailModal } from "./components/ProfileDetailModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
/** -------------------------------
 * ✅ 댓글/답변(목업) 타입 & 헬퍼
 * - 실제 API 붙이면 service로 빼면 됨
 * -------------------------------- */
type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorNickname: string;
  authorAvatarUrl?: string;
  content: string;
  createdAt: string;
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60 * 1000) return "방금";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}분 전`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}시간 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

// ✅ 목업 댓글(게시글 id="1","3" 등과 연결됨)
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
    authorId: "u1", // ✅ 호스트(작성자) 답변 예시
    authorNickname: "민수",
    content: "네! 여분 라켓 있어요. 편하게 오세요 🙂",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "c3",
    postId: "3",
    authorId: "u10",
    authorNickname: "게임초보",
    content: "인원 확정은 언제쯤 되나요?",
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
];

// ✅ 현재 로그인 유저(목업) — 실제로는 authStore에서 가져오면 됨
const CURRENT_USER_ID = "me";

export default function MeetingDetailScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams();
  const rawId = params.id as string | string[] | undefined;
  const meetingId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [post, setPost] = useState<MeetingPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [memoDraft, setMemoDraft] = useState("");

  // ✅ 프로필 모달 상태
  const [profileVisible, setProfileVisible] = useState(false);

  // ✅ 댓글 상태(목업)
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null); // 답글 대상(UX용)

  // 데이터 로드
  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!meetingId) {
        Alert.alert("오류", "모임 id가 없습니다.");
        router.back();
        return;
      }

      try {
        const m = await getMeeting(meetingId);
        if (!alive) return;

        setPost(m);
        setMemoDraft(m?.hostMemo ?? "");

        // ✅ 댓글 로드(목업)
        const loadedComments = MOCK_COMMENTS.filter((c) => c.postId === String(m.id)).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setComments(loadedComments);
      } catch (e) {
        console.error("Failed to load meeting:", e);
        Alert.alert("오류", "모임 정보를 불러오지 못했습니다.");
        router.back();
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [meetingId, router]);

  const isAuthor = useMemo(() => {
    // ✅ 작성자 판별: 실제 서비스에선 post.host.id === me 같은 방식
    // 여기선 호스트가 "me"면 작성자라고 가정 (createMeeting에서 host.id="me")
    return post?.host?.id === CURRENT_USER_ID;
  }, [post?.host?.id]);

  const membership = post?.myState?.membershipStatus ?? "NONE";
  const canJoin = post?.myState?.canJoin ?? post?.status === "OPEN";

  const handleJoin = async () => {
    if (!post) return;

    const r = await joinMeeting(post.id);
    setPost(r.post);

    if (r.membershipStatus === "JOINED") {
      Alert.alert("환영합니다! 🎉", "모임방으로 이동할까요?", [
        { text: "나중에", style: "cancel" },
        // ✅ dm/[threadId] = post.id 로 사용(목업)
        {
          text: "이동",
          onPress: () =>
            router.push({
              pathname: "/dm/[threadId]",
              params: {
                threadId: post.id,
                nickname: post.host?.nickname ?? "대화",
                meetingId: post.id,
                meetingTitle: post.title,
              },
            } as any),
        },
      ]);
    } else if (r.membershipStatus === "PENDING") {
      Alert.alert("신청 완료", "호스트의 승인을 기다려주세요.");
    }
  };

  /** -------------------------------
   * ✅ 댓글/답변 액션(목업)
   * -------------------------------- */
  const handleSubmitComment = () => {
    if (!post) return;
    const content = commentDraft.trim();
    if (!content) return;

    const newComment: Comment = {
      id: `c_${Date.now()}`,
      postId: String(post.id),
      authorId: CURRENT_USER_ID,
      authorNickname: isAuthor ? (post.host?.nickname ?? "나") : "나",
      content: replyTo ? `@${replyTo.authorNickname} ${content}` : content,
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [...prev, newComment]);
    setCommentDraft("");
    setReplyTo(null);
  };

  const handleEditComment = (c: Comment) => {
    Alert.prompt?.(
      "댓글 수정",
      "",
      (value) => {
        const v = (value ?? "").trim();
        if (!v) return;
        setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, content: v } : x)));
      },
      "plain-text",
      c.content
    );

    // Android는 Alert.prompt가 없음 → fallback
    if (Platform.OS !== "ios") {
      Alert.alert("안내", "Android에서는 댓글 수정 UI를 별도 화면/모달로 구현해주세요.");
    }
  };

  const handleDeleteComment = (c: Comment) => {
    Alert.alert("댓글 삭제", "정말 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => setComments((prev) => prev.filter((x) => x.id !== c.id)),
      },
    ]);
  };

  const handleEditPost = () => {
    if (!post) return;
    // ✅ 실제로는 edit screen으로 push
    Alert.alert("수정", "게시글 수정 화면으로 이동하도록 연결하세요.");
  };

  const handleDeletePost = async () => {
    if (!post) return;
    Alert.alert("게시글 삭제", "게시글을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          // ✅ 목업에 delete가 없어서 '취소'로 대체
          await cancelMeeting(post.id);
          Alert.alert("삭제됨", "게시글이 삭제(처리)되었습니다.");
          router.back();
        },
      },
    ]);
  };

  if (loading || !post) {
    return (
      <AppLayout>
        <Stack.Screen options={{ headerShown: false }} />
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
        <ProfileDetailModal
          visible={profileVisible}
          user={post.host}
          onClose={() => setProfileVisible(false)}
        />
      )}

      <AppLayout padded={false}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          {/* ✅ TopBar: 공통 + 작성자면 우측 액션 */}
          <TopBar
            title="모임 상세"
            showBorder
            showBack
            onPressBack={() => router.back()}
            showNoti={false}
            showMenu={false}
            rightActionText={isAuthor ? "수정" : undefined}
            onPressRightAction={isAuthor ? handleEditPost : undefined}
          />

          {/* ✅ 작성자일 때: 상단에 삭제 버튼도 노출(가볍게) */}
          {isAuthor ? (
            <View style={{ paddingHorizontal: t.spacing.pagePaddingH, paddingTop: 10 }}>
              <Pressable
                onPress={handleDeletePost}
                style={({ pressed }) => [
                  styles.authorDanger,
                  {
                    borderColor: t.colors.neutral[200],
                    backgroundColor: t.colors.surface,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={16} color={t.colors.error} />
                <Text style={[t.typography.labelLarge, { color: t.colors.error }]}>게시글 삭제</Text>
              </Pressable>
            </View>
          ) : null}

          <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
            {/* 1. 이미지/지도 Placeholder */}
            <View style={[styles.mapPlaceholder, { backgroundColor: t.colors.neutral[100] }]}>
              <Ionicons name="map" size={48} color={t.colors.neutral[300]} />
              <Text style={[t.typography.bodySmall, { color: t.colors.neutral[400], marginTop: 8 }]}>
                지도 미리보기
              </Text>
            </View>

            <View style={{ paddingHorizontal: t.spacing.pagePaddingH, paddingTop: 20 }}>
              {/* 2. 호스트 프로필 섹션 */}
              <Pressable
                onPress={() => setProfileVisible(true)}
                style={({ pressed }) => [
                  styles.hostRow,
                  {
                    backgroundColor: t.colors.surface,
                    borderColor: t.colors.neutral[100],
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View style={[styles.hostAvatar, { backgroundColor: t.colors.neutral[100] }]}>
                  {post.host?.avatarUrl ? (
                    <Image source={{ uri: post.host.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                  ) : (
                    <Ionicons name="person" size={20} color={t.colors.neutral[400]} />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]}>{post.host?.nickname}</Text>
                    <View
                      style={{
                        backgroundColor: t.colors.primaryLight,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: t.colors.primary, fontWeight: "700" }}>HOST</Text>
                    </View>
                  </View>
                  <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                    매너온도 {post.host?.mannerTemp}°C · 칭찬 {post.host?.kudosCount}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color={t.colors.neutral[400]} />
              </Pressable>

              {/* 3. 헤더: 카테고리 & 제목 */}
              <View style={styles.headerSection}>
                <View style={styles.badgeRow}>
                  <Badge label={post.category} tone="default" />
                  <Badge label={post.joinMode === "INSTANT" ? "⚡ 선착순" : "🙋 승인제"} tone="primary" />
                  {post.status !== "OPEN" && <Badge label={post.status} tone="warning" />}
                </View>
                <Text style={[t.typography.headlineMedium, { marginTop: 12, color: t.colors.textMain }]}>
                  {post.title}
                </Text>
              </View>

              {/* 4. 정보 요약 박스 */}
              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: t.colors.neutral[50], borderColor: t.colors.neutral[100] },
                ]}
              >
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={20} color={t.colors.textMain} />
                  <View style={styles.infoTextCtx}>
                    <Text style={t.typography.titleSmall}>{post.meetingTimeText}</Text>
                    <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>약 {post.durationHours}시간 예정</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: t.colors.neutral[200] }]} />

                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={20} color={t.colors.textMain} />
                  <View style={styles.infoTextCtx}>
                    <Text style={t.typography.titleSmall}>{post.locationText}</Text>
                    <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>
                      {post.distanceText} · 상세 위치는 참여 후 공개
                    </Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: t.colors.neutral[200] }]} />

                <View style={styles.infoRow}>
                  <Ionicons name="people-outline" size={20} color={t.colors.textMain} />
                  <View style={styles.infoTextCtx}>
                    <Text style={t.typography.titleSmall}>
                      {post.capacityJoined} / {post.capacityTotal}명 참여 중
                    </Text>
                    {post.capacityTotal - post.capacityJoined <= 1 && post.status === "OPEN" ? (
                      <Text style={[t.typography.labelSmall, { color: t.colors.error }]}>마감 임박!</Text>
                    ) : (
                      <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>아직 자리가 있어요</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* 5. 호스트 메모 */}
              <View style={styles.section}>
                <Text style={[t.typography.titleMedium, { marginBottom: 12 }]}>호스트의 한마디</Text>
                <View style={[styles.bubble, { backgroundColor: t.colors.primaryLight }]}>
                  <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, lineHeight: 22 }]}>
                    {`"${post.hostMemo || "별도의 공지사항이 없습니다. 편하게 오세요!"}"`}
                  </Text>
                  <View style={[styles.bubbleTail, { borderTopColor: t.colors.primaryLight }]} />
                </View>
              </View>

              {/* ✅ 댓글/답변 UI */}
              <View style={styles.section}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={[t.typography.titleMedium]}>댓글 · 답변</Text>
                  <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                    {comments.length}개
                  </Text>
                </View>

                <View style={{ height: 12 }} />

                {comments.length === 0 ? (
                  <View
                    style={[
                      styles.emptyComments,
                      { backgroundColor: t.colors.neutral[50], borderColor: t.colors.neutral[100] },
                    ]}
                  >
                    <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>
                      아직 댓글이 없어요. 첫 댓글을 남겨보세요!
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={comments}
                    keyExtractor={(c) => c.id}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                    renderItem={({ item }) => {
                      const isMine = item.authorId === CURRENT_USER_ID;
                      const isHost = item.authorId === post.host?.id;

                      return (
                        <View
                          style={[
                            styles.commentCard,
                            { backgroundColor: t.colors.surface, borderColor: t.colors.neutral[100] },
                          ]}
                        >
                          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                            <View style={[styles.commentAvatar, { backgroundColor: t.colors.neutral[100] }]}>
                              {item.authorAvatarUrl ? (
                                <Image
                                  source={{ uri: item.authorAvatarUrl }}
                                  style={{ width: 28, height: 28, borderRadius: 14 }}
                                />
                              ) : (
                                <Ionicons name="person" size={14} color={t.colors.neutral[400]} />
                              )}
                            </View>

                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]}>
                                  {item.authorNickname}
                                </Text>

                                {isHost ? (
                                  <View
                                    style={{
                                      backgroundColor: t.colors.primaryLight,
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      borderRadius: 999,
                                    }}
                                  >
                                    <Text style={{ fontSize: 10, fontWeight: "700", color: t.colors.primary }}>
                                      HOST
                                    </Text>
                                  </View>
                                ) : null}

                                <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                                  · {timeAgo(item.createdAt)}
                                </Text>
                              </View>

                              <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, marginTop: 6, lineHeight: 20 }]}>
                                {item.content}
                              </Text>

                              {/* ✅ 액션 영역:
                                  - 작성자(호스트): 답글(Reply) + (내 댓글이면 수정/삭제)
                                  - 비작성자: 내 댓글이면 수정/삭제, 아니면 답글만(선택)
                               */}
                              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                                <Pressable
                                  onPress={() => setReplyTo(item)}
                                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                                >
                                  <Text style={[t.typography.labelSmall, { color: t.colors.primary }]}>답글</Text>
                                </Pressable>

                                {isMine ? (
                                  <>
                                    <Pressable
                                      onPress={() => handleEditComment(item)}
                                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                                    >
                                      <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>수정</Text>
                                    </Pressable>

                                    <Pressable
                                      onPress={() => handleDeleteComment(item)}
                                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                                    >
                                      <Text style={[t.typography.labelSmall, { color: t.colors.error }]}>삭제</Text>
                                    </Pressable>
                                  </>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    }}
                  />
                )}

                {/* ✅ 댓글 입력창 */}
                <View style={{ height: 14 }} />

                {replyTo ? (
                  <View
                    style={[
                      styles.replyHint,
                      { backgroundColor: t.colors.neutral[50], borderColor: t.colors.neutral[100] },
                    ]}
                  >
                    <Text style={[t.typography.labelSmall, { color: t.colors.textSub, flex: 1 }]} numberOfLines={1}>
                      {replyTo.authorNickname}님에게 답글 작성 중…
                    </Text>
                    <Pressable onPress={() => setReplyTo(null)} hitSlop={12}>
                      <Ionicons name="close" size={16} color={t.colors.textSub} />
                    </Pressable>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.commentComposer,
                    { backgroundColor: t.colors.surface, borderColor: t.colors.neutral[200] },
                  ]}
                >
                  <TextInput
                    value={commentDraft}
                    onChangeText={setCommentDraft}
                    placeholder={isAuthor ? "질문에 답변을 남겨주세요" : "댓글을 남겨주세요"}
                    placeholderTextColor={t.colors.textSub}
                    style={[
                      styles.commentInput,
                      {
                        color: t.colors.textMain,
                        backgroundColor: t.colors.neutral[50],
                        borderColor: t.colors.neutral[200],
                      },
                    ]}
                    multiline
                  />

                  <Pressable
                    onPress={handleSubmitComment}
                    disabled={!commentDraft.trim()}
                    style={[
                      styles.sendMiniBtn,
                      { backgroundColor: commentDraft.trim() ? t.colors.primary : t.colors.neutral[200] },
                    ]}
                  >
                    <Ionicons name="send" size={16} color="white" />
                  </Pressable>
                </View>
              </View>

              {/* --- 호스트/개발자 모드(작성자만 보이게) --- */}
              {isAuthor ? (
                <View style={[styles.devBox, { borderColor: t.colors.neutral[200] }]}>
                  <Text style={[t.typography.labelSmall, { color: t.colors.neutral[400], marginBottom: 8 }]}>
                    🛠 호스트/개발자 모드
                  </Text>

                  <TextInput
                    value={memoDraft}
                    onChangeText={setMemoDraft}
                    placeholder="메모 수정..."
                    style={[
                      styles.input,
                      {
                        backgroundColor: t.colors.background,
                        borderColor: t.colors.neutral[300],
                        color: t.colors.textMain,
                      },
                    ]}
                  />

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <Button
                      title="메모 저장"
                      size="sm"
                      variant="secondary"
                      onPress={async () => {
                        const r = await updateHostMemo(post.id, memoDraft.trim());
                        setPost(r.post);
                        Alert.alert("메모 수정됨");
                      }}
                    />
                    <Button
                      title="모임 취소"
                      size="sm"
                      variant="danger"
                      onPress={async () => {
                        const r = await cancelMeeting(post.id);
                        setPost(r.post);
                        Alert.alert("모임 취소됨");
                      }}
                    />
                  </View>
                </View>
              ) : null}

              <View style={{ height: 40 }} />
            </View>
          </ScrollView>

          {/* Sticky Bottom Bar */}
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: t.colors.surface,
                borderTopColor: t.colors.neutral[200],
                paddingBottom: 12 + insets.bottom, // ✅ 핵심: 안드로이드/ios 모두 안전영역 반영
              },
            ]}
          >
            {membership === "JOINED" ? (
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Button
                  title="참여 취소"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={async () => setPost((await cancelJoin(post.id)).post)}
                />
                <Button
                  title="대화방 입장"
                  style={{ flex: 2 }}
                  onPress={() =>
                    router.push({
                      pathname: "/dm/[threadId]",
                      params: {
                        threadId: post.id,
                        nickname: post.host?.nickname ?? "대화",
                        meetingId: post.id,
                        meetingTitle: post.title,
                      },
                    } as any)
                  }
                />
              </View>
            ) : membership === "PENDING" ? (
              <Button
                title="승인 대기중 (취소하기)"
                variant="secondary"
                onPress={async () => setPost((await cancelJoin(post.id)).post)}
              />
            ) : (
              <Button
                title={canJoin ? "참여하기" : post.myState?.reason || "참여 불가"}
                disabled={!canJoin}
                size="lg"
                onPress={handleJoin}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </AppLayout>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  mapPlaceholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },

  authorDanger: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  hostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  headerSection: { marginBottom: 24 },
  badgeRow: { flexDirection: "row", gap: 8 },

  infoBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoTextCtx: { marginLeft: 14, gap: 2 },
  divider: { height: 1, marginVertical: 16, marginLeft: 34 },

  section: { marginBottom: 32 },

  bubble: {
    padding: 20,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  bubbleTail: {
    position: "absolute",
    bottom: -10,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },

  // ✅ 댓글 UI
  emptyComments: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  commentCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  replyHint: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  commentComposer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendMiniBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },

  devBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    opacity: 0.9,
  },
  input: { borderWidth: 1, borderRadius: 8, padding: 10 },

  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 10,
  },
});
