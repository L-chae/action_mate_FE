import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import MapView, { Region, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ✅ UI 컴포넌트 임포트
import AppLayout from "@/shared/ui/AppLayout";
import { Button } from "@/shared/ui/Button";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import CategoryChips from "@/shared/ui/CategoryChips";

// ✅ 서비스 및 타입 임포트
import { getMeeting, updateMeeting } from "@/features/meetings/api/meetingService";
import type { CategoryKey, JoinMode } from "@/features/meetings/model/meeting.types";

// 안드로이드 레이아웃 애니메이션 활성화
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// -------------------------------------------------------------------------
// ✅ Types & Constants
// -------------------------------------------------------------------------
type PickedLocation = {
  addressText: string;
  lat: number;
  lng: number;
};

const DEFAULT_REGION = {
  latitude: 37.5665,
  longitude: 126.9780,
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
};

// -------------------------------------------------------------------------
// ✅ Helper Functions
// -------------------------------------------------------------------------
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

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`;
};

// -------------------------------------------------------------------------
// ✅ Edit Screen (수정 페이지)
// -------------------------------------------------------------------------
export default function EditMeetingScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // ✅ URL 파라미터에서 모임 ID 가져오기
  const { id } = useLocalSearchParams<{ id: string }>();

  // --- Loading State ---
  const [loadingInitial, setLoadingInitial] = useState(true);

  // --- Form State ---
  const [category, setCategory] = useState<CategoryKey | "ALL">("SPORTS");
  const [title, setTitle] = useState("");
  
  const [joinMode, setJoinMode] = useState<JoinMode>("INSTANT");
  const [conditions, setConditions] = useState("");

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  
  const [capacity, setCapacity] = useState(4);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [content, setContent] = useState(""); 

  // --- UI State ---
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ✅ 초기 데이터 불러오기
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const data = await getMeeting(id);
        
        // 받아온 데이터로 State 초기화
        setTitle(data.title);
        setCategory(data.category as CategoryKey);
        setJoinMode(data.joinMode);
        if (data.conditions) setConditions(data.conditions);
        
        // 날짜 파싱 (ISO String -> Date)
        if (data.meetingTime) {
          setSelectedDate(new Date(data.meetingTime));
        } else {
          // 기존 데이터에 ISO가 없으면 현재 시간으로 fallback
          setSelectedDate(new Date()); 
        }
        
        // 위치 정보 매핑
        if (data.locationLat && data.locationLng) {
          setPickedLocation({
            addressText: data.locationText || "위치 정보",
            lat: data.locationLat,
            lng: data.locationLng,
          });
        }
        
        setCapacity(data.capacityTotal);
        setDurationMinutes(data.durationMinutes || 120);
        setContent(data.content || "");
        
      } catch (e) {
        console.error(e);
        Alert.alert("오류", "모임 정보를 불러오지 못했습니다.");
        router.back();
      } finally {
        setLoadingInitial(false);
      }
    };
    loadData();
  }, [id, router]);

  // --- Handlers ---
  const handleConfirmDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setDatePickerVisibility(false);
  }, []);

  const changeCapacity = useCallback((delta: number) => {
    setCapacity((prev) => Math.max(2, Math.min(20, prev + delta)));
  }, []);

  const changeDuration = useCallback((delta: number) => {
    setDurationMinutes((prev) => Math.max(30, Math.min(360, prev + delta)));
  }, []);

  const handleJoinModeChange = (mode: JoinMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setJoinMode(mode);
  };

  const handleUpdate = async () => {
    if (!title.trim()) return Alert.alert("알림", "제목을 입력해주세요.");
    if (!selectedDate) return Alert.alert("알림", "모임 시간을 선택해주세요.");
    if (!pickedLocation) return Alert.alert("알림", "장소를 지도에서 선택해주세요.");
    if (joinMode === "APPROVAL" && !conditions.trim()) {
      return Alert.alert("알림", "어떤 사람을 승인할지 조건을 적어주세요.");
    }

    try {
      setSubmitting(true);
      const selectedCategory = category === "ALL" ? "ETC" : category;

      // ✅ updateMeeting 호출
      await updateMeeting(id!, {
        title: title.trim(),
        category: selectedCategory,
        meetingTimeText: formatDate(selectedDate),
        meetingTimeIso: selectedDate.toISOString(), // 날짜 복원용
        locationText: pickedLocation.addressText,
        locationLat: pickedLocation.lat,
        locationLng: pickedLocation.lng,
        capacityTotal: capacity,
        content: content.trim(),
        joinMode,
        conditions: joinMode === "APPROVAL" ? conditions.trim() : undefined,
        durationMinutes,
      });

      Alert.alert("수정 완료", "모임 정보가 수정되었습니다.", [
        { text: "확인", onPress: () => router.back() }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "모임을 수정하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <AppLayout>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={t.colors.primary} />
        </View>
      </AppLayout>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "모임 수정",
          headerStyle: { backgroundColor: t.colors.background },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingRight: 16 }}>
              <Ionicons name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"} size={24} color={t.colors.textMain} />
            </Pressable>
          ),
        }}
      />

      <AppLayout padded={false}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }} keyboardShouldPersistTaps="handled">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ paddingHorizontal: t.spacing.pagePaddingH, paddingTop: 20 }}>
                
                {/* 1. 카테고리 */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: t.colors.textSub }]}>카테고리</Text>
                  <CategoryChips value={category} onChange={setCategory} />
                </View>

                {/* 2. 제목 */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: t.colors.textSub }]}>제목</Text>
                  <TextInput
                    style={[styles.inputUnderline, { color: t.colors.textMain, borderBottomColor: t.colors.neutral[200] }]}
                    placeholder="예: 한강 러닝 같이 하실 분!"
                    placeholderTextColor={t.colors.neutral[400]}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={40}
                    returnKeyType="done"
                  />
                </View>

                {/* 3. 참여 방식 */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: t.colors.textSub }]}>참여 방식</Text>
                  <View style={[styles.segmentContainer, { backgroundColor: t.colors.neutral[100] }]}>
                    <Pressable
                      onPress={() => handleJoinModeChange("INSTANT")}
                      style={[styles.segmentBtn, joinMode === "INSTANT" && { backgroundColor: t.colors.surface, ...styles.shadow }]}
                    >
                      <Text style={[t.typography.labelMedium, { color: joinMode === "INSTANT" ? t.colors.primary : t.colors.textSub }]}>
                        ⚡ 선착순
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleJoinModeChange("APPROVAL")}
                      style={[styles.segmentBtn, joinMode === "APPROVAL" && { backgroundColor: t.colors.surface, ...styles.shadow }]}
                    >
                      <Text style={[t.typography.labelMedium, { color: joinMode === "APPROVAL" ? t.colors.primary : t.colors.textSub }]}>
                        🙋 승인제
                      </Text>
                    </Pressable>
                  </View>

                  {joinMode === "APPROVAL" && (
                    <View style={[styles.conditionBox, { backgroundColor: t.colors.primaryLight }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons name="alert-circle-outline" size={16} color={t.colors.primaryDark} style={{ marginRight: 4 }} />
                        <Text style={[t.typography.labelSmall, { color: t.colors.primaryDark }]}>
                          어떤 멤버를 승인하실 건가요? (필수)
                        </Text>
                      </View>
                      <TextInput
                        style={[styles.inputSimple, { color: t.colors.textMain }]}
                        placeholder="예: 20대 여성분만, 초보자 환영 등"
                        placeholderTextColor={t.colors.neutral[500]}
                        value={conditions}
                        onChangeText={setConditions}
                        autoFocus={false}
                      />
                    </View>
                  )}
                </View>

                {/* 4. 정보 카드 */}
                <View style={[styles.cardForm, { backgroundColor: t.colors.surface, borderColor: t.colors.neutral[200] }]}>
                  {/* 날짜 */}
                  <Pressable onPress={() => setDatePickerVisibility(true)} style={styles.rowInput}>
                    <Ionicons name="time" size={20} color={t.colors.primary} style={styles.iconStyle} />
                    <View style={{ flex: 1 }}>
                      <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>모임 시간</Text>
                      <Text style={[t.typography.bodyLarge, { color: selectedDate ? t.colors.textMain : t.colors.neutral[400], marginTop: 2 }]}>
                        {selectedDate ? formatDate(selectedDate) : "날짜 선택"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={t.colors.neutral[300]} />
                  </Pressable>

                  <View style={[styles.divider, { backgroundColor: t.colors.neutral[100] }]} />

                  {/* 장소 */}
                  <Pressable onPress={() => setLocationModalVisible(true)} style={styles.rowInput}>
                    <Ionicons name="location" size={20} color={t.colors.primary} style={styles.iconStyle} />
                    <View style={{ flex: 1 }}>
                      <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>장소</Text>
                      <Text 
                        style={[t.typography.bodyLarge, { color: pickedLocation ? t.colors.textMain : t.colors.neutral[400], marginTop: 2 }]} 
                        numberOfLines={1}
                      >
                        {pickedLocation ? pickedLocation.addressText : "위치 선택"}
                      </Text>
                    </View>
                    {pickedLocation ? (
                       <Ionicons name="checkmark-circle" size={20} color={t.colors.primary} />
                    ) : (
                       <Ionicons name="chevron-forward" size={20} color={t.colors.neutral[300]} />
                    )}
                  </Pressable>

                  <View style={[styles.divider, { backgroundColor: t.colors.neutral[100] }]} />

                  {/* 인원 */}
                  <View style={styles.rowInput}>
                    <Ionicons name="people" size={20} color={t.colors.primary} style={styles.iconStyle} />
                    <View style={styles.flexRowBetween}>
                      <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>최대 인원</Text>
                      <Stepper value={capacity} onMinus={() => changeCapacity(-1)} onPlus={() => changeCapacity(1)} />
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: t.colors.neutral[100] }]} />

                  {/* 시간 */}
                  <View style={styles.rowInput}>
                    <Ionicons name="hourglass" size={20} color={t.colors.primary} style={styles.iconStyle} />
                    <View style={styles.flexRowBetween}>
                      <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>소요 시간</Text>
                      <Stepper value={formatDuration(durationMinutes)} onMinus={() => changeDuration(-30)} onPlus={() => changeDuration(30)} isText />
                    </View>
                  </View>
                </View>

                {/* 5. 모임 소개 */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: t.colors.textSub }]}>
                    모임 소개 & 준비물
                  </Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: t.colors.neutral[50], color: t.colors.textMain, borderColor: t.colors.neutral[200] }]}
                    placeholder="내용을 입력해주세요."
                    placeholderTextColor={t.colors.neutral[400]}
                    multiline
                    value={content}
                    onChangeText={setContent}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>

          {/* 하단 버튼 */}
          <View style={[styles.bottomBar, { backgroundColor: t.colors.background, borderTopColor: t.colors.neutral[200], paddingBottom: 12 + insets.bottom }]}>
            <Button
              title={submitting ? "수정 중..." : "수정 완료"}
              size="lg"
              onPress={handleUpdate}
              loading={submitting}
              disabled={submitting}
            />
          </View>
        </KeyboardAvoidingView>

        {/* --- Modals --- */}
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="datetime"
          onConfirm={handleConfirmDate}
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
          onConfirm={(loc) => { setPickedLocation(loc); setLocationModalVisible(false); }}
        />
      </AppLayout>
    </>
  );
}

// -------------------------------------------------------------------------
// ✅ Reusable Stepper
// -------------------------------------------------------------------------
const Stepper = ({ value, onMinus, onPlus, isText = false }: { value: string | number, onMinus: () => void, onPlus: () => void, isText?: boolean }) => {
  const t = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Pressable onPress={onMinus} style={[styles.stepBtn, { backgroundColor: t.colors.neutral[100] }]} hitSlop={10}>
        <Ionicons name="remove" size={18} color={t.colors.textMain} />
      </Pressable>
      <Text style={[t.typography.titleMedium, { color: t.colors.textMain, marginHorizontal: 12, minWidth: isText ? 80 : 24, textAlign: "center" }]}>
        {value}
      </Text>
      <Pressable onPress={onPlus} style={[styles.stepBtn, { backgroundColor: t.colors.neutral[100] }]} hitSlop={10}>
        <Ionicons name="add" size={18} color={t.colors.textMain} />
      </Pressable>
    </View>
  );
};

// -------------------------------------------------------------------------
// ✅ Location Picker Modal (Optimized)
// -------------------------------------------------------------------------
function LocationPickerModal({
  visible,
  initialLocation,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  initialLocation: PickedLocation | null;
  onClose: () => void;
  onConfirm: (loc: PickedLocation) => void;
}) {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  
  const [region, setRegion] = useState<Region>(() => {
    if (initialLocation) {
      return { latitude: initialLocation.lat, longitude: initialLocation.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 };
    }
    return DEFAULT_REGION;
  });

  const [address, setAddress] = useState("");

  // ✅ FIX: NodeJS.Timeout 타입 충돌 해결을 위해 any 사용
  const debounceRef = useRef<any>(null);

  // 모달 진입 로직
  useEffect(() => {
    if (visible) {
      setAddress(initialLocation?.addressText || "");
      if (initialLocation) {
        setRegion({ latitude: initialLocation.lat, longitude: initialLocation.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 });
      } else {
        moveToCurrentLocation();
      }
    }
  }, [visible]);

  const moveToCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const newRegion = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      
      mapRef.current?.animateToRegion(newRegion, 500);
      setRegion(newRegion);
      fetchAddress(newRegion.latitude, newRegion.longitude);
    } catch (e) {
      // ignore
    }
  };

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (result.length > 0) {
        const addr = result[0];
        const parts = [
          addr.city || addr.subregion,
          addr.district,
          addr.street,
          addr.name
        ].filter((part, index, self) => part && self.indexOf(part) === index);
        
        setAddress(parts.join(" "));
      }
    } catch {
      setAddress("주소를 불러올 수 없습니다.");
    }
  };

  const onRegionChangeComplete = (r: Region) => {
    setRegion(r);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAddress(r.latitude, r.longitude), 400);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.background }}>
        <View style={[styles.modalHeader, { paddingTop: 14 + insets.top, borderBottomColor: t.colors.neutral[200] }]}>
          <Pressable onPress={onClose} style={{ padding: 8 }} hitSlop={10}>
            <Ionicons name="close" size={24} color={t.colors.textMain} />
          </Pressable>
          <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>지도에서 위치 선택</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            region={region}
            onRegionChangeComplete={onRegionChangeComplete}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={true}
            showsMyLocationButton={false}
            rotateEnabled={false}
          />
          <View style={styles.centerPin} pointerEvents="none">
            <Ionicons name="location-sharp" size={36} color={t.colors.primary} />
          </View>
          <Pressable
            onPress={moveToCurrentLocation}
            style={({ pressed }) => [styles.fab, { backgroundColor: t.colors.surface, opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="locate" size={22} color={t.colors.textMain} />
          </Pressable>
        </View>

        <View style={[styles.modalBottom, { paddingBottom: 12 + insets.bottom, borderTopColor: t.colors.neutral[200] }]}>
          <View style={[styles.addressBox, { backgroundColor: t.colors.neutral[50] }]}>
            <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginBottom: 4 }]}>선택된 주소</Text>
            <Text style={[t.typography.bodyMedium, { color: t.colors.textMain }]} numberOfLines={2}>
              {address || "지도를 움직여 위치를 잡아주세요"}
            </Text>
          </View>
          <Button
            title="이 위치로 설정"
            size="lg"
            onPress={() => onConfirm({ addressText: address || "선택된 위치", lat: region.latitude, lng: region.longitude })}
          />
        </View>
      </View>
    </Modal>
  );
}

// -------------------------------------------------------------------------
// ✅ Styles
// -------------------------------------------------------------------------
const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  inputUnderline: { fontSize: 18, fontWeight: "600", paddingVertical: 8, borderBottomWidth: 1 },
  segmentContainer: { flexDirection: "row", padding: 4, borderRadius: 12, height: 44 },
  segmentBtn: { flex: 1, justifyContent: "center", alignItems: "center", borderRadius: 10 },
  shadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, elevation: 2 },
  conditionBox: { marginTop: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "transparent" },
  inputSimple: { fontSize: 14, padding: 0 },
  cardForm: { borderWidth: 1, borderRadius: 16, marginBottom: 24, overflow: "hidden" },
  rowInput: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, minHeight: 60 },
  iconStyle: { marginRight: 12, width: 24, textAlign: "center" },
  divider: { height: 1, marginLeft: 52 },
  flexRowBetween: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  textArea: { height: 120, borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 15, textAlignVertical: "top" },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 10, paddingBottom: 10, borderBottomWidth: 1 },
  centerPin: { position: "absolute", left: "50%", top: "50%", marginLeft: -18, marginTop: -36 },
  fab: { position: "absolute", right: 16, bottom: 20, width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: {width:0, height:2} },
  modalBottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  addressBox: { padding: 12, borderRadius: 8, marginBottom: 12 },
});