// src/features/meetings/ui/DetailContent.tsx
import React, { memo, useCallback, useMemo, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";

// ✅ Shared & Model (기존 유지)
import { Badge } from "@/shared/ui/Badge";
import { withAlpha } from "@/shared/theme/colors";
import type { MeetingPost, Comment } from "@/features/meetings/model/types";
import { getMeetingStatusTokens } from "@/features/meetings/model/constants";
import type { StatusPillToken } from "@/features/meetings/model/constants";
import { calculateMannerTemp } from "@/shared/utils/mannerCalculator";

// -------------------------------------------------------------------------
// 1) Constants
// -------------------------------------------------------------------------
const ICON_SIZE = { S: 16, M: 20, L: 24, XL: 30 } as const;
const AVATAR_SIZE = 40;
const COMMENT_PAGE_SIZE = 20;

type Theme = any;
type IonIconName = ComponentProps<typeof Ionicons>["name"];

type CommentAuthorPayload = { id: string; nickname: string; avatarUrl?: string };

type DetailContentProps = {
  t: Theme;
  post: MeetingPost;
  comments: Comment[];
  currentUserId: string;

  headerComponent?: ReactNode;
  scrollViewRef: React.RefObject<ScrollView | null>;
  bottomPadding: number;

  onPressHostProfile: () => void;
  onPressCommentAuthor?: (payload: CommentAuthorPayload) => void;

  onReply: (c: Comment) => void;
  onEditComment: (c: Comment) => void;
  onDeleteComment: (id: string) => void;

  onContentHeightChange: (h: number) => void;
  onScrollViewHeightChange: (h: number) => void;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;

  commentText: string;
  setCommentText: (v: string) => void;
  inputRef: React.RefObject<TextInput | null>;

  replyTarget: Comment | null;
  editingComment: Comment | null;
  onCancelInputMode: () => void;
  onSubmitComment: () => void;
  onFocusComposer: () => void;
};

// -------------------------------------------------------------------------
// 2) Helpers
// -------------------------------------------------------------------------
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

function parseDateTime(iso?: string) {
  if (!iso) return { fullDate: "날짜 미정", time: "시간 미정", day: "-" };
  const d = new Date(iso);
  const weekDay = d.toLocaleDateString("ko-KR", { weekday: "short" });
  return {
    day: d.getDate().toString(),
    fullDate: `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekDay})`,
    time: d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true }),
  };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "방금";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function parseReplyPrefix(content?: string) {
  if (!content?.startsWith("@")) return null;
  const firstSpace = content.indexOf(" ");
  if (firstSpace <= 1) return null;
  const target = content.slice(1, firstSpace);
  const body = content.slice(firstSpace + 1).trim();
  if (!target) return null;
  return { target, body };
}

function isValidLatLng(lat: unknown, lng: unknown) {
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (a === 0 && b === 0) return false;
  return true;
}

