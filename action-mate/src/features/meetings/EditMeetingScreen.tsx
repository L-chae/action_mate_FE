import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import MeetingForm from "./ui/MeetingForm";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingParams } from "@/features/meetings/model/types";

export default function EditMeetingScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [initialData, setInitialData] = useState<Partial<MeetingParams> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 1. 기존 데이터 불러오기
  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      try {
        const data = await meetingApi.getMeeting(id);
        
        // 서버 데이터를 폼 데이터 포맷으로 변환
        setInitialData({
          title: data.title,
          category: data.category,
          meetingTimeIso: data.meetingTime, // 기존 시간
          locationText: data.locationText,
          locationLat: data.locationLat,
          locationLng: data.locationLng,
          capacityTotal: data.capacityTotal,
          content: data.content,
          joinMode: data.joinMode,
          conditions: data.conditions,
          durationMinutes: data.durationMinutes,
        });
      } catch (e) {
        console.error(e);
        Alert.alert("오류", "데이터를 불러오지 못했습니다.");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, router]);

  // 2. 수정 API 호출
  const handleUpdate = async (formData: MeetingParams) => {
    if (!id) return;
    try {
      setSubmitting(true);
      await meetingApi.updateMeeting(id, formData);
      Alert.alert("성공", "모임 정보가 수정되었습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "수정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={t.colors.primary} />
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout padded={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar title="모임 수정" showBack onPressBack={() => router.back()} />
      
      {/* ✅ 초기값 주입하여 폼 렌더링 */}
      <MeetingForm
        initialValues={initialData || {}}
        submitLabel="수정 완료"
        onSubmit={handleUpdate}
        isSubmitting={submitting}
      />
    </AppLayout>
  );
}