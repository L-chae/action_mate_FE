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
import NotiButton from "@/shared/ui/NotiButton";

type LogoProps = {
  leftText: string;
  rightText: string;
  rightColor?: string;
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

  // ✅ 추가: 설정 버튼
  showSettings?: boolean;
  onPressSettings?: () => void;
  settingsIconName?: keyof typeof Ionicons.glyphMap; // 기본: settings-outline

  showMenu?: boolean;
  onPressMenu?: () => void;

  rightActionText?: string;
  rightActionTextStyle?: StyleProp<TextStyle>;
  onPressRightAction?: () => void;
  rightActionDisabled?: boolean;

  renderRight?: () => React.ReactNode;

  keepDefaultRight?: boolean;
};

export default function TopBar({
  style,
  title,
  titleStyle,
  logo,
  showBorder = false,

  showBack = false,
  onPressBack,

  showNoti = false,
  showNotiDot = false,
  onPressNoti,

  // ✅ settings default
  showSettings = false,
  onPressSettings,
  settingsIconName = "settings-outline",

  showMenu = false,
  onPressMenu,

  rightActionText,
  rightActionTextStyle,
  onPressRightAction,
  rightActionDisabled = false,

  renderRight,
  keepDefaultRight = false,
}: Props) {
  const t = useAppTheme();
  const flat = RNStyleSheet.flatten(style) as ViewStyle | undefined;

  const backgroundColor = (flat?.backgroundColor as string) ?? t.colors.background;

  const hideDefaultRight = !!renderRight && !keepDefaultRight;

  const shouldShowNoti = showNoti && !hideDefaultRight;
  const shouldShowSettings = showSettings && !hideDefaultRight;
  const shouldShowMenu = showMenu && !hideDefaultRight;

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

              <Text style={[styles.logoTextBase, { color: t.colors.textMain }]}>{logo.leftText}</Text>
              <Text style={[styles.logoTextBase, { color: logo.rightColor ?? t.colors.primary }]}>
                {logo.rightText}
              </Text>
            </View>
          ) : title ? (
            <Text style={[t.typography.titleLarge, { color: t.colors.textMain }, titleStyle]} numberOfLines={1}>
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
            onPress={onPressRightAction ?? (() => Alert.alert("액션", "onPressRightAction 없음"))}
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

        {renderRight ? <View style={{ marginLeft: 6 }}>{renderRight()}</View> : null}

{/*   ✅ 알림 */}
        {shouldShowNoti && (
          <View style={[styles.iconWrap, { marginLeft: 6 }]}>
            <NotiButton
              color={t.colors.icon.default}
              backgroundColor={backgroundColor}
              onPress={onPressNoti ?? (() => Alert.alert("알림", "없음"))}
              dot={showNotiDot}
              size={24}
            />
          </View>
        )}
{/* ✅ 설정 */}
        {shouldShowSettings && (
          <Pressable
            onPress={onPressSettings ?? (() => Alert.alert("설정", "onPressSettings 없음"))}
            hitSlop={12}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: pressed ? 0.85 : 1, marginLeft: 6 },
            ]}
          >
            <Ionicons name={settingsIconName} size={24} color={t.colors.icon.default} />
          </Pressable>
        )}

        {/* ✅ 메뉴 */}
        {shouldShowMenu && (
          <Pressable
            onPress={onPressMenu ?? (() => Alert.alert("메뉴", "오픈"))}
            hitSlop={12}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.85 : 1, marginLeft: 6 }]}
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
   iconBtn: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrap: {
    padding: 4, 
    justifyContent: "center",
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
  },

  textActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
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