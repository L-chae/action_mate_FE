import React, { useCallback, useState } from "react";
import { Alert } from "react-native";
import { Stack, useRouter } from "expo-router";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import MeetingForm from "./ui/MeetingForm";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingParams } from "@/features/meetings/model/types";

export default function CreateMeetingScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const goHomeOnce = useCallback(() => {
    // ✅ navigation은 1번만: dismissAll 후 replace, 혹은 replace만
    // dismissAll이 필요한 구조라면 아래처럼 하고 return 처리
    if (router.canGoBack()) {
      router.dismissAll();
      router.replace("/(tabs)");
      return;
    }
    router.replace("/(tabs)");
  }, [router]);

  const handleCreate = useCallback(
    async (formData: MeetingParams) => {
      if (submitting) return;

      try {
        setSubmitting(true);

        const created: any = await meetingApi.createMeeting(formData);

        // ✅ API 응답 방어적 파싱 (프로젝트마다 형태가 달라서)
        const createdId =
          created?.id ??
          created?.post?.id ??
          created?.meeting?.id ??
          created?.data?.id ??
          null;

        // ✅ 가장 좋은 UX: 생성 직후 상세로 이동 (리스트 캐시 문제도 사라짐)
        if (createdId) {
          router.replace((`/meetings/${createdId}?v=${Date.now()}` as unknown) as any);
          return;
        }

        // ✅ id를 못 받으면 탭으로
        goHomeOnce();
      } catch (e) {
        console.error(e);
        Alert.alert("오류", "모임 생성에 실패했습니다.");
      } finally {
        setSubmitting(false);
      }
    },
    [router, submitting, goHomeOnce]
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, [router]);

  return (
    <AppLayout padded={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar title="모임 만들기" showBack onPressBack={handleBack} />

      <MeetingForm submitLabel="모임 만들기" onSubmit={handleCreate} isSubmitting={submitting} />
    </AppLayout>
  );
}