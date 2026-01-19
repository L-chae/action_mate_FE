import React, { useEffect, useRef } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { Button } from "@/shared/ui/Button";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type Props = {
  t: ReturnType<typeof useAppTheme>;
  insetsBottom: number;
  isKeyboardVisible: boolean;

  membership: string; // "NONE" | "MEMBER" | "PENDING" | "HOST" | "CANCELED"
  canJoin: boolean;
  joinDisabledReason?: string;

  onJoin: () => void;
  onCancelJoin: () => void;
  onEnterChat: () => void;

  onLayoutHeight: (h: number) => void;
};

export function BottomBar({
  t,
  insetsBottom,
  isKeyboardVisible,

  membership,
  canJoin,
  joinDisabledReason,

  onJoin,
  onCancelJoin,
  onEnterChat,

  onLayoutHeight,
}: Props) {
  // 키보드가 올라와 있으면 하단 버튼 바를 숨김 (댓글 입력창 확보)
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
    // 1. 승인 대기 중 (PENDING)
    if (membership === "PENDING") {
      return (
        <Button
          title="승인 대기 중 (요청 취소)"
          variant="secondary"
          style={{
            backgroundColor: t.colors.neutral[200],
            borderColor: "transparent",
          }}
          // secondary variant는 보통 텍스트가 검정색이므로 별도 color 설정 불필요
          size="lg"
          onPress={onCancelJoin}
        />
      );
    }

    // 2. 참여 완료 (MEMBER 또는 HOST)
    if (membership === "MEMBER" || membership === "HOST") {
      return (
        <View style={{ flexDirection: "row", gap: 12 }}>
          {membership !== "HOST" && (
            <Button
              title="참여 취소"
              variant="secondary"
              style={{ flex: 1, borderColor: t.colors.neutral[300] }}
              onPress={onCancelJoin}
            />
          )}
          <Button
            title="대화방 입장"
            style={{ flex: 2 }}
            onPress={onEnterChat}
          />
        </View>
      );
    }

    // 3. 미참여 (NONE / CANCELED)
    return (
      <Button
        title={canJoin ? "참여하기" : joinDisabledReason || "참여 불가"}
        disabled={!canJoin}
        size="lg"
        onPress={() => {
          Keyboard.dismiss(); // 참여 버튼 누를 때 키보드 내림
          onJoin();
        }}
      />
    );
  };

  return (
    <View
      collapsable={false}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) lastMeasuredHeightRef.current = h;
        // 현재 숨김 상태가 아닐 때만 높이 업데이트
        if (!hidden) onLayoutHeight(h);
      }}
      style={[
        styles.wrap,
        {
          backgroundColor: t.colors.surface,
          borderTopColor: t.colors.neutral[200],
          // 숨김 처리 시 높이 0, 패딩 0
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