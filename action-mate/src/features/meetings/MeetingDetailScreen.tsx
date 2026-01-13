import React, { useEffect, useState } from "react";
import { 
  Alert, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  View, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AppLayout from "@/shared/ui/AppLayout";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import { 
  cancelJoin, 
  cancelMeeting, 
  getMeeting, 
  joinMeeting, 
  updateHostMemo 
} from "./meetingService";
import type { MeetingPost } from "./types";
import { ProfileDetailModal } from "./components/ProfileDetailModal";

export default function MeetingDetailScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [post, setPost] = useState<MeetingPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [memoDraft, setMemoDraft] = useState("");
  
  // ✅ 프로필 모달 상태 추가
  const [profileVisible, setProfileVisible] = useState(false);

  // 데이터 로드
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const m = await getMeeting(String(id));
        if (!alive) return;
        setPost(m);
        setMemoDraft(m?.hostMemo ?? "");
      } catch (e) {
        console.error("Failed to load meeting:", e);
        Alert.alert("오류", "모임 정보를 불러오지 못했습니다.");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [id, router]);

  if (loading || !post) {
    return (
      <AppLayout>
        <Stack.Screen options={{ title: "", headerBackTitle: "뒤로" }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={t.colors.primary} />
        </View>
      </AppLayout>
    );
  }

  const membership = post.myState?.membershipStatus ?? "NONE";
  const canJoin = post.myState?.canJoin ?? (post.status === "OPEN");

  const handleJoin = async () => {
    const r = await joinMeeting(post.id);
    setPost(r.post);
    if (r.membershipStatus === "JOINED") {
      Alert.alert("환영합니다! 🎉", "모임방으로 이동할까요?", [
        { text: "나중에", style: "cancel" },
        { text: "이동", onPress: () => router.push(`/chat/${post.id}` as any) },
      ]);
    } else if (r.membershipStatus === "PENDING") {
      Alert.alert("신청 완료", "호스트의 승인을 기다려주세요.");
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: "",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: t.colors.background },
        }} 
      />

      {/* ✅ 프로필 상세 모달 (데이터가 있을 때만 렌더링) */}
      {post.host && (
        <ProfileDetailModal 
          visible={profileVisible} 
          user={post.host} 
          onClose={() => setProfileVisible(false)} 
        />
      )}

      <AppLayout padded={false}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : undefined} 
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
            {/* 1. 이미지/지도 Placeholder */}
            <View style={[styles.mapPlaceholder, { backgroundColor: t.colors.neutral[100] }]}>
              <Ionicons name="map" size={48} color={t.colors.neutral[300]} />
              <Text style={[t.typography.bodySmall, { color: t.colors.neutral[400], marginTop: 8 }]}>
                지도 미리보기
              </Text>
            </View>

            <View style={{ paddingHorizontal: t.spacing.pagePaddingH, paddingTop: 20 }}>
              
              {/* ✅ 2. 호스트 프로필 섹션 (New) */}
              <Pressable 
                onPress={() => setProfileVisible(true)}
                style={({ pressed }) => [
                  styles.hostRow, 
                  { 
                    backgroundColor: t.colors.surface, 
                    borderColor: t.colors.neutral[100],
                    opacity: pressed ? 0.7 : 1 
                  }
                ]}
              >
                {/* 아바타 */}
                <View style={[styles.hostAvatar, { backgroundColor: t.colors.neutral[100] }]}>
                  {post.host?.avatarUrl ? (
                    <Image source={{ uri: post.host.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                  ) : (
                    <Ionicons name="person" size={20} color={t.colors.neutral[400]} />
                  )}
                </View>

                {/* 정보 */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[t.typography.labelLarge, { color: t.colors.textMain }]}>
                      {post.host?.nickname}
                    </Text>
                    <View style={{ backgroundColor: t.colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: t.colors.primary, fontWeight: '700' }}>HOST</Text>
                    </View>
                  </View>
                  <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                    매너온도 {post.host?.mannerTemp}°C · 칭찬 {post.host?.kudosCount}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color={t.colors.neutral[400]} />
              </Pressable>


              {/* 3. 헤더: 카테고리 & 제목 */}
              <View style={styles.headerSection}>
                <View style={styles.badgeRow}>
                  <Badge label={post.category} tone="default" />
                  <Badge 
                    label={post.joinMode === "INSTANT" ? "⚡ 선착순" : "🙋 승인제"} 
                    tone="primary" 
                  />
                  {post.status !== "OPEN" && <Badge label={post.status} tone="warning" />}
                </View>
                <Text style={[t.typography.headlineMedium, { marginTop: 12, color: t.colors.textMain }]}>
                  {post.title}
                </Text>
              </View>

              {/* 4. 정보 요약 박스 */}
              <View style={[styles.infoBox, { backgroundColor: t.colors.neutral[50], borderColor: t.colors.neutral[100] }]}>
                {/* 시간 */}
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={20} color={t.colors.textMain} />
                  <View style={styles.infoTextCtx}>
                    <Text style={t.typography.titleSmall}>{post.meetingTimeText}</Text>
                    <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>
                      약 {post.durationHours}시간 예정
                    </Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: t.colors.neutral[200] }]} />
                {/* 장소 */}
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={20} color={t.colors.textMain} />
                  <View style={styles.infoTextCtx}>
                    <Text style={t.typography.titleSmall}>{post.locationText}</Text>
                    <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>
                      {post.distanceText} · 상세 위치는 참여 후 공개
                    </Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: t.colors.neutral[200] }]} />
                {/* 인원 */}
                <View style={styles.infoRow}>
                  <Ionicons name="people-outline" size={20} color={t.colors.textMain} />
                  <View style={styles.infoTextCtx}>
                    <Text style={t.typography.titleSmall}>
                      {post.capacityJoined} / {post.capacityTotal}명 참여 중
                    </Text>
                    {post.capacityTotal - post.capacityJoined <= 1 && post.status === "OPEN" ? (
                       <Text style={[t.typography.labelSmall, { color: t.colors.error }]}>마감 임박!</Text>
                    ) : (
                      <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>아직 자리가 있어요</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* 5. 호스트 메모 */}
              <View style={styles.section}>
                <Text style={[t.typography.titleMedium, { marginBottom: 12 }]}>호스트의 한마디</Text>
                <View style={[styles.bubble, { backgroundColor: t.colors.primaryLight }]}>
                  <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, lineHeight: 22 }]}>
                    {`"${post.hostMemo || "별도의 공지사항이 없습니다. 편하게 오세요!"}"`}
                  </Text>
                  <View style={[styles.bubbleTail, { borderTopColor: t.colors.primaryLight }]} />
                </View>
              </View>

              {/* --- 호스트/개발자 모드 --- */}
              <View style={[styles.devBox, { borderColor: t.colors.neutral[200] }]}>
                <Text style={[t.typography.labelSmall, { color: t.colors.neutral[400], marginBottom: 8 }]}>
                  🛠 호스트/개발자 모드
                </Text>
                <TextInput
                  value={memoDraft}
                  onChangeText={setMemoDraft}
                  placeholder="메모 수정..."
                  style={[styles.input, { backgroundColor: t.colors.background, borderColor: t.colors.neutral[300] }]}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Button 
                    title="메모 저장" size="sm" variant="secondary"
                    onPress={async () => {
                      const r = await updateHostMemo(post.id, memoDraft.trim());
                      setPost(r.post);
                      Alert.alert("메모 수정됨");
                    }} 
                  />
                  <Button 
                    title="모임 취소" size="sm" variant="danger"
                    onPress={async () => {
                      const r = await cancelMeeting(post.id);
                      setPost(r.post);
                    }} 
                  />
                </View>
              </View>
              
              <View style={{ height: 100 }} /> 
            </View>
          </ScrollView>

          {/* Sticky Bottom Bar */}
          <View style={[styles.bottomBar, { backgroundColor: t.colors.surface, borderTopColor: t.colors.neutral[200] }]}>
            {membership === "JOINED" ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button 
                  title="참여 취소" variant="secondary" style={{ flex: 1 }}
                  onPress={async () => setPost((await cancelJoin(post.id)).post)}
                />
                <Button 
                  title="대화방 입장" style={{ flex: 2 }}
                  onPress={() => router.push(`/chat/${post.id}` as any)}
                />
              </View>
            ) : membership === "PENDING" ? (
              <Button 
                title="승인 대기중 (취소하기)" variant="secondary"
                onPress={async () => setPost((await cancelJoin(post.id)).post)}
              />
            ) : (
              <Button 
                title={canJoin ? "참여하기" : post.myState?.reason || "참여 불가"} 
                disabled={!canJoin} size="lg"
                onPress={handleJoin}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </AppLayout>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  mapPlaceholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  // ✅ 호스트 프로필 섹션 스타일
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  hostAvatar: {
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: "center", 
    alignItems: "center",
    marginRight: 12,
  },
  headerSection: { marginBottom: 24 },
  badgeRow: { flexDirection: "row", gap: 8 },
  infoBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoTextCtx: { marginLeft: 14, gap: 2 },
  divider: { height: 1, marginVertical: 16, marginLeft: 34 },
  section: { marginBottom: 32 },
  bubble: {
    padding: 20,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  bubbleTail: {
    position: "absolute",
    bottom: -10,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  devBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    opacity: 0.8,
  },
  input: { borderWidth: 1, borderRadius: 8, padding: 10 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 10,
  },
});