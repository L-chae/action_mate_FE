import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type Props = {
  /** 현재 점수 (0 ~ max) */
  value: number;
  /** 점수 변경 콜백 */
  onChange: (v: number) => void;
  /** 별 크기 (기본값: 32) */
  size?: number;
  /** 최대 점수 (기본값: 5) */
  max?: number;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 컨테이너 스타일 */
  style?: ViewStyle;
};

// ----------------------------------------------------------------------
// ✅ 개별 별 아이콘 컴포넌트 (애니메이션 분리)
// ----------------------------------------------------------------------
const StarItem = ({
  filled,
  onPress,
  size,
  disabled,
  colorFilled,
  colorEmpty,
}: {
  filled: boolean;
  onPress: () => void;
  size: number;
  disabled: boolean;
  colorFilled: string;
  colorEmpty: string;
}) => {
  // 애니메이션 값 (크기 조절용)
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (disabled) return;
    
    // 클릭 시 튕기는 애니메이션 (Scale 1 -> 0.8 -> 1.2 -> 1)
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={8} // 터치 영역 확장
      style={({ pressed }) => ({
        opacity: disabled ? 0.5 : 1,
      })}
      // 접근성 설정
      accessibilityRole="button"
      accessibilityLabel={filled ? "채워진 별" : "비어있는 별"}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={filled ? "star" : "star-outline"}
          size={size}
          color={filled ? colorFilled : colorEmpty}
        />
      </Animated.View>
    </Pressable>
  );
};

// ----------------------------------------------------------------------
// ✅ 메인 컴포넌트
// ----------------------------------------------------------------------
export default function StarRating({
  value,
  onChange,
  size = 32, // 터치하기 좋게 조금 더 키움
  max = 5,
  disabled = false,
  style,
}: Props) {
  const t = useAppTheme();
  
  // 별 배열 생성 (1 ~ max)
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <View 
      style={[styles.row, style]}
      // 접근성: 전체 그룹에 대한 설명
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`별점 평가: ${max}점 만점에 ${value}점`}
      accessibilityValue={{ min: 0, max, now: value }}
    >
      {stars.map((s) => {
        const filled = s <= value;
        return (
          <StarItem
            key={s}
            filled={filled}
            size={size}
            disabled={disabled}
            colorFilled={t.colors.ratingStar} // ThemeColors의 ratingStar 사용
            colorEmpty={t.colors.icon.muted}  // 비어있을 땐 회색
            onPress={() => onChange(s)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // 별 사이 간격 (RN 0.71+)
  },
});