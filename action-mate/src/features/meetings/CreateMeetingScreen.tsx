// CreateMeetingScreen.tsx
import React, { useCallback, useState } from "react";
import { Alert } from "react-native";
import { Stack, useRouter } from "expo-router";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import MeetingForm from "./ui/MeetingForm";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingUpsert } from "@/features/meetings/model/types";

export default function CreateMeetingScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const goHomeOnce = useCallback(() => {
    // ✅ 라우팅 중복 호출 방지(한 번만)
    if (router.canGoBack()) {
      router.dismissAll();
      router.replace("/(tabs)");
      return;
    }
    router.replace("/(tabs)");
  }, [router]);

  const handleCreate = useCallback(
    async (formData: MeetingUpsert) => {
      if (submitting) return;

      try {
        setSubmitting(true);

        // ✅ MeetingUpsert(=MeetingShape) 그대로 전송
        const created = await meetingApi.createMeeting(formData);
        const anyCreated = created as any;

        // ✅ API 응답 방어적 파싱(로컬/리모트/래퍼 형태 차이 대응)
        const createdId =
          anyCreated?.id ??
          anyCreated?.post?.id ??
          anyCreated?.meeting?.id ??
          anyCreated?.data?.id ??
          null;

        if (createdId) {
          // ✅ 생성 직후 상세로 이동 (리스트 캐시/갱신 이슈 회피)
          router.replace((`/meetings/${createdId}?v=${Date.now()}` as unknown) as any);
          return;
        }

        // ✅ id를 못 받으면 홈으로
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