import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "@/shared/ui/Button";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type Props = {
  t: ReturnType<typeof useAppTheme>;
  insetsBottom: number;
  isKeyboardVisible: boolean;

  membership: string;
  canJoin: boolean;
  joinDisabledReason?: string;
  
  // ✅ 승인 대기 인원 수 (호스트용)
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
    if (hidden) {
      onLayoutHeight(0);
    } else {
      onLayoutHeight(lastMeasuredHeightRef.current);
    }
  }, [hidden, onLayoutHeight]);

  const renderButtons = () => {
    // 1. [HOST] 호스트인 경우
    if (membership === "HOST") {
      // 🚨 Case A: 승인 대기자가 있을 때 (강조 상태)
      if (pendingCount > 0) {
        return (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button
              title="대화방"
              variant="secondary"
              style={{ 
                flex: 1, 
                backgroundColor: t.colors.neutral[100], 
                borderColor: t.colors.neutral[300] 
              }}
              onPress={onEnterChat}
            />
            <Button
              title={`승인 대기 ${pendingCount}명 확인`}
              style={{ flex: 2 }}
              onPress={onManage || (() => {})}
            />
          </View>
        );
      }

      // 😌 Case B: 대기자가 없을 때 (참여자 관리만 표시)
      return (
        <Button
          title="참여자 관리"
          variant="secondary"
          size="lg"
          style={{ 
            width: "100%",
            backgroundColor: t.colors.neutral[100], 
            borderColor: t.colors.neutral[300] 
          }}
          onPress={onManage || (() => {})}
        />
      );
    }

    // 2. [REJECTED] 거절됨
    if (membership === "REJECTED") {
      return (
        <Button
          title="참여할 수 없는 모임입니다"
          disabled
          size="lg"
          style={{ backgroundColor: t.colors.neutral[200], borderColor: "transparent" }}
          onPress={() => {}} 
        />
      );
    }

    // 3. [PENDING] 승인 대기 중
    if (membership === "PENDING") {
      return (
        <Button
          title="승인 대기 중 (요청 취소)"
          variant="secondary"
          style={{ backgroundColor: t.colors.neutral[200], borderColor: "transparent" }}
          size="lg"
          onPress={onCancelJoin}
        />
      );
    }

    // 4. [MEMBER] 참여 완료
    if (membership === "MEMBER") {
      return (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Button
            title="참여 취소"
            variant="secondary"
            style={{ flex: 1, borderColor: t.colors.neutral[300] }}
            onPress={onCancelJoin}
          />
          <Button
            title="대화방 입장"
            style={{ flex: 2 }}
            onPress={onEnterChat}
          />
        </View>
      );
    }

    // 5. [NONE] 미참여
    return (
      <Button
        title={canJoin ? "참여하기" : joinDisabledReason || "참여 불가"}
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
          borderTopColor: t.colors.neutral[200],
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
});