import React from "react";
import { View, Text } from "react-native";
import { Screen } from "~/shared/layout/Screen";
import { Card } from "~/shared/ui/Card";
import { Button } from "~/shared/ui/Button";
import { Badge } from "~/shared/ui/Badge";
import { useAppTheme } from "~/shared/hooks/useAppTheme";

export default function HomeScreen() {
  const t = useAppTheme();

  return (
    <Screen>
      <Text style={[t.typography.titleLarge, { marginBottom: 12 }]}>
        Action Mate (Light)
      </Text>

      <Card style={{ gap: 12 } as any}>
        <Badge label="D-2 마감임박" tone="warning" />
        <Text style={t.typography.bodyMedium}>
          테마/공통 UI 적용 테스트 화면
        </Text>

        <View style={{ flexDirection: "row", gap: 10 } as any}>
          <Button title="참여하기" onPress={() => {}} />
          <Button title="상세" variant="outlined" onPress={() => {}} />
          <Button title="더보기" variant="text" onPress={() => {}} />
        </View>
      </Card>
    </Screen>
  );
}
