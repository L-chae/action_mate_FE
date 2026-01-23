// 📂 src/features/meetings/ui/DetailContent.tsx
import React, { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";

// ✅ Shared
import { Badge } from "@/shared/ui/Badge";
import { withAlpha } from "@/shared/theme/colors";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

// ✅ Model & Constants
import type { MeetingPost, Comment } from "@/features/meetings/model/types";
import { getMeetingStatusTokens } from "@/features/meetings/model/constants";
import { meetingTimeTextFromIso } from "@/features/meetings/utils/timeText";

// -------------------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------------------
function timeAgo(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60 * 1000) return "방금";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}분 전`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}시간 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

/** 테마 타입 정의 */
type Theme = ReturnType<typeof useAppTheme>;

function toneColor(t: Theme, tone?: string) {
  switch (tone) {
    case "point":
      return t.colors.point;
    case "info":
      return t.colors.info;
    case "success":
      return t.colors.success;
    case "warning":
      return t.colors.warning;
    case "error":
      return t.colors.error;
    case "primary":
      return t.colors.primary;
    default:
      return t.colors.textSub;
  }
}

function getDurationLabel(mins?: number | null) {
  if (!mins || mins <= 0) return "소요 시간 미정";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

function isValidLatLng(lat: unknown, lng: unknown) {
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (a === 0 && b === 0) return false;
  return true;
}

/**
 * ✅ Comment.author(UserSummary) 기준
 * (과거/목업 데이터가 섞여도 화면이 죽지 않게 읽기만 방어)
 */
function getCommentAuthor(item: Comment): { id: string; nickname: string; avatarUrl?: string } {
  const anyItem = item as any;

  const author = (item as any)?.author;
  if (author) {
    const id = String(author.id ?? "");
    const nickname = String(author.nickname ?? "");
    const avatarUrl =
      author.avatarUrl ??
      author.profileImageUrl ??
      author.imageUrl ??
      author.photoUrl ??
      undefined;

    return { id, nickname, avatarUrl: avatarUrl ?? undefined };
  }

  const id = String(anyItem?.authorId ?? "");
  const nickname = String(anyItem?.authorNickname ?? "");
  const avatarUrl = anyItem?.authorAvatarUrl ?? anyItem?.avatarUrl ?? undefined;
  return { id, nickname, avatarUrl };
}

// ✅ 댓글 아바타 URL 결정: comment.author 우선, 없으면 호스트 매칭 시 host avatar
function pickAvatarUrlFromComment(item: Comment, post: MeetingPost): string | undefined {
  const { id, avatarUrl } = getCommentAuthor(item);
  if (avatarUrl) return avatarUrl;

  if (id && post?.host?.id && String(id) === String(post.host.id)) {
    return post.host.avatarUrl || undefined;
  }
  return undefined;
}

// -------------------------------------------------------------------------
// Sub Components
// -------------------------------------------------------------------------
function InfoRow({
  icon,
  text,
  subText,
  t,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  subText: string;
  t: Theme;
  iconColor: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <View style={styles.infoTextCtx}>
        <Text style={[t.typography.titleSmall, { color: t.colors.textMain }]}>{text}</Text>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>{subText}</Text>
      </View>
    </View>
  );
}

function MetaLine({
  t,
  iconName,
  label,
  tone,
}: {
  t: Theme;
  iconName?: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: string;
}) {
  return (
    <View style={styles.metaLine}>
      {iconName ? (
        <Ionicons name={iconName} size={14} color={toneColor(t, tone)} style={styles.metaIcon} />
      ) : null}
      <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>{label}</Text>
    </View>
  );
}

// -------------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------------
type DetailContentProps = {
  t: Theme;
  post: MeetingPost;

  /** ✅ 이미 MeetingDetailScreen에서 “무한 depth threaded”로 정렬된 리스트가 들어온다 */
  comments: Comment[];

  /** ✅ TS2322 해결: MeetingDetailScreen에서 넘기는 commentById prop 추가 */
  commentById: Map<string, Comment>;

  currentUserId: string;

  headerComponent?: ReactNode;
  scrollViewRef: React.RefObject<ScrollView | null>;
  bottomPadding: number;

  onPressHostProfile: () => void;

  onPressCommentAuthor?: (payload: { id: string; nickname: string; avatarUrl?: string }) => void;
  onReply: (c: Comment) => void;
  onEditComment: (c: Comment) => void;
  onDeleteComment: (id: string) => void;

  onContentHeightChange?: (h: number) => void;
  onScrollViewHeightChange?: (h: number) => void;
  onScroll?: (e: any) => void;

  commentText: string;
  setCommentText: (v: string) => void;
  inputRef: React.RefObject<TextInput | null>;
  replyTarget: Comment | null;
  editingComment: Comment | null;
  onCancelInputMode: () => void;
  onSubmitComment: () => void;
  onFocusComposer: () => void;

  /** ✅ 댓글 위치 저장(부모/신규 댓글로 스크롤 이동용) */
  onCommentLayout?: (id: string, y: number) => void;
};

export function DetailContent({
  t,
  post,
  comments,
  commentById,
  currentUserId,
  headerComponent,
  scrollViewRef,
  bottomPadding,
  onPressHostProfile,
  onPressCommentAuthor,
  onReply,
  onEditComment,
  onDeleteComment,
  onContentHeightChange,
  onScrollViewHeightChange,
  onScroll,
  commentText,
  setCommentText,
  inputRef,
  replyTarget,
  editingComment,
  onCancelInputMode,
  onSubmitComment,
  onFocusComposer,
  onCommentLayout,
}: DetailContentProps) {
  const isDark = t.mode === "dark";

  const pageBg = t.colors.background;
  const surface = t.colors.surface;
  const border = t.colors.border;
  const subtleBg = t.colors.overlay[6];
  const subtleBg2 = t.colors.overlay[8];
  const dividerColor = t.colors.divider ?? border;

  const mutedIcon = t.colors.icon?.muted ?? t.colors.textSub;
  const iconMain = t.colors.icon?.default ?? t.colors.textMain;

  const hostPillBg = withAlpha(t.colors.primary, isDark ? 0.24 : 0.14);
  const hostPillFg = t.colors.primary;

  const bubbleBg = withAlpha(t.colors.primary, isDark ? 0.18 : 0.12);
  const inputBg = isDark ? subtleBg2 : subtleBg;

  const conditionBg = withAlpha(t.colors.point ?? t.colors.primary, 0.08);
  const conditionText = t.colors.point ?? t.colors.primary;

  const { meta, right } = useMemo(() => getMeetingStatusTokens(post), [post]);
  const metaToken = meta[0];
  const rightToken = right[0];

  const timeLabel = useMemo(() => {
    return post.meetingTime ? meetingTimeTextFromIso(post.meetingTime) : "";
  }, [post.meetingTime]);

  // ✅ 지도 좌표
  const map = useMemo(() => {
    const lat = post.location?.lat;
    const lng = post.location?.lng;
    const ok = isValidLatLng(lat, lng);
    return { lat: Number(lat), lng: Number(lng), ok };
  }, [post.location?.lat, post.location?.lng]);

  const hostAvatarUrl = post.host?.avatarUrl || null;

  // ✅ 인원 정보
  const capacityCurrent = post.capacity?.current ?? 0;
  const capacityTotal = post.capacity?.total ?? 0;
  const remaining = Math.max(0, capacityTotal - capacityCurrent);

  // ✅ reply/edit 표기용
  const replyNickname = replyTarget ? getCommentAuthor(replyTarget).nickname : "";
  const editingLabel = editingComment ? "댓글 수정 중" : "";

  /** ✅ depth에 따라 들여쓰기 계산 (부모 체인을 타고 올라감) */
  const depthOf = useCallback(
    (c: Comment) => {
      let depth = 0;
      const visited = new Set<string>();
      let cur: Comment | undefined = c;

      while (cur && (cur as any)?.parentId) {
        const pid = String((cur as any).parentId);
        if (!pid || visited.has(pid)) break; // cycle 방어
        visited.add(pid);
        const parent = commentById.get(pid);
        if (!parent) break;
        depth += 1;
        cur = parent;
        if (depth >= 6) break; // 너무 깊어지면 UI 폭 망가짐 방어
      }
      return depth;
    },
    [commentById]
  );

  const indentByDepth = (depth: number) => {
    const base = 0;
    const step = 18; // ✅ 너무 과하지 않게
    const max = 54; // ✅ 최대 3단까지만 시각적으로 들여쓰기
    return base + Math.min(max, depth * step);
  };

  const parentNicknameOf = (c: Comment) => {
    const pid = (c as any)?.parentId ? String((c as any).parentId) : "";
    if (!pid) return "";
    const parent = commentById.get(pid);
    if (!parent) return "";
    return getCommentAuthor(parent).nickname;
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: bottomPadding, backgroundColor: pageBg }}
      onContentSizeChange={(_, h) => onContentHeightChange?.(h)}
      onLayout={(e) => onScrollViewHeightChange?.(e.nativeEvent.layout.height)}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {headerComponent ? (
        <View style={{ paddingHorizontal: t.spacing.pagePaddingH, paddingTop: 12 }}>{headerComponent}</View>
      ) : null}

      {/* 1. 지도 영역 */}
      <View style={[styles.mapContainer, { backgroundColor: subtleBg2 }]}>
        {map.ok ? (
          <View style={{ flex: 1 }} pointerEvents="none">
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              region={{
                latitude: map.lat,
                longitude: map.lng,
                latitudeDelta: 0.003,
                longitudeDelta: 0.003,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            />
            <View style={styles.centerPin}>
              <Ionicons name="location-sharp" size={32} color={t.colors.primary} />
            </View>
          </View>
        ) : (
          <View style={styles.center}>
            <Ionicons name="map" size={48} color={mutedIcon} />
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 8 }]}>위치 정보 없음</Text>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: t.spacing.pagePaddingH, paddingTop: 20 }}>
        {/* 2. 호스트 프로필 */}
        <Pressable
          onPress={onPressHostProfile}
          style={({ pressed }) => [
            styles.hostRow,
            { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.86 : 1 },
          ]}
        >
          <View style={[styles.hostAvatar, { backgroundColor: subtleBg }]}>
            {hostAvatarUrl ? (
              <Image source={{ uri: hostAvatarUrl }} style={styles.hostAvatarImg} />
            ) : (
              <Ionicons name="person" size={20} color={mutedIcon} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.rowCenter}>
              <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]}>{post.host?.nickname ?? "호스트"}</Text>
              <View style={[styles.hostBadge, { backgroundColor: hostPillBg, marginLeft: 6 }]}>
                <Text style={[styles.hostBadgeText, { color: hostPillFg }]}>HOST</Text>
              </View>
            </View>

            <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
              매너 {post.host?.mannerTemperature ?? 36.5}°C
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={mutedIcon} />
        </Pressable>

        {/* 3. 게시글 헤더 */}
        <View style={styles.headerSection}>
          <View style={styles.headerMetaRow}>
            <Badge label={post.category} tone="neutral" />
            {metaToken ? <MetaLine t={t} iconName={metaToken.iconName} label={metaToken.label} tone={metaToken.tone} /> : null}
            {rightToken ? <MetaLine t={t} iconName={rightToken.iconName} label={rightToken.label} tone={rightToken.tone} /> : null}
          </View>

          <Text style={[t.typography.headlineMedium, { marginTop: 12, color: t.colors.textMain }]}>{post.title}</Text>
        </View>

        {/* 4. 정보 박스 */}
        <View style={[styles.infoBox, { backgroundColor: surface, borderColor: border }]}>
          <InfoRow
            icon="time-outline"
            text={timeLabel || "시간 정보 없음"}
            subText={`약 ${getDurationLabel(post.durationMinutes)} 예정`}
            t={t}
            iconColor={iconMain}
          />
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          <InfoRow
            icon="location-outline"
            text={post.location?.name || "위치 정보 없음"}
            subText={post.distanceText || ""}
            t={t}
            iconColor={iconMain}
          />
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          <InfoRow
            icon="people-outline"
            text={capacityTotal > 0 ? `${capacityCurrent} / ${capacityTotal}명 참여 중` : `${capacityCurrent}명 참여 중`}
            subText={capacityTotal > 0 ? (remaining <= 1 ? "마감 임박!" : "자리 있음") : "정원 정보 없음"}
            t={t}
            iconColor={iconMain}
          />
        </View>

        {/* 5. 승인 조건 */}
        {post.joinMode === "APPROVAL" ? (
          <View style={[styles.conditionBox, { backgroundColor: conditionBg, borderColor: "transparent" }]}>
            <View style={styles.rowCenter}>
              <Ionicons name="checkmark-circle-outline" size={18} color={conditionText} style={{ marginRight: 6 }} />
              <Text style={[t.typography.labelLarge, { color: conditionText }]}>참여 승인 조건</Text>
            </View>
            <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, lineHeight: 22, marginTop: 6 }]}>
              {post.conditions || "호스트가 설정한 별도의 조건이 없습니다. 편하게 신청해주세요!"}
            </Text>
          </View>
        ) : null}

        {/* 6. 호스트의 한마디 */}
        <View style={styles.section}>
          <Text style={[t.typography.titleMedium, { marginBottom: 12, color: t.colors.textMain }]}>호스트의 한마디</Text>
          <View style={[styles.bubble, { backgroundColor: bubbleBg, borderColor: border }]}>
            <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, lineHeight: 22 }]}>{post.content || "편하게 오세요!"}</Text>
            <View style={[styles.bubbleTail, { borderTopColor: bubbleBg }]} />
          </View>
        </View>

        {/* 7. 댓글 */}
        <View style={styles.section}>
          <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>댓글 {comments.length}</Text>

          {comments.length === 0 ? (
            <View style={[styles.emptyComments, { backgroundColor: subtleBg, marginTop: 12 }]}>
              <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>첫 댓글을 남겨보세요!</Text>
            </View>
          ) : (
            <FlatList
              style={{ marginTop: 12 }}
              data={comments}
              keyExtractor={(c) => String(c.id)}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              renderItem={({ item }) => {
                const author = getCommentAuthor(item);
                const avatarUrl = pickAvatarUrlFromComment(item, post);

                const isMine = String(author.id) === String(currentUserId);
                const pid = (item as any)?.parentId ? String((item as any).parentId) : "";
                const isReply = !!pid;

                const depth = isReply ? depthOf(item) : 0;
                const indent = indentByDepth(depth);

                const parentNickname = isReply ? parentNicknameOf(item) : "";

                const onPressAuthor = () => {
                  if (!onPressCommentAuthor) return;
                  if (!author.id || !author.nickname) return;
                  onPressCommentAuthor({ id: author.id, nickname: author.nickname, avatarUrl });
                };

                return (
                  <View
                    onLayout={(e) => onCommentLayout?.(String(item.id), e.nativeEvent.layout.y)}
                    style={[
                      styles.commentCard,
                      { backgroundColor: surface, borderColor: border, marginLeft: indent },
                      isReply && { backgroundColor: subtleBg },
                    ]}
                  >
                    <View style={styles.commentItemRow}>
                      {/* 아바타 */}
                      <Pressable
                        onPress={onPressCommentAuthor ? onPressAuthor : undefined}
                        disabled={!onPressCommentAuthor}
                        hitSlop={8}
                        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                      >
                        <View style={[styles.commentAvatar, { backgroundColor: subtleBg2 }]}>
                          {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.commentAvatarImg} />
                          ) : (
                            <Ionicons name="person" size={14} color={mutedIcon} />
                          )}
                        </View>
                      </Pressable>

                      {/* 오른쪽 */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.commentTopLine}>
                          <Pressable
                            onPress={onPressCommentAuthor ? onPressAuthor : undefined}
                            disabled={!onPressCommentAuthor}
                            hitSlop={8}
                            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, flexShrink: 1 }]}
                          >
                            <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]} numberOfLines={1}>
                              {author.nickname || "사용자"}
                            </Text>
                          </Pressable>

                          <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}> · {timeAgo(item.createdAt)}</Text>

                          {onPressCommentAuthor ? (
                            <Ionicons name="chevron-forward" size={14} color={mutedIcon} style={{ marginLeft: 6 }} />
                          ) : null}
                        </View>

                        {/* ✅ 답글 표시: 라인/주황바/칩 없이 “얇은 텍스트 한 줄” */}
                        {isReply ? (
                          <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginTop: 6 }]}>
                            ↳ {parentNickname ? `${parentNickname}님에게 답글` : "답글"}
                          </Text>
                        ) : null}

                        {/* 본문 */}
                        <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, marginTop: 8 }]}>{item.content}</Text>

                        {/* 액션: 간격 좁게(붙지 않게만) */}
                        <View style={styles.commentActions}>
                          <Pressable onPress={() => onReply(item)} hitSlop={8} style={styles.actionBtn}>
                            <Text style={[t.typography.labelSmall, { color: t.colors.primary }]}>답글</Text>
                          </Pressable>

                          {isMine ? (
                            <>
                              <Pressable onPress={() => onEditComment(item)} hitSlop={8} style={styles.actionBtn}>
                                <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>수정</Text>
                              </Pressable>
                              <Pressable onPress={() => onDeleteComment(String(item.id))} hitSlop={8} style={styles.actionBtn}>
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

          {/* 댓글 입력 */}
          <View style={[styles.composerWrap, { borderColor: border, backgroundColor: surface }]}>
            {(replyTarget || editingComment) ? (
              <View style={[styles.composerStatus, { backgroundColor: subtleBg, borderColor: border }]}>
                <View style={styles.rowCenter}>
                  <Ionicons
                    name={replyTarget ? "return-down-forward" : "pencil"}
                    size={16}
                    color={t.colors.textSub}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                    {replyTarget ? `${replyNickname || "상대"}님에게 답글 작성 중` : editingLabel}
                  </Text>
                </View>

                <Pressable onPress={onCancelInputMode} hitSlop={10}>
                  <Ionicons name="close" size={16} color={t.colors.textSub} />
                </Pressable>
              </View>
            ) : null}

            <View style={styles.composerRow}>
              <TextInput
                ref={inputRef}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="댓글을 입력하세요..."
                placeholderTextColor={t.colors.textSub}
                style={[
                  styles.composerInput,
                  { backgroundColor: inputBg, color: t.colors.textMain, borderColor: border },
                ]}
                multiline
                maxLength={200}
                onFocus={() => requestAnimationFrame(() => onFocusComposer())}
              />

              <Pressable
                onPress={onSubmitComment}
                disabled={!commentText.trim()}
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: commentText.trim() ? t.colors.primary : t.colors.overlay[12],
                    opacity: commentText.trim() ? 1 : 0.7,
                  },
                ]}
              >
                <Ionicons name="arrow-up" size={20} color="white" />
              </Pressable>
            </View>
          </View>

          <View style={{ height: 8 }} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  mapContainer: { position: "relative", height: 200, width: "100%", overflow: "hidden" },
  centerPin: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: [{ translateX: -16 }, { translateY: -32 }],
  },

  rowCenter: { flexDirection: "row", alignItems: "center" },

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
    overflow: "hidden",
  },
  hostAvatarImg: { width: 40, height: 40, borderRadius: 20 },

  hostBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  hostBadgeText: { fontSize: 10, fontWeight: "800" },

  headerSection: { marginBottom: 24 },
  headerMetaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  metaLine: { flexDirection: "row", alignItems: "center", marginLeft: 10 },
  metaIcon: { marginRight: 6, marginTop: 1 },

  infoBox: { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 32 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoTextCtx: { marginLeft: 14 },
  divider: { height: 1, marginVertical: 16, marginLeft: 34 },

  conditionBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 32 },

  section: { marginBottom: 32 },

  bubble: { padding: 20, borderRadius: 16, borderBottomLeftRadius: 6, borderWidth: 1 },
  bubbleTail: {
    position: "absolute",
    bottom: -10,
    left: 18,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },

  emptyComments: { padding: 20, alignItems: "center", borderRadius: 12 },

  // ✅ 댓글 카드
  commentCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },

  commentItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  commentAvatarImg: { width: 32, height: 32, borderRadius: 16 },

  commentTopLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
  },

  commentActions: { flexDirection: "row", marginTop: 10 },

  // ✅ “답글/수정/삭제” 간격: 살짝만 띄우기 (너무 멀지 않게)
  actionBtn: { marginRight: 10 },

  composerWrap: { marginTop: 14, borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  composerStatus: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  composerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
});
