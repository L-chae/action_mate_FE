import React from "react";
import { Modal, View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { HostSummary } from "../model/types";

// 🔥 매너 온도 바 (내부 컴포넌트)
function MannerTempBar({ temp }: { temp: number }) {
  const t = useAppTheme();
  // 36.5도 기준: 높으면 Primary(Coral), 낮으면 Gray
  const isHigh = temp >= 36.5;
  const color = isHigh ? t.colors.primary : t.colors.neutral[500];
  const widthPercent = Math.min(100, Math.max(0, (temp / 100) * 100)); // 0~100도 기준

  return (
    <View style={{ width: "100%", gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>매너온도</Text>
        <Text style={[t.typography.titleMedium, { color, fontWeight: "700" }]}>
          {temp}°C {isHigh ? "😊" : "😐"}
        </Text>
      </View>
      <View style={{ height: 8, backgroundColor: t.colors.neutral[200], borderRadius: 4, overflow: "hidden" }}>
        <View style={{ width: `${widthPercent}%`, height: "100%", backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

// 🟢 프로필 모달 메인
export function ProfileModal({ 
  visible, 
  user, 
  onClose 
}: { 
  visible: boolean; 
  user: HostSummary; 
  onClose: () => void;
}) {
  const t = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* 뒷배경 누르면 닫기 */}
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={[styles.card, { backgroundColor: t.colors.surface }]}>
          {/* 닫기 버튼 (우측 상단) */}
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={24} color={t.colors.textSub} />
          </Pressable>

          {/* 1. 프로필 이미지 */}
          <View style={[styles.avatarContainer, { backgroundColor: t.colors.neutral[100] }]}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={48} color={t.colors.neutral[400]} />
            )}
          </View>

          {/* 2. 닉네임 & 소개 */}
          <Text style={[t.typography.headlineSmall, { marginTop: 16, color: t.colors.textMain }]}>
            {user.nickname}
          </Text>
          
          {/* ✅ 소개글 (쌍따옴표 포함하여 출력) */}
          <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, marginTop: 8, textAlign: 'center', lineHeight: 20 }]}>
            {`"${user.intro || "자기소개가 없습니다."}"`}
          </Text>

          {/* 3. 스탯 정보 (칭찬 / 인증) */}
          <View style={styles.statsRow}>
            {/* 받은 칭찬 */}
            <View style={styles.statItem}>
              <View style={[styles.iconCircle, { backgroundColor: t.colors.primaryLight }]}>
                <Ionicons name="heart" size={20} color={t.colors.primary} />
              </View>
              <Text style={[t.typography.labelMedium, { marginTop: 6, color: t.colors.textSub }]}>받은 칭찬</Text>
              <Text style={[t.typography.titleMedium, { color: t.colors.textMain, marginTop: 2 }]}>
                {user.kudosCount}
              </Text>
            </View>
            
            <View style={[styles.divider, { backgroundColor: t.colors.neutral[200] }]} />

            {/* 본인 인증 */}
            <View style={styles.statItem}>
              <View style={[styles.iconCircle, { backgroundColor: t.colors.neutral[100] }]}>
                <Ionicons name="shield-checkmark" size={20} color={t.colors.success} />
              </View>
              <Text style={[t.typography.labelMedium, { marginTop: 6, color: t.colors.textSub }]}>인증 완료</Text>
              <Text style={[t.typography.titleMedium, { color: t.colors.textMain, marginTop: 2 }]}>
                본인
              </Text>
            </View>
          </View>

          {/* 4. 매너 온도 바 */}
          <View style={[styles.tempBox, { backgroundColor: t.colors.neutral[50] }]}>
            <MannerTempBar temp={user.mannerTemp} />
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "rgba(0,0,0,0.5)" 
  },
  backdrop: { 
    position: "absolute", 
    width: "100%", 
    height: "100%" 
  },
  card: { 
    width: "85%", 
    maxWidth: 340,
    borderRadius: 24, 
    padding: 24, 
    alignItems: "center", 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  closeBtn: { 
    position: "absolute", 
    right: 16, 
    top: 16, 
    padding: 4 
  },
  avatarContainer: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 4,
    overflow: 'hidden'
  },
  avatarImg: { 
    width: "100%", 
    height: "100%" 
  },
  statsRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    width: "100%", 
    justifyContent: "space-evenly", 
    marginVertical: 24 
  },
  statItem: { 
    alignItems: "center",
    width: 80 
  },
  iconCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  divider: { 
    width: 1, 
    height: 40 
  },
  tempBox: { 
    width: "100%", 
    padding: 20, 
    borderRadius: 16 
  },
});