// FILE: src/features/meetings/CreateMeetingScreen.tsx
import React, { useCallback, useRef, useState } from "react";
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

  const navOnceRef = useRef(false);

  const goHomeOnce = useCallback(() => {
    if (navOnceRef.current) return;
    navOnceRef.current = true;

    try {
      const anyRouter = router as any;
      if (typeof anyRouter?.dismissAll === "function") anyRouter.dismissAll();
    } catch {
      // ignore
    }

    router.replace("/(tabs)");
  }, [router]);

  const handleCreate = useCallback(
    async (formData: MeetingUpsert) => {
      if (submitting) return;
      if (navOnceRef.current) return;

      try {
        setSubmitting(true);

        const created = await meetingApi.createMeeting(formData);
        const anyCreated = created as any;

        const createdId =
          anyCreated?.id ?? anyCreated?.post?.id ?? anyCreated?.meeting?.id ?? anyCreated?.data?.id ?? null;

        if (createdId != null) {
          router.replace((`/meetings/${createdId}?v=${Date.now()}` as unknown) as any);
          return;
        }

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

/*
요약:
1) dismissAll 유무를 방어적으로 처리해 라우팅 API 차이로 인한 크래시를 막았습니다.
2) 생성 응답 id 파싱을 유지하되, 중복 네비게이션을 navOnceRef로 차단했습니다.
3) 실패/예외 케이스에서도 submitting 상태 복구가 항상 보장됩니다.
*/
// END FILE
