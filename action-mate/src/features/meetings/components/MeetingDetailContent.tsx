import React from "react";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";

import { Badge } from "@/shared/ui/Badge";
import type { MeetingPost, Comment } from "@/features/meetings/types";

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

function InfoRow({
  icon,
  text,
  subText,
  t,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  subText: string;
  t: any;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={t.colors.textMain} />
      <View style={styles.infoTextCtx}>
        <Text style={t.typography.titleSmall}>{text}</Text>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>{subText}</Text>
      </View>
    </View>
  );
}

export function MeetingDetailContent({
  t,
  post,
  comments,
  currentUserId,

  scrollViewRef,
  bottomPadding,

  onPressHostProfile,
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
}: {
  t: any;
  post: MeetingPost;
  comments: Comment[];
  currentUserId: string;

  scrollViewRef: React.RefObject<ScrollView | null>;
  bottomPadding: number;

  onPressHostProfile: () => void;
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
}) {
  const hasLocation = !!(post.locationLat && post.locationLng);

  return (
    <ScrollView
      ref={scrollViewRef}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      onContentSizeChange={(_, h) => onContentHeightChange(h)}
      onLayout={(e) => onScrollViewHeightChange(e.nativeEvent.layout.height)}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* 지도 */}
      <View style={[styles.mapContainer, { backgroundColor: t.colors.neutral[100] }]}>
        {hasLocation ? (
          <View style={{ flex: 1 }} pointerEvents="none">
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              region={{
                latitude: post.locationLat!,
                longitude: post.locationLng!,
                latitudeDelta: 0.003,
                longitudeDelta: 0.003,
              }}
              liteMode
              scrollEnabled={false}
              zoomEnabled={false}
            />
            <View style={styles.centerPin}>
              <Ionicons name="location-sharp" size={32} color={t.colors.primary} />
            </View>
          </View>
        ) : (
          <View style={styles.center}>
            <Ionicons name="map" size={48} color={t.colors.neutral[300]} />
            <Text style={[t.typography.bodySmall, { color: t.colors.neutral[400], marginTop: 8 }]}>
              위치 정보 없음
            </Text>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: t.spacing.pagePaddingH, paddingTop: 20 }}>
        {/* 호스트 프로필 */}
        <Pressable
          onPress={onPressHostProfile}
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
              <Image source={{ uri: post.host.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={20} color={t.colors.neutral[400]} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]}>{post.host?.nickname}</Text>
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>HOST</Text>
              </View>
            </View>
            <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>매너 {post.host?.mannerTemp}°C</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.colors.neutral[400]} />
        </Pressable>

        {/* 게시글 */}
        <View style={styles.headerSection}>
          <View style={styles.badgeRow}>
            <Badge label={post.category} tone="default" />
            <Badge label={post.joinMode === "INSTANT" ? "⚡ 선착순" : "🙋 승인제"} tone="primary" />
            {post.status !== "OPEN" && <Badge label={post.status} tone="warning" />}
          </View>
          <Text style={[t.typography.headlineMedium, { marginTop: 12, color: t.colors.textMain }]}>{post.title}</Text>
        </View>

        <View style={[styles.infoBox, { backgroundColor: t.colors.neutral[50], borderColor: t.colors.neutral[100] }]}>
          <InfoRow icon="time-outline" text={post.meetingTimeText} subText={`약 ${post.durationHours}시간 예정`} t={t} />
          <View style={[styles.divider, { backgroundColor: t.colors.neutral[200] }]} />
          <InfoRow icon="location-outline" text={post.locationText} subText={post.distanceText || "위치 정보"} t={t} />
          <View style={[styles.divider, { backgroundColor: t.colors.neutral[200] }]} />
          <InfoRow
            icon="people-outline"
            text={`${post.capacityJoined} / ${post.capacityTotal}명 참여 중`}
            subText={post.capacityTotal - post.capacityJoined <= 1 ? "마감 임박!" : "자리 있음"}
            t={t}
          />
        </View>

        <View style={styles.section}>
          <Text style={[t.typography.titleMedium, { marginBottom: 12 }]}>호스트의 한마디</Text>
          <View style={[styles.bubble, { backgroundColor: t.colors.primaryLight }]}>
            <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, lineHeight: 22 }]}>
              {`"${post.content || "편하게 오세요!"}"`}
            </Text>
            <View style={[styles.bubbleTail, { borderTopColor: t.colors.primaryLight }]} />
          </View>
        </View>

        {/* 댓글 */}
        <View style={styles.section}>
          <Text style={t.typography.titleMedium}>댓글 {comments.length}</Text>

          {comments.length === 0 ? (
            <View style={[styles.emptyComments, { backgroundColor: t.colors.neutral[50], marginTop: 12 }]}>
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

                return (
                  <View
                    style={[
                      styles.commentCard,
                      { backgroundColor: t.colors.surface, borderColor: t.colors.neutral[100] },
                      isReply && styles.replyCard,
                      isReply && { borderLeftColor: t.colors.primary },
                    ]}
                  >
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={[styles.commentAvatar, { backgroundColor: t.colors.neutral[100] }]}>
                        <Ionicons name="person" size={14} color={t.colors.neutral[400]} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]}>{item.authorNickname}</Text>
                          <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>· {timeAgo(item.createdAt)}</Text>
                        </View>

                        {isReply && (
                          <View style={[styles.replyMeta, { backgroundColor: t.colors.neutral[50] }]}>
                            <Ionicons name="return-down-forward" size={14} color={t.colors.textSub} />
                            <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                              {reply!.nickname}님에게 답글
                            </Text>
                          </View>
                        )}

                        <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, marginTop: 6 }]}>
                          {isReply ? reply!.body : item.content}
                        </Text>

                        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                          <Pressable onPress={() => onReply(item)} hitSlop={8}>
                            <Text style={[t.typography.labelSmall, { color: t.colors.primary }]}>답글</Text>
                          </Pressable>

                          {item.authorId === currentUserId && (
                            <>
                              <Pressable onPress={() => onEditComment(item)} hitSlop={8}>
                                <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>수정</Text>
                              </Pressable>
                              <Pressable onPress={() => onDeleteComment(item.id)} hitSlop={8}>
                                <Text style={[t.typography.labelSmall, { color: t.colors.error }]}>삭제</Text>
                              </Pressable>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* 댓글 입력창(댓글 섹션 내부) */}
          <View style={[styles.composerWrap, { borderColor: t.colors.neutral[100], backgroundColor: t.colors.surface }]}>
            {(replyTarget || editingComment) && (
              <View
                style={[
                  styles.composerStatus,
                  { backgroundColor: t.colors.neutral[50], borderColor: t.colors.neutral[100] },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons
                    name={replyTarget ? "return-down-forward" : "pencil"}
                    size={16}
                    color={t.colors.textSub}
                  />
                  <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                    {replyTarget ? `${replyTarget.authorNickname}님에게 답글 작성 중` : "댓글 수정 중"}
                  </Text>
                </View>
                <Pressable onPress={onCancelInputMode} hitSlop={10}>
                  <Ionicons name="close" size={16} color={t.colors.textSub} />
                </Pressable>
              </View>
            )}

            <View style={styles.composerRow}>
              <TextInput
                ref={inputRef}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="댓글을 입력하세요..."
                placeholderTextColor={t.colors.textSub}
                style={[styles.composerInput, { backgroundColor: t.colors.neutral[50], color: t.colors.textMain }]}
                multiline
                maxLength={200}
                onFocus={() => requestAnimationFrame(() => onFocusComposer())}
              />
              <Pressable
                onPress={onSubmitComment}
                disabled={!commentText.trim()}
                style={[
                  styles.sendBtn,
                  { backgroundColor: commentText.trim() ? t.colors.primary : t.colors.neutral[200] },
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
  mapContainer: { height: 200, width: "100%", overflow: "hidden", justifyContent: "center", alignItems: "center" },
  centerPin: { position: "absolute", left: "50%", top: "50%", marginLeft: -16, marginTop: -32 },

  hostRow: { flexDirection: "row", alignItems: "center", marginBottom: 24, padding: 12, borderRadius: 12, borderWidth: 1 },
  hostAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  hostBadge: { backgroundColor: "#E0F2FE", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  hostBadgeText: { fontSize: 10, color: "#0284C7", fontWeight: "700" },

  headerSection: { marginBottom: 24 },
  badgeRow: { flexDirection: "row", gap: 8 },

  infoBox: { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 32 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoTextCtx: { marginLeft: 14, gap: 2 },
  divider: { height: 1, marginVertical: 16, marginLeft: 34 },

  section: { marginBottom: 32 },
  bubble: { padding: 20, borderRadius: 16, borderBottomLeftRadius: 4 },
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

  emptyComments: { padding: 20, alignItems: "center", borderRadius: 12 },

  commentCard: { borderWidth: 1, borderRadius: 12, padding: 12 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 2 },

  replyCard: { marginLeft: 14, borderLeftWidth: 3, paddingLeft: 10 },
  replyMeta: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  composerWrap: { marginTop: 14, borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  composerStatus: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  composerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  composerInput: { flex: 1, minHeight: 40, maxHeight: 110, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
});
