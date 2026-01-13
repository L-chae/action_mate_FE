import React from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "~/shared/hooks/useAppTheme";
import { Card } from "~/shared/ui/Card";
import { Badge } from "~/shared/ui/Badge";

type Props = {
  title: string;
  placeName: string;
  distanceLabel: string;
  timeLabel: string;
  capacityLabel: string;
  category: string;
  onPress: () => void;
};

export function NearbyMeetupRow(props: Props) {
  const t = useAppTheme();

  return (
    <Pressable onPress={props.onPress}>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]} numberOfLines={1}>
              {props.title}
            </Text>

            <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 6 }]} numberOfLines={1}>
              📍 {props.placeName}
            </Text>

            <View style={{ height: 8 }} />

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 } as any}>
              <Badge label={`#${props.category}`} tone="primary" />
              <Badge label={props.distanceLabel} />
              <Badge label={props.timeLabel} />
              <Badge label={props.capacityLabel} />
            </View>
          </View>

          <MaterialIcons name="chevron-right" size={24} color={t.colors.textSub} />
        </View>
      </Card>
    </Pressable>
  );
}