function getDurationLabel(mins?: number | null) {
  if (!mins || mins <= 0) return "소요 시간 미정";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

function getAuthorInfo(item: Comment, postHostId?: string) {
  const author = (item as any).author || item;
  const id = String(author.id || (item as any).authorId || "");
  const nickname = String(author.nickname || (item as any).authorNickname || "알 수 없음");
  const avatarUrl =
    author.avatarUrl ||
    author.profileImageUrl ||
    author.imageUrl ||
    author.photoUrl ||
    (item as any).authorAvatarUrl ||
    (item as any).avatarUrl ||
    undefined;

  const isHost = !!(postHostId && id && id === String(postHostId));
  return { id, nickname, avatarUrl, isHost };
}

function getCapacityInfo(post: MeetingPost, t: Theme) {
  const current = post.capacity?.current ?? 0;
  const total = (post.capacity as any)?.total ?? (post.capacity as any)?.max ?? 0;

  const isLimited = total > 0;
  const percent = isLimited ? Math.min(100, (current / total) * 100) : 0;
  const remaining = Math.max(0, total - current);

  let label = "제한 없음";
  let color = t.colors.textSub;

  if (isLimited) {
    if (current >= total) {
      label = "모집 마감";
      color = t.colors.error;
    } else if (remaining <= 2) {
      label = `마감 임박 (${remaining}자리)`;
      color = t.colors.warning;
    } else {
      label = `여유 있음 (${remaining}자리)`;
      color = t.colors.success;
    }
  }

  return { current, total, isLimited, percent, remaining, label, color };
}

/**
 * ✅ StatusPillToken(프로젝트 타입)에 맞춰 “안전한 토큰”으로 정규화
 * - 문제 원인: StatusPillToken.iconName이 string | undefined 인데
 *   MetaChip은 string(필수)로 가정하며 map 콜백 타입이 불일치 발생
 * - 해결: MetaChip이 받을 토큰을 StatusPillToken 기반으로 받고,
 *   iconName이 없으면 렌더에서 제외(=null)해서 런타임/타입 모두 안전
 */
function isValidIoniconName(name: unknown): name is IonIconName {
  return typeof name === "string" && name.length > 0;
}

function normalizeStatusTokens(tokens?: StatusPillToken[] | null) {
  if (!tokens || tokens.length === 0) return [];
  return tokens.filter(Boolean);
}

const createStyles = (t: Theme) => {
  const isDark = t.mode === "dark";
  const borderColor = t.colors.border;
  const subtleBg = t.colors.overlay?.[6] ?? withAlpha(t.colors.textMain, 0.06);
  const cardBg = t.colors.surface;
  const PADDING_H = t.spacing.pagePaddingH;

  const chipBg = subtleBg;
  const contentBubbleBg = withAlpha(t.colors.primary, isDark ? 0.15 : 0.05);
  const conditionBg = withAlpha(t.colors.point ?? "#FF5722", 0.08);
  const commentBubbleBg = isDark ? (t.colors.overlay?.[10] ?? subtleBg) : subtleBg;
  const replyBubbleBg = withAlpha(t.colors.primary, isDark ? 0.12 : 0.05);

  return StyleSheet.create({
    fullSize: { width: "100%", height: "100%" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    rowCenter: { flexDirection: "row", alignItems: "center" },
    rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    rowTop: { flexDirection: "row", alignItems: "flex-start" },

    headerContainer: { paddingHorizontal: PADDING_H, paddingTop: 8 },
    headerSection: { paddingHorizontal: PADDING_H, paddingTop: 12, marginBottom: 16 },

    tagRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
    tagItem: { marginRight: 8, marginBottom: 8 },
    metaChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: chipBg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: borderColor,
    },

    hostRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: PADDING_H,
      marginBottom: 16,
      paddingVertical: 6,
    },
    hostAvatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: subtleBg,
      overflow: "hidden",
      marginRight: 12,
      borderWidth: 1,
      borderColor: borderColor,
      justifyContent: "center",
      alignItems: "center",
    },
    badgeHost: {
      backgroundColor: withAlpha(t.colors.primary, isDark ? 0.22 : 0.15),
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginLeft: 6,
    },
    badgeHostText: { fontSize: 9, fontWeight: "800", color: t.colors.primary },

    card: {
      marginHorizontal: PADDING_H,
      marginBottom: 14,
      backgroundColor: cardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: borderColor,
      overflow: "hidden",
    },
    divider: { height: 1, backgroundColor: borderColor, marginLeft: 56, marginRight: 16 },

    gridRow: { flexDirection: "row", padding: 14, alignItems: "center" },
    gridIconBox: { width: 44, alignItems: "center", marginRight: 12 },
    calendarBox: {
      width: 40,
      height: 44,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: t.colors.textSub,
      overflow: "hidden",
    },
    calendarHeader: { height: 10, backgroundColor: t.colors.textSub },
    calendarBody: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: cardBg },
    calendarText: { fontSize: 14, fontWeight: "900", color: t.colors.textMain },

    capacityTrack: { height: 6, borderRadius: 3, backgroundColor: subtleBg, marginTop: 8, overflow: "hidden" },
    capacityFill: { height: "100%", borderRadius: 3 },

    mapContainer: { height: 160, backgroundColor: subtleBg },
    mapPin: { position: "absolute", top: "50%", left: "50%", marginLeft: -12, marginTop: -24 },
    mapFooter: {
      padding: 14,
      borderTopWidth: 1,
      borderColor: borderColor,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: cardBg,
    },

    section: { paddingHorizontal: PADDING_H, marginBottom: 26 },
    sectionTitle: { marginBottom: 12, color: t.colors.textMain },
    contentBubble: { padding: 16, borderRadius: 12, backgroundColor: contentBubbleBg },
    conditionBox: { marginHorizontal: PADDING_H, padding: 14, borderRadius: 12, backgroundColor: conditionBg, marginBottom: 16 },

    emptyBox: {
      padding: 22,
      alignItems: "center",
      borderWidth: 1,
      borderColor: t.colors.disabled,
      borderStyle: "dashed",
      borderRadius: 12,
      backgroundColor: subtleBg,
    },
    loadMoreBtn: {
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: subtleBg,
      borderRadius: 10,
      marginTop: 8,
      borderWidth: 1,
      borderColor: borderColor,
    },
    loadMoreText: { fontSize: 12, fontWeight: "800", color: t.colors.textSub },

    commentWrap: { marginBottom: 14 },
    replyWrap: { marginLeft: 46, marginBottom: 14, position: "relative" },
    replyLine: {
      position: "absolute",
      left: -16,
      top: 8,
      width: 16,
      height: 24,
      borderLeftWidth: 2,
      borderBottomWidth: 2,
      borderBottomLeftRadius: 10,
      borderColor: t.colors.divider,
      opacity: 0.5,
    },

    commentAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: subtleBg,
      overflow: "hidden",
      marginRight: 10,
      borderWidth: 1,
      borderColor: borderColor,
      justifyContent: "center",
      alignItems: "center",
    },

    commentBubble: {
      flex: 1,
      padding: 12,
      borderRadius: 14,
      backgroundColor: commentBubbleBg,
      borderWidth: 1,
      borderColor: "transparent",
    },
    commentBubbleReply: { backgroundColor: replyBubbleBg },

    actionRow: { flexDirection: "row", marginTop: 10 },
    actionBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 2, marginRight: 12 },
    actionText: { fontSize: 11, fontWeight: "700", color: t.colors.textSub },

    composer: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: borderColor,
      borderRadius: 20,
      backgroundColor: cardBg,
      overflow: "hidden",
    },
    composerHeader: { flexDirection: "row", justifyContent: "space-between", padding: 10, backgroundColor: subtleBg },
    composerBody: { flexDirection: "row", alignItems: "flex-end", padding: 8 },
    input: { flex: 1, minHeight: 40, maxHeight: 110, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
    sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginLeft: 8 },
  });
};

