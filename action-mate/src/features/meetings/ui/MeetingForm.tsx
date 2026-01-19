import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  UIManager,
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

// ✅ Types
import type { CategoryKey, JoinMode, MeetingParams } from "@/features/meetings/model/types";

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
const DURATION_QUICK = [10, 15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180];

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

// --- Props Definition ---
type MeetingFormProps = {
  initialValues?: Partial<MeetingParams>;
  submitLabel: string;
  onSubmit: (data: MeetingParams) => void;
  isSubmitting: boolean;
};

export default function MeetingForm({ initialValues, submitLabel, onSubmit, isSubmitting }: MeetingFormProps) {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const titleRef = useRef<TextInput>(null);

  // ✅ Android LayoutAnimation enable
  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // --- Form State ---
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategoryKey>("SPORTS");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pickedLocation, setPickedLocation] = useState<LocationData | null>(null);
  const [content, setContent] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [joinMode, setJoinMode] = useState<JoinMode>("INSTANT");
  const [conditions, setConditions] = useState("");

  // ✅ duration direct input state
  const [durationInput, setDurationInput] = useState(String(durationMinutes));
  const [durationError, setDurationError] = useState<string | null>(null);

  // --- UI State ---
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);
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

    setSelectedDate(iv.meetingTimeIso ? new Date(iv.meetingTimeIso) : null);

    if (iv.locationLat && iv.locationLng) {
      setPickedLocation({
        addressText: iv.locationText || "위치 정보",
        lat: iv.locationLat,
        lng: iv.locationLng,
      });
    } else {
      setPickedLocation(null);
    }

    setContent(iv.content ?? "");
    setCapacity(iv.capacityTotal ?? 4);

    const initDuration = clampDuration(iv.durationMinutes ?? 90);
    setDurationMinutes(initDuration);

    setJoinMode((iv.joinMode as JoinMode) ?? "INSTANT");
    setConditions(iv.conditions ?? "");

    didInitRef.current = true;
  }, [initialValues]);

  // durationMinutes 바뀌면 입력창도 동기화
  useEffect(() => {
    setDurationInput(String(durationMinutes));
  }, [durationMinutes]);

  const applyDuration = useCallback((v: number) => {
    const next = clampDuration(v);
    setDurationError(null);
    setDurationMinutes(next);
  }, []);

  const toggleOptions = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOptionsExpanded((v) => !v);
  }, []);

  const summaryText = useMemo(() => {
    return `${capacity}명 · ${getDurationLabel(durationMinutes)} · ${joinMode === "INSTANT" ? "선착순" : "승인제"}`;
  }, [capacity, durationMinutes, joinMode]);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return Alert.alert("알림", "제목을 입력해주세요.");
    if (!selectedDate) return Alert.alert("알림", "언제 만날지 정해주세요.");
    if (!pickedLocation) return Alert.alert("알림", "어디서 만날지 정해주세요.");
    if (joinMode === "APPROVAL" && !conditions.trim()) {
      return Alert.alert("알림", "승인 조건을 입력해주세요.");
    }

    const formData: MeetingParams = {
      title: title.trim(),
      category,
      meetingTimeText: formatDateSimple(selectedDate),
      meetingTimeIso: selectedDate.toISOString(),
      locationText: pickedLocation.addressText,
      locationLat: pickedLocation.lat,
      locationLng: pickedLocation.lng,
      capacityTotal: capacity,
      content: content.trim(),
      joinMode,
      conditions: joinMode === "APPROVAL" ? conditions.trim() : undefined,
      durationMinutes,
    };

    onSubmit(formData);
  }, [title, selectedDate, pickedLocation, joinMode, conditions, category, capacity, content, durationMinutes, onSubmit]);

  const onPickCategory = useCallback((val: CategoryKey | "ALL") => {
    if (val !== "ALL") setCategory(val);
  }, []);

  const onTitleSubmitEditing = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 260, animated: true });
  }, []);

  const onDecCapacity = useCallback(() => setCapacity((c) => Math.max(2, c - 1)), []);
  const onIncCapacity = useCallback(() => setCapacity((c) => Math.min(20, c + 1)), []);

  const onSelectJoinMode = useCallback((mode: JoinMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ paddingHorizontal: t.spacing.pagePaddingH }}>
            {/* 1. 카테고리 */}
            <View style={{ marginTop: 16, marginBottom: 16 }}>
              <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 8 }]}>카테고리 선택</Text>
              <CategoryChips mode="select" value={category} onChange={onPickCategory} />
            </View>

            {/* 2. 제목 */}
            <View style={{ marginTop: 8 }}>
              <View style={styles.labelRow}>
                <Text style={[t.typography.labelMedium, { color: t.colors.textSub }]}>모임 제목</Text>
                <Text style={[t.typography.labelSmall, { color: t.colors.overlay[55] }]}>{title.length}/40</Text>
              </View>

              <View style={[styles.inputBox, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                <TextInput
                  ref={titleRef}
                  style={[t.typography.titleLarge, { color: t.colors.textMain, paddingVertical: 0 }]}
                  placeholder="예) 한강 러닝 5km 같이 뛰어요"
                  placeholderTextColor={t.colors.placeholder}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={40}
                  multiline
                  returnKeyType="next"
                  blurOnSubmit
                  onSubmitEditing={onTitleSubmitEditing}
                />
              </View>
            </View>

            {/* 3. 시간 & 장소 */}
            <View style={{ flexDirection: "row", marginTop: 24 }}>
              <Pressable
                onPress={() => setDatePickerVisibility(true)}
                style={({ pressed }) => [
                  styles.infoCard,
                  { marginRight: 12, backgroundColor: t.colors.neutral[50], opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Ionicons name="calendar" size={24} color={selectedDate ? t.colors.primary : t.colors.neutral[400]} />
                <View style={{ marginTop: 8 }}>
                  <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>날짜 및 시간</Text>
                  <Text
                    style={[t.typography.bodyLarge, { color: t.colors.textMain, fontWeight: "600", marginTop: 2 }]}
                    numberOfLines={1}
                  >
                    {dateLabel}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setLocationModalVisible(true)}
                style={({ pressed }) => [
                  styles.infoCard,
                  { backgroundColor: t.colors.neutral[50], opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Ionicons name="location" size={24} color={pickedLocation ? t.colors.primary : t.colors.neutral[400]} />
                <View style={{ marginTop: 8 }}>
                  <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>만남 장소</Text>
                  <Text
                    style={[t.typography.bodyLarge, { color: t.colors.textMain, fontWeight: "600", marginTop: 2 }]}
                    numberOfLines={1}
                  >
                    {locationLabel}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* 4. 내용 */}
            <View style={{ marginTop: 24 }}>
              <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 8 }]}>내용</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: t.colors.surface, color: t.colors.textMain, borderColor: t.colors.neutral[200] },
                ]}
                placeholder="활동 내용이나 준비물을 자유롭게 적어주세요."
                placeholderTextColor={t.colors.placeholder}
                multiline
                value={content}
                onChangeText={setContent}
              />
            </View>

            {/* 5. 상세 설정 (아코디언) */}
            <View style={[styles.optionsContainer, { borderColor: t.colors.neutral[200], backgroundColor: t.colors.surface }]}>
              <Pressable onPress={toggleOptions} style={styles.expandHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>상세 설정 (인원, 시간, 방식)</Text>
                  {!isOptionsExpanded && (
                    <Text style={[t.typography.bodyMedium, { color: t.colors.primary, fontWeight: "600", marginTop: 2 }]}>
                      {summaryText}
                    </Text>
                  )}
                </View>
                <Ionicons name={isOptionsExpanded ? "chevron-up" : "chevron-down"} size={20} color={t.colors.neutral[400]} />
              </Pressable>

              {isOptionsExpanded && (
                <View style={{ marginTop: 16 }}>
                  {/* 인원 */}
                  <View style={styles.optionRow}>
                    <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>모집 인원</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Pressable onPress={onDecCapacity} style={[styles.circleBtn, { backgroundColor: t.colors.neutral[100] }]} hitSlop={10}>
                        <Ionicons name="remove" size={18} color={t.colors.textMain} />
                      </Pressable>

                      <Text style={[t.typography.titleMedium, { color: t.colors.textMain, minWidth: 28, textAlign: "center", marginHorizontal: 12 }]}>
                        {capacity}
                      </Text>

                      <Pressable onPress={onIncCapacity} style={[styles.circleBtn, { backgroundColor: t.colors.neutral[100] }]} hitSlop={10}>
                        <Ionicons name="add" size={18} color={t.colors.textMain} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: t.colors.neutral[100] }]} />

                  {/* ✅ 소요 시간 (퀵칩 + 슬라이더 + 직접입력) */}
                  <View style={{ paddingVertical: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                      <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>소요 시간</Text>
                      <Text style={[t.typography.titleSmall, { color: t.colors.primary }]}>{getDurationLabel(durationMinutes)}</Text>
                    </View>

                    {/* 1) 퀵 선택 칩 */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
                      {DURATION_QUICK.map((m, idx) => {
                        const active = durationMinutes === m;
                        return (
                          <Pressable
                            key={m}
                            onPress={() => applyDuration(m)}
                            style={[
                              styles.timeChip,
                              { backgroundColor: active ? t.colors.primary : t.colors.neutral[100] },
                              idx !== 0 ? { marginLeft: 8 } : null,
                            ]}
                          >
                            <Text style={[t.typography.labelSmall, { color: active ? "#FFF" : t.colors.textSub }]}>
                              {getDurationLabel(m)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    {/* 2) 슬라이더 */}
                    <View style={{ marginTop: 14 }}>
                      <Slider
                        minimumValue={DURATION_MIN}
                        maximumValue={DURATION_MAX}
                        step={DURATION_STEP}
                        value={durationMinutes}
                        onValueChange={(v) => setDurationMinutes(v)}
                        onSlidingComplete={(v) => applyDuration(v)}
                        minimumTrackTintColor={t.colors.primary}
                        maximumTrackTintColor={t.colors.neutral[200]}
                        thumbTintColor={t.colors.primary}
                      />
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                        <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>{getDurationLabel(DURATION_MIN)}</Text>
                        <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>{getDurationLabel(DURATION_MAX)}</Text>
                      </View>
                    </View>

                    {/* 3) 직접 입력 */}
                    <View style={{ marginTop: 14 }}>
                      <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginBottom: 8 }]}>직접 입력 (분)</Text>
                      <View
                        style={[
                          styles.durationInputWrap,
                          {
                            backgroundColor: t.colors.neutral[50],
                            borderColor: durationError ? t.colors.error : t.colors.neutral[200],
                          },
                        ]}
                      >
                        <TextInput
                          value={durationInput}
                          onChangeText={(txt) => {
                            setDurationInput(txt.replace(/[^0-9]/g, ""));
                            setDurationError(null);
                          }}
                          keyboardType="number-pad"
                          placeholder={`${DURATION_MIN}~${DURATION_MAX}`}
                          placeholderTextColor={t.colors.neutral[400]}
                          style={[styles.durationInput, { color: t.colors.textMain }]}
                          returnKeyType="done"
                          onEndEditing={commitDurationInput}
                        />

                        <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginLeft: 8 }]}>분</Text>

                        <Pressable onPress={commitDurationInput} hitSlop={10} style={({ pressed }) => [{ marginLeft: "auto", padding: 8, opacity: pressed ? 0.8 : 1 }]}>
                          <Ionicons name="checkmark-circle" size={22} color={t.colors.primary} />
                        </Pressable>
                      </View>

                      {durationError ? (
                        <Text style={[t.typography.labelSmall, { color: t.colors.error, marginTop: 6 }]}>{durationError}</Text>
                      ) : null}

                      <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginTop: 6 }]}>
                        * {DURATION_STEP}분 단위로 자동 보정됩니다.
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: t.colors.neutral[100] }]} />

                  {/* 참여 방식 */}
                  <View style={{ paddingVertical: 12 }}>
                    <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, marginBottom: 8 }]}>참여 방식</Text>

                    <View style={{ flexDirection: "row" }}>
                      {(["INSTANT", "APPROVAL"] as JoinMode[]).map((mode, idx) => {
                        const active = joinMode === mode;
                        return (
                          <Pressable
                            key={mode}
                            onPress={() => onSelectJoinMode(mode)}
                            style={[
                              styles.modeBtn,
                              {
                                borderColor: active ? t.colors.primary : t.colors.neutral[200],
                                backgroundColor: active ? t.colors.primaryLight : "transparent",
                              },
                              idx === 0 ? { marginRight: 8 } : null,
                            ]}
                          >
                            <Text style={[t.typography.labelMedium, { color: active ? t.colors.primaryDark : t.colors.textSub }]}>
                              {mode === "INSTANT" ? "⚡ 선착순" : "🙋 승인제"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {joinMode === "APPROVAL" && (
                      <TextInput
                        style={[
                          styles.smallInput,
                          { marginTop: 10, color: t.colors.textMain, backgroundColor: t.colors.neutral[50] },
                        ]}
                        placeholder="예: 20대 여성분만, 초보 환영 등"
                        placeholderTextColor={t.colors.neutral[400]}
                        value={conditions}
                        onChangeText={setConditions}
                      />
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={[styles.bottomBar, { backgroundColor: t.colors.background, borderTopColor: t.colors.neutral[200], paddingBottom: 12 + insets.bottom }]}>
        <Button title={isSubmitting ? "처리 중..." : submitLabel} size="lg" onPress={handleSubmit} loading={isSubmitting} disabled={isSubmitting} />
      </View>

      {/* 모달 */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="datetime"
        onConfirm={(date) => {
          setSelectedDate(date);
          setDatePickerVisibility(false);
        }}
        onCancel={() => setDatePickerVisibility(false)}
        locale="ko_KR"
        confirmTextIOS="선택"
        cancelTextIOS="취소"
        date={selectedDate || new Date()}
      />

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

// ✅ LocationPickerModal (실무 최적화 버전)
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
  const mapRef = useRef<MapView | null>(null);

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [address, setAddress] = useState("");

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

      if (res[0]) {
        const text = [res[0].city, res[0].district, res[0].street, res[0].name].filter(Boolean).join(" ");
        setAddress(text);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    if (initialLocation) {
      const r = { ...DEFAULT_REGION, latitude: initialLocation.lat, longitude: initialLocation.lng };
      setRegion(r);
      setAddress(initialLocation.addressText);
      requestAnimationFrame(() => mapRef.current?.animateToRegion(r, 0));
      return;
    }

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({});
        const r = { ...DEFAULT_REGION, latitude: pos.coords.latitude, longitude: pos.coords.longitude };

        setRegion(r);
        requestAnimationFrame(() => mapRef.current?.animateToRegion(r, 500));
        fetchAddress(r.latitude, r.longitude);
      } catch {
        // ignore
      }
    })();
  }, [visible, initialLocation, fetchAddress]);

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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.background }}>
        <View style={[styles.modalHeader, { paddingTop: 14 + insets.top }]}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={28} color={t.colors.textMain} />
          </Pressable>
          <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>위치 선택</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            region={region}
            onRegionChangeComplete={onRegionChangeComplete}
            provider={PROVIDER_GOOGLE}
            rotateEnabled={false}
          />
          <View style={styles.centerPin} pointerEvents="none">
            <Ionicons name="location-sharp" size={36} color={t.colors.primary} />
          </View>
        </View>

        <View style={[styles.modalBottom, { paddingBottom: 20 + insets.bottom, backgroundColor: t.colors.surface }]}>
          <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, marginBottom: 16, textAlign: "center" }]} numberOfLines={2}>
            {address || "위치 잡는 중..."}
          </Text>
          <Button title="이 위치로 설정" onPress={confirm} />
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  labelRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 8 },
  inputBox: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  infoCard: { flex: 1, borderRadius: 16, padding: 16, justifyContent: "space-between", minHeight: 100 },

  textArea: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    textAlignVertical: "top",
    lineHeight: 22,
  },

  optionsContainer: { marginTop: 32, borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 40 },
  expandHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  optionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  circleBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },

  timeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },

  modeBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderRadius: 8, alignItems: "center" },
  smallInput: { height: 40, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },

  divider: { height: 1, width: "100%" },

  bottomBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },

  modalHeader: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  centerPin: { position: "absolute", top: "50%", left: "50%", marginTop: -36, marginLeft: -18 },
  modalBottom: { paddingHorizontal: 16, paddingTop: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },

  // ✅ duration input
  durationInputWrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  durationInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    margin: 0,
  },
});