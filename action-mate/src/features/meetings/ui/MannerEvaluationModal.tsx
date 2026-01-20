// src/features/meetings/ui/MannerEvaluationModal.tsx (최종본)
// ✅ 별 UI로 0~5 정수 평가
// ✅ hostId 받아서 호스트만 "호스트" 배지 표시 (ParticipantRatingItem의 user.isHost 사용)
// ✅ 초기값 0점
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/Button";

import ParticipantRatingItem from "./ParticipantRatingItem";

type Participant = {
  id: string;
  nickname: string;
  photoUrl?: string;
};

type Props = {
  visible: boolean;
  participants: Participant[];
  hostId?: string; // ✅ 추가: 호스트 표시용

  /** ✅ 기본값: 0 (정수만) */
  initialRating?: number;

  /** 평가 제출 */
  onSubmit: (evaluations: { targetUserId: string; rating: number }[]) => Promise<void> | void;

  /** 닫기(부모에서 visible=false 처리) */
  onClose?: () => void;

  /** 옵션 */
  title?: string;
  subtitle?: string;
  disableClose?: boolean; // true면 바깥/뒤로가기 닫기 방지(기본 true)
};

function clampInt(n: number, min: number, max: number) {
  const v = Math.round(n);
  return Math.max(min, Math.min(max, v));
}

export default function MannerEvaluationModal({
  visible,
  participants,
  hostId,
  initialRating = 0,
  onSubmit,
  onClose,
  title = "오늘 모임 어떠셨나요?",
  subtitle = "함께한 분들을 평가해주세요",
  disableClose = true,
}: Props) {
  const t = useAppTheme();
  const { colors, spacing, typography } = t;
  const insets = useSafeAreaInsets();

  const [submitting, setSubmitting] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  // 모달이 열릴 때 참여자 목록 기준으로 초기화
  useEffect(() => {
    if (!visible) return;
    const init: Record<string, number> = {};
    for (const p of participants) init[p.id] = clampInt(initialRating, 0, 5);
    setRatings(init);
    setSubmitting(false);
  }, [visible, participants, initialRating]);

  const evaluations = useMemo(() => {
    return participants.map((p) => ({
      targetUserId: p.id,
      rating: clampInt(ratings[p.id] ?? initialRating, 0, 5),
    }));
  }, [participants, ratings, initialRating]);

  const canSubmit = participants.length > 0;

  const handleRequestClose = () => {
    if (disableClose) return;
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    try {
      setSubmitting(true);
      await onSubmit(evaluations);
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  const setUserRating = (userId: string, next: number) => {
    setRatings((prev) => ({ ...prev, [userId]: clampInt(next, 0, 5) }));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleRequestClose}
      statusBarTranslucent={Platform.OS === "android"}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={handleRequestClose} disabled={disableClose} />

      {/* Sheet */}
      <View
        style={[
          styles.sheet,
          {
            left: spacing.pagePaddingH,
            right: spacing.pagePaddingH,
            bottom: Math.max(12, insets.bottom),
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: spacing.borderWidth,
            borderRadius: spacing.radiusLg,
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.pagePaddingH }]}>
          <Text style={[typography.titleLarge, { color: colors.textMain }]}>{title}</Text>
          <Text style={[typography.bodySmall, { color: colors.textSub, marginTop: 6 }]}>
            {subtitle}
          </Text>
        </View>

        {/* List */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: spacing.pagePaddingH, paddingBottom: 12 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {participants.map((p) => (
            <View key={p.id} style={styles.itemWrap}>
              <ParticipantRatingItem
                user={{ ...p, isHost: !!hostId && p.id === hostId }}
                rating={ratings[p.id] ?? initialRating}
                onChange={(r) => setUserRating(p.id, r)}
                disabled={submitting}
                showValue
              />
            </View>
          ))}

          {participants.length === 0 && (
            <View
              style={[
                styles.empty,
                {
                  backgroundColor: colors.disabledBg,
                  borderColor: colors.border,
                  borderWidth: spacing.borderWidth,
                  borderRadius: spacing.radiusLg,
                  padding: spacing.pagePaddingH,
                },
              ]}
            >
              <Text style={[typography.bodySmall, { color: colors.textSub, fontWeight: "600" }]}>
                평가할 참여자가 없어요.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: spacing.pagePaddingH,
              paddingBottom: Math.max(12, insets.bottom),
            },
          ]}
        >
          <Button
            title="평가 완료"
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={submitting}
            variant="primary"
            size="lg"
          />

          {!disableClose && (
            <View style={{ marginTop: 10 }}>
              <Button
                title="나중에"
                onPress={onClose}
                disabled={submitting}
                variant="secondary"
                size="md"
              />
            </View>
          )}

          {submitting ? (
            <View style={{ marginTop: 8, alignItems: "center" }}>
              <ActivityIndicator color={colors.disabledFg} />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    overflow: "hidden",
    maxHeight: "78%",
  },

  header: {
    paddingTop: 16,
    paddingBottom: 12,
  },

  list: {},
  listContent: {
    paddingBottom: 12,
  },
  itemWrap: {
    marginBottom: 10, // ✅ RN 안전: gap 대신
  },

  empty: {
    alignItems: "center",
    justifyContent: "center",
  },

  footer: {
    paddingTop: 10,
  },
});
