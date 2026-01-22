// src/features/meetings/ui/DetailContent.tsx
import React, { useMemo } from "react";
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

function parseReplyPrefix(content: string) {
  if (!content?.startsWith("@")) return null;
  const firstSpace = content.indexOf(" ");
  if (firstSpace <= 1) return null;
  const nickname = content.slice(1, firstSpace);
  const body = content.slice(firstSpace + 1).trim();
  if (!nickname) return null;
  return { nickname, body };
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

// ✅ [수정] 댓글에서 아바타 URL 추출 로직 개선 (User 모델의 avatarUrl 우선)
function pickavatarUrlUrlFromComment(item: Comment, post: MeetingPost): string | undefined {
  const anyItem = item as any;

  // 1. Comment 객체 안에 author 객체가 있고 그 안에 avatarUrl가 있는 경우 (Best)
  if (anyItem.author?.avatarUrl) return anyItem.author.avatarUrl;

  // 2. Comment 객체에 평탄화(Flatten)된 필드로 있는 경우
  if (anyItem.authoravatarUrl) return anyItem.authoravatarUrl;
  if (anyItem.avatarUrl) return anyItem.avatarUrl;

  // 3. (Fallback) 호스트가 쓴 댓글이면 게시글의 호스트 정보를 사용
  if (item.authorId && post?.host?.id && String(item.authorId) === String(post.host.id)) {
    // post.host는 User 타입이므로 avatarUrl 필드 사용
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
  comments: Comment[];
  currentUserId: string;

  headerComponent?: ReactNode;

  scrollViewRef: React.RefObject<ScrollView | null>;
  bottomPadding: number;

  onPressHostProfile: () => void;

  // 댓글 작성자(프로필) 클릭
  onPressCommentAuthor?: (payload: { id: string; nickname: string; avatarUrlUrl?: string }) => void;

  onReply: (c: Comment) => void;
  onEditComment: (c: Comment) => void;
  onDeleteComment: (id: string) => void;

  onContentHeightChange: (h: number) => void;
  onScrollViewHeightChange: (h: number) => void;
  onScroll: (e: any) => void;

  commentText: string;
  setCommentText: (v: string) => void;
  inputRef: React.RefObject<TextInput | null>;

  replyTarget: Comment | null;
  editingComment: Comment | null;
  onCancelInputMode: () => void;

  onSubmitComment: () => void;
  onFocusComposer: () => void;
};

export function DetailContent({
  t,
  post,
  comments,
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
}: DetailContentProps) {
  const isDark = t.mode === "dark";

  // ✅ 공용 색상 토큰
  const pageBg = t.colors.background;
  const surface = t.colors.surface;
  const border = t.colors.border;
  const subtleBg = t.colors.overlay[6];
  const subtleBg2 = t.colors.overlay[8];
  const dividerColor = t.colors.divider ?? border;

  const mutedIcon = t.colors.icon?.muted ?? t.colors.textSub;
  const iconMain = t.colors.icon?.default ?? t.colors.textMain;

  // ✅ Colors
  const hostPillBg = withAlpha(t.colors.primary, isDark ? 0.24 : 0.14);
  const hostPillFg = t.colors.primary;
  const bubbleBg = withAlpha(t.colors.primary, isDark ? 0.18 : 0.12);
  const inputBg = isDark ? subtleBg2 : subtleBg;

  // ✅ 승인 조건 박스 색상
  const conditionBg = withAlpha(t.colors.point ?? "#FF5722", 0.08);
  const conditionText = t.colors.point ?? "#FF5722";

  // ✅ 상태 토큰
  const { meta, right } = useMemo(() => getMeetingStatusTokens(post), [post]);
  const metaToken = meta[0];
  const rightToken = right[0];

  // ✅ 시간 라벨
  const timeLabel = useMemo(() => {
    const iso = post.meetingTime || (post as any).meetingTimeIso;
    return iso ? meetingTimeTextFromIso(iso) : "";
  }, [post.meetingTime]);

  // ✅ 지도 좌표
  const map = useMemo(() => {
    const lat = Number((post as any).locationLat);
    const lng = Number((post as any).locationLng);
    const ok = Number.isFinite(lat) && Number.isFinite(lng);
    return { lat, lng, ok };
  }, [post]);

  // ✅ [수정] 호스트 아바타 URL 추출 (User 모델의 avatarUrl 사용)
  const hostavatarUrlUrl = post.host?.avatarUrl || null;

  return (
    <ScrollView
      ref={scrollViewRef}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: bottomPadding, backgroundColor: pageBg }}
      onContentSizeChange={(_, h) => onContentHeightChange(h)}
      onLayout={(e) => onScrollViewHeightChange(e.nativeEvent.layout.height)}
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
          <View style={[styles.hostavatarUrl, { backgroundColor: subtleBg }]}>
            {/* ✅ [수정] hostavatarUrlUrl 사용 */}
            {hostavatarUrlUrl ? (
              <Image source={{ uri: hostavatarUrlUrl }} style={styles.avatarUrlImg} />
            ) : (
              <Ionicons name="person" size={20} color={mutedIcon} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.rowCenter}>
              <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]}>{post.host?.nickname}</Text>
              <View style={[styles.hostBadge, { backgroundColor: hostPillBg, marginLeft: 6 }]}>
                <Text style={[styles.hostBadgeText, { color: hostPillFg }]}>HOST</Text>
              </View>
            </View>

            <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>매너 {post.host?.mannerTemperature ?? 36.5}°C</Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={mutedIcon} />
        </Pressable>

        {/* 3. 게시글 헤더 */}
        <View style={styles.headerSection}>
          <View style={styles.headerMetaRow}>
            <Badge label={post.category} tone="neutral" />
            {metaToken ? (
              <MetaLine t={t} iconName={metaToken.iconName} label={metaToken.label} tone={metaToken.tone} />
            ) : null}
            {rightToken ? (
              <MetaLine t={t} iconName={rightToken.iconName} label={rightToken.label} tone={rightToken.tone} />
            ) : null}
          </View>

          <Text style={[t.typography.headlineMedium, { marginTop: 12, color: t.colors.textMain }]}>{post.title}</Text>
        </View>

        {/* 4. 정보 박스 (시간, 장소, 인원) */}
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
            text={post.locationText || "위치 정보 없음"}
            subText={post.distanceText || ""}
            t={t}
            iconColor={iconMain}
          />
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          <InfoRow
            icon="people-outline"
            text={`${post.capacityJoined} / ${post.capacityTotal}명 참여 중`}
            subText={post.capacityTotal - post.capacityJoined <= 1 ? "마감 임박!" : "자리 있음"}
            t={t}
            iconColor={iconMain}
          />
        </View>

        {/* 5. 승인 조건 표시 */}
        {post.joinMode === "APPROVAL" ? (
          <View style={[styles.conditionBox, { backgroundColor: conditionBg, borderColor: "transparent" }]}>
            <View style={styles.rowCenter}>
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={conditionText}
                style={{ marginRight: 6 }}
              />
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
            <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, lineHeight: 22 }]}>
              {post.content || "편하게 오세요!"}
            </Text>
            <View style={[styles.bubbleTail, { borderTopColor: bubbleBg }]} />
          </View>
        </View>

        {/* 7. 댓글 섹션 */}
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
              keyExtractor={(c) => c.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              renderItem={({ item }) => {
                const reply = parseReplyPrefix(item.content);
                const isReply = !!reply;

                // ✅ [수정] 개선된 헬퍼 함수 사용
                const avatarUrlUrl = pickavatarUrlUrlFromComment(item, post);

                const onPressAuthor = () => {
                  if (!onPressCommentAuthor) return;
                  const id = String((item as any)?.authorId ?? "");
                  const nickname = String((item as any)?.authorNickname ?? "");
                  if (!id || !nickname) return;
                  // avatarUrlUrl 전달
                  onPressCommentAuthor({ id, nickname, avatarUrlUrl });
                };

                return (
                  <View
                    style={[
                      styles.commentCard,
                      { backgroundColor: surface, borderColor: border },
                      isReply && styles.replyCard,
                      isReply && { borderLeftColor: t.colors.primary },
                    ]}
                  >
                    <View style={styles.commentRow}>
                      {/* ✅ 작성자 영역: 누르면 프로필 오픈 */}
                      <Pressable
                        onPress={onPressCommentAuthor ? onPressAuthor : undefined}
                        disabled={!onPressCommentAuthor}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.authorPressable,
                          { opacity: pressed ? 0.9 : 1 },
                        ]}
                      >
                        <View style={[styles.commentavatarUrl, { backgroundColor: subtleBg }]}>
                          {avatarUrlUrl ? (
                            <Image source={{ uri: avatarUrlUrl }} style={styles.commentavatarUrlImg} />
                          ) : (
                            <Ionicons name="person" size={14} color={mutedIcon} />
                          )}
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={styles.authorLine}>
                            <Text
                              style={[t.typography.labelLarge, { color: t.colors.textMain }]}
                              numberOfLines={1}
                            >
                              {item.authorNickname}
                            </Text>
                            <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                              {" "}
                              · {timeAgo(item.createdAt)}
                            </Text>
                          </View>

                          {isReply ? (
                            <View style={[styles.replyMeta, { backgroundColor: subtleBg }]}>
                              <Ionicons name="return-down-forward" size={14} color={t.colors.textSub} />
                              <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginLeft: 6 }]}>
                                {reply!.nickname}님에게 답글
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {onPressCommentAuthor ? (
                          <Ionicons name="chevron-forward" size={16} color={mutedIcon} style={{ marginLeft: 6 }} />
                        ) : null}
                      </Pressable>

                      <View style={{ flex: 1 }}>
                        <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, marginTop: 6 }]}>
                          {isReply ? reply!.body : item.content}
                        </Text>

                        <View style={styles.commentActions}>
                          <Pressable onPress={() => onReply(item)} hitSlop={8}>
                            <Text style={[t.typography.labelSmall, { color: t.colors.primary }]}>답글</Text>
                          </Pressable>

                          {item.authorId === currentUserId ? (
                            <>
                              <Pressable onPress={() => onEditComment(item)} hitSlop={8}>
                                <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>수정</Text>
                              </Pressable>
                              <Pressable onPress={() => onDeleteComment(item.id)} hitSlop={8}>
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

          {/* 댓글 입력창 */}
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
                    {replyTarget ? `${replyTarget.authorNickname}님에게 답글 작성 중` : "댓글 수정 중"}
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

  mapContainer: {
    position: "relative",
    height: 200,
    width: "100%",
    overflow: "hidden",
  },
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
  hostavatarUrl: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarUrlImg: { width: 40, height: 40, borderRadius: 20 },
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

  conditionBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
  },

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

  commentCard: { borderWidth: 1, borderRadius: 12, padding: 12 },
  replyCard: { marginLeft: 14, borderLeftWidth: 3, paddingLeft: 10 },

  commentRow: { flexDirection: "row" },
  authorPressable: { flexDirection: "row", alignItems: "center", marginRight: 10, flex: 1, minWidth: 0 },

  commentavatarUrl: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
    overflow: "hidden",
    marginRight: 10,
  },
  commentavatarUrlImg: { width: 28, height: 28, borderRadius: 14 },

  authorLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },

  replyMeta: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  commentActions: { flexDirection: "row", marginTop: 8 },
  
  composerWrap: { marginTop: 14, borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  composerStatus: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
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