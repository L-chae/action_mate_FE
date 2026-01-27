// FILE: src/features/meetings/EditMeetingScreen.tsx
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

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let alive = true;

    const loadData = async () => {
      try {
        const data = await meetingApi.getMeeting(id);
        if (!alive) return;

        const capMax = Number((data as any)?.capacity?.max ?? (data as any)?.capacity?.total ?? 0);
        const safeMax = Number.isFinite(capMax) ? Math.max(0, Math.trunc(capMax)) : 0;

        setInitialData({
          title: data.title,
          category: data.category,
          meetingTime: data.meetingTime,
          location: data.location,
          capacity: { max: safeMax, total: (data as any)?.capacity?.total },
          content: data.content,
          joinMode: data.joinMode,
          conditions: data.conditions,
          durationMinutes: data.durationMinutes,
          items: data.items,
        });
      } catch (e) {
        console.error(e);
        Alert.alert("오류", "데이터를 불러오지 못했습니다.");
        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)");
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadData();

    return () => {
      alive = false;
    };
  }, [id, router]);

  const handleUpdate = useCallback(
    async (formData: MeetingUpsert) => {
      if (!id) return;

      try {
        setSubmitting(true);

        await meetingApi.updateMeeting(id, formData);

        Alert.alert("성공", "모임 정보가 수정되었습니다.", [
          {
            text: "확인",
            onPress: () => {
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
      <TopBar
        title="모임 수정"
        showBack
        onPressBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/(tabs)");
        }}
      />

      <MeetingForm initialValues={initialData || {}} submitLabel="수정 완료" onSubmit={handleUpdate} isSubmitting={submitting} />
    </AppLayout>
  );
}

/*
요약:
1) initialValues.capacity에 current를 섞지 않도록 { max/total }로 정규화했습니다.
2) id 누락/로드 실패 시 back/홈 복귀를 방어적으로 처리했습니다.
3) 업데이트 후 detail replace에 v 파라미터로 강제 리프레시를 유지했습니다.
*/
// END FILE