// -------------------------------------------------------------------------
// 3) Sub Components
// -------------------------------------------------------------------------
const MetaChip = memo(function MetaChip({
  t,
  s,
  iconName,
  label,
  tone,
}: {
  t: Theme;
  s: ReturnType<typeof createStyles>;
  iconName: IonIconName;
  label: string;
  tone?: string;
}) {
  return (
    <View style={[s.metaChip, s.tagItem]}>
      <Ionicons name={iconName} size={ICON_SIZE.S} color={toneColor(t, tone)} style={{ marginRight: 4 }} />
      <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>{label}</Text>
    </View>
  );
});

const HostProfileRow = memo(function HostProfileRow({
  t,
  s,
  post,
  onPress,
}: {
  t: Theme;
  s: ReturnType<typeof createStyles>;
  post: MeetingPost;
  onPress: () => void;
}) {
  const temp = useMemo(() => calculateMannerTemp(post.host?.avgRate), [post.host?.avgRate]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.hostRow, { opacity: pressed ? 0.7 : 1 }]} hitSlop={6}>
      <View style={s.hostAvatar}>
        {post.host?.avatarUrl ? (
          <Image source={{ uri: post.host.avatarUrl }} style={s.fullSize} />
        ) : (
          <Ionicons name="person" size={ICON_SIZE.M} color={t.colors.textSub} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={s.rowCenter}>
          <Text style={[t.typography.titleSmall, { color: t.colors.textMain }]}>{post.host?.nickname ?? "알 수 없음"}</Text>
          <View style={s.badgeHost}>
            <Text style={s.badgeHostText}>HOST</Text>
          </View>
        </View>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>매너온도 {temp}°C</Text>
      </View>

      <Ionicons name="chevron-forward" size={ICON_SIZE.M} color={t.colors.textSub} />
    </Pressable>
  );
});

