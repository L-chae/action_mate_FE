import { useEffect, useRef, useState } from "react";
import { Keyboard, LayoutAnimation, Platform, KeyboardEvent } from "react-native";

type KeyboardConfig = {
  onShow?: (height: number) => void;
  onHide?: () => void;
  disableAnimation?: boolean;
};

/**
 * ✅ 키보드 상태 및 높이를 관리하는 최적화된 Hook
 * - LayoutAnimation을 내장하여 부드러운 전환 지원
 * - 콜백 함수가 변경되어도 리스너를 재등록하지 않음 (Ref 패턴)
 */
export function useKeyboardAwareScroll(config?: KeyboardConfig) {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ✅ 최신 콜백을 ref에 저장 (useEffect 의존성 제거 목적)
  const onShowRef = useRef(config?.onShow);
  const onHideRef = useRef(config?.onHide);
  const disableAnimationRef = useRef(config?.disableAnimation);

  // 렌더링마다 ref 업데이트
  useEffect(() => {
    onShowRef.current = config?.onShow;
    onHideRef.current = config?.onHide;
    disableAnimationRef.current = config?.disableAnimation;
  });

  useEffect(() => {
    const animate = () => {
      if (!disableAnimationRef.current) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    };

    const handleShow = (e: KeyboardEvent) => {
      const height = e.endCoordinates.height;
      animate();
      setKeyboardVisible(true);
      setKeyboardHeight(height);
      onShowRef.current?.(height);
    };

    const handleHide = () => {
      animate();
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      onHideRef.current?.();
    };

    // ✅ iOS는 Will, Android는 Did 이벤트를 사용하는 것이 자연스러움
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, handleShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []); // ✅ 의존성 배열을 비워 리스너가 한 번만 등록되도록 보장

  return { isKeyboardVisible, keyboardHeight };
}