import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
//topbar의 알림 아이콘 공통 컴포넌트
type Props = {
    color: string;
    backgroundColor: string;
    size:number;
    onPress: () => void;
    dot?: boolean;
    count?: number; // count가 있으면 숫자, 없으면 dot
};

export default function NotiButton({ color, onPress, dot, count }: Props) {
    const showCount = typeof count === "number" && count > 0;
    const showDot = !showCount && !!dot;

    return (
        <Pressable onPress={onPress} hitSlop={10} style={{ padding: 4 }}>
            <View>
                {/* ✅ 아이콘 스타일 통일: 이름/사이즈 고정 */}
                <Ionicons name="notifications-outline" size={22} color={color} />

                {showDot && (
                    <View
                        style={{
                            position: "absolute",
                            right: -1,
                            top: -1,
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: "#FF3B30",
                        }}
                    />
                )}

                {showCount && (
                    <View
                        style={{
                            position: "absolute",
                            right: -6,
                            top: -6,
                            minWidth: 16,
                            height: 16,
                            paddingHorizontal: 4,
                            borderRadius: 999,
                            backgroundColor: "#FF3B30",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Text style={{ color: "white", fontSize: 10, fontWeight: "800" }}>
                            {count! > 99 ? "99+" : count}
                        </Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
}