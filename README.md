# Action Mate

> 본 문서는 **프론트엔드 구현 기준**으로 작성되었습니다.  
> 현재는 **UI/UX 및 화면 흐름(Policy) 구현 단계**이며, 서버 연동 전 단계의 정책/상태 정의를 포함합니다.

위치 기반으로 주변 모임을 탐색하고 참여/대화 흐름까지 이어지는 모바일 앱입니다.  
홈·지도에서 모임을 찾고, 상세에서 신청(승인/선착순) 후 상태에 따라 채팅/관리 화면으로 연결되도록 설계했습니다.

---

## 주요 기능

### 1) 홈(Home)
- **상단 추천 카드**: 인원 마감 임박/시작 시간 임박 모임을 **현재 위치 기준 가까운 순**으로 카드 노출
- **카테고리 칩 필터**: 전체(기본) · 운동 · 게임/오락 · 식사/카페 · 스터디 · 기타
- **모임 목록**: 선택한 카테고리 기준 모집글 리스트 표시
- **FAB(+)**: 우측 하단에서 **모임 생성 화면으로 즉시 진입**

**사용 흐름**
- 홈(카드/목록) → **모임 상세**
  - 참여자: **신청** → (상태에 따라) **채팅방 이동**
  - 호스트: (승인제일 경우) **참여 요청 수락/거절**, **참여자 관리**, **모집글 수정/삭제**
- **모임 생성 → 모집글 상세**(작성 완료 후 상세로 연결)

---

### 2) 지도(Map)
- **위치 권한 허용** 후 Google Maps에 현재 위치 표시
- **주변 모임 마커 시각화**: 카테고리별 마커 아이콘으로 구분해 근처 모임을 직관적으로 탐색

**사용 흐름**
- 지도(마커 선택) → **모임 상세** → **신청** → (상태에 따라) **채팅방 이동**

---

### 3) 채팅(Chat)
- **신청 완료한 모임**을 기준으로 호스트와 1:1 채팅 화면으로 연결(문의/메시지)
- 채팅 상세에서 **연결된 모임 상세로 이동** 가능(동선 유지)
- 채팅 목록에서 **최근 순 정렬**, **미읽음 개수**, **상대 프로필** 확인

**사용 흐름**
- 채팅 목록 → 채팅 상세 → (상단/연결 버튼) **모임 상세 이동**

---

### 4) 마이페이지(My)
- **내가 만든 모임** 목록 및 상태별 확인
- **내가 참여한/신청한 모임** 내역 확인
- **회원 정보 수정**: 프로필 사진/회원 정보 변경
- **설정**: 로그아웃/회원탈퇴 등 계정 관리

**사용 흐름**
- 마이페이지 → 내가 만든 모임 → 모임 상태별 확인/관리
- 마이페이지 → 내가 참여한 모임 → 참여/신청 내역 확인
- 마이페이지 → 회원 정보 수정
- 마이페이지 → 설정 → 로그아웃/탈퇴

---

## 공통 UX/정책

### 정렬/필터 기준
- 홈/목록에서 사용하는 **정렬 기준을 고정**(예: 거리순/마감순/최신순 중 실제 사용 기준 명시)
- 카테고리 칩은 **목록 필터로 동작**
- 상단 추천 카드에 카테고리 필터가 **적용되는지 여부를 규정**(적용/미적용 중 하나로 고정)

### 예외/빈 상태 처리
- **위치 권한 거부**: 권한 재요청 안내 또는 대체 UI(예: 수동 위치 설정/기본 지역)
- **데이터 없음**: 주변 모임 없음/검색 결과 없음 상태 화면 제공
- **네트워크 오류**: 에러 안내 + 재시도 액션 제공

---

## 모임 상태 정책 및 UI 규칙(뱃지/비활성)

### 상태 모델
- **모임 상태 `status`**: `OPEN`, `FULL`, `STARTED`, `ENDED`, `CANCELED`
- **내 멤버십 상태 `myState.membershipStatus`**: `HOST`, `MEMBER`, `PENDING`, `REJECTED` (비참여는 `NONE` 또는 미정)
- **참여 가능 여부 `myState.canJoin`**: `false`일 때 “참여불가” 판단(호스트/멤버 제외)

### 뱃지 표시 규칙(3영역)
- **meta(모임 속성)**: 항상 1개  
  - `INSTANT` → **선착순**  
  - 그 외 → **승인제**
- **left(내 상태)**: 0~1개  
  - HOST: 내 모임 / MEMBER: 참여중 / PENDING: 승인 대기 / REJECTED: 거절됨 / 참여불가: 참여불가
- **right(모임 상태)**: 0~1개 (`OPEN`은 생략)  
  - FULL: 정원마감 / CANCELED: 취소됨 / ENDED: 종료됨 / STARTED: 진행중

### 비활성(disabled) 정책
`disabled`는 카드/CTA(신청 등) 조작을 제한해야 하는 상태를 통합합니다.

