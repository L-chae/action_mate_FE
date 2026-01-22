// EditMeetingScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import MeetingForm from "./ui/MeetingForm";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingUpsert } from "@/features/meetings/model/types";

export default function EditMeetingScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [initialData, setInitialData] = useState<Partial<MeetingUpsert> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 1) 기존 데이터 불러오기
  useEffect(() => {
    if (!id) return;

    let alive = true;

    const loadData = async () => {
      try {
        const data = await meetingApi.getMeeting(id);
        if (!alive) return;

        // ✅ MeetingUpsert(=MeetingShape) 기준으로 맞춤
        setInitialData({
          title: data.title,
          category: data.category,
          meetingTime: data.meetingTime, // ISO string
          location: data.location, // Location 객체
          capacity: data.capacity, // Capacity -> CapacityInput으로 구조 호환(필드 포함관계)
          content: data.content,
          joinMode: data.joinMode,
          conditions: data.conditions,
          durationMinutes: data.durationMinutes,
          items: data.items,
        });
      } catch (e) {
        console.error(e);
        Alert.alert("오류", "데이터를 불러오지 못했습니다.");
        router.back();
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadData();

    return () => {
      alive = false;
    };
  }, [id, router]);

  // 2) 수정 API 호출
  const handleUpdate = useCallback(
    async (formData: MeetingUpsert) => {
      if (!id) return;

      try {
        setSubmitting(true);

        // update가 Partial<MeetingUpsert>를 받더라도 MeetingUpsert는 대입 가능
        await meetingApi.updateMeeting(id, formData);

        Alert.alert("성공", "모임 정보가 수정되었습니다.", [
          {
            text: "확인",
            onPress: () => {
              // ✅ back 대신 replace로 detail 재진입 (v로 강제 리프레시)
              router.replace((`/meetings/${id}?v=${Date.now()}` as unknown) as any);
            },
          },
        ]);
      } catch (e) {
        console.error(e);
        Alert.alert("오류", "수정에 실패했습니다.");
      } finally {
        setSubmitting(false);
      }
    },
    [id, router]
  );

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

      <MeetingForm
        initialValues={initialData || {}}
        submitLabel="수정 완료"
        onSubmit={handleUpdate}
        isSubmitting={submitting}
      />
    </AppLayout>
  );
}