const InfoGrid = memo(function InfoGrid({
  t,
  s,
  post,
  dateInfo,
  capacity,
}: {
  t: Theme;
  s: ReturnType<typeof createStyles>;
  post: MeetingPost;
  dateInfo: ReturnType<typeof parseDateTime>;
  capacity: ReturnType<typeof getCapacityInfo>;
}) {
  const duration = useMemo(() => getDurationLabel(post.durationMinutes), [post.durationMinutes]);

  return (
    <View style={s.card}>
      <View style={s.gridRow}>
        <View style={s.gridIconBox}>
          <View style={s.calendarBox}>
            <View style={s.calendarHeader} />
            <View style={s.calendarBody}>
              <Text style={s.calendarText}>{dateInfo.day}</Text>
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[t.typography.titleSmall, { color: t.colors.textMain }]}>
            {dateInfo.fullDate} · {dateInfo.time}
          </Text>
          <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 2 }]}>소요시간: {duration}</Text>
        </View>
      </View>

      <View style={s.divider} />

      <View style={s.gridRow}>
        <View style={s.gridIconBox}>
          <Ionicons name="people-outline" size={ICON_SIZE.L} color={t.colors.icon?.default ?? t.colors.textMain} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={[s.rowCenter, { justifyContent: "space-between" }]}>
            <Text style={[t.typography.titleSmall, { color: t.colors.textMain }]}>
              {capacity.isLimited ? `${capacity.current} / ${capacity.total}명` : `${capacity.current}명 참여`}
            </Text>
            <Text style={[t.typography.labelSmall, { color: capacity.color, fontWeight: "800" }]}>{capacity.label}</Text>
          </View>

          {capacity.isLimited ? (
            <View style={s.capacityTrack}>
              <View style={[s.capacityFill, { width: `${capacity.percent}%`, backgroundColor: t.colors.primary }]} />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
});

const MapCard = memo(function MapCard({
  t,
  s,
  post,
  onPress,
}: {
  t: Theme;
  s: ReturnType<typeof createStyles>;
  post: MeetingPost;
  onPress: () => void;
}) {
  const lat = Number(post.location?.latitude);
  const lng = Number(post.location?.longitude);
  const valid = isValidLatLng(lat, lng);

  const region = useMemo(
    () => (valid ? { latitude: lat, longitude: lng, latitudeDelta: 0.003, longitudeDelta: 0.003 } : undefined),
    [lat, lng, valid]
  );

  return (
    <Pressable style={({ pressed }) => [s.card, { opacity: pressed ? 0.9 : 1 }]} onPress={onPress} disabled={!valid}>
      <View style={s.mapContainer}>
        {valid && region ? (
          <>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              region={region}
              scrollEnabled={false}
              zoomEnabled={false}
              pointerEvents="none"
            />
            <View style={s.mapPin}>
              <Ionicons name="location" size={ICON_SIZE.L} color={t.colors.primary} />
            </View>
          </>
        ) : (
          <View style={s.center}>
            <Ionicons name="map-outline" size={32} color={t.colors.disabled} />
            <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginTop: 6 }]}>위치 정보 없음</Text>
          </View>
        )}
      </View>

      <View style={s.mapFooter}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={[t.typography.titleSmall, { color: t.colors.textMain }]} numberOfLines={1}>
            {post.location?.name || "위치 미정"}
          </Text>

          {post.address || post.distanceText ? (
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 2 }]} numberOfLines={1}>
              {[post.address ?? undefined, post.distanceText].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </View>

        <Ionicons name="navigate-circle-outline" size={ICON_SIZE.XL} color={t.colors.primary} />
      </View>
    </Pressable>
  );
});

