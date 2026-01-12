import React, { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import { Screen } from "~/shared/layout/Screen";
import { useAppTheme } from "~/shared/hooks/useAppTheme";
import { Card } from "~/shared/ui/Card";
import { Button } from "~/shared/ui/Button";
import { Badge } from "~/shared/ui/Badge";

import { useMeetupsStore } from "~/features/meetups/store";
import type { Category } from "~/features/meetups/types";

type UiCategory = "running" | "climb" | "badminton" | "walk" | "gym" | "etc";

function startsAtFromLabel(label: string) {
  // label 예: "오늘 19:00" / "내일 19:00"
  const now = new Date();
  const d = new Date(now);

  const isTomorrow = label.startsWith("내일");
  const time = label.split(" ")[1] ?? "19:00";
  const [hh, mm] = time.split(":").map((x) => Number(x));

  if (isTomorrow) d.setDate(d.getDate() + 1);
  d.setHours(Number.isFinite(hh) ? hh : 19, Number.isFinite(mm) ? mm : 0, 0, 0);

  return d.toISOString();
}

export default function MeetupCreateScreen() {
  const t = useAppTheme();

  const createMeetup = useMeetupsStore((s) => s.createMeetup);
  const myLocation = useMeetupsStore((s) => s.myLocation);

  const categories: { key: UiCategory; label: string; icon: React.ComponentProps<typeof MaterialIcons>["name"] }[] =
    useMemo(
      () => [
        { key: "running", label: "러닝", icon: "directions-run" },
        { key: "climb", label: "클라이밍", icon: "terrain" },
        { key: "walk", label: "산책", icon: "directions-walk" },
        { key: "gym", label: "헬스", icon: "fitness-center" },
        { key: "badminton", label: "배드민턴", icon: "sports-tennis" }, // UI에만 존재 → 저장은 etc로
        { key: "etc", label: "기타", icon: "category" },
      ],
      []
    );

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [timeLabel, setTimeLabel] = useState("오늘 19:00");
  const [maxPeople, setMaxPeople] = useState("6");
  const [category, setCategory] = useState<UiCategory>("running");

  const inputStyle = {
    borderWidth: t.spacing.borderWidth,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    borderRadius: t.spacing.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: t.colors.textMain,
  } as const;

  // UI 카테고리 -> store Category로 매핑
  const toStoreCategory = (c: UiCategory): Category => {
    if (c === "badminton") return "etc" as any;
    return c as any; // running/climb/walk/gym/etc
  };

  return (
    <Screen>
      {/* 상단 헤더 */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}
        >
          <MaterialIcons name="arrow-back-ios-new" size={20} color={t.colors.textMain} />
        </Pressable>

        <Text style={[t.typography.titleMedium, { marginLeft: 6, color: t.colors.textMain }]}>모임 만들기</Text>
      </View>

      <Card>
        <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>기본 정보</Text>

        <View style={{ height: 12 }} />

        <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 6 }]}>제목</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="예) 한강 5km 러닝 같이해요"
          placeholderTextColor={t.colors.textSub}
          style={inputStyle}
        />

        <View style={{ height: 12 }} />

        <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 6 }]}>장소</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="예) 여의도 한강공원"
          placeholderTextColor={t.colors.textSub}
          style={inputStyle}
        />

        <View style={{ height: 12 }} />

        <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 6 }]}>시간(placeholder)</Text>
        <View style={{ flexDirection: "row", gap: 8 } as any}>
          <Button
            title="오늘 19:00"
            variant={timeLabel === "오늘 19:00" ? "primary" : "secondary"}
            onPress={() => setTimeLabel("오늘 19:00")}
          />
          <Button
            title="내일 19:00"
            variant={timeLabel === "내일 19:00" ? "primary" : "secondary"}
            onPress={() => setTimeLabel("내일 19:00")}
          />
        </View>

        <View style={{ height: 12 }} />

        <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 6 }]}>최대 인원</Text>
        <TextInput
          value={maxPeople}
          onChangeText={setMaxPeople}
          keyboardType="number-pad"
          placeholder="예) 6"
          placeholderTextColor={t.colors.textSub}
          style={inputStyle}
        />

        <View style={{ height: 14 }} />

        <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>카테고리</Text>

        <View style={{ height: 10 }} />

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 } as any}>
          {categories.map((c) => {
            const selected = c.key === category;
            return (
              <Pressable
                key={c.key}
                onPress={() => setCategory(c.key)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: t.spacing.radiusLg,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderWidth: t.spacing.borderWidth,
                  borderColor: selected ? t.colors.primary : t.colors.border,
                  backgroundColor: selected ? t.colors.primaryLight : t.colors.surface,
                }}
              >
                <MaterialIcons name={c.icon} size={18} color={selected ? t.colors.primaryDark : t.colors.textSub} />
                <Text style={[t.typography.labelMedium, { marginLeft: 6, color: t.colors.textMain }]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 14 }} />

        <Card padded={false} style={{ padding: 12 }}>
          <Text style={[t.typography.titleSmall, { color: t.colors.textMain }]}>미리보기(placeholder)</Text>
          <View style={{ height: 8 }} />
          <Text style={[t.typography.bodyMedium, { color: t.colors.textMain }]} numberOfLines={2}>
            {title.trim() || "제목을 입력하면 여기에 표시돼요"}
          </Text>
          <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 4 }]} numberOfLines={1}>
            ⏰ {timeLabel} · 📍 {location.trim() || "장소"}
          </Text>
          <View style={{ height: 8 }} />
          <View style={{ flexDirection: "row", gap: 6 } as any}>
            <Badge label={categories.find((x) => x.key === category)?.label ?? "카테고리"} tone="primary" />
            <Badge label={`정원 ${Number(maxPeople || 0) || 0}명`} />
          </View>
        </Card>

        <View style={{ height: 14 }} />

        <Button
          title="생성하기"
          onPress={() => {
            const max = Number(maxPeople);

            if (!title.trim()) {
              Alert.alert("제목을 입력해줘", "모임 제목은 필수야.");
              return;
            }
            if (!location.trim()) {
              Alert.alert("장소를 입력해줘", "장소는 필수야.");
              return;
            }
            if (!Number.isFinite(max) || max <= 1) {
              Alert.alert("최대 인원을 확인해줘", "2명 이상으로 입력해줘.");
              return;
            }

            const id = createMeetup({
              title: title.trim(),
              category: toStoreCategory(category),
              startsAt: startsAtFromLabel(timeLabel),
              durationMin: 60, // 1차 본: 고정 (원하면 입력 추가해줄게)
              capacity: max,
              placeName: location.trim(),
              // 1차 본: 내 위치 기반으로 약간 랜덤 오프셋
              lat: myLocation.lat + (Math.random() - 0.5) * 0.002,
              lng: myLocation.lng + (Math.random() - 0.5) * 0.002,
            });

            router.replace({ pathname: "/meetups/[meetupId]", params: { meetupId: id } });
          }}
        />
      </Card>
    </Screen>
  );
}
