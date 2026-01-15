import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";

import AppLayout from "@/shared/ui/AppLayout";
import { Button } from "@/shared/ui/Button";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import CategoryChips from "@/shared/ui/CategoryChips";
import { createMeeting } from "./meetingService";
import type { CategoryKey, JoinMode } from "./types";

export default function CreateMeetingScreen() {
  const t = useAppTheme();
  const router = useRouter();

  const [category, setCategory] = useState<CategoryKey | "ALL">("SPORTS");
  const [joinMode, setJoinMode] = useState<JoinMode>("INSTANT");
  const [conditions, setConditions] = useState("");

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [content, setContent] = useState("");

  // ✅ 예상 소요시간 (기본 2시간) / 준비물
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [items, setItems] = useState("");

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // ✅ 소요시간 포맷팅 함수
  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}시간 ${m}분`;
    if (h > 0) return `${h}시간`;
    return `${m}분`;
  };

  const handleConfirmDate = (date: Date) => {
    setSelectedDate(date);
    setDatePickerVisibility(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return Alert.alert("알림", "제목을 입력해주세요.");
    if (!selectedDate) return Alert.alert("알림", "모임 시간을 선택해주세요.");
    if (!location.trim()) return Alert.alert("알림", "만날 장소를 입력해주세요.");
    if (joinMode === "APPROVAL" && !conditions.trim()) {
      return Alert.alert("알림", "승인 조건을 입력해주세요.");
    }

    const selectedCategory = category === "ALL" ? "ETC" : category;

    try {
      setSubmitting(true);

      const capacityTotal = Math.max(2, parseInt(capacity) || 2);

      await createMeeting({
        title,
        category: selectedCategory,
        meetingTimeText: formatDate(selectedDate),
        locationText: location,
        capacityTotal,
        content,
        joinMode,
        conditions: joinMode === "APPROVAL" ? conditions : undefined,
        durationMinutes,
        items: items.trim() ? items.trim() : undefined,
      });

      if (router.canGoBack()) router.dismissAll();
      router.replace("/(tabs)");
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "모임을 만들지 못했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "모임 만들기",
          headerStyle: { backgroundColor: t.colors.background },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace("/(tabs)");
              }}
              style={{ paddingRight: 16 }}
            >
              <Ionicons
                name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
                size={24}
                color={t.colors.textMain}
              />
            </Pressable>
          ),
        }}
      />

      <AppLayout padded={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
            <View style={{ paddingHorizontal: t.spacing.pagePaddingH, paddingTop: 24 }}>
              
              {/* 1. 카테고리 선택 */}
              <View style={styles.section}>
                <Text style={[t.typography.titleSmall, styles.label, { color: t.colors.textSub }]}>
                  어떤 모임인가요?
                </Text>
                <CategoryChips value={category} onChange={setCategory} />
              </View>

              {/* 2. 제목 입력 */}
              <View style={styles.section}>
                <Text style={[t.typography.titleSmall, styles.label, { color: t.colors.textSub }]}>
                  제목
                </Text>
                <TextInput
                  style={[
                    styles.inputUnderline,
                    { color: t.colors.textMain, borderBottomColor: t.colors.neutral[200] },
                  ]}
                  placeholder="예: 한강 러닝 같이 하실 분!"
                  placeholderTextColor={t.colors.neutral[400]}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={40}
                />
              </View>

              {/* 3. 참여 방식 */}
              <View style={styles.section}>
                <Text style={[t.typography.titleSmall, styles.label, { color: t.colors.textSub }]}>
                  참여 방식
                </Text>
                <View style={[styles.segmentContainer, { backgroundColor: t.colors.neutral[100] }]}>
                  <Pressable
                    onPress={() => setJoinMode("INSTANT")}
                    style={[
                      styles.segmentBtn,
                      joinMode === "INSTANT" && {
                        backgroundColor: t.colors.surface,
                        ...styles.shadow,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        t.typography.labelMedium,
                        { color: joinMode === "INSTANT" ? t.colors.primary : t.colors.textSub },
                      ]}
                    >
                      ⚡ 선착순
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setJoinMode("APPROVAL")}
                    style={[
                      styles.segmentBtn,
                      joinMode === "APPROVAL" && {
                        backgroundColor: t.colors.surface,
                        ...styles.shadow,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        t.typography.labelMedium,
                        { color: joinMode === "APPROVAL" ? t.colors.primary : t.colors.textSub },
                      ]}
                    >
                      🙋 승인제
                    </Text>
                  </Pressable>
                </View>

                {joinMode === "APPROVAL" && (
                  <View style={[styles.conditionBox, { backgroundColor: t.colors.primaryLight }]}>
                    <Text
                      style={[
                        t.typography.labelSmall,
                        { color: t.colors.primaryDark, marginBottom: 4 },
                      ]}
                    >
                      승인 조건 (필수)
                    </Text>
                    <TextInput
                      style={[styles.inputSimple, { color: t.colors.textMain }]}
                      placeholder="예: 20대만, 여성만, 초보 환영 등"
                      placeholderTextColor={t.colors.neutral[500]}
                      value={conditions}
                      onChangeText={setConditions}
                    />
                  </View>
                )}
              </View>

              {/* 4. 시간/장소/인원/소요시간 */}
              <View
                style={[
                  styles.cardForm,
                  { backgroundColor: t.colors.surface, borderColor: t.colors.neutral[200] },
                ]}
              >
                {/* 모임 시간 */}
                <Pressable onPress={() => setDatePickerVisibility(true)} style={styles.rowInput}>
                  <View style={[styles.iconBox, { backgroundColor: t.colors.neutral[50] }]}>
                    <Ionicons name="time" size={20} color={t.colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                      모임 시간
                    </Text>
                    {selectedDate ? (
                      <Text style={[t.typography.bodyLarge, { color: t.colors.textMain, marginTop: 2 }]}>
                        {formatDate(selectedDate)}
                      </Text>
                    ) : (
                      <Text style={[t.typography.bodyLarge, { color: t.colors.neutral[400], marginTop: 2 }]}>
                        날짜와 시간을 선택해주세요
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={t.colors.neutral[300]} />
                </Pressable>

                <View style={[styles.divider, { backgroundColor: t.colors.neutral[100] }]} />

                {/* 장소 */}
                <View style={styles.rowInput}>
                  <View style={[styles.iconBox, { backgroundColor: t.colors.neutral[50] }]}>
                    <Ionicons name="location" size={20} color={t.colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>장소</Text>
                    <TextInput
                      style={[styles.inputField, { color: t.colors.textMain }]}
                      placeholder="예: 잠원지구 3주차장"
                      placeholderTextColor={t.colors.neutral[400]}
                      value={location}
                      onChangeText={setLocation}
                    />
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: t.colors.neutral[100] }]} />

                {/* 최대 인원 */}
                <View style={styles.rowInput}>
                  <View style={[styles.iconBox, { backgroundColor: t.colors.neutral[50] }]}>
                    <Ionicons name="people" size={20} color={t.colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>최대 인원</Text>
                    <View style={styles.stepper}>
                      <Pressable
                        onPress={() => setCapacity((prev) => String(Math.max(2, (parseInt(prev) || 2) - 1)))}
                        style={[styles.stepBtn, { backgroundColor: t.colors.neutral[100] }]}
                      >
                        <Ionicons name="remove" size={16} color={t.colors.textMain} />
                      </Pressable>
                      <Text style={[t.typography.titleMedium, { marginHorizontal: 12, minWidth: 24, textAlign: "center", color: t.colors.textMain }]}>
                        {capacity}
                      </Text>
                      <Pressable
                        onPress={() => setCapacity((prev) => String(Math.min(20, (parseInt(prev) || 2) + 1)))}
                        style={[styles.stepBtn, { backgroundColor: t.colors.neutral[100] }]}
                      >
                        <Ionicons name="add" size={16} color={t.colors.textMain} />
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: t.colors.neutral[100] }]} />

                {/* ✅ 수정됨: 예상 소요시간 (표시 방식 개선) */}
                <View style={styles.rowInput}>
                  <View style={[styles.iconBox, { backgroundColor: t.colors.neutral[50] }]}>
                    <Ionicons name="hourglass" size={20} color={t.colors.primary} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                      예상 소요시간
                    </Text>

                    <View style={styles.stepper}>
                      <Pressable
                        onPress={() => setDurationMinutes((prev) => Math.max(30, prev - 30))}
                        style={[styles.stepBtn, { backgroundColor: t.colors.neutral[100] }]}
                      >
                        <Ionicons name="remove" size={16} color={t.colors.textMain} />
                      </Pressable>
                      
                      {/* 120m 대신 2시간 으로 표시 */}
                      <Text
                        style={[
                          t.typography.titleMedium,
                          { 
                            marginHorizontal: 12, 
                            minWidth: 80, // 글자 잘리지 않게 너비 확보
                            textAlign: "center", 
                            color: t.colors.textMain 
                          },
                        ]}
                      >
                        {formatDuration(durationMinutes)}
                      </Text>
                      
                      <Pressable
                        onPress={() => setDurationMinutes((prev) => Math.min(360, prev + 30))}
                        style={[styles.stepBtn, { backgroundColor: t.colors.neutral[100] }]}
                      >
                        <Ionicons name="add" size={16} color={t.colors.textMain} />
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: t.colors.neutral[100] }]} />

                {/* 준비물 */}
                <View style={styles.rowInput}>
                  <View style={[styles.iconBox, { backgroundColor: t.colors.neutral[50] }]}>
                    <Ionicons name="bag" size={20} color={t.colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
                      준비물/주의사항 (선택)
                    </Text>
                    <TextInput
                      style={[styles.inputField, { color: t.colors.textMain }]}
                      placeholder="예: 운동화, 물 / 우천 시 취소"
                      placeholderTextColor={t.colors.neutral[400]}
                      value={items}
                      onChangeText={setItems}
                    />
                  </View>
                </View>
              </View>

              {/* 5. 내용 */}
              <View style={styles.section}>
                <Text style={[t.typography.titleSmall, styles.label, { color: t.colors.textSub }]}>
                  호스트 메모 (선택)
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: t.colors.neutral[50],
                      color: t.colors.textMain,
                      borderColor: t.colors.neutral[200],
                    },
                  ]}
                  placeholder="준비물이나 하고 싶은 말을 자유롭게 적어주세요."
                  placeholderTextColor={t.colors.neutral[400]}
                  multiline
                  textAlignVertical="top"
                  value={content}
                  onChangeText={setContent}
                />
              </View>
            </View>
          </ScrollView>

          <View
            style={[
              styles.bottomBar,
              { backgroundColor: t.colors.background, borderTopColor: t.colors.neutral[200] },
            ]}
          >
            <Button
              title={submitting ? "생성 중..." : "모임 만들기"}
              size="lg"
              onPress={handleSubmit}
              loading={submitting}
              disabled={
                !title ||
                !selectedDate ||
                !location ||
                (joinMode === "APPROVAL" && !conditions) ||
                submitting
              }
            />
          </View>
        </KeyboardAvoidingView>

        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="datetime"
          onConfirm={handleConfirmDate}
          onCancel={() => setDatePickerVisibility(false)}
          confirmTextIOS="선택"
          cancelTextIOS="취소"
          locale="ko_KR"
        />
      </AppLayout>
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  label: { marginBottom: 8 },
  inputUnderline: {
    fontSize: 20,
    fontWeight: "600",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  segmentContainer: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    height: 44,
  },
  segmentBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  conditionBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  inputSimple: { fontSize: 14, padding: 0 },
  cardForm: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 24,
    overflow: "hidden",
  },
  rowInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  inputField: {
    fontSize: 16,
    paddingVertical: 4,
  },
  divider: { height: 1, marginLeft: 64 },
  stepper: { flexDirection: "row", alignItems: "center" },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  textArea: {
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
});