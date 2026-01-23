// src/features/meetings/ui/ProfileModal.tsx
import React from "react";
import { Modal, View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors"; 
import type { HostSummary } from "../model/types";

// 🔥 [수정] 대문자로 변경: MannerTemperatureBar
function MannerTemperatureBar({ temp }: { temp: number }) {
  const t = useAppTheme();
  // 36.5도 기준
  const isHigh = temp >= 36.5;
  const color = isHigh ? t.colors.primary : t.colors.textSub;
  
  // 0~100도 범위 퍼센트
  const widthPercent = Math.min(100, Math.max(0, (temp / 100) * 100)); 
  const trackColor = t.colors.overlay?.[12] ?? t.colors.border;

  return (
    <View style={{ width: "100%", gap: 6 }}>
      <View style={{ height: 8, backgroundColor: trackColor, borderRadius: 4, overflow: "hidden" }}>
        <View style={{ width: `${widthPercent}%`, height: "100%", backgroundColor: color, borderRadius: 4 }} />
      </View>
      <Text style={[t.typography.bodySmall, { color: t.colors.textSub, textAlign: 'right' }]}>
        매너온도 상세
      </Text>
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

  // 색상 토큰
  const surfaceColor = t.colors.surface;
  const iconColor = t.colors.textSub;
  const dividerColor = t.colors.divider ?? t.colors.border;
  const boxBg = t.colors.overlay?.[6] ?? "#fafafa"; 
  const ratingColor = t.colors.ratingStar ?? "#FFB800"; 

  // 배경 (이미지 없을 때)
  const fallbackBg = user.avatarUrl ? "transparent" : t.colors.primary; 
  const fallbackText = "#FFFFFF";

  // ✅ 별점 계산
  const rawRating = ((user.mannerTemperature - 32) / 10) * 5;
  const rating = Math.max(0, Math.min(5, Number(rawRating.toFixed(1))));

  // ✅ 아이콘 배경색
  const iconCircleStar = withAlpha(ratingColor, 0.15);
  const iconCircleTemp = withAlpha(t.colors.primary, 0.15);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={[styles.card, { backgroundColor: surfaceColor }]}>
          {/* 닫기 버튼 */}
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={24} color={iconColor} />
          </Pressable>

          {/* 1. 프로필 이미지 */}
          <View style={[styles.avatarUrlContainer, { backgroundColor: fallbackBg, borderColor: t.colors.border }]}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarUrlImg} />
            ) : (
              <Text style={[t.typography.headlineMedium, { color: fallbackText, fontWeight: "bold" }]}>
                {user.nickname?.slice(0, 1) || "?"}
              </Text>
            )}
          </View>

          {/* 2. 닉네임 & 소개 */}
          <Text style={[t.typography.headlineSmall, { marginTop: 16, color: t.colors.textMain }]}>
            {user.nickname}
          </Text>
          <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, marginTop: 8, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 }]}>
            {`"${user.intro || "안녕하세요! 같이 즐겁게 활동해요."}"`}
          </Text>

          {/* 3. 스탯 정보 (별점 / 매너온도) */}
          <View style={styles.statsRow}>
            
            {/* ⭐ 별점 */}
            <View style={styles.statItem}>
              <View style={[styles.iconCircle, { backgroundColor: iconCircleStar }]}>
                <Ionicons name="star" size={24} color={ratingColor} />
              </View>
              <Text style={[t.typography.labelMedium, { marginTop: 8, color: t.colors.textSub }]}>별점</Text>
              <Text style={[t.typography.titleMedium, { color: t.colors.textMain, marginTop: 2, fontWeight: "700" }]}>
                {rating}
              </Text>
            </View>
            
            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            {/* 🔥 매너온도 */}
            <View style={styles.statItem}>
              <View style={[styles.iconCircle, { backgroundColor: iconCircleTemp }]}>
                <Ionicons name="thermometer" size={24} color={t.colors.primary} />
              </View>
              <Text style={[t.typography.labelMedium, { marginTop: 8, color: t.colors.textSub }]}>매너온도</Text>
              <Text style={[t.typography.titleMedium, { color: t.colors.textMain, marginTop: 2, fontWeight: "700" }]}>
                {user.mannerTemperature}°C
              </Text>
            </View>

          </View>

          {/* 4. 매너 온도 바 (시각적 표시) */}
          <View style={[styles.tempBox, { backgroundColor: boxBg }]}>
            {/* ✅ [수정] 대문자 컴포넌트 사용 */}
            <MannerTemperatureBar temp={user.mannerTemperature} />
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
    // 그림자
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
    padding: 4,
    zIndex: 1,
  },
  avatarUrlContainer: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 4,
    overflow: 'hidden',
    borderWidth: 1,
  },
  avatarUrlImg: { 
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
    width: 50, 
    height: 50, 
    borderRadius: 25, 
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
    paddingBottom: 16, 
    borderRadius: 16 
  },
});