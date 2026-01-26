// 📂 src/features/meetings/ui/MeetingForm.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";

// ✅ Shared Components
import { Button } from "@/shared/ui/Button";
import CategoryChips from "@/shared/ui/CategoryChips";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

// ✅ Types (통일 Shape)
import type { CategoryKey, JoinMode, MeetingUpsert } from "@/features/meetings/model/types";

// --- Types & Constants ---
type LocationData = {
  addressText: string;
  lat: number;
  lng: number;
};

const DEFAULT_REGION: Region = {
  latitude: 37.5665,
  longitude: 126.978,
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
};

// ✅ Duration UX constants (10분 ~ 3시간)
const DURATION_MIN = 10;
const DURATION_MAX = 180;
const DURATION_STEP = 5;
const DURATION_QUICK = [30, 60, 90, 120, 180]; // ✅ 초보자용: 너무 많지 않게 축소

// --- Helpers ---
const formatDateSimple = (date: Date) =>
  date.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const getDurationLabel = (mins: number | undefined | null) => {
  if (!mins || mins <= 0) return "0분";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`;
};

const clampDuration = (v: number) => {
  const clamped = Math.max(DURATION_MIN, Math.min(DURATION_MAX, v));
  return Math.round(clamped / DURATION_STEP) * DURATION_STEP;
};

const clampCapacity = (v: number) => Math.max(2, Math.min(20, v));

const safeLayoutAnim = () => {
  try {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  } catch {
    // ignore
  }
};

const createStyles = (t: ReturnType<typeof useAppTheme>) => {
  const neutral = t.colors?.neutral as Partial<Record<number, string>> | undefined;
  const overlay = t.colors?.overlay as Partial<Record<number, string>> | undefined;

  return StyleSheet.create({
    root: { flex: 1 },
    page: { paddingHorizontal: t.spacing?.pagePaddingH ?? 0, paddingTop: 12 },

    section: { marginTop: 16 },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginBottom: 10,
    },

    helperText: { marginTop: 6 },
    errorText: { marginTop: 6 },

    card: { borderWidth: 1, borderRadius: 16, padding: 16 },

    labelRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 8,
    },

    inputBox: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 56,
      justifyContent: "center",
    },

    textArea: {
      minHeight: 132,
      borderRadius: 14,
      borderWidth: 1,
      padding: 16,
      fontSize: 16,
      textAlignVertical: "top",
      lineHeight: 22,
    },

    stackedPickRow: { gap: 10 },
    pickCard: {
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
    },
    pickIconWrap: { width: 34, alignItems: "center" },
    pickTextWrap: { flex: 1, paddingRight: 10 },
    pickChevronWrap: { width: 24, alignItems: "flex-end" },

    optionsContainer: {
      marginTop: 18,
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      marginBottom: 34,
    },
    expandHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

    summaryBadge: {
      marginTop: 8,
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },

    optionBlock: { paddingTop: 14 },
    divider: { height: 1, width: "100%" },

    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
    },
    stepperWrap: { flexDirection: "row", alignItems: "center" },
    circleBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },

    timeChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    durationInputWrap: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
    },
    durationInput: {
      flex: 1,
      fontSize: 16,
      padding: 0,
      margin: 0,
      minHeight: 22,
    },

    modeRow: { flexDirection: "row", gap: 10, marginTop: 10 },
    modeBtn: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },

    smallInput: {
      height: 46,
      borderRadius: 12,
      paddingHorizontal: 12,
      fontSize: 14,
      borderWidth: 1,
    },

    bottomBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },

    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
      alignItems: "center",
    },
    mapWrap: { flex: 1 },
    centerPin: { position: "absolute", top: "50%", left: "50%", marginTop: -36, marginLeft: -18 },

    floatingBtn: {
      position: "absolute",
      right: 14,
      bottom: 14,
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },

    modalBottom: {
      paddingHorizontal: 16,
      paddingTop: 16,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderTopWidth: 1,
    },

    warningBox: {
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },

    subtleText: { color: overlay?.[55] ?? t.colors.textSub },
    neutralBg: { backgroundColor: neutral?.[50] ?? t.colors.surface },
  });
};

// --- Props Definition ---
type MeetingFormProps = {
  initialValues?: Partial<MeetingUpsert>;
  submitLabel: string;
  onSubmit: (data: MeetingUpsert) => void;
  isSubmitting: boolean;
};

export default function MeetingForm({ initialValues, submitLabel, onSubmit, isSubmitting }: MeetingFormProps) {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(t), [t]);

  const scrollViewRef = useRef<ScrollView>(null);
  const titleRef = useRef<TextInput>(null);

  // --- Form State ---
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategoryKey>("SPORTS");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pickedLocation, setPickedLocation] = useState<LocationData | null>(null);
  const [content, setContent] = useState("");
  const [capacityTotal, setCapacityTotal] = useState(4);
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [joinMode, setJoinMode] = useState<JoinMode>("INSTANT");
  const [conditions, setConditions] = useState("");

  // ✅ duration direct input state
  const [durationInput, setDurationInput] = useState(String(durationMinutes));
  const [durationError, setDurationError] = useState<string | null>(null);

  // --- UI State ---
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(() => !initialValues);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // ✅ initialValues가 늦게 들어오는(Edit) 케이스 안정 처리
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;

    const iv = initialValues;
    if (!iv) return;

    setTitle(iv.title ?? "");
    setCategory((iv.category as CategoryKey) ?? "SPORTS");
    setSelectedDate(iv.meetingTime ? new Date(iv.meetingTime) : null);

    const lat = (iv.location as any)?.lat ?? (iv.location as any)?.latitude;
    const lng = (iv.location as any)?.lng ?? (iv.location as any)?.longitude;

    if (lat != null && lng != null) {
      setPickedLocation({
        addressText: (iv.location as any)?.name || "위치 정보",
        lat: Number(lat),
        lng: Number(lng),
      });
    } else {
      setPickedLocation(null);
    }

    setContent(iv.content ?? "");
    setCapacityTotal(clampCapacity(iv.capacity?.total ?? (iv.capacity as any)?.max ?? 4));

    const initDuration = clampDuration(iv.durationMinutes ?? 90);
    setDurationMinutes(initDuration);

    setJoinMode((iv.joinMode as JoinMode) ?? "INSTANT");
    setConditions(iv.conditions ?? "");

    setIsOptionsExpanded(false);
    didInitRef.current = true;
  }, [initialValues]);

  useEffect(() => {
    setDurationInput(String(durationMinutes));
  }, [durationMinutes]);

  const applyDuration = useCallback((v: number) => {
    const next = clampDuration(Number(v));
    setDurationError(null);
    setDurationMinutes(next);
  }, []);

  const toggleOptions = useCallback(() => {
    safeLayoutAnim();
    setIsOptionsExpanded((v) => !v);
  }, []);

  const summaryText = useMemo(() => {
    return `${capacityTotal}명 · ${getDurationLabel(durationMinutes)} · ${joinMode === "INSTANT" ? "선착순" : "승인제"}`;
  }, [capacityTotal, durationMinutes, joinMode]);

  const onPickCategory = useCallback((val: CategoryKey | "ALL") => {
    if (val !== "ALL") setCategory(val);
  }, []);

  const onTitleSubmitEditing = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 260, animated: true });
  }, []);

  const onDecCapacity = useCallback(() => setCapacityTotal((c) => clampCapacity(c - 1)), []);
  const onIncCapacity = useCallback(() => setCapacityTotal((c) => clampCapacity(c + 1)), []);

  const onSelectJoinMode = useCallback((mode: JoinMode) => {
    safeLayoutAnim();
    setJoinMode(mode);
    if (mode === "INSTANT") setConditions("");
  }, []);

  const dateLabel = useMemo(() => (selectedDate ? formatDateSimple(selectedDate) : "선택하기"), [selectedDate]);
  const locationLabel = useMemo(() => (pickedLocation ? pickedLocation.addressText : "선택하기"), [pickedLocation]);

  const commitDurationInput = useCallback(() => {
    const n = Number(durationInput);
    if (!Number.isFinite(n) || n <= 0) {
      setDurationError("숫자를 입력해주세요.");
      setDurationInput(String(durationMinutes));
      return;
    }
    if (n < DURATION_MIN || n > DURATION_MAX) {
      setDurationError(`소요 시간은 ${DURATION_MIN}~${DURATION_MAX}분 사이로 설정해주세요.`);
      setDurationInput(String(durationMinutes));
      return;
    }
    applyDuration(n);
  }, [durationInput, durationMinutes, applyDuration]);

  const openDatePicker = useCallback(() => {
    setDatePickerVisibility(true);
  }, []);

  const openLocationPicker = useCallback(() => {
    setLocationModalVisible(true);
  }, []);

  const handleSubmit = useCallback(() => {
    setSubmitAttempted(true);

    if (!title.trim()) {
      Alert.alert("알림", "모임 제목을 입력해주세요.");
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      requestAnimationFrame(() => titleRef.current?.focus());
      return;
    }

    if (!selectedDate) {
      Alert.alert("알림", "언제 만날지 정해주세요.");
      scrollViewRef.current?.scrollTo({ y: 160, animated: true });
      openDatePicker();
      return;
    }

    if (!pickedLocation) {
      Alert.alert("알림", "어디서 만날지 정해주세요.");
      scrollViewRef.current?.scrollTo({ y: 160, animated: true });
      openLocationPicker();
      return;
    }

    if (joinMode === "APPROVAL" && !conditions.trim()) {
      Alert.alert("알림", "승인 조건을 입력해주세요.");
      if (!isOptionsExpanded) setIsOptionsExpanded(true);
      return;
    }

    const formData: MeetingUpsert = {
      title: title.trim(),
      category,
      meetingTime: selectedDate.toISOString(),
      location: {
        name: pickedLocation.addressText,
        latitude: pickedLocation.lat,
        longitude: pickedLocation.lng,
      } as any,
      capacity: {
        max: capacityTotal,
        total: capacityTotal,
      } as any,
      content: content.trim(),
      joinMode,
      conditions: joinMode === "APPROVAL" ? conditions.trim() : undefined,
      durationMinutes,
    };

    onSubmit(formData);
  }, [
    title,
    selectedDate,
    pickedLocation,
    joinMode,
    conditions,
    category,
    capacityTotal,
    content,
    durationMinutes,
    onSubmit,
    openDatePicker,
    openLocationPicker,
    isOptionsExpanded,
  ]);

  const titleError = submitAttempted && !title.trim();
  const dateError = submitAttempted && !selectedDate;
  const locationError = submitAttempted && !pickedLocation;
  const conditionsError = submitAttempted && joinMode === "APPROVAL" && !conditions.trim();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.root}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.page}>
            {/* 1) 카테고리 */}
            <View style={s.section}>
              <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 10 }]}>카테고리</Text>
              <View style={[s.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                <CategoryChips mode="select" value={category} onChange={onPickCategory} />
              </View>
            </View>

            {/* 2) 제목 */}
            <View style={s.section}>
              <View style={s.labelRow}>
                <Text style={[t.typography.labelMedium, { color: t.colors.textSub }]}>
                  모임 제목 <Text style={{ color: t.colors.error }}>*</Text>
                </Text>
                <Text style={[t.typography.labelSmall, { color: t.colors.overlay?.[55] ?? t.colors.textSub }]}>
                  {title.length}/40
                </Text>
              </View>

              <View
                style={[
                  s.inputBox,
                  {
                    backgroundColor: t.colors.surface,
                    borderColor: titleError ? t.colors.error : t.colors.border,
                  },
                ]}
              >
                <TextInput
                  ref={titleRef}
                  style={[t.typography.titleLarge, { color: t.colors.textMain, paddingVertical: 0 }]}
                  placeholder="예) 한강 러닝 5km 같이 뛰어요"
                  placeholderTextColor={t.colors.placeholder}
                  value={title}
                  onChangeText={(v) => setTitle(v ?? "")}
                  maxLength={40}
                  multiline
                  returnKeyType="next"
                  blurOnSubmit
                  onSubmitEditing={onTitleSubmitEditing}
                />
              </View>

              {titleError ? (
                <Text style={[t.typography.labelSmall, { color: t.colors.error }, s.errorText]}>제목은 필수입니다.</Text>
              ) : null}
            </View>

            {/* 3) 시간 & 장소 (세로 스택, 큰 터치 영역) */}
            <View style={s.section}>
              <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 10 }]}>
                일정과 장소 <Text style={{ color: t.colors.error }}>*</Text>
              </Text>

              <View style={s.stackedPickRow}>
                <Pressable
                  onPress={openDatePicker}
                  style={({ pressed }) => [
                    s.pickCard,
                    {
                      backgroundColor: t.colors.neutral?.[50] ?? t.colors.surface,
                      borderColor: dateError ? t.colors.error : (t.colors.neutral?.[200] ?? t.colors.border),
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={s.pickIconWrap}>
                    <Ionicons
                      name="calendar"
                      size={22}
                      color={selectedDate ? t.colors.primary : (t.colors.neutral?.[400] ?? t.colors.textSub)}
                    />
                  </View>

                  <View style={s.pickTextWrap}>
                    <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>날짜 및 시간</Text>
                    <Text
                      style={[t.typography.bodyLarge, { color: t.colors.textMain, fontWeight: "600", marginTop: 2 }]}
                      numberOfLines={1}
                    >
                      {dateLabel}
                    </Text>
                  </View>

                  <View style={s.pickChevronWrap}>
                    <Ionicons name="chevron-forward" size={18} color={t.colors.neutral?.[400] ?? t.colors.textSub} />
                  </View>
                </Pressable>

                <Pressable
                  onPress={openLocationPicker}
                  style={({ pressed }) => [
                    s.pickCard,
                    {
                      backgroundColor: t.colors.neutral?.[50] ?? t.colors.surface,
                      borderColor: locationError ? t.colors.error : (t.colors.neutral?.[200] ?? t.colors.border),
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={s.pickIconWrap}>
                    <Ionicons
                      name="location"
                      size={22}
                      color={pickedLocation ? t.colors.primary : (t.colors.neutral?.[400] ?? t.colors.textSub)}
                    />
                  </View>

                  <View style={s.pickTextWrap}>
                    <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>만남 장소</Text>
                    <Text
                      style={[t.typography.bodyLarge, { color: t.colors.textMain, fontWeight: "600", marginTop: 2 }]}
                      numberOfLines={1}
                    >
                      {locationLabel}
                    </Text>
                  </View>

                  <View style={s.pickChevronWrap}>
                    <Ionicons name="chevron-forward" size={18} color={t.colors.neutral?.[400] ?? t.colors.textSub} />
                  </View>
                </Pressable>

                {(dateError || locationError) && (
                  <Text style={[t.typography.labelSmall, { color: t.colors.error }]}>
                    날짜/장소를 선택해주세요.
                  </Text>
                )}
              </View>
            </View>

            {/* 4) 내용 (선택) */}
            <View style={s.section}>
              <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 10 }]}>내용 (선택)</Text>

              <TextInput
                style={[
                  s.textArea,
                  {
                    backgroundColor: t.colors.surface,
                    color: t.colors.textMain,
                    borderColor: t.colors.neutral?.[200] ?? t.colors.border,
                  },
                ]}
                placeholder="활동 내용이나 준비물을 적어주세요."
                placeholderTextColor={t.colors.placeholder}
                multiline
                value={content}
                onChangeText={(v) => setContent(v ?? "")}
              />
            </View>

            {/* 5) 상세 설정 (간소화: 인원/시간/방식만) */}
            <View
              style={[
                s.optionsContainer,
                { borderColor: t.colors.neutral?.[200] ?? t.colors.border, backgroundColor: t.colors.surface },
              ]}
            >
              <Pressable onPress={toggleOptions} style={s.expandHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>상세 설정</Text>
                  {!isOptionsExpanded && (
                    <View style={[s.summaryBadge, { backgroundColor: t.colors.neutral?.[50] ?? t.colors.surface }]}>
                      <Text style={[t.typography.bodyMedium, { color: t.colors.primary, fontWeight: "600" }]}>{summaryText}</Text>
                    </View>
                  )}
                </View>
                <Ionicons
                  name={isOptionsExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={t.colors.neutral?.[400] ?? t.colors.textSub}
                />
              </Pressable>

              {isOptionsExpanded && (
                <View style={s.optionBlock}>
                  {/* 인원 (스텝퍼만 남김) */}
                  <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, marginBottom: 6 }]}>모집 인원</Text>
                  <View style={s.optionRow}>
                    <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>2~20명</Text>

                    <View style={s.stepperWrap}>
                      <Pressable
                        onPress={onDecCapacity}
                        style={({ pressed }) => [
                          s.circleBtn,
                          { backgroundColor: t.colors.neutral?.[100] ?? t.colors.surface, opacity: pressed ? 0.85 : 1 },
                        ]}
                        hitSlop={10}
                      >
                        <Ionicons name="remove" size={18} color={t.colors.textMain} />
                      </Pressable>

                      <Text
                        style={[
                          t.typography.titleMedium,
                          { color: t.colors.textMain, minWidth: 34, textAlign: "center", marginHorizontal: 12 },
                        ]}
                      >
                        {capacityTotal}
                      </Text>

                      <Pressable
                        onPress={onIncCapacity}
                        style={({ pressed }) => [
                          s.circleBtn,
                          { backgroundColor: t.colors.neutral?.[100] ?? t.colors.surface, opacity: pressed ? 0.85 : 1 },
                        ]}
                        hitSlop={10}
                      >
                        <Ionicons name="add" size={18} color={t.colors.textMain} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={[s.divider, { backgroundColor: t.colors.neutral?.[100] ?? t.colors.border, marginTop: 12 }]} />

                  {/* 소요 시간 (퀵 5개 + 슬라이더 + 입력) */}
                  <View style={{ paddingTop: 14 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                      <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>소요 시간</Text>
                      <Text style={[t.typography.titleSmall, { color: t.colors.primary }]}>{getDurationLabel(durationMinutes)}</Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 8, marginTop: 12 }}
                    >
                      {DURATION_QUICK.map((m, idx) => {
                        const active = durationMinutes === m;
                        return (
                          <Pressable
                            key={m}
                            onPress={() => applyDuration(m)}
                            style={({ pressed }) => [
                              s.timeChip,
                              {
                                borderColor: active ? t.colors.primary : (t.colors.neutral?.[200] ?? t.colors.border),
                                backgroundColor: active ? t.colors.primaryLight : (t.colors.neutral?.[100] ?? t.colors.surface),
                                marginLeft: idx === 0 ? 0 : 8,
                                opacity: pressed ? 0.9 : 1,
                              },
                            ]}
                          >
                            <Text style={[t.typography.labelMedium, { color: active ? t.colors.primaryDark : t.colors.textSub, fontWeight: "600" }]}>
                              {getDurationLabel(m)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    <View style={{ marginTop: 14 }}>
                      <Slider
                        minimumValue={DURATION_MIN}
                        maximumValue={DURATION_MAX}
                        step={DURATION_STEP}
                        value={durationMinutes}
                        onValueChange={(v) => setDurationMinutes(clampDuration(Number(v)))}
                        onSlidingComplete={(v) => applyDuration(Number(v))}
                        minimumTrackTintColor={t.colors.primary}
                        maximumTrackTintColor={t.colors.neutral?.[200] ?? t.colors.border}
                        thumbTintColor={t.colors.primary}
                      />
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                        <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>{getDurationLabel(DURATION_MIN)}</Text>
                        <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>{getDurationLabel(DURATION_MAX)}</Text>
                      </View>
                    </View>

                    <View style={{ marginTop: 14 }}>
                      <View
                        style={[
                          s.durationInputWrap,
                          {
                            backgroundColor: t.colors.neutral?.[50] ?? t.colors.surface,
                            borderColor: durationError ? t.colors.error : (t.colors.neutral?.[200] ?? t.colors.border),
                          },
                        ]}
                      >
                        <TextInput
                          value={durationInput}
                          onChangeText={(txt) => {
                            setDurationInput((txt ?? "").replace(/[^0-9]/g, ""));
                            setDurationError(null);
                          }}
                          keyboardType="number-pad"
                          placeholder={`${DURATION_MIN}~${DURATION_MAX}`}
                          placeholderTextColor={t.colors.neutral?.[400] ?? t.colors.placeholder}
                          style={[s.durationInput, { color: t.colors.textMain }]}
                          returnKeyType="done"
                          onEndEditing={commitDurationInput}
                        />
                        <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginLeft: 8 }]}>분</Text>
                        <Pressable
                          onPress={commitDurationInput}
                          hitSlop={10}
                          style={({ pressed }) => [{ marginLeft: "auto", padding: 8, opacity: pressed ? 0.8 : 1 }]}
                        >
                          <Ionicons name="checkmark-circle" size={22} color={t.colors.primary} />
                        </Pressable>
                      </View>

                      {durationError ? (
                        <Text style={[t.typography.labelSmall, { color: t.colors.error }, s.errorText]}>{durationError}</Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={[s.divider, { backgroundColor: t.colors.neutral?.[100] ?? t.colors.border, marginTop: 16 }]} />

                  {/* 참여 방식 (버튼 2개로 단순화) */}
                  <View style={{ paddingTop: 14 }}>
                    <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>참여 방식</Text>

                    <View style={s.modeRow}>
                      {(["INSTANT", "APPROVAL"] as JoinMode[]).map((mode) => {
                        const active = joinMode === mode;
                        return (
                          <Pressable
                            key={mode}
                            onPress={() => onSelectJoinMode(mode)}
                            style={({ pressed }) => [
                              s.modeBtn,
                              {
                                borderColor: active ? t.colors.primary : (t.colors.neutral?.[200] ?? t.colors.border),
                                backgroundColor: active ? t.colors.primaryLight : (t.colors.neutral?.[50] ?? t.colors.surface),
                                opacity: pressed ? 0.92 : 1,
                              },
                            ]}
                          >
                            <Text style={[t.typography.labelMedium, { color: active ? t.colors.primaryDark : t.colors.textSub, fontWeight: "700" }]}>
                              {mode === "INSTANT" ? "선착순" : "승인제"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {joinMode === "APPROVAL" && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginBottom: 8 }]}>
                          승인 조건 <Text style={{ color: t.colors.error }}>*</Text>
                        </Text>

                        <TextInput
                          style={[
                            s.smallInput,
                            {
                              color: t.colors.textMain,
                              backgroundColor: t.colors.neutral?.[50] ?? t.colors.surface,
                              borderColor: conditionsError ? t.colors.error : (t.colors.neutral?.[200] ?? t.colors.border),
                            },
                          ]}
                          placeholder="예: 초보 환영 / 준비물 없음"
                          placeholderTextColor={t.colors.neutral?.[400] ?? t.colors.placeholder}
                          value={conditions}
                          onChangeText={(v) => setConditions(v ?? "")}
                        />

                        {conditionsError ? (
                          <Text style={[t.typography.labelSmall, { color: t.colors.error }, s.errorText]}>
                            승인제에서는 조건 입력이 필요합니다.
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>

      {/* 하단 버튼 */}
      <View
        style={[
          s.bottomBar,
          {
            backgroundColor: t.colors.background,
            borderTopColor: t.colors.neutral?.[200] ?? t.colors.border,
            paddingBottom: 12 + insets.bottom,
          },
        ]}
      >
        <Button
          title={isSubmitting ? "처리 중..." : submitLabel}
          size="lg"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
        />
      </View>

      {/* 날짜/시간 선택 모달 */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="datetime"
        onConfirm={(date) => {
          const now = new Date();
          if (date && date.getTime() < now.getTime()) {
            Alert.alert("알림", "지난 시간은 선택할 수 없어요.");
            setDatePickerVisibility(false);
            return;
          }
          setSelectedDate(date);
          setDatePickerVisibility(false);
        }}
        onCancel={() => setDatePickerVisibility(false)}
        locale="ko_KR"
        confirmTextIOS="선택"
        cancelTextIOS="취소"
        date={selectedDate || new Date(Date.now() + 60 * 60 * 1000)}
        minimumDate={new Date()}
      />

      {/* 위치 선택 모달 */}
      <LocationPickerModal
        visible={locationModalVisible}
        initialLocation={pickedLocation}
        onClose={() => setLocationModalVisible(false)}
        onConfirm={(loc) => {
          setPickedLocation(loc);
          setLocationModalVisible(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

// ✅ LocationPickerModal (권한/실패 케이스 방어)
const LocationPickerModal = React.memo(function LocationPickerModal({
  visible,
  initialLocation,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  initialLocation: LocationData | null;
  onClose: () => void;
  onConfirm: (loc: LocationData) => void;
}) {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(t), [t]);

  const mapRef = useRef<MapView | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [address, setAddress] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const fetchAddress = useCallback(async (lat: number, lng: number) => {
    const myReq = ++reqIdRef.current;
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (!aliveRef.current) return;
      if (myReq !== reqIdRef.current) return;

      if (res?.[0]) {
        const text = [res[0].city, res[0].district, res[0].street, res[0].name].filter(Boolean).join(" ");
        setAddress(text || "선택된 위치");
      } else {
        setAddress("선택된 위치");
      }
    } catch {
      // ignore
    }
  }, []);

  const animateTo = useCallback((r: Region, durationMs: number) => {
    requestAnimationFrame(() => mapRef.current?.animateToRegion(r, durationMs));
  }, []);

  const ensurePermission = useCallback(async () => {
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm?.granted) return true;

      const req = await Location.requestForegroundPermissionsAsync();
      return req?.granted === true;
    } catch {
      return false;
    }
  }, []);

  const moveToCurrent = useCallback(async () => {
    if (isLocating) return;

    setIsLocating(true);
    try {
      const granted = await ensurePermission();
      setPermissionDenied(!granted);
      if (!granted) return;

      const pos = await Location.getCurrentPositionAsync({});
      const r = { ...DEFAULT_REGION, latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setRegion(r);
      animateTo(r, 450);
      fetchAddress(r.latitude, r.longitude);
    } catch {
      // ignore
    } finally {
      setIsLocating(false);
    }
  }, [ensurePermission, fetchAddress, animateTo, isLocating]);

  useEffect(() => {
    if (!visible) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    setPermissionDenied(false);

    if (initialLocation) {
      const r = { ...DEFAULT_REGION, latitude: initialLocation.lat, longitude: initialLocation.lng };
      setRegion(r);
      setAddress(initialLocation.addressText);
      animateTo(r, 0);
      return;
    }

    setAddress("");
    moveToCurrent();
  }, [visible, initialLocation, moveToCurrent, animateTo]);

  const onRegionChangeComplete = useCallback(
    (r: Region) => {
      setRegion(r);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchAddress(r.latitude, r.longitude);
      }, 350);
    },
    [fetchAddress]
  );

  const confirm = useCallback(() => {
    onConfirm({
      addressText: address || "선택된 위치",
      lat: region.latitude,
      lng: region.longitude,
    });
  }, [onConfirm, address, region.latitude, region.longitude]);

  const openSettings = useCallback(() => {
    try {
      Linking.openSettings?.();
    } catch {
      // ignore
    }
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.background }}>
        <View style={[s.modalHeader, { paddingTop: 14 + insets.top }]}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={28} color={t.colors.textMain} />
          </Pressable>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>위치 선택</Text>
          </View>

          <View style={{ width: 28 }} />
        </View>

        <View style={s.mapWrap}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            region={region}
            onRegionChangeComplete={onRegionChangeComplete}
            provider={PROVIDER_GOOGLE}
            rotateEnabled={false}
            pitchEnabled={false}
          />

          <View style={s.centerPin} pointerEvents="none">
            <Ionicons name="location-sharp" size={36} color={t.colors.primary} />
          </View>

          <Pressable
            onPress={moveToCurrent}
            hitSlop={10}
            style={({ pressed }) => [
              s.floatingBtn,
              {
                backgroundColor: t.colors.surface,
                borderColor: t.colors.neutral?.[200] ?? t.colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name={isLocating ? "time" : "locate"} size={20} color={t.colors.textMain} />
          </Pressable>
        </View>

        <View
          style={[
            s.modalBottom,
            {
              paddingBottom: 18 + insets.bottom,
              backgroundColor: t.colors.surface,
              borderTopColor: t.colors.neutral?.[200] ?? t.colors.border,
            },
          ]}
        >
          {permissionDenied ? (
            <View
              style={[
                s.warningBox,
                {
                  backgroundColor: t.colors.neutral?.[50] ?? t.colors.surface,
                  borderColor: t.colors.neutral?.[200] ?? t.colors.border,
                },
              ]}
            >
              <Ionicons name="alert-circle" size={18} color={t.colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={[t.typography.labelMedium, { color: t.colors.textMain }]}>위치 권한이 필요해요</Text>
                <Pressable onPress={openSettings} style={({ pressed }) => [{ marginTop: 10, opacity: pressed ? 0.85 : 1 }]}>
                  <Text style={[t.typography.labelMedium, { color: t.colors.primary, fontWeight: "700" }]}>설정 열기</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, marginTop: permissionDenied ? 12 : 0, textAlign: "center" }]} numberOfLines={2}>
            {address || "주소 확인 중..."}
          </Text>

          <View style={{ marginTop: 14 }}>
            <Button title="이 위치로 설정" onPress={confirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
});

// 요약(3줄): neutral[0] 인덱싱 오류를 제거하고, 색상 접근을 50/100/200 중심으로만 사용하도록 정리했습니다.
// 요약(3줄): 상세 설정에서 모집 인원 “빠른 선택 버튼”을 삭제하고 스텝퍼만 남겨 화면을 간소화했습니다.
// 요약(3줄): 안내/부연 텍스트를 필수 에러 메시지 중심으로 줄여 초보자에게 덜 복잡하게 보이도록 했습니다.
