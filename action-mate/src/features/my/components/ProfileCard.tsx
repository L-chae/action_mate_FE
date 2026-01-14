import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "../../../shared/ui/Card";
import { Badge } from "../../../shared/ui/Badge";
import { useAppTheme } from "../../../shared/hooks/useAppTheme";
import type { MyProfile } from "../types";
import MannerTemperature from "./MannerTemperature";

export default function ProfileCard({ profile }: { profile: MyProfile }) {
  const t = useAppTheme();

  return (
    <Card style={{ padding: 16 }}>
      <View style={styles.topRow}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: t.colors.border }]}>
          <Text style={{ fontSize: 22 }}>👤</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={t.typography.titleLarge}>{profile.nickname}</Text>

          {typeof profile.kudosCount === "number" ? (
            <View style={{ marginTop: 8 }}>
              <Badge label={`👍 받은 칭찬 ${profile.kudosCount}`} tone="success" />
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ height: 14 }} />

      <MannerTemperature value={profile.mannerTemp} label={profile.mannerLabel} />
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
