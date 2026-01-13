import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import AppLayout from "../../shared/ui/AppLayout";
import { Card } from "../../shared/ui/Card";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { useAppTheme } from "../../shared/hooks/useAppTheme";

import { cancelJoin, cancelMeeting, getMeeting, joinMeeting, updateHostMemo } from "./meetingService";
import type { MeetingPost } from "./types";

export default function MeetingDetailScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [post, setPost] = useState<MeetingPost | null>(null);
  const [memoDraft, setMemoDraft] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const m = await getMeeting(String(id));
      if (!alive) return;
      setPost(m);
      setMemoDraft(m?.hostMemo ?? "");
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const membership = post?.myState?.membershipStatus ?? "NONE";
  const canJoin = post?.myState?.canJoin ?? (post?.status === "OPEN");

  return (
    <>
      <Stack.Screen options={{ title: "모임 상세", headerShown: true }} />

      <AppLayout>
        {!post ? (
          <Card>
            <Text style={t.typography.bodyMedium}>불러오는 중...</Text>
          </Card>
        ) : (
          <View style={{ gap: 12 }}>
            <Card style={{ padding: 16 }}>
              <Text style={t.typography.headlineSmall}>{post.title}</Text>

              <View style={{ height: 10 }} />

              <View style={styles.row}>
                <Badge
                  label={post.joinMode === "INSTANT" ? "⚡ 선착순" : "🙋 승인제"}
                  tone="primary"
                />
                <Badge label={post.status} />
              </View>

              <View style={{ height: 12 }} />

              <Text style={[t.typography.bodyMedium, { color: t.colors.primary }]}>
                ⏰ {post.meetingTimeText} · {post.durationHours}h
              </Text>
              <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, marginTop: 6 }]}>
                📍 {post.locationText}
              </Text>

              <View style={{ height: 12 }} />

              <Text style={t.typography.bodyMedium}>
                👥 {post.capacityJoined}/{post.capacityTotal}
              </Text>

              <View style={{ height: 12 }} />

              {/* 호스트 메모(한 줄) */}
              <Text style={t.typography.titleSmall}>호스트 메모</Text>
              <TextInput
                value={memoDraft}
                onChangeText={setMemoDraft}
                placeholder="예: 빨간 모자예요 / 비 오면 취소"
                placeholderTextColor={t.colors.textSub}
                style={[
                  styles.memoInput,
                  { borderColor: t.colors.border, color: t.colors.textMain, backgroundColor: t.colors.surface },
                ]}
              />
              {post.memoUpdatedAtText ? (
                <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginTop: 6 }]}>
                  업데이트: {post.memoUpdatedAtText}
                </Text>
              ) : null}

              <View style={{ height: 12 }} />

              <Button
                title="메모 저장(테스트)"
                variant="secondary"
                onPress={async () => {
                  const r = await updateHostMemo(post.id, memoDraft.trim());
                  setPost(r.post);
                  Alert.alert("저장됨");
                }}
              />
            </Card>

            {/* 참여/취소 */}
            {membership === "JOINED" ? (
              <Button
                title="참여 취소"
                variant="secondary"
                onPress={async () => {
                  const r = await cancelJoin(post.id);
                  setPost(r.post);
                }}
              />
            ) : membership === "PENDING" ? (
              <Button
                title="신청 취소"
                variant="secondary"
                onPress={async () => {
                  const r = await cancelJoin(post.id);
                  setPost(r.post);
                }}
              />
            ) : (
              <Button
                title={canJoin ? "참여하기" : post.myState?.reason ?? "참여 불가"}
                disabled={!canJoin}
                onPress={async () => {
                  const r = await joinMeeting(post.id);
                  setPost(r.post);

                  if (r.membershipStatus === "JOINED") {
                    Alert.alert("참여 완료", "모임방으로 이동합니다", [
                      { text: "OK", onPress: () => router.push(`/chat/${post.id}`) },
                    ]);
                  } else if (r.membershipStatus === "PENDING") {
                    Alert.alert("신청 완료", "호스트 승인을 기다려요");
                  }
                }}
              />
            )}

            {/* (호스트만) 취소 버튼은 나중에 권한 붙이면 됨: 테스트용 */}
            <Button
              title="(테스트) 모임 취소"
              variant="danger"
              onPress={async () => {
                const r = await cancelMeeting(post.id);
                setPost(r.post);
              }}
            />

            <Button title="뒤로" variant="ghost" onPress={() => router.back()} />
          </View>
        )}
      </AppLayout>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  memoInput: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