type CommentActions = {
  onPressAuthor?: (payload: CommentAuthorPayload) => void;
  onReply: (c: Comment) => void;
  onEdit: (c: Comment) => void;
  onDelete: (id: string) => void;
};

const CommentRow = memo(function CommentRow({
  t,
  s,
  item,
  post,
  currentUserId,
  actions,
}: {
  t: Theme;
  s: ReturnType<typeof createStyles>;
  item: Comment;
  post: MeetingPost;
  currentUserId: string;
  actions: CommentActions;
}) {
  const { id, nickname, avatarUrl, isHost } = useMemo(() => getAuthorInfo(item, post.host?.id), [item, post.host?.id]);

  const isMine = useMemo(() => String(id) === String(currentUserId), [id, currentUserId]);
  const replyMeta = useMemo(() => parseReplyPrefix(item.content), [item.content]);

  const isReply = !!replyMeta;
  const content = replyMeta ? replyMeta.body : item.content;

  const onPressAuthor = useCallback(() => {
    if (typeof actions.onPressAuthor === "function" && id) {
      actions.onPressAuthor({ id, nickname, avatarUrl });
    }
  }, [actions, id, nickname, avatarUrl]);

  return (
    <View style={isReply ? s.replyWrap : s.commentWrap}>
      {isReply ? <View style={s.replyLine} /> : null}

      <View style={s.rowTop}>
        <Pressable onPress={onPressAuthor} disabled={typeof actions.onPressAuthor !== "function"} hitSlop={8}>
          <View style={s.commentAvatar}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={s.fullSize} /> : <Ionicons name="person" size={18} color={t.colors.textSub} />}
          </View>
        </Pressable>

        <View style={{ flex: 1 }}>
          <View style={[s.commentBubble, isReply ? s.commentBubbleReply : null]}>
            <View style={s.rowBetween}>
              <View style={s.rowCenter}>
                <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]}>{nickname}</Text>
                {isHost ? (
                  <View style={s.badgeHost}>
                    <Text style={s.badgeHostText}>HOST</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>{timeAgo(item.createdAt)}</Text>
            </View>

            {isReply ? (
              <View style={[s.rowCenter, { marginTop: 6 }]}>
                <Ionicons name="return-down-forward" size={12} color={t.colors.textSub} style={{ marginRight: 4 }} />
                <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]} numberOfLines={1}>
                  @{replyMeta!.target}에게 답글
                </Text>
              </View>
            ) : null}

            <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, marginTop: 8, lineHeight: 20 }]}>{content}</Text>

            <View style={s.actionRow}>
              <Pressable onPress={() => actions.onReply(item)} style={s.actionBtn} hitSlop={8}>
                <Ionicons name="chatbubble-outline" size={14} color={t.colors.textSub} style={{ marginRight: 4 }} />
                <Text style={s.actionText}>답글</Text>
              </Pressable>

              {isMine ? (
                <>
                  <Pressable onPress={() => actions.onEdit(item)} style={s.actionBtn} hitSlop={8}>
                    <Ionicons name="create-outline" size={14} color={t.colors.textSub} style={{ marginRight: 4 }} />
                    <Text style={s.actionText}>수정</Text>
                  </Pressable>
                  <Pressable onPress={() => actions.onDelete(String(item.id))} style={s.actionBtn} hitSlop={8}>
                    <Ionicons name="trash-outline" size={14} color={t.colors.error} style={{ marginRight: 4 }} />
                    <Text style={[s.actionText, { color: t.colors.error }]}>삭제</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

// -------------------------------------------------------------------------
// 4) Main Component
// -------------------------------------------------------------------------
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
  const s = useMemo(() => createStyles(t), [t.mode]);

  const { meta, right } = useMemo(() => getMeetingStatusTokens(post), [post]);

  // ✅ 핵심: StatusPillToken[] 그대로 map 하되,
  // iconName이 없으면 “칩을 아예 렌더하지 않음”으로 타입/런타임 둘 다 안전
  const metaTokens = useMemo(() => normalizeStatusTokens(meta), [meta]);
  const rightTokens = useMemo(() => normalizeStatusTokens(right), [right]);

  const dateInfo = useMemo(() => parseDateTime(post.meetingTime), [post.meetingTime]);
  const capacity = useMemo(() => getCapacityInfo(post, t), [post.capacity, t]);

  const handleMapPress = useCallback(() => {
    const lat = Number(post.location?.latitude);
    const lng = Number(post.location?.longitude);
    if (!isValidLatLng(lat, lng)) return;

    const queryRaw = post.address || post.location?.name || `${lat},${lng}`;
    const query = encodeURIComponent(queryRaw);
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${query}&center=${lat},${lng}`;

    if (Platform.OS === "ios") {
      const appUrl = `comgooglemaps://?q=${query}&center=${lat},${lng}`;
      Linking.canOpenURL(appUrl)
        .then((supported) => Linking.openURL(supported ? appUrl : webUrl))
        .catch(() => Linking.openURL(webUrl));
      return;
    }

    const geoUrl = `geo:${lat},${lng}?q=${query}`;
    Linking.canOpenURL(geoUrl)
      .then((supported) => Linking.openURL(supported ? geoUrl : webUrl))
      .catch(() => Linking.openURL(webUrl));
  }, [post.location, post.address]);

  const [visibleCount, setVisibleCount] = useState(COMMENT_PAGE_SIZE);

  const visibleComments = useMemo(() => comments.slice(0, visibleCount), [comments, visibleCount]);
  const canLoadMore = comments.length > visibleCount;

  const commentActions: CommentActions = useMemo(
    () => ({
      onPressAuthor: onPressCommentAuthor,
      onReply,
      onEdit: onEditComment,
      onDelete: onDeleteComment,
    }),
    [onPressCommentAuthor, onReply, onEditComment, onDeleteComment]
  );

  const onPressLoadMore = useCallback(() => {
    setVisibleCount((v) => Math.min(v + COMMENT_PAGE_SIZE, comments.length));
  }, [comments.length]);

  return (
    <ScrollView
      ref={scrollViewRef}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: bottomPadding, backgroundColor: t.colors.background }}
      onContentSizeChange={(_, h) => onContentHeightChange(h)}
      onLayout={(e: LayoutChangeEvent) => onScrollViewHeightChange(e.nativeEvent.layout.height)}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {headerComponent ? <View style={s.headerContainer}>{headerComponent}</View> : null}

      <View style={s.headerSection}>
        <View style={s.tagRow}>
          <View style={s.tagItem}>
            <Badge label={post.category} tone="neutral" />
          </View>

          {metaTokens.map((m: StatusPillToken, i: number) => {
            if (!m) return null;
            if (!isValidIoniconName(m.iconName)) return null; // ✅ iconName undefined 방어
            return (
              <MetaChip
                key={`m-${i}`}
                t={t}
                s={s}
                iconName={m.iconName}
                label={m.label}
                tone={m.tone}
              />
            );
          })}

          {rightTokens.map((m: StatusPillToken, i: number) => {
            if (!m) return null;
            if (!isValidIoniconName(m.iconName)) return null; // ✅ iconName undefined 방어
            return (
              <MetaChip
                key={`r-${i}`}
                t={t}
                s={s}
                iconName={m.iconName}
                label={m.label}
                tone={m.tone}
              />
            );
          })}
        </View>

        <Text style={[t.typography.headlineMedium, { color: t.colors.textMain, marginTop: 6 }]}>{post.title}</Text>
      </View>

      <HostProfileRow t={t} s={s} post={post} onPress={onPressHostProfile} />

      <InfoGrid t={t} s={s} post={post} dateInfo={dateInfo} capacity={capacity} />

      <MapCard t={t} s={s} post={post} onPress={handleMapPress} />

      {post.joinMode === "APPROVAL" ? (
        <View style={s.conditionBox}>
          <View style={s.rowCenter}>
            <Ionicons name="checkmark-circle" size={ICON_SIZE.M} color={t.colors.point} style={{ marginRight: 6 }} />
            <Text style={[t.typography.labelLarge, { color: t.colors.point }]}>승인 후 참여 가능</Text>
          </View>
          <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, marginTop: 6, lineHeight: 20 }]}>
            {post.conditions || "호스트의 승인이 필요한 모임입니다."}
          </Text>
        </View>
      ) : null}

      <View style={s.section}>
        <Text style={[t.typography.titleMedium, s.sectionTitle]}>모임 소개</Text>
        <View style={s.contentBubble}>
          <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, lineHeight: 24 }]}>{post.content || "내용이 없습니다."}</Text>
        </View>
      </View>

      <View style={s.section}>
        <View style={s.rowBetween}>
          <Text style={[t.typography.titleMedium, s.sectionTitle]}>
            댓글 <Text style={{ color: t.colors.primary }}>{comments.length}</Text>
          </Text>
        </View>

        {comments.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color={t.colors.disabled} />
            <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, marginTop: 8 }]}>첫 댓글을 남겨보세요!</Text>
          </View>
        ) : (
          <View>
            {visibleComments.map((c: Comment) => (
              <CommentRow key={String(c.id)} t={t} s={s} item={c} post={post} currentUserId={currentUserId} actions={commentActions} />
            ))}

            {canLoadMore ? (
              <Pressable onPress={onPressLoadMore} style={({ pressed }) => [s.loadMoreBtn, { opacity: pressed ? 0.85 : 1 }]}>
                <Text style={s.loadMoreText}>더 보기</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <View style={s.composer}>
          {replyTarget || editingComment ? (
            <View style={s.composerHeader}>
              <Text style={[t.typography.labelSmall, { color: t.colors.textMain }]}>
                {replyTarget ? `@${getAuthorInfo(replyTarget).nickname} 답글` : "댓글 수정 중"}
              </Text>
              <Pressable onPress={onCancelInputMode} hitSlop={10}>
                <Ionicons name="close" size={ICON_SIZE.S} color={t.colors.textSub} />
              </Pressable>
            </View>
          ) : null}

          <View style={s.composerBody}>
            <TextInput
              ref={inputRef}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="댓글을 입력하세요..."
              placeholderTextColor={t.colors.textSub}
              style={[s.input, { color: t.colors.textMain }]}
              multiline
              onFocus={() => requestAnimationFrame(() => onFocusComposer())}
            />
            <Pressable
              onPress={onSubmitComment}
              disabled={!commentText.trim()}
              style={[s.sendBtn, { backgroundColor: commentText.trim() ? t.colors.primary : t.colors.disabled }]}
              hitSlop={8}
            >
              <Ionicons name="arrow-up" size={18} color="white" />
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}