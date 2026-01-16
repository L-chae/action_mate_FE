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
  leftText: string;
  rightText: string;
  rightColor?: string; // 필요하면 외부에서 override
  iconName?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  style?: StyleProp<ViewStyle>;

  title?: string;
  titleStyle?: StyleProp<TextStyle>;

  logo?: LogoProps;

  showBorder?: boolean;

  showBack?: boolean;
  onPressBack?: () => void;

  showNoti?: boolean;
  showNotiDot?: boolean;
  onPressNoti?: () => void;

  showMenu?: boolean;
  onPressMenu?: () => void;

  rightActionText?: string;
  rightActionTextStyle?: StyleProp<TextStyle>;
  onPressRightAction?: () => void;
  rightActionDisabled?: boolean;

  renderRight?: () => React.ReactNode;
};

export default function TopBar({
  style,
  title,
  titleStyle,
  logo,
  showBorder = false,

  showBack = false,
  onPressBack,

  showNoti = true,
  showNotiDot = false,
  onPressNoti,

  showMenu = false,
  onPressMenu,

  rightActionText,
  rightActionTextStyle,
  onPressRightAction,
  rightActionDisabled = false,

  renderRight,
}: Props) {
  const t = useAppTheme();
  const flat = RNStyleSheet.flatten(style) as ViewStyle | undefined;

  const backgroundColor = (flat?.backgroundColor as string) ?? t.colors.background;

  return (
    <View
      style={[
        styles.topBar,
        {
          backgroundColor,
          paddingHorizontal: t.spacing.pagePaddingH,
          borderBottomWidth: showBorder ? 1 : 0,
          borderBottomColor: showBorder ? t.colors.border : "transparent",
        },
        style,
      ]}
    >
      {/* LEFT */}
      <View style={styles.leftWrap}>
        {showBack && (
          <Pressable
            onPress={onPressBack ?? (() => Alert.alert("뒤로", "onPressBack 없음"))}
            hitSlop={12}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: pressed ? 0.85 : 1, marginRight: 4 },
            ]}
          >
            <Ionicons name="chevron-back" size={26} color={t.colors.icon.default} />
          </Pressable>
        )}

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
                  { color: logo.rightColor ?? t.colors.primary },
                ]}
              >
                {logo.rightText}
              </Text>
            </View>
          ) : title ? (
            <Text
              style={[t.typography.titleLarge, { color: t.colors.textMain }, titleStyle]}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}
        </View>
      </View>

      {/* RIGHT */}
      <View style={styles.rightArea}>
        {rightActionText ? (
          <Pressable
            disabled={rightActionDisabled}
            onPress={
              onPressRightAction ?? (() => Alert.alert("액션", "onPressRightAction 없음"))
            }
            hitSlop={12}
            style={({ pressed }) => [
              styles.textActionBtn,
              { opacity: rightActionDisabled ? 0.5 : pressed ? 0.85 : 1 },
            ]}
          >
            <Text
              style={[
                t.typography.bodySmall,
                { color: t.colors.primary, fontWeight: "700" },
                rightActionTextStyle,
              ]}
            >
              {rightActionText}
            </Text>
          </Pressable>
        ) : null}

        {renderRight ? renderRight() : null}

        {showNoti && (
          <Pressable
            onPress={onPressNoti ?? (() => Alert.alert("알림", "없음"))}
            hitSlop={12}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View>
              <Ionicons
                name="notifications-outline"
                size={24}
                color={t.colors.icon.default}
              />
              {showNotiDot && (
                <View
                  style={[
                    styles.notiDot,
                    {
                      backgroundColor: t.colors.error,
                      borderColor: backgroundColor,
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
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="menu-outline" size={26} color={t.colors.icon.default} />
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

  leftWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  leftArea: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
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

  textActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
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