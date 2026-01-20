// src/features/meetings/ui/ParticipantRatingItem.tsx (최종본)
// ✅ 별 UI(터치해서 0~5 정수 선택)는 유지
// ✅ 닉네임 아래: "3점"만 표시 (텍스트 별 ★★★ 제거)
// ✅ 호스트 표시: 상세페이지와 동일하게 shared Badge 사용 (label="HOST")

import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Badge } from "@/shared/ui/Badge";

type UserSummary = {
  id: string;
  nickname: string;
  photoUrl?: string;
  isHost?: boolean;
};

type Props = {
  user: UserSummary;
  rating: number; // ✅ 0 ~ 5 (정수)
  onChange: (nextRating: number) => void;

  disabled?: boolean;
  showValue?: boolean; // 기본 true
};

function clampInt(n: number, min: number, max: number) {
  const v = Math.round(n);
  return Math.max(min, Math.min(max, v));
}

export default function ParticipantRatingItem({
  user,
  rating,
  onChange,
  disabled = false,
  showValue = true,
}: Props) {
  const t = useAppTheme();
  const { colors, spacing, typography } = t;

  const safeRating = useMemo(() => clampInt(rating, 0, 5), [rating]);
  const filledStars = safeRating;

  const avatarSource = useMemo(() => {
    if (user.photoUrl) return { uri: user.photoUrl };
    return null;
  }, [user.photoUrl]);

  const initial = useMemo(
    () => user.nickname?.trim()?.[0]?.toUpperCase() ?? "?",
    [user.nickname]
  );

  const emit = (next: number) => {
    if (disabled) return;
    onChange(clampInt(next, 0, 5));
  };

  const onPressStar = (i: number) => {
    // ✅ 같은 점수 별을 다시 누르면 0으로 리셋
    if (safeRating === i) emit(0);
    else emit(i);
  };

  const renderStar = (i: number) => {
    const isFull = i <= filledStars;
    const iconName = isFull ? "star" : "star-border";
    const starColor = isFull ? colors.primary : colors.disabledFg;

    return (
      <Pressable
        key={i}
        disabled={disabled}
        onPress={() => onPressStar(i)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${user.nickname} ${i}점`}
        style={({ pressed }) => [
          styles.starHit,
          i !== 1 && styles.starHitGap,
          pressed && !disabled && { opacity: 0.7 },
        ]}
      >
        <MaterialIcons name={iconName} size={22} color={starColor} />
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.row,
        {
          borderRadius: spacing.radiusLg,
          borderWidth: spacing.borderWidth,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingVertical: 12,
          paddingHorizontal: spacing.pagePaddingH,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      {/* Avatar */}
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: colors.disabledBg,
            borderColor: colors.border,
            borderWidth: spacing.borderWidth,
          },
        ]}
      >
        {avatarSource ? (
          <Image source={avatarSource} style={styles.avatarImg} />
        ) : (
          <Text style={[styles.initial, { color: colors.textMain }]}>{initial}</Text>
        )}
      </View>

      {/* Name */}
      <View style={styles.nameCol}>
        <View style={styles.nameRow}>
          <Text
            style={[typography.bodyLarge, { color: colors.textMain, fontWeight: "700" }]}
            numberOfLines={1}
          >
            {user.nickname}
          </Text>

          {/* ✅ 상세페이지와 동일한 HOST 배지 */}
          {user.isHost ? (
            <View style={styles.hostBadgeWrap}>
              <Badge label="HOST" tone="primary" size="sm" />
            </View>
          ) : null}
        </View>

        {/* ✅ 닉네임 아래에는 숫자만 */}
        {showValue ? (
          <Text
            style={[
              typography.bodySmall,
              { color: colors.textSub, marginTop: 2, fontWeight: "600" },
            ]}
            numberOfLines={1}
          >
            {safeRating}점
          </Text>
        ) : null}
      </View>

      {/* Stars (평가 UI 유지) */}
      <View style={styles.stars}>{[1, 2, 3, 4, 5].map(renderStar)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarImg: { width: "100%", height: "100%" },
  initial: { fontSize: 16, fontWeight: "700" },

  nameCol: { minWidth: 92, flexShrink: 1 },
  nameRow: { flexDirection: "row", alignItems: "center" },

  hostBadgeWrap: { marginLeft: 8 },

  stars: { marginLeft: "auto", flexDirection: "row", alignItems: "center" },

  starHit: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  starHitGap: { marginLeft: 2 },
});
