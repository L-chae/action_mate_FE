import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "@/shared/ui/Button";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { MembershipStatus } from "@/features/meetings/model/types";

type Props = {
  t: ReturnType<typeof useAppTheme>;
  insetsBottom: number;
  isKeyboardVisible: boolean;

  membership: MembershipStatus;
  canJoin: boolean;
  joinDisabledReason?: string;

  pendingCount?: number;

  onJoin: () => void;
  onCancelJoin: () => void;
  onEnterChat: () => void;
  onManage?: () => void;

  onLayoutHeight: (h: number) => void;
};

export function BottomBar({
  t,
  insetsBottom,
  isKeyboardVisible,

  membership,
  canJoin,
  joinDisabledReason,
  pendingCount = 0,

  onJoin,
  onCancelJoin,
  onEnterChat,
  onManage,

  onLayoutHeight,
}: Props) {
  const hidden = isKeyboardVisible;
  const lastMeasuredHeightRef = useRef(0);

  useEffect(() => {
    onLayoutHeight(hidden ? 0 : lastMeasuredHeightRef.current);
  }, [hidden, onLayoutHeight]);

  const safeOnManage = useMemo(() => onManage ?? (() => {}), [onManage]);

  const renderButtons = () => {
    // 1) HOST
    if (membership === "HOST") {
      if (pendingCount > 0) {
        return (
          <View style={styles.row}>
            <Button
              title="대화방"
              variant="secondary"
              size="lg"
              style={{
                flex: 1,
                backgroundColor: t.colors.neutral?.[100] ?? t.colors.surface,
                borderColor: t.colors.neutral?.[300] ?? t.colors.border,
              }}
              onPress={onEnterChat}
            />
            <Button
              title={`승인 대기 ${pendingCount}명 확인`}
              size="lg"
              style={{ flex: 2 }}
              onPress={safeOnManage}
            />
          </View>
        );
      }

      return (
        <Button
          title="참여자 관리"
          variant="secondary"
          size="lg"
          style={{
            width: "100%",
            backgroundColor: t.colors.neutral?.[100] ?? t.colors.surface,
            borderColor: t.colors.neutral?.[300] ?? t.colors.border,
          }}
          onPress={safeOnManage}
        />
      );
    }

    // 2) REJECTED
    if (membership === "REJECTED") {
      return (
        <Button
          title="참여할 수 없는 모임입니다"
          disabled
          size="lg"
          style={{
            backgroundColor: t.colors.neutral?.[200] ?? t.colors.overlay?.[6] ?? t.colors.surface,
            borderColor: "transparent",
          }}
          onPress={() => {}}
        />
      );
    }

    // 3) PENDING
    if (membership === "PENDING") {
      return (
        <Button
          title="승인 대기 중 (요청 취소)"
          variant="secondary"
          size="lg"
          style={{
            backgroundColor: t.colors.neutral?.[200] ?? t.colors.overlay?.[6] ?? t.colors.surface,
            borderColor: "transparent",
          }}
          onPress={onCancelJoin}
        />
      );
    }

    // 4) MEMBER
    if (membership === "MEMBER") {
      return (
        <View style={styles.row}>
          <Button
            title="참여 취소"
            variant="secondary"
            size="lg"
            style={{ flex: 1, borderColor: t.colors.neutral?.[300] ?? t.colors.border }}
            onPress={onCancelJoin}
          />
          <Button title="대화방 입장" size="lg" style={{ flex: 2 }} onPress={onEnterChat} />
        </View>
      );
    }

    // 5) NONE (기본)
    return (
      <Button
        title={canJoin ? "참여하기" : (joinDisabledReason?.trim() ? joinDisabledReason : "참여 불가")}
        disabled={!canJoin}
        size="lg"
        onPress={onJoin}
      />
    );
  };

  return (
    <View
      collapsable={false}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) lastMeasuredHeightRef.current = h;
        if (!hidden) onLayoutHeight(h);
      }}
      style={[
        styles.wrap,
        {
          backgroundColor: t.colors.surface,
          borderTopColor: t.colors.neutral?.[200] ?? t.colors.border,
          height: hidden ? 0 : undefined,
          paddingBottom: hidden ? 0 : 12 + insetsBottom,
          paddingTop: hidden ? 0 : 12,
          overflow: "hidden",
          opacity: hidden ? 0 : 1,
        },
      ]}
      pointerEvents={hidden ? "none" : "auto"}
    >
      {renderButtons()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
});

/*
1) membership 타입을 MembershipStatus로 고정해서 상위(DetailScreen)에서 내려오는 API 상태값과 정확히 매칭되도록 수정.
2) theme 토큰(neutral/overlay) 옵셔널 체이닝 적용으로 런타임 크래시 방지.
3) onManage 미전달 시에도 버튼 동작이 안전하도록 safeOnManage로 처리.
*/
