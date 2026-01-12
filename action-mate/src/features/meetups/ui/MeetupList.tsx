import React from "react";
import { FlatList, View } from "react-native";
import type { Meetup } from "../types";
import { MeetupCard } from "./MeetupCard";

type Props = {
  data: Meetup[];
  distanceKmById?: Record<string, number>;
  onPressItem?: (meetup: Meetup) => void;
  onJoinItem?: (meetup: Meetup) => void;
};

export function MeetupList({ data, distanceKmById, onPressItem, onJoinItem }: Props) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 24 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => (
        <MeetupCard
          meetup={item}
          distanceKm={distanceKmById?.[item.id]}
          onPress={() => onPressItem?.(item)}
          onJoin={() => onJoinItem?.(item)}
        />
      )}
    />
  );
}
