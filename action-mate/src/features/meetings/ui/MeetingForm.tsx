import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const DURATION_PRESETS = [30, 60, 90, 120, 180];
const DEFAULT_REGION: Region = {
  latitude: 37.5665,
  longitude: 126.978,
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
};

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

// --- Props Definition ---
type MeetingFormProps = {
  initialValues?: Partial<MeetingParams>; // 수정 시 초기값
  submitLabel: string;
  onSubmit: (data: MeetingParams) => void;
  isSubmitting: boolean;
};

export default function MeetingForm({
  initialValues,
  submitLabel,
  onSubmit,
  isSubmitting,
}: MeetingFormProps) {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const titleRef = useRef<TextInput>(null);

  // --- Form State ---
  const [title, setTitle] = useState(initialValues?.title || "");
  const [category, setCategory] = useState<CategoryKey>(initialValues?.category || "SPORTS");
  
  // Date Handling
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialValues?.meetingTimeIso ? new Date(initialValues.meetingTimeIso) : null
  );

  // Location Handling
  const [pickedLocation, setPickedLocation] = useState<LocationData | null>(
    initialValues?.locationLat && initialValues?.locationLng
      ? {
          addressText: initialValues.locationText || "위치 정보",
          lat: initialValues.locationLat,
          lng: initialValues.locationLng,
        }
      : null
  );

  const [content, setContent] = useState(initialValues?.content || "");
  const [capacity, setCapacity] = useState(initialValues?.capacityTotal || 4);
  const [durationMinutes, setDurationMinutes] = useState(initialValues?.durationMinutes || 90);
  const [joinMode, setJoinMode] = useState<JoinMode>(initialValues?.joinMode || "INSTANT");
  const [conditions, setConditions] = useState(initialValues?.conditions || "");

  // --- UI State ---
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  const toggleOptions = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOptionsExpanded(!isOptionsExpanded);
  };

  const handleSubmit = () => {
    // 1. 유효성 검사
    if (!title.trim()) return Alert.alert("알림", "제목을 입력해주세요.");
    if (!selectedDate) return Alert.alert("알림", "언제 만날지 정해주세요.");
    if (!pickedLocation) return Alert.alert("알림", "어디서 만날지 정해주세요.");
    if (joinMode === "APPROVAL" && !conditions.trim()) {
      return Alert.alert("알림", "승인 조건을 입력해주세요.");
    }

    // 2. 데이터 조합 및 전송
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
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ paddingHorizontal: t.spacing.pagePaddingH }}>
            
            {/* 1. 카테고리 */}
            <View style={{ marginTop: 16, marginBottom: 16 }}>
              <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 8 }]}>
                카테고리 선택
              </Text>
              <CategoryChips
                mode="select"
                value={category}
                onChange={(val) => {
                  if (val !== "ALL") setCategory(val);
                }}
              />
            </View>

            {/* 2. 제목 */}
            <View style={{ marginTop: 8 }}>
              <View style={styles.labelRow}>
                <Text style={[t.typography.labelMedium, { color: t.colors.textSub }]}>모임 제목</Text>
                <Text style={[t.typography.labelSmall, { color: t.colors.overlay[55] }]}>
                  {title.length}/40
                </Text>
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
                  onSubmitEditing={() => scrollViewRef.current?.scrollTo({ y: 260, animated: true })}
                />
              </View>
            </View>

            {/* 3. 시간 & 장소 */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
              <Pressable
                onPress={() => setDatePickerVisibility(true)}
                style={({ pressed }) => [
                  styles.infoCard,
                  { backgroundColor: t.colors.neutral[50], opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Ionicons name="calendar" size={24} color={selectedDate ? t.colors.primary : t.colors.neutral[400]} />
                <View style={{ marginTop: 8 }}>
                  <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>날짜 및 시간</Text>
                  <Text
                    style={[t.typography.bodyLarge, { color: t.colors.textMain, fontWeight: "600", marginTop: 2 }]}
                    numberOfLines={1}
                  >
                    {selectedDate ? formatDateSimple(selectedDate) : "선택하기"}
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
                    {pickedLocation ? pickedLocation.addressText : "선택하기"}
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
                <View>
                  <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>상세 설정 (인원, 시간, 방식)</Text>
                  {!isOptionsExpanded && (
                    <Text style={[t.typography.bodyMedium, { color: t.colors.primary, fontWeight: "600", marginTop: 2 }]}>
                      {`${capacity}명 · ${getDurationLabel(durationMinutes)} · ${joinMode === "INSTANT" ? "선착순" : "승인제"}`}
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
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Pressable onPress={() => setCapacity((c) => Math.max(2, c - 1))} style={[styles.circleBtn, { backgroundColor: t.colors.neutral[100] }]}>
                        <Ionicons name="remove" size={18} color={t.colors.textMain} />
                      </Pressable>
                      <Text style={[t.typography.titleMedium, { color: t.colors.textMain, minWidth: 20, textAlign: "center" }]}>{capacity}</Text>
                      <Pressable onPress={() => setCapacity((c) => Math.min(20, c + 1))} style={[styles.circleBtn, { backgroundColor: t.colors.neutral[100] }]}>
                        <Ionicons name="add" size={18} color={t.colors.textMain} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={[styles.divider, { backgroundColor: t.colors.neutral[100] }]} />

                  {/* 시간 */}
                  <View style={{ gap: 10, paddingVertical: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>소요 시간</Text>
                      <Text style={[t.typography.titleSmall, { color: t.colors.primary }]}>{getDurationLabel(durationMinutes)}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {DURATION_PRESETS.map((m) => (
                        <Pressable
                          key={m}
                          onPress={() => setDurationMinutes(m)}
                          style={[styles.timeChip, { backgroundColor: durationMinutes === m ? t.colors.primary : t.colors.neutral[100] }]}
                        >
                          <Text style={[t.typography.labelSmall, { color: durationMinutes === m ? "#FFF" : t.colors.textSub }]}>
                            {getDurationLabel(m)}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={[styles.divider, { backgroundColor: t.colors.neutral[100] }]} />

                  {/* 참여 방식 */}
                  <View style={{ paddingVertical: 12 }}>
                    <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, marginBottom: 8 }]}>참여 방식</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["INSTANT", "APPROVAL"] as JoinMode[]).map((mode) => (
                        <Pressable
                          key={mode}
                          onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setJoinMode(mode); }}
                          style={[styles.modeBtn, { borderColor: joinMode === mode ? t.colors.primary : t.colors.neutral[200], backgroundColor: joinMode === mode ? t.colors.primaryLight : "transparent" }]}
                        >
                          <Text style={[t.typography.labelMedium, { color: joinMode === mode ? t.colors.primaryDark : t.colors.textSub }]}>
                            {mode === "INSTANT" ? "⚡ 선착순" : "🙋 승인제"}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {joinMode === "APPROVAL" && (
                      <TextInput
                        style={[styles.smallInput, { marginTop: 10, color: t.colors.textMain, backgroundColor: t.colors.neutral[50] }]}
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
        <Button
          title={isSubmitting ? "처리 중..." : submitLabel}
          size="lg"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
        />
      </View>

      {/* 모달 */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="datetime"
        onConfirm={(date) => { setSelectedDate(date); setDatePickerVisibility(false); }}
        onCancel={() => setDatePickerVisibility(false)}
        locale="ko_KR" confirmTextIOS="선택" cancelTextIOS="취소" date={selectedDate || new Date()}
      />
      
      <LocationPickerModal
        visible={locationModalVisible}
        initialLocation={pickedLocation}
        onClose={() => setLocationModalVisible(false)}
        onConfirm={(loc) => { setPickedLocation(loc); setLocationModalVisible(false); }}
      />
    </KeyboardAvoidingView>
  );
}

// ✅ LocationPickerModal (Internal)
function LocationPickerModal({ visible, initialLocation, onClose, onConfirm }: { visible: boolean; initialLocation: LocationData | null; onClose: () => void; onConfirm: (loc: LocationData) => void; }) {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [address, setAddress] = useState("");
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      if (initialLocation) {
        setAddress(initialLocation.addressText);
        setRegion({ ...DEFAULT_REGION, latitude: initialLocation.lat, longitude: initialLocation.lng });
      } else {
        (async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
              const pos = await Location.getCurrentPositionAsync({});
              const r = { ...DEFAULT_REGION, latitude: pos.coords.latitude, longitude: pos.coords.longitude };
              mapRef.current?.animateToRegion(r, 500);
              setRegion(r);
              fetchAddress(r.latitude, r.longitude);
            }
          } catch {}
        })();
      }
    }
  }, [visible]);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (res[0]) setAddress([res[0].city, res[0].district, res[0].street, res[0].name].filter(Boolean).join(" "));
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.background }}>
        <View style={[styles.modalHeader, { paddingTop: 14 + insets.top }]}>
          <Pressable onPress={onClose}><Ionicons name="close" size={28} color={t.colors.textMain} /></Pressable>
          <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>위치 선택</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef} style={{ flex: 1 }} region={region}
            onRegionChangeComplete={(r) => { setRegion(r); if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => fetchAddress(r.latitude, r.longitude), 400); }}
            provider={PROVIDER_GOOGLE} rotateEnabled={false}
          />
          <View style={styles.centerPin} pointerEvents="none"><Ionicons name="location-sharp" size={36} color={t.colors.primary} /></View>
        </View>
        <View style={[styles.modalBottom, { paddingBottom: 20 + insets.bottom, backgroundColor: t.colors.surface }]}>
          <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, marginBottom: 16, textAlign: "center" }]}>{address || "위치 잡는 중..."}</Text>
          <Button title="이 위치로 설정" onPress={() => onConfirm({ addressText: address || "선택된 위치", lat: region.latitude, lng: region.longitude })} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 8 },
  inputBox: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  infoCard: { flex: 1, borderRadius: 16, padding: 16, justifyContent: "space-between", minHeight: 100 },
  textArea: { minHeight: 120, borderRadius: 12, borderWidth: 1, padding: 16, fontSize: 16, textAlignVertical: "top", lineHeight: 22 },
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
});