import React from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  StyleSheet as RNStyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type LogoProps = {
  /** 예: "Action" */
  leftText: string;
  /** 예: "Mate" */
  rightText: string;
  /** 오른쪽 단어 색상(기본: primary) */
  rightColor?: string;
  /** 심볼 아이콘(선택) */
  iconName?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  style?: StyleProp<ViewStyle>;

  /** 일반 타이틀 (로고 없으면 이거 사용) */
  title?: string;
  titleStyle?: StyleProp<TextStyle>;

  /** ✅ 로고(워드마크) */
  logo?: LogoProps;

  showBorder?: boolean;

  showNoti?: boolean;
  showNotiDot?: boolean;
  onPressNoti?: () => void;

  showMenu?: boolean;
  onPressMenu?: () => void;
};

export default function TopBar({
  style,
  title,
  titleStyle,
  logo,
  showBorder = false,

  showNoti = true,
  showNotiDot = false,
  onPressNoti,

  showMenu = false,
  onPressMenu,
}: Props) {
  const t = useAppTheme();
  const flat = RNStyleSheet.flatten(style) as ViewStyle | undefined;

  const borderColor = t.colors.border ?? "#E5E7EB";
  const backgroundColor = flat?.backgroundColor ?? t.colors.background;

  return (
    <View
      style={[
        styles.topBar,
        {
          backgroundColor,
          paddingHorizontal: t.spacing.pagePaddingH ?? 20,
          borderBottomWidth: 1,
          borderBottomColor: showBorder ? borderColor : "transparent",
        },
        style,
      ]}
    >
      {/* ✅ LEFT: Logo or Title */}
      <View style={styles.leftArea}>
        {logo ? (
          <View style={styles.logoRow}>
            {logo.iconName ? (
              <Ionicons
                name={logo.iconName}
                size={18}
                color={t.colors.primary}
                style={{ marginRight: 6 }}
              />
            ) : null}

            <Text style={[styles.logoTextBase, { color: t.colors.textMain }]}>
              {logo.leftText}
            </Text>

            <Text
              style={[
                styles.logoTextBase,
                {
                  color: logo.rightColor ?? t.colors.primary,
                },
              ]}
            >
              {logo.rightText}
            </Text>
          </View>
        ) : title ? (
          <Text
            style={[
              t.typography.titleLarge,
              { color: t.colors.textMain },
              titleStyle,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : null}
      </View>

      {/* ✅ RIGHT: icons */}
      <View style={styles.rightArea}>
        {showNoti && (
          <Pressable
            onPress={onPressNoti ?? (() => Alert.alert("알림", "없음"))}
            hitSlop={12}
            style={styles.iconBtn}
          >
            <View>
              <Ionicons
                name="notifications-outline"
                size={24}
                color={t.colors.textMain}
              />
              {showNotiDot && (
                <View
                  style={[
                    styles.notiDot,
                    {
                      backgroundColor: t.colors.error,
                      borderColor: String(backgroundColor),
                    },
                  ]}
                />
              )}
            </View>
          </Pressable>
        )}

        {showMenu && (
          <Pressable
            onPress={onPressMenu ?? (() => Alert.alert("메뉴", "오픈"))}
            hitSlop={12}
            style={styles.iconBtn}
          >
            <Ionicons name="menu-outline" size={26} color={t.colors.textMain} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
  },
  leftArea: {
    flex: 1,
    justifyContent: "center",
  },
  rightArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  iconBtn: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  notiDot: {
    position: "absolute",
    right: 2,
    top: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
  },

  // ✅ 로고(워드마크) 스타일: 자간/굵기/크기 조절
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoTextBase: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
});