- **disabled = true**
  - 모임이 닫힘: `FULL | ENDED | CANCELED`
  - 내 상태가 대기/거절: `PENDING | REJECTED`
  - 참여불가: `canJoin === false`이고(내 상태 비참여, 진행중 제외) 참여가 막힌 경우
- **표현 방식**
  - 색상 톤은 유지하고 **알파/불투명도만 낮춰** “정보는 유지 + 조작은 제한”을 명확히 합니다.

### 내 상태 우선순위(중복 방지)
- `HOST > MEMBER > PENDING > REJECTED > 참여불가`
- 모임 상태(right)는 `OPEN`이면 생략하고 나머지는 1개만 표시합니다.

### CTA 행동 규칙
- `disabled=true`: 신청/참여 CTA 비활성(또는 숨김) + 해당 사유를 뱃지로 명확히 노출
- `PENDING/REJECTED`: 신청 버튼 대신 상태 고정(승인 대기/거절됨)
- `STARTED`: 진행중 모임의 신청 가능 여부를 별도 정책으로 명시(현재 로직은 진행중이면 참여불가 판단에서 제외)

---

## 기술 스택(Tech Stack)

### Core
- **Expo SDK**: `expo ~54` / **Expo Router**: `~6`
- **React / React Native**: `react 19.1.0`, `react-native 0.81.5`
- **TypeScript**: `~5.9`

### Navigation
- **Expo Router**(file-based routing)
- **React Navigation**: `@react-navigation/native`, `bottom-tabs`, `elements`

### State / Server State
- **Zustand**: 전역 상태 관리
- **TanStack Query(React Query)**: 서버 상태 캐싱/동기화

### Networking / Forms
- **Axios**: API 통신
- **React Hook Form**: 폼 상태/검증

### Maps / Location
- **react-native-maps**
- **expo-location**: 위치 권한/현재 위치

### UI / UX
- **@expo/vector-icons**: 아이콘
- **@gorhom/bottom-sheet**: 바텀시트
- **expo-image / expo-image-picker**: 이미지 처리
- **expo-linear-gradient / expo-haptics**: UI 효과/피드백
- **react-native-gesture-handler / reanimated / worklets**: 제스처/애니메이션
- **react-native-safe-area-context / react-native-screens**: 안전영역/네비게이션 성능

### Storage / Security / External
- **AsyncStorage**: 로컬 저장
- **expo-secure-store**: 민감정보 저장
- **Kakao Login**: `@react-native-seoul/kakao-login`

### Tooling / Quality
- **ESLint**(+ `eslint-config-expo`)
- **Module Resolver**: `babel-plugin-module-resolver`, `eslint-import-resolver-typescript`
- **Reactotron**: 디버깅
- Scripts: `expo start`, `expo run:ios/android`, `expo lint`

---

## 아키텍처/구조(How it’s built)

### 폴더 구조
- **app/**: Expo Router 기반 라우팅/네비게이션(화면 진입점)
- **src/**: FSD 기반 기능 모듈(비즈니스 로직/상태/UI)
  - **features/**: auth, meetings, dm, home, map, my, notifications 등 기능 단위
  - **shared/**: 공용 API, 테마, UI, 훅, 유틸

### 데이터 흐름
- **UI(Screen/Component)** → 사용자 액션/라이프사이클 발생  
→ **feature model/store**에서 화면 상태(필터/폼/선택값) 관리  
→ **feature api**에서 요청 구성  
→ **shared/api/apiClient(Axios)**로 공통 헤더/토큰/인터셉터 적용  
→ 응답은 **React Query**가 캐시/동기화(invalidate/refetch)  
→ **feature ui**가 typed model(`MeetingPost` 등) 기반으로 렌더링  
→ 권한/환경값(위치/테마)은 **shared/hooks**를 단일 진입점으로 사용  
→ 로컬/민감 데이터는 **AsyncStorage / SecureStore**에 저장

### 설계 선택 이유
- **Expo Router(app) + FSD(src)**로 라우팅과 도메인을 분리해 기능 추가 시 영향 범위를 최소화하고 탐색성을 높였습니다.
- **React Query + Axios(shared api)**로 서버 상태/에러/토큰 처리 규칙을 중앙화해 네트워크 정책을 일관되게 유지했습니다.
- **shared(Theme/UI)**에 디자인 시스템을 통합해 다크모드/스타일 변경을 수월하게 하고, 기능 UI는 features 내부에서 응집도를 유지했습니다.

---

## 3줄 요약
- 홈/지도에서 모임을 탐색하고 상세에서 신청한 뒤, 상태에 따라 채팅/관리 화면으로 연결되도록 설계했습니다.  
- 모임 상태/내 상태/참여방식 뱃지 규칙과 disabled 정책으로 “표시/조작” 기준을 통일했습니다.  
- Expo Router + FSD 구조 위에 React Query/Axios/Theme를 공통 레이어로 두어 확장성과 일관성을 확보했습니다.
