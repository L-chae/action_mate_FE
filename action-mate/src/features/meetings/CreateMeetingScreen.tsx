import React, { useState } from "react";
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

  const handleCreate = async (formData: MeetingParams) => {
    try {
      setSubmitting(true);
      await meetingApi.createMeeting(formData);
      // 성공 시 뒤로가기 대신 탭으로 이동 (또는 상세 페이지로 이동)
      if (router.canGoBack()) router.dismissAll();
      router.replace("/(tabs)");
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "모임 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout padded={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar 
        title="모임 만들기" 
        showBack 
        onPressBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} 
      />
      
      {/* ✅ 공통 폼 사용 */}
      <MeetingForm
        submitLabel="모임 만들기"
        onSubmit={handleCreate}
        isSubmitting={submitting}
      />
    </AppLayout>
  );
}