import React from "react";
import { Pressable, Text, View } from "react-native";
import type { Meetup } from "../types";
import { Card } from "~/shared/ui/Card";
import { Badge } from "~/shared/ui/Badge";
import { Button } from "~/shared/ui/Button";
import { useAppTheme } from "~/shared/hooks/useAppTheme";

type Props = {
  meetup: Meetup;
  distanceKm?: number;
  onPress?: () => void;
  onJoin?: () => void;
};

export function MeetupCard({ meetup, distanceKm, onPress, onJoin }: Props) {
  const t = useAppTheme();

  const remain = meetup.capacity - meetup.joinedCount;
  const isFull = remain <= 0;
  const isJoined = meetup.joinStatus === "joined";

  const timeLabel = formatStartLabel(meetup.startsAt);
  const distLabel = distanceKm == null ? "" : `${distanceKm.toFixed(distanceKm < 1 ? 1 : 0)}km`;

  const categoryLabel = categoryToLabel(meetup.category);
  const badgeTone = isFull ? "danger" : remain <= 2 ? "warning" : "info";

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={t.typography.labelSmall}>{categoryLabel}</Text>
            <Text style={[t.typography.titleMedium, { marginTop: 4 }]} numberOfLines={1}>
              {meetup.title}
            </Text>

            <Text style={[t.typography.bodySmall, { marginTop: 6 }]} numberOfLines={1}>
              {timeLabel} · {meetup.placeName}{distLabel ? ` · ${distLabel}` : ""}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 6 } as any}>
            <Badge label={isFull ? "마감" : `남은자리 ${remain}`} tone={badgeTone} />
            {isJoined ? <Badge label="참여중" tone="success" /> : null}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 } as any}>
          <Button
            title={isJoined ? "참여완료" : isFull ? "마감됨" : "참여하기"}
            onPress={onJoin}
            disabled={isJoined || isFull}
            style={{ flex: 1 }}
          />
          <Button title="상세" variant="outlined" onPress={onPress} style={{ width: 92 }} />
        </View>
      </Card>
    </Pressable>
  );
}

function categoryToLabel(c: Meetup["category"]) {
  if (c === "running") return "러닝";
  if (c === "walk") return "산책";
  if (c === "climb") return "클라이밍";
  if (c === "gym") return "헬스";
  return "기타";
}

function formatStartLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();

  const isToday = d.toDateString() === now.toDateString();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  if (isToday) return `오늘 ${hh}:${mm}`;
  if (isTomorrow) return `내일 ${hh}:${mm}`;

  const M = d.getMonth() + 1;
  const D = d.getDate();
  return `${M}/${D} ${hh}:${mm}`;
}
