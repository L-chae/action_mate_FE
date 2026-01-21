import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";

import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button } from "@/shared/ui/Button";
import StarRating from "@/shared/ui/StarRating";

import { meetingApi } from "@/features/meetings/api/meetingApi";

const ratingDoneKey = (meetingId: string) => `meeting_rating_done:${meetingId}`;

export default function MeetingRatingScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const meetingId = String(id ?? "");
  const [stars, setStars] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    (async () => {
      if (!meetingId) return;
      const v = await AsyncStorage.getItem(ratingDoneKey(meetingId));
      setAlreadyDone(v === "1");
    })();
  }, [meetingId]);

  const canSubmit = useMemo(
    () => Boolean(meetingId) && stars >= 1 && !loading,
    [meetingId, stars, loading]
  );

  const buttonTitle = useMemo(() => {
    if (alreadyDone) return "평가 완료됨";
    if (loading) return "전송 중...";
    return "평가 완료";
  }, [alreadyDone, loading]);

  const onSubmit = useCallback(async () => {
    if (!meetingId) return;

    if (stars < 1) {
      Alert.alert("별점을 선택해 주세요", "최소 1점부터 평가할 수 있어요.");
      return;
    }

    try {
      setLoading(true);

      await meetingApi.submitMeetingRating({ meetingId, stars });

      await AsyncStorage.setItem(ratingDoneKey(meetingId), "1");
      setAlreadyDone(true);

      Alert.alert("평가 완료", "소중한 평가가 반영됐어요!", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("평가 실패", e?.message ?? "잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [meetingId, stars, router]);

  return (
    <AppLayout>
      <View
        style={[
          styles.card,
          {
            backgroundColor: t.colors.card,
            borderColor: t.colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: t.colors.textMain }]}>
          오늘 모임 어떠셨나요?
        </Text>

        <Text style={[styles.sub, { color: t.colors.textSub }]}>
          별점(최대 5점)으로 모임을 평가해 주세요.
        </Text>

        <View style={styles.starWrap}>
          <StarRating
            value={stars}
            onChange={setStars}
            size={34}
            disabled={alreadyDone || loading}
          />
        </View>

        <Button
          title={buttonTitle}
          onPress={onSubmit}
          disabled={!canSubmit || alreadyDone}
          loading={loading}
        />
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  sub: {
    fontSize: 13,
    lineHeight: 18,
  },
  starWrap: {
    paddingVertical: 8,
    alignItems: "flex-start",
  },
});
