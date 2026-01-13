import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import AppLayout from "../../src/shared/ui/AppLayout";
import EmptyView from "../../src/shared/ui/EmptyView";
import { Badge } from "../../src/shared/ui/Badge";
import { Button } from "../../src/shared/ui/Button";
import { Card } from "../../src/shared/ui/Card";
import { Fab } from "../../src/shared/ui/Fab";
import { useAppTheme } from "../../src/shared/hooks/useAppTheme";


export default function UiPreviewScreen() {
  const t = useAppTheme();
  const [loading, setLoading] = useState(false);

  return (
    <>
      <Stack.Screen options={{ title: "UI Preview", headerShown: true }} />

      <AppLayout>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Theme quick check */}
          <Text style={[t.typography.titleLarge, { marginBottom: 8 }]}>Theme Check</Text>
          <View style={{ gap: 8 }}>
            <Card>
              <Text style={t.typography.bodyMedium}>mode: {t.mode}</Text>
              <Text style={t.typography.bodyMedium}>primary: {t.colors.primary}</Text>
              <Text style={t.typography.bodyMedium}>background: {t.colors.background}</Text>
              <Text style={t.typography.bodyMedium}>textMain: {t.colors.textMain}</Text>
            </Card>
          </View>

          {/* Badges */}
          <Text style={[t.typography.titleLarge, { marginTop: 18, marginBottom: 8 }]}>Badges</Text>
          <View style={styles.rowWrap}>
            <Badge label="default" />
            <Badge label="primary" tone="primary" />
            <Badge label="point" tone="point" />
            <Badge label="success" tone="success" />
            <Badge label="warning" tone="warning" />
            <Badge label="error" tone="error" />
            <Badge label="MD primary" tone="primary" size="md" />
          </View>

          {/* Buttons */}
          <Text style={[t.typography.titleLarge, { marginTop: 18, marginBottom: 8 }]}>Buttons</Text>
          <View style={{ gap: 10 }}>
            <Button title="Primary" onPress={() => Alert.alert("Primary")} />
            <Button title="Secondary" variant="secondary" onPress={() => Alert.alert("Secondary")} />
            <Button title="Ghost" variant="ghost" onPress={() => Alert.alert("Ghost")} />
            <Button title="Danger" variant="danger" onPress={() => Alert.alert("Danger")} />

            <View style={styles.row}>
              <Button title="Small" size="sm" onPress={() => {}} style={{ flex: 1 }} />
              <Button title="Large" size="lg" onPress={() => {}} style={{ flex: 1 }} />
            </View>

            <View style={styles.row}>
              <Button title="Disabled" disabled onPress={() => {}} style={{ flex: 1 }} />
              <Button
                title={loading ? "Loading..." : "Toggle Loading"}
                loading={loading}
                onPress={() => setLoading((v) => !v)}
                style={{ flex: 1 }}
              />
            </View>
          </View>

          {/* Cards */}
          <Text style={[t.typography.titleLarge, { marginTop: 18, marginBottom: 8 }]}>Cards</Text>
          <View style={{ gap: 10 }}>
            <Card>
              <Text style={t.typography.titleMedium}>Card 기본</Text>
              <Text style={t.typography.bodySmall}>surface / border / radius 확인</Text>
            </Card>

            <Card onPress={() => Alert.alert("Card pressed!")}>
              <Text style={t.typography.titleMedium}>Pressable Card</Text>
              <Text style={t.typography.bodySmall}>눌림/그림자 확인</Text>
            </Card>

            <Card padded={false} style={{ overflow: "hidden" }}>
              <View style={{ padding: t.spacing.pagePaddingH }}>
                <Text style={t.typography.titleMedium}>No padded</Text>
                <Text style={t.typography.bodySmall}>padded={"{false}"} 확인</Text>
              </View>
            </Card>
          </View>

          {/* Empty */}
          <Text style={[t.typography.titleLarge, { marginTop: 18, marginBottom: 8 }]}>EmptyView</Text>
          <View style={{ height: 160 }}>
            <EmptyView title="비어 있어요" description="EmptyView 레이아웃/폰트 확인" />
          </View>

          {/* Spacer for FAB */}
          <View style={{ height: 80 }} />
        </ScrollView>

        <Fab onPress={() => Alert.alert("FAB")} />
      </AppLayout>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  row: { flexDirection: "row", gap: 10 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
