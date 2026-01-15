import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import AppLayout from "@/shared/ui/AppLayout";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Card } from "@/shared/ui/Card";
import TemperatureGauge from "./components/TemperatureGauge";
import SegmentedTabs from "./components/SegmentedTabs";
import MeetingList from "./components/MeetingList";
import SettingsTab from "./components/SettingsTab";
import ProfileEditModal from "./components/ProfileEditModal";
import HostedMeetingEditModal from "./components/HostedMeetingEditModal";
import { myService } from "./myService";
import type { MyMeetingItem, MyProfile, MySummary } from "./types";

type TabKey = "hosted" | "joined" | "settings";

export default function MyScreen() {
  const t = useAppTheme();

  const [tab, setTab] = useState<TabKey>("hosted");
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState<MyProfile>({ nickname: "액션메이트" });
  const [summary, setSummary] = useState<MySummary>({ praiseCount: 0, temperature: 36.5 });
  const [hosted, setHosted] = useState<MyMeetingItem[]>([]);
  const [joined, setJoined] = useState<MyMeetingItem[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  // 게이지 애니메이션 트리거
  const [animKey, setAnimKey] = useState(0);

  // 내가 만든 모임 수정 모달
  const [editMeetingOpen, setEditMeetingOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MyMeetingItem | null>(null);

  const tabs = useMemo(
    () => [
      { key: "hosted", label: "내가 만든 모임" },
      { key: "joined", label: "참여한 모임" },
      { key: "settings", label: "설정" },
    ],
    []
  );

  const loadAll = useCallback(async () => {
    const [p, s, h, j] = await Promise.all([
      myService.getMyProfile(),
      myService.getMySummary(),
      myService.getMyHostedMeetings(),
      myService.getMyJoinedMeetings(),
    ]);

    setProfile(p);
    setSummary(s);
    setHosted(h);
    setJoined(j);

    // 데이터 반영 후 온도 애니메이션 재생
    setAnimKey((k) => k + 1);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  const requestDelete = useCallback(
    (item: MyMeetingItem) => {
      Alert.alert("모임 삭제", `“${item.title}” 모임을 삭제할까요?`, [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            setRefreshing(true);
            try {
              await myService.deleteMyHostedMeeting(item.id);
              setHosted((prev) => prev.filter((x) => x.id !== item.id));
            } catch (e: any) {
              Alert.alert("삭제 실패", e?.message ?? "삭제 중 오류가 발생했어요.");
            } finally {
              setRefreshing(false);
            }
          },
        },
      ]);
    },
    [setHosted]
  );

  return (
    <AppLayout>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ✅ 헤더 원복 */}
        <View style={styles.header}>
          <Text style={t.typography.headlineSmall}>마이페이지</Text>
          <Text style={t.typography.bodySmall}>내 정보 · 모임 · 설정</Text>
        </View>

        {/* 프로필 카드 */}
        <Card style={{ paddingVertical: 14 }}>
          <View style={styles.profileRow}>
            {/* 왼쪽: 프로필 */}
            <View style={styles.profileLeft}>
              {profile.photoUrl ? (
                <Image
                  source={{ uri: profile.photoUrl }}
                  style={[
                    styles.avatar,
                    { borderColor: t.colors.background, backgroundColor: t.colors.border },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    styles.avatarFallback,
                    { borderColor: t.colors.background, backgroundColor: t.colors.primary },
                  ]}
                >
                  <Text style={[t.typography.titleMedium, { color: "#fff" }]}>
                    {profile.nickname?.slice(0, 1) || "A"}
                  </Text>
                </View>
              )}

              <View style={{ marginLeft: 12 }}>
                <Text style={t.typography.titleMedium}>{profile.nickname}</Text>
                <Text style={[t.typography.bodySmall, { marginTop: 4, color: t.colors.textSub }]}>
                  내 프로필
                </Text>
              </View>
            </View>

            {/* 오른쪽: 받은 칭찬 */}
            <View style={styles.profileRight}>
              <Text style={[t.typography.labelLarge, { color: t.colors.textSub }]}>받은 칭찬</Text>
              <Text style={[t.typography.titleMedium, { marginTop: 2 }]}>{summary.praiseCount}개</Text>
            </View>
          </View>

          {/* 온도 */}
          <View style={{ marginTop: 14 }}>
            <TemperatureGauge
              temperature={summary.temperature}
              title="매너 온도"
              subtitle={`받은 칭찬 ${summary.praiseCount}개 반영`}
              animateKey={animKey}
              durationMs={900}
              colorMode="theme"
            />
          </View>
        </Card>

        {/* 탭 */}
        <View style={{ marginTop: 14 }}>
          <SegmentedTabs tabs={tabs} activeKey={tab} onChange={(k) => setTab(k as TabKey)} />
        </View>

        {/* 탭 컨텐츠 */}
        <View style={{ marginTop: 12 }}>
          {tab === "hosted" && (
            <MeetingList
              items={hosted}
              emptyText="아직 내가 만든 모임이 없어요."
              editable
              onEdit={(item) => {
                setEditingMeeting(item);
                setEditMeetingOpen(true);
              }}
              onDelete={requestDelete}
            />
          )}

          {tab === "joined" && <MeetingList items={joined} emptyText="아직 참여한 모임이 없어요." />}

          {tab === "settings" && <SettingsTab onOpenProfileEdit={() => setEditOpen(true)} />}
        </View>

        {/* 내가 만든 모임 수정 모달 */}
        <HostedMeetingEditModal
          visible={editMeetingOpen}
          meeting={editingMeeting}
          onClose={() => setEditMeetingOpen(false)}
          onSave={async (patch) => {
            if (!editingMeeting) return;

            setRefreshing(true);
            try {
              const updated = await myService.updateMyHostedMeeting(editingMeeting.id, patch);
              setHosted((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
              setEditingMeeting(updated);
            } finally {
              setRefreshing(false);
            }
          }}
        />

        {/* 프로필 수정 모달 */}
        <ProfileEditModal
          visible={editOpen}
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={async (next) => {
            setRefreshing(true);
            try {
              const saved = await myService.updateMyProfile(next);
              setProfile(saved);
              setAnimKey((k) => k + 1);
            } finally {
              setRefreshing(false);
            }
          }}
        />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4, marginTop: 4, marginBottom: 10 },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    paddingLeft: 10,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
});