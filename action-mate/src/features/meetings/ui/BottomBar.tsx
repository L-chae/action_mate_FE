import React, { useEffect, useRef } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { Button } from "@/shared/ui/Button";

export function BottomBar({
  t,
  insetsBottom,
  isKeyboardVisible,

  membership, // "NONE" | "MEMBER" | "PENDING" | "HOST" | "CANCELED"
  canJoin,
  joinDisabledReason,

  onJoin,
  onCancelJoin,
  onEnterChat,

  onLayoutHeight,
}: {
  t: any;
  insetsBottom: number;
  isKeyboardVisible: boolean;

  membership: string;
  canJoin: boolean;
  joinDisabledReason?: string;

  onJoin: () => void;
  onCancelJoin: () => void;
  onEnterChat: () => void;

  onLayoutHeight: (h: number) => void;
}) {
  const hidden = isKeyboardVisible;
  const lastMeasuredHeightRef = useRef(0);

  useEffect(() => {
    if (hidden) {
      onLayoutHeight(0);
    } else {
      onLayoutHeight(lastMeasuredHeightRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  const renderButtons = () => {
    // 1. 승인 대기 중 (PENDING)
    if (membership === "PENDING") {
      return (
        <Button
          title="승인 대기 (요청 취소)"
          variant="secondary"
          // ✅ 오류 수정: textStyle 제거
          // variant="secondary"가 적용되면 보통 검은 글씨가 나옵니다.
          // 배경색만 회색으로 덮어씌워서 눈에 띄게 만듭니다.
          style={{ 
            backgroundColor: t.colors.neutral[200] ?? "#E5E7EB", 
            borderColor: "transparent",
          }}
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
              style={{ flex: 1 }}
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

    // 3. 미참여
    return (
      <Button
        title={canJoin ? "참여하기" : joinDisabledReason || "참여 불가"}
        disabled={!canJoin}
        size="lg"
        onPress={() => {
          Keyboard.dismiss();
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
        onLayoutHeight(hidden ? 0 : h);
      }}
      style={[
        styles.wrap,
        {
          backgroundColor: t.colors.surface,
          borderTopColor: t.colors.neutral[200],
          height: hidden ? 0 : undefined,
          paddingBottom: hidden ? 0 : 12 + insetsBottom,
          paddingTop: hidden ? 0 : 8,
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
  },
});