import React, { useRef, useState } from "react";
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
  UIManager,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppLayout from "@/shared/ui/AppLayout";
import { Button } from "@/shared/ui/Button";
import TopBar from "@/shared/ui/TopBar";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

// ✅ API & Model
import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { CategoryKey, JoinMode } from "@/features/meetings/model/types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Types ---
type LocationData = {
  addressText: string;
  lat: number;
  lng: number;
};

// --- Constants ---
const CATEGORIES: { key: CategoryKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "SPORTS", label: "운동", icon: "fitness" },
  { key: "GAMES", label: "게임", icon: "game-controller" },
  { key: "MEAL", label: "식사", icon: "restaurant" },
  { key: "STUDY", label: "스터디", icon: "book" },
  { key: "ETC", label: "기타", icon: "ellipsis-horizontal-circle" },
];

const DURATION_PRESETS = [30, 60, 90, 120, 180];
const DEFAULT_REGION: Region = { latitude: 37.5665, longitude: 126.978, latitudeDelta: 0.005, longitudeDelta: 0.005 };

// --- Helpers ---
const formatDateSimple = (date: Date) =>
  date.toLocaleString("ko-KR", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`;
};

// --- Components ---
const ExpandableHeader = ({ title, value, expanded, onPress }: { title: string; value: string; expanded: boolean; onPress: () => void }) => {
  const t = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.expandHeader}>
      <View>
        <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>{title}</Text>
        {!expanded && <Text style={[t.typography.bodyMedium, { color: t.colors.primary, fontWeight: "600", marginTop: 2 }]}>{value}</Text>}
      </View>
      <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={t.colors.neutral[400]} />
    </Pressable>
  );
};

export default function CreateMeetingScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategoryKey>("SPORTS");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pickedLocation, setPickedLocation] = useState<LocationData | null>(null);
  const [content, setContent] = useState("");

  // Options
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);
  const [capacity, setCapacity] = useState(4);
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [joinMode, setJoinMode] = useState<JoinMode>("INSTANT");
  const [conditions, setConditions] = useState("");

  // UI State
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleOptions = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOptionsExpanded(!isOptionsExpanded);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return Alert.alert("알림", "제목을 입력해주세요.");
    if (!selectedDate) return Alert.alert("알림", "언제 만날지 정해주세요.");
    if (!pickedLocation) return Alert.alert("알림", "어디서 만날지 정해주세요.");
    if (joinMode === "APPROVAL" && !conditions.trim()) return Alert.alert("알림", "승인 조건을 입력해주세요.");

    try {
      setSubmitting(true);
      await meetingApi.createMeeting({
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
      });

      if (router.canGoBack()) router.dismissAll();
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("오류", "모임 생성 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AppLayout padded={false}>
        <TopBar
          title="모임 만들기"
          showBack
          showBorder={false}
          showNoti={false}
          onPressBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
        />

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
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {CATEGORIES.map((item) => {
                      const isSelected = category === item.key;
                      return (
                        <Pressable
                          key={item.key}
                          onPress={() => setCategory(item.key)}
                          style={[styles.miniChip, { backgroundColor: isSelected ? t.colors.primary : t.colors.neutral[100] }]}
                        >
                          <Ionicons name={item.icon} size={16} color={isSelected ? "#FFF" : t.colors.textSub} style={{ marginRight: 6 }} />
                          <Text style={[t.typography.labelMedium, { color: isSelected ? "#FFF" : t.colors.textSub }]}>{item.label}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 2. 제목 */}
                <TextInput
                  style={[styles.bigTitleInput, { color: t.colors.textMain }]}
                  placeholder="모임 제목을 적어주세요"
                  placeholderTextColor={t.colors.neutral[300]}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={40}
                  multiline
                />

                {/* 3. 시간 & 장소 */}
                <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
                  <Pressable onPress={() => setDatePickerVisibility(true)} style={({ pressed }) => [styles.infoCard, { backgroundColor: t.colors.neutral[50], opacity: pressed ? 0.9 : 1 }]}>
                    <Ionicons name="calendar" size={24} color={selectedDate ? t.colors.primary : t.colors.neutral[400]} />
                    <View style={{ marginTop: 8 }}>
                      <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>날짜 및 시간</Text>
                      <Text style={[t.typography.bodyLarge, { color: t.colors.textMain, fontWeight: "600", marginTop: 2 }]} numberOfLines={1}>
                        {selectedDate ? formatDateSimple(selectedDate) : "선택하기"}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable onPress={() => setLocationModalVisible(true)} style={({ pressed }) => [styles.infoCard, { backgroundColor: t.colors.neutral[50], opacity: pressed ? 0.9 : 1 }]}>
                    <Ionicons name="location" size={24} color={pickedLocation ? t.colors.primary : t.colors.neutral[400]} />
                    <View style={{ marginTop: 8 }}>
                      <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>만남 장소</Text>
                      <Text style={[t.typography.bodyLarge, { color: t.colors.textMain, fontWeight: "600", marginTop: 2 }]} numberOfLines={1}>
                        {pickedLocation ? pickedLocation.addressText : "선택하기"}
                      </Text>
                    </View>
                  </Pressable>
                </View>

                {/* 4. 내용 */}
                <View style={{ marginTop: 24 }}>
                  <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 8 }]}>내용</Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: t.colors.surface, color: t.colors.textMain, borderColor: t.colors.neutral[200] }]}
                    placeholder="활동 내용이나 준비물을 자유롭게 적어주세요."
                    placeholderTextColor={t.colors.neutral[300]}
                    multiline
                    value={content}
                    onChangeText={setContent}
                  />
                </View>

                {/* 5. 상세 설정 */}
                <View style={[styles.optionsContainer, { borderColor: t.colors.neutral[200], backgroundColor: t.colors.surface }]}>
                  <ExpandableHeader
                    title="상세 설정 (인원, 시간, 방식)"
                    value={`${capacity}명 · ${formatDuration(durationMinutes)} · ${joinMode === "INSTANT" ? "선착순" : "승인제"}`}
                    expanded={isOptionsExpanded}
                    onPress={toggleOptions}
                  />
                  {isOptionsExpanded && (
                    <View style={{ marginTop: 16 }}>
                      {/* 인원 */}
                      <View style={styles.optionRow}>
                        <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>모집 인원</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                          <Pressable onPress={() => setCapacity(c => Math.max(2, c - 1))} style={[styles.circleBtn, { backgroundColor: t.colors.neutral[100] }]}><Ionicons name="remove" size={18} color={t.colors.textMain} /></Pressable>
                          <Text style={[t.typography.titleMedium, { color: t.colors.textMain, minWidth: 20, textAlign: 'center' }]}>{capacity}</Text>
                          <Pressable onPress={() => setCapacity(c => Math.min(20, c + 1))} style={[styles.circleBtn, { backgroundColor: t.colors.neutral[100] }]}><Ionicons name="add" size={18} color={t.colors.textMain} /></Pressable>
                        </View>
                      </View>
                      <View style={[styles.divider, { backgroundColor: t.colors.neutral[100] }]} />
                      
                      {/* 시간 */}
                      <View style={{ gap: 10, paddingVertical: 12 }}>
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>소요 시간</Text>
                            <Text style={[t.typography.titleSmall, { color: t.colors.primary }]}>{formatDuration(durationMinutes)}</Text>
                         </View>
                         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                           {DURATION_PRESETS.map((m) => (
                             <Pressable key={m} onPress={() => setDurationMinutes(m)} style={[styles.timeChip, { backgroundColor: durationMinutes === m ? t.colors.primary : t.colors.neutral[100] }]}>
                               <Text style={[t.typography.labelSmall, { color: durationMinutes === m ? "#FFF" : t.colors.textSub }]}>{formatDuration(m)}</Text>
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
                            <Pressable key={mode} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setJoinMode(mode); }} style={[styles.modeBtn, { borderColor: joinMode === mode ? t.colors.primary : t.colors.neutral[200], backgroundColor: joinMode === mode ? t.colors.primaryLight : "transparent" }]}>
                              <Text style={[t.typography.labelMedium, { color: joinMode === mode ? t.colors.primaryDark : t.colors.textSub }]}>{mode === "INSTANT" ? "⚡ 선착순" : "🙋 승인제"}</Text>
                            </Pressable>
                          ))}
                        </View>
                        {joinMode === "APPROVAL" && (
                          <TextInput style={[styles.smallInput, { marginTop: 10, color: t.colors.textMain, backgroundColor: t.colors.neutral[50] }]} placeholder="예: 20대 여성분만, 초보 환영 등" placeholderTextColor={t.colors.neutral[400]} value={conditions} onChangeText={setConditions} />
                        )}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>

          <View style={[styles.bottomBar, { backgroundColor: t.colors.background, borderTopColor: t.colors.neutral[200], paddingBottom: 12 + insets.bottom }]}>
            <Button title={submitting ? "생성 중..." : "모임 만들기"} size="lg" onPress={handleSubmit} loading={submitting} disabled={submitting} />
          </View>
        </KeyboardAvoidingView>

        <DateTimePickerModal isVisible={isDatePickerVisible} mode="datetime" onConfirm={(date) => { setSelectedDate(date); setDatePickerVisibility(false); }} onCancel={() => setDatePickerVisibility(false)} locale="ko_KR" confirmTextIOS="선택" cancelTextIOS="취소" />
        
        {/* ✅ 타입 오류 수정됨 */}
        <LocationPickerModal 
          visible={locationModalVisible} 
          initialLocation={pickedLocation} 
          onClose={() => setLocationModalVisible(false)} 
          onConfirm={(loc: LocationData) => { 
            setPickedLocation(loc); 
            setLocationModalVisible(false); 
          }} 
        />
      </AppLayout>
    </>
  );
}

// -------------------------------------------------------------------------
// ✅ LocationPickerModal with Type
// -------------------------------------------------------------------------
function LocationPickerModal({
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
  const debounceRef = useRef<any>(null); // Timeout typing fix

  React.useEffect(() => {
    if (visible) {
      if (initialLocation) {
        setAddress(initialLocation.addressText);
        setRegion({ ...DEFAULT_REGION, latitude: initialLocation.lat, longitude: initialLocation.lng });
      } else {
        (async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
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
            ref={mapRef}
            style={{ flex: 1 }}
            region={region}
            onRegionChangeComplete={(r) => {
              setRegion(r);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => fetchAddress(r.latitude, r.longitude), 400);
            }}
            provider={PROVIDER_GOOGLE}
            rotateEnabled={false}
          />
          <View style={styles.centerPin} pointerEvents="none"><Ionicons name="location-sharp" size={36} color={t.colors.primary} /></View>
        </View>
        <View style={[styles.modalBottom, { paddingBottom: 20 + insets.bottom }]}>
          <Text style={[t.typography.bodyMedium, { color: t.colors.textMain, marginBottom: 16, textAlign: 'center' }]}>{address || "위치 잡는 중..."}</Text>
          <Button title="이 위치로 설정" onPress={() => onConfirm({ addressText: address || "선택된 위치", lat: region.latitude, lng: region.longitude })} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  miniChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  bigTitleInput: { fontSize: 24, fontWeight: "800", paddingVertical: 4 },
  infoCard: { flex: 1, borderRadius: 16, padding: 16, justifyContent: "space-between", minHeight: 100 },
  textArea: { minHeight: 120, borderRadius: 12, borderWidth: 1, padding: 16, fontSize: 16, textAlignVertical: "top", lineHeight: 22 },
  optionsContainer: { marginTop: 32, borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 40 },
  expandHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  circleBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  timeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  modeBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderRadius: 8, alignItems: 'center' },
  smallInput: { height: 40, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  divider: { height: 1, width: '100%' },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  centerPin: { position: 'absolute', top: '50%', left: '50%', marginTop: -36, marginLeft: -18 },
  modalBottom: { paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
});