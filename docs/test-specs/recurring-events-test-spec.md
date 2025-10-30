# 반복 일정 기능 테스트 명세서

## 문서 개요

### 목적
반복 일정 기능에 대한 TDD(Test-Driven Development) 관점에서 상세한 테스트 케이스를 정의합니다. 이 명세서를 기반으로 테스트를 먼저 작성한 후, 구현을 진행합니다.

### 관련 기능 명세서
`/docs/feature-specs/recurring-events.md`

### 테스트 전략
- **Red-Green-Refactor**: 실패하는 테스트를 먼저 작성 (Red), 구현 (Green), 리팩토링 (Refactor)
- **3계층 테스트**:
  1. 단위 테스트 (Unit Tests) - 순수 함수 검증
  2. 훅 테스트 (Hook Tests) - 커스텀 훅 로직 검증
  3. 통합 테스트 (Integration Tests) - 전체 플로우 검증

### 테스트 파일 구조
```
src/__tests__/
├── unit/
│   └── easy.repeatUtils.spec.ts              (단위 테스트)
├── hooks/
│   └── medium.useEventOperations-recurring.spec.ts  (훅 테스트)
└── medium.recurring-integration.spec.tsx     (통합 테스트)
```

### 공통 테스트 데이터 정의

#### 테스트용 이벤트 팩토리 함수
```typescript
// 테스트 파일 내에서 공통으로 사용할 팩토리 함수
const createMockEvent = (overrides: Partial<Event> = {}): Event => ({
  id: '1',
  title: '테스트 일정',
  date: '2025-10-01',
  startTime: '09:00',
  endTime: '10:00',
  description: '테스트 설명',
  location: '테스트 장소',
  category: '업무',
  repeat: { type: 'none', interval: 0 },
  notificationTime: 10,
  ...overrides,
});

const createRecurringEvent = (
  repeatType: RepeatType,
  overrides: Partial<Event> = {}
): Event =>
  createMockEvent({
    repeat: {
      type: repeatType,
      interval: 1,
      endDate: '2025-12-31',
      id: 'repeat-id-1',
    },
    ...overrides,
  });
```

#### 테스트 날짜 상수
```typescript
const TEST_DATES = {
  CURRENT: '2025-10-01', // setupTests.ts에서 설정된 현재 시간
  WEEK_LATER: '2025-10-08',
  MONTH_LATER: '2025-11-01',
  YEAR_END: '2025-12-31',
  LEAP_YEAR_FEB_29: '2024-02-29',
  MONTH_31_DAY: '2025-01-31', // 31일이 있는 달
  MONTH_30_DAY: '2025-04-30', // 30일까지만 있는 달
};
```

---

## 파일 1: easy.repeatUtils.spec.ts

### 테스트 파일 개요
- **위치**: `src/__tests__/unit/easy.repeatUtils.spec.ts`
- **테스트 대상**: `generateRepeatDates` 함수 (순수 함수)
- **난이도**: Easy
- **총 테스트 케이스 수**: 18개
- **모킹 전략**: 모킹 불필요 (순수 함수, 부수 효과 없음)

### 테스트 스위트 구조
```
describe('generateRepeatDates')
  ├── describe('매일 반복 (daily)')
  │   ├── TC-001: 기본 동작
  │   ├── TC-002: 단일 날짜
  │   └── TC-003: 장기간 반복
  ├── describe('매주 반복 (weekly)')
  │   ├── TC-004: 기본 동작
  │   ├── TC-005: 월 경계 넘기
  │   └── TC-006: 연도 경계 넘기
  ├── describe('매월 반복 (monthly)')
  │   ├── TC-007: 기본 동작
  │   ├── TC-008: 31일 반복 - 31일이 있는 달만
  │   ├── TC-009: 31일 반복 - 2월 제외
  │   ├── TC-010: 30일 반복
  │   └── TC-011: 28일 반복
  ├── describe('매년 반복 (yearly)')
  │   ├── TC-012: 기본 동작
  │   ├── TC-013: 윤년 2월 29일 - 윤년만
  │   └── TC-014: 일반 날짜 매년 반복
  ├── describe('엣지 케이스')
  │   ├── TC-015: 시작일 = 종료일
  │   ├── TC-016: 시작일 > 종료일 (빈 배열)
  │   └── TC-017: 매우 긴 기간 (성능 검증)
  └── describe('잘못된 입력')
      └── TC-018: 잘못된 날짜 형식
```

---

### TC-001: 매일 반복 - 일주일 동안 매일 반복
**카테고리**: 정상 케이스 - 매일 반복
**난이도**: Easy

**사전 조건**:
- 시작 날짜: '2025-10-01'
- 종료 날짜: '2025-10-07'
- 반복 유형: 'daily'

**실행 단계**:
```typescript
const result = generateRepeatDates('2025-10-01', '2025-10-07', 'daily');
```

**예상 결과**:
- 반환 배열 길이: 7
- 첫 번째 요소: '2025-10-01'
- 마지막 요소: '2025-10-07'
- 모든 날짜가 연속적 (하루 간격)
- 정확한 배열: `['2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07']`

**비고**:
- 가장 기본적인 반복 패턴
- 7일 간격으로 검증하여 가독성 확보

---

### TC-002: 매일 반복 - 시작일과 종료일이 동일
**카테고리**: 경계 케이스 - 매일 반복
**난이도**: Easy

**사전 조건**:
- 시작 날짜: '2025-10-01'
- 종료 날짜: '2025-10-01'
- 반복 유형: 'daily'

**실행 단계**:
```typescript
const result = generateRepeatDates('2025-10-01', '2025-10-01', 'daily');
```

**예상 결과**:
- 반환 배열 길이: 1
- 배열 내용: `['2025-10-01']`

**비고**:
- 종료일 포함 여부 확인
- 최소 반복 케이스

---

### TC-003: 매일 반복 - 3개월 장기간 반복
**카테고리**: 정상 케이스 - 매일 반복
**난이도**: Easy

**사전 조건**:
- 시작 날짜: '2025-10-01'
- 종료 날짜: '2025-12-31'
- 반복 유형: 'daily'

**실행 단계**:
```typescript
const result = generateRepeatDates('2025-10-01', '2025-12-31', 'daily');
```

**예상 결과**:
- 반환 배열 길이: 92 (10월 31일 + 11월 30일 + 12월 31일)
- 첫 번째 요소: '2025-10-01'
- 마지막 요소: '2025-12-31'
- 날짜가 연속적이고 누락 없음
- 월 경계를 올바르게 넘김 (10/31 → 11/01, 11/30 → 12/01)

**비고**:
- 월 경계 처리 검증
- 장기간 반복의 정확성 확인

---

### TC-004: 매주 반복 - 기본 동작
**카테고리**: 정상 케이스 - 매주 반복
**난이도**: Easy

**사전 조건**:
- 시작 날짜: '2025-10-01'
- 종료 날짜: '2025-10-31'
- 반복 유형: 'weekly'

**실행 단계**:
```typescript
const result = generateRepeatDates('2025-10-01', '2025-10-31', 'weekly');
```

**예상 결과**:
- 반환 배열 길이: 5
- 정확한 배열: `['2025-10-01', '2025-10-08', '2025-10-15', '2025-10-22', '2025-10-29']`
- 각 날짜 간 간격: 정확히 7일

**비고**:
- 명세서 예시와 동일한 케이스
- 기본 동작 검증

---

### TC-005: 매주 반복 - 월 경계를 넘는 경우
**카테고리**: 경계 케이스 - 매주 반복
**난이도**: Easy

**사전 조건**:
- 시작 날짜: '2025-10-25'
- 종료 날짜: '2025-11-15'
- 반복 유형: 'weekly'

**실행 단계**:
```typescript
const result = generateRepeatDates('2025-10-25', '2025-11-15', 'weekly');
```

**예상 결과**:
- 반환 배열 길이: 4
- 정확한 배열: `['2025-10-25', '2025-11-01', '2025-11-08', '2025-11-15']`
- 10월 → 11월 경계를 올바르게 넘김

**비고**:
- 월 경계 처리 검증
- 10/31 다음이 11/01임을 올바르게 계산

---

### TC-006: 매주 반복 - 연도 경계를 넘는 경우
**카테고리**: 경계 케이스 - 매주 반복
**난이도**: Easy

**사전 조건**:
- 시작 날짜: '2024-12-25'
- 종료 날짜: '2025-01-15'
- 반복 유형: 'weekly'

**실행 단계**:
```typescript
const result = generateRepeatDates('2024-12-25', '2025-01-15', 'weekly');
```

**예상 결과**:
- 반환 배열 길이: 4
- 정확한 배열: `['2024-12-25', '2025-01-01', '2025-01-08', '2025-01-15']`
- 2024년 → 2025년 경계를 올바르게 넘김

**비고**:
- 연도 경계 처리 검증
- 12/31 다음이 01/01임을 올바르게 계산

---

### TC-007: 매월 반복 - 기본 동작 (1일 기준)
**카테고리**: 정상 케이스 - 매월 반복
**난이도**: Easy

**사전 조건**:
- 시작 날짜: '2025-01-01'
- 종료 날짜: '2025-06-01'
- 반복 유형: 'monthly'

**실행 단계**:
```typescript
const result = generateRepeatDates('2025-01-01', '2025-06-01', 'monthly');
```

**예상 결과**:
- 반환 배열 길이: 6
- 정확한 배열: `['2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01', '2025-05-01', '2025-06-01']`
- 모든 달의 1일

**비고**:
- 1일은 모든 달에 존재하므로 누락 없음
- 기본 매월 반복 검증

---

### TC-008: 매월 반복 - 31일 반복 (31일이 있는 달만 생성)
**카테고리**: 경계 케이스 - 매월 반복
**난이도**: Medium

**사전 조건**:
- 시작 날짜: '2025-01-31'
- 종료 날짜: '2025-12-31'
- 반복 유형: 'monthly'

**실행 단계**:
```typescript
const result = generateRepeatDates('2025-01-31', '2025-12-31', 'monthly');
```

**예상 결과**:
- 반환 배열 길이: 7
- 정확한 배열: `['2025-01-31', '2025-03-31', '2025-05-31', '2025-07-31', '2025-08-31', '2025-10-31', '2025-12-31']`
- 31일이 없는 달 제외:
  - 2월 (28일)
  - 4월 (30일)
  - 6월 (30일)
  - 9월 (30일)
  - 11월 (30일)

**비고**:
- 명세서 예시와 동일한 케이스
- **핵심 엣지 케이스**: 존재하지 않는 날짜는 생성하지 않음
- 각 달의 일수를 올바르게 체크해야 함

---

### TC-009: 매월 반복 - 31일 반복이 2월을 제외하는지 확인
**카테고리**: 경계 케이스 - 매월 반복
**난이도**: Medium

**사전 조건**:
- 시작 날짜: '2025-01-31'
- 종료 날짜: '2025-03-31'
- 반복 유형: 'monthly'

**실행 단계**:
```typescript
const result = generateRepeatDates('2025-01-31', '2025-03-31', 'monthly');
```

**예상 결과**:
- 반환 배열 길이: 2
- 정확한 배열: `['2025-01-31', '2025-03-31']`
- 2월은 31일이 없으므로 제외됨
- 배열에 '2025-02-31'이 없음 (유효하지 않은 날짜)

**비고**:
- 2월 처리 검증
- 유효하지 않은 날짜 생성 방지

---

### TC-010: 매월 반복 - 30일 반복
**카테고리**: 경계 케이스 - 매월 반복
**난이도**: Easy

**사전 조건**:
- 시작 날짜: '2025-01-30'
- 종료 날짜: '2025-06-30'
- 반복 유형: 'monthly'

**실행 단계**:
```typescript
const result = generateRepeatDates('2025-01-30', '2025-06-30', 'monthly');
```

**예상 결과**:
- 반환 배열 길이: 5
- 정확한 배열: `['2025-01-30', '2025-03-30', '2025-04-30', '2025-05-30', '2025-06-30']`
- 2월은 30일이 없으므로 제외됨
- 30일이 있는 달만 포함 (1월, 3월, 4월, 5월, 6월)

**비고**:
- 30일 처리 검증
- 2월(28일)이 자동으로 제외됨

---

### TC-011: 매월 반복 - 28일 반복 (모든 달 포함)
**카테고리**: 정상 케이스 - 매월 반복
**난이도**: Easy

**사전 조건**:
- 시작 날짜: '2025-01-28'
- 종료 날짜: '2025-12-28'
- 반복 유형: 'monthly'

**실행 단계**:
```typescript
const result = generateRepeatDates('2025-01-28', '2025-12-28', 'monthly');
```

**예상 결과**:
- 반환 배열 길이: 12
- 첫 번째 요소: '2025-01-28'
- 마지막 요소: '2025-12-28'
- 모든 달 포함 (28일은 모든 달에 존재)

**비고**:
- 28일 이하는 모든 달에 존재함을 검증
- 2월도 포함됨 (평년 기준)

---

### TC-012: 매년 반복 - 기본 동작
**카테고리**: 정상 케이스 - 매년 반복
**난이도**: Easy

**사전 조건**:
- 시작 날짜: '2025-01-01'
- 종료 날짜: '2028-01-01'
- 반복 유형: 'yearly'

**실행 단계**:
```typescript
const result = generateRepeatDates('2025-01-01', '2028-01-01', 'yearly');
```

**예상 결과**:
- 반환 배열 길이: 4
- 정확한 배열: `['2025-01-01', '2026-01-01', '2027-01-01', '2028-01-01']`
- 매년 같은 날짜

**비고**:
- 기본 매년 반복 검증
- 1월 1일은 모든 년도에 존재

---

### TC-013: 매년 반복 - 윤년 2월 29일 (윤년만 생성)
**카테고리**: 경계 케이스 - 매년 반복
**난이도**: Medium

**사전 조건**:
- 시작 날짜: '2024-02-29' (윤년)
- 종료 날짜: '2030-12-31'
- 반복 유형: 'yearly'

**실행 단계**:
```typescript
const result = generateRepeatDates('2024-02-29', '2030-12-31', 'yearly');
```

**예상 결과**:
- 반환 배열 길이: 2
- 정확한 배열: `['2024-02-29', '2028-02-29']`
- 2024년, 2028년만 포함 (윤년)
- 2025, 2026, 2027, 2029, 2030년은 제외 (평년)

**비고**:
- 명세서 예시와 유사한 케이스
- **핵심 엣지 케이스**: 윤년 체크 필수
- 윤년 판단 로직:
  - 4로 나누어떨어지고
  - 100으로 나누어떨어지지 않거나
  - 400으로 나누어떨어지는 경우

---

### TC-014: 매년 반복 - 일반 날짜 (7월 15일)
**카테고리**: 정상 케이스 - 매년 반복
**난이도**: Easy

**사전 조건**:
- 시작 날짜: '2025-07-15'
- 종료 날짜: '2027-12-31'
- 반복 유형: 'yearly'

**실행 단계**:
```typescript
const result = generateRepeatDates('2025-07-15', '2027-12-31', 'yearly');
```

**예상 결과**:
- 반환 배열 길이: 3
- 정확한 배열: `['2025-07-15', '2026-07-15', '2027-07-15']`
- 모든 년도에 존재하는 날짜

**비고**:
- 일반 날짜 처리 검증
- 윤년이 아닌 경우도 정상 작동

---

### TC-015: 시작일과 종료일이 동일 (모든 반복 유형)
**카테고리**: 경계 케이스 - 엣지 케이스
**난이도**: Easy

**사전 조건**:
- 시작 날짜: '2025-10-01'
- 종료 날짜: '2025-10-01'
- 반복 유형: 각각 'daily', 'weekly', 'monthly', 'yearly'

**실행 단계**:
```typescript
const dailyResult = generateRepeatDates('2025-10-01', '2025-10-01', 'daily');
const weeklyResult = generateRepeatDates('2025-10-01', '2025-10-01', 'weekly');
const monthlyResult = generateRepeatDates('2025-10-01', '2025-10-01', 'monthly');
const yearlyResult = generateRepeatDates('2025-10-01', '2025-10-01', 'yearly');
```

**예상 결과**:
- 모든 결과 배열 길이: 1
- 모든 결과: `['2025-10-01']`

**비고**:
- 최소 반복 케이스
- 모든 반복 유형에서 동일 동작

---

### TC-016: 시작일이 종료일보다 늦은 경우 (빈 배열 반환)
**카테고리**: 에러 케이스 - 엣지 케이스
**난이도**: Easy

**사전 조건**:
- 시작 날짜: '2025-10-31'
- 종료 날짜: '2025-10-01'
- 반복 유형: 'daily'

**실행 단계**:
```typescript
const result = generateRepeatDates('2025-10-31', '2025-10-01', 'daily');
```

**예상 결과**:
- 반환 배열 길이: 0
- 빈 배열: `[]`

**비고**:
- 잘못된 입력에 대한 방어 로직
- 에러를 던지지 않고 빈 배열 반환

---

### TC-017: 매우 긴 기간 반복 (성능 검증)
**카테고리**: 경계 케이스 - 엣지 케이스
**난이도**: Medium

**사전 조건**:
- 시작 날짜: '2025-01-01'
- 종료 날짜: '2025-12-31'
- 반복 유형: 'daily'

**실행 단계**:
```typescript
const startTime = performance.now();
const result = generateRepeatDates('2025-01-01', '2025-12-31', 'daily');
const endTime = performance.now();
const executionTime = endTime - startTime;
```

**예상 결과**:
- 반환 배열 길이: 365
- 첫 번째 요소: '2025-01-01'
- 마지막 요소: '2025-12-31'
- 실행 시간: 100ms 이하 (성능 기준)
- 메모리 누수 없음

**비고**:
- 대량 데이터 처리 성능 검증
- 반복문 효율성 확인

---

### TC-018: 잘못된 날짜 형식 입력
**카테고리**: 에러 케이스 - 입력 검증
**난이도**: Easy

**사전 조건**:
- 시작 날짜: '2025/10/01' (잘못된 형식, '/'가 아닌 '-' 사용해야 함)
- 종료 날짜: '2025-10-31'
- 반복 유형: 'daily'

**실행 단계**:
```typescript
const result = generateRepeatDates('2025/10/01', '2025-10-31', 'daily');
```

**예상 결과**:
- 빈 배열 반환: `[]`
- 또는 에러 발생 (구현 정책에 따라)

**비고**:
- 입력 검증 로직 확인
- YYYY-MM-DD 형식 강제 여부 확인

---

## 파일 2: medium.useEventOperations-recurring.spec.ts

### 테스트 파일 개요
- **위치**: `src/__tests__/hooks/medium.useEventOperations-recurring.spec.ts`
- **테스트 대상**: `useEventOperations` 훅의 반복 일정 관련 함수들
- **난이도**: Medium
- **총 테스트 케이스 수**: 15개
- **모킹 전략**:
  - MSW 핸들러 사용 (API 모킹)
  - notistack의 useSnackbar 모킹
  - setupTests.ts의 가짜 타이머 사용

### 테스트 스위트 구조
```
describe('useEventOperations - 반복 일정 기능')
  ├── describe('반복 일정 생성 (saveRecurringEvents)')
  │   ├── TC-101: 매일 반복 일정 생성
  │   ├── TC-102: 매주 반복 일정 생성
  │   ├── TC-103: 매월 반복 일정 생성
  │   ├── TC-104: 매년 반복 일정 생성
  │   ├── TC-105: API 성공 시 스낵바 표시
  │   └── TC-106: API 실패 시 에러 처리
  ├── describe('반복 일정 수정 (updateRecurringEvents)')
  │   ├── TC-107: 전체 반복 일정 수정 성공
  │   ├── TC-108: 제목만 수정
  │   ├── TC-109: 반복 종료일 수정
  │   ├── TC-110: repeatId가 없을 때 에러 처리
  │   └── TC-111: API 실패 시 에러 처리
  ├── describe('반복 일정 삭제 (deleteRecurringEvents)')
  │   ├── TC-112: 전체 반복 일정 삭제 성공
  │   ├── TC-113: repeatId가 없을 때 에러 처리
  │   └── TC-114: API 실패 시 에러 처리
  └── describe('단일 일정 수정/삭제 (반복 해제)')
      └── TC-115: 단일 일정 수정 시 repeat.type이 'none'으로 변경
```

---

### TC-101: 매일 반복 일정 생성
**카테고리**: 정상 케이스 - 반복 일정 생성
**난이도**: Medium

**사전 조건**:
- MSW 핸들러에 `POST /api/events-list` 설정
- 반복 일정 폼 데이터 준비

**실행 단계**:
```typescript
// MSW 핸들러 설정
server.use(
  http.post('/api/events-list', async ({ request }) => {
    const { events } = await request.json();
    const repeatId = 'repeat-id-1';
    const newEvents = events.map((event, index) => ({
      ...event,
      id: `event-${index + 1}`,
      repeat: {
        ...event.repeat,
        id: repeatId,
      },
    }));
    return HttpResponse.json({ events: newEvents }, { status: 201 });
  })
);

// 훅 렌더링
const { result } = renderHook(() => useEventOperations(false));

// 반복 일정 생성
const eventFormData: EventForm = {
  title: '매일 회의',
  date: '2025-10-01',
  startTime: '09:00',
  endTime: '10:00',
  description: '매일 스탠드업 미팅',
  location: '회의실 A',
  category: '업무',
  repeat: {
    type: 'daily',
    interval: 1,
    endDate: '2025-10-07',
  },
  notificationTime: 10,
};

await act(async () => {
  await result.current.saveEvent(eventFormData);
});
```

**예상 결과**:
- API 호출 확인: `POST /api/events-list`
- 요청 body에 7개의 이벤트 포함 (10/01 ~ 10/07)
- `result.current.events` 배열에 7개 이벤트 추가됨
- 모든 이벤트의 `repeat.id`가 동일 ('repeat-id-1')
- 모든 이벤트의 `repeat.type`이 'daily'
- 각 이벤트의 `date`가 하루씩 증가

**비고**:
- `generateRepeatDates` 함수가 올바르게 호출되는지 검증
- API 페이로드 구조 검증

---

### TC-102: 매주 반복 일정 생성
**카테고리**: 정상 케이스 - 반복 일정 생성
**난이도**: Medium

**사전 조건**:
- MSW 핸들러에 `POST /api/events-list` 설정

**실행 단계**:
```typescript
const { result } = renderHook(() => useEventOperations(false));

const eventFormData: EventForm = {
  title: '주간 회의',
  date: '2025-10-01',
  startTime: '14:00',
  endTime: '15:00',
  description: '주간 진행 상황 공유',
  location: '회의실 B',
  category: '업무',
  repeat: {
    type: 'weekly',
    interval: 1,
    endDate: '2025-10-31',
  },
  notificationTime: 10,
};

await act(async () => {
  await result.current.saveEvent(eventFormData);
});
```

**예상 결과**:
- `result.current.events` 배열에 5개 이벤트 추가됨
- 이벤트 날짜: `['2025-10-01', '2025-10-08', '2025-10-15', '2025-10-22', '2025-10-29']`
- 모든 이벤트의 `repeat.id`가 동일
- 각 이벤트의 날짜 간격이 정확히 7일

**비고**:
- 주간 반복 로직 검증

---

### TC-103: 매월 반복 일정 생성
**카테고리**: 정상 케이스 - 반복 일정 생성
**난이도**: Medium

**사전 조건**:
- MSW 핸들러에 `POST /api/events-list` 설정

**실행 단계**:
```typescript
const { result } = renderHook(() => useEventOperations(false));

const eventFormData: EventForm = {
  title: '월간 리뷰',
  date: '2025-01-31',
  startTime: '10:00',
  endTime: '11:00',
  description: '월간 성과 리뷰',
  location: '대회의실',
  category: '업무',
  repeat: {
    type: 'monthly',
    interval: 1,
    endDate: '2025-06-30',
  },
  notificationTime: 10,
};

await act(async () => {
  await result.current.saveEvent(eventFormData);
});
```

**예상 결과**:
- `result.current.events` 배열에 4개 이벤트 추가됨
- 이벤트 날짜: `['2025-01-31', '2025-03-31', '2025-05-31']` (2월, 4월은 31일이 없어 제외)
- 2월은 28일까지만 있으므로 제외됨
- 4월은 30일까지만 있으므로 제외됨

**비고**:
- 31일 엣지 케이스 처리 검증
- `generateRepeatDates`의 월별 처리 로직 검증

---

### TC-104: 매년 반복 일정 생성
**카테고리**: 정상 케이스 - 반복 일정 생성
**난이도**: Medium

**사전 조건**:
- MSW 핸들러에 `POST /api/events-list` 설정

**실행 단계**:
```typescript
const { result } = renderHook(() => useEventOperations(false));

const eventFormData: EventForm = {
  title: '연례 회의',
  date: '2025-01-01',
  startTime: '09:00',
  endTime: '10:00',
  description: '신년 회의',
  location: '본사',
  category: '업무',
  repeat: {
    type: 'yearly',
    interval: 1,
    endDate: '2027-12-31',
  },
  notificationTime: 10,
};

await act(async () => {
  await result.current.saveEvent(eventFormData);
});
```

**예상 결과**:
- `result.current.events` 배열에 3개 이벤트 추가됨
- 이벤트 날짜: `['2025-01-01', '2026-01-01', '2027-01-01']`
- 모든 이벤트의 `repeat.type`이 'yearly'

**비고**:
- 연간 반복 로직 검증

---

### TC-105: API 성공 시 스낵바 표시
**카테고리**: 정상 케이스 - UI 피드백
**난이도**: Easy

**사전 조건**:
- MSW 핸들러에 `POST /api/events-list` 설정
- enqueueSnackbar 모킹

**실행 단계**:
```typescript
const enqueueSnackbarFn = vi.fn();

vi.mock('notistack', async () => {
  const actual = await vi.importActual('notistack');
  return {
    ...actual,
    useSnackbar: () => ({
      enqueueSnackbar: enqueueSnackbarFn,
    }),
  };
});

const { result } = renderHook(() => useEventOperations(false));

await act(async () => {
  await result.current.saveEvent(eventFormData);
});
```

**예상 결과**:
- `enqueueSnackbarFn`이 '일정이 추가되었습니다.' 메시지로 호출됨
- variant는 'success'

**비고**:
- 사용자 피드백 검증

---

### TC-106: API 실패 시 에러 처리
**카테고리**: 에러 케이스 - 반복 일정 생성
**난이도**: Medium

**사전 조건**:
- MSW 핸들러에서 500 에러 반환 설정

**실행 단계**:
```typescript
server.use(
  http.post('/api/events-list', () => {
    return new HttpResponse(null, { status: 500 });
  })
);

const { result } = renderHook(() => useEventOperations(false));

await act(async () => {
  await result.current.saveEvent(eventFormData);
});
```

**예상 결과**:
- `enqueueSnackbarFn`이 '일정 저장 실패' 메시지로 호출됨
- variant는 'error'
- `result.current.events`는 변경되지 않음
- 콘솔 에러 출력됨

**비고**:
- 네트워크 에러 처리 검증
- 기존 `medium.useEventOperations.spec.ts`의 에러 처리 패턴 참고

---

### TC-107: 전체 반복 일정 수정 성공
**카테고리**: 정상 케이스 - 반복 일정 수정
**난이도**: Medium

**사전 조건**:
- 반복 일정이 이미 존재 (repeatId: 'repeat-id-1')
- MSW 핸들러에 `PUT /api/recurring-events/:repeatId` 설정

**실행 단계**:
```typescript
server.use(
  http.get('/api/events', () => {
    return HttpResponse.json({
      events: [
        createRecurringEvent('daily', {
          id: '1',
          date: '2025-10-01',
          title: '원래 제목',
        }),
        createRecurringEvent('daily', {
          id: '2',
          date: '2025-10-02',
          title: '원래 제목',
        }),
      ],
    });
  }),
  http.put('/api/recurring-events/:repeatId', async ({ params, request }) => {
    const { repeatId } = params;
    const updateData = await request.json();
    // 모든 반복 일정 업데이트
    return HttpResponse.json({ updated: true });
  })
);

const { result } = renderHook(() => useEventOperations(true));

await act(() => Promise.resolve(null));

const updateData = {
  title: '수정된 제목',
  description: '수정된 설명',
};

await act(async () => {
  await result.current.updateRecurringEvents('repeat-id-1', updateData);
});
```

**예상 결과**:
- API 호출 확인: `PUT /api/recurring-events/repeat-id-1`
- 요청 body에 updateData 포함
- `result.current.events`의 모든 반복 일정이 수정됨
- 모든 일정의 `title`이 '수정된 제목'으로 변경
- `repeat.id`는 유지됨

**비고**:
- 전체 반복 일정 수정 로직 검증

---

### TC-108: 제목만 수정
**카테고리**: 정상 케이스 - 반복 일정 수정
**난이도**: Easy

**사전 조건**:
- 반복 일정이 이미 존재

**실행 단계**:
```typescript
const { result } = renderHook(() => useEventOperations(true));

await act(async () => {
  await result.current.updateRecurringEvents('repeat-id-1', {
    title: '새 제목',
  });
});
```

**예상 결과**:
- 모든 반복 일정의 `title`만 변경됨
- 다른 필드(description, location 등)는 유지됨

**비고**:
- 부분 업데이트 검증

---

### TC-109: 반복 종료일 수정
**카테고리**: 정상 케이스 - 반복 일정 수정
**난이도**: Medium

**사전 조건**:
- 반복 일정이 이미 존재

**실행 단계**:
```typescript
const { result } = renderHook(() => useEventOperations(true));

await act(async () => {
  await result.current.updateRecurringEvents('repeat-id-1', {
    repeat: {
      type: 'daily',
      interval: 1,
      endDate: '2025-11-30', // 종료일 연장
    },
  });
});
```

**예상 결과**:
- 모든 반복 일정의 `repeat.endDate`가 '2025-11-30'으로 변경됨
- 주의: 서버 구현에 따라 새로운 일정이 추가되지는 않음 (기존 일정의 메타데이터만 수정)

**비고**:
- 반복 정보 수정 검증
- 명세서 3.3.2 참고: 날짜, 시작시간, 종료시간은 변경 불가

---

### TC-110: repeatId가 없을 때 에러 처리
**카테고리**: 에러 케이스 - 반복 일정 수정
**난이도**: Easy

**사전 조건**:
- repeatId가 undefined 또는 빈 문자열

**실행 단계**:
```typescript
const { result } = renderHook(() => useEventOperations(false));

await act(async () => {
  await result.current.updateRecurringEvents('', { title: '새 제목' });
});
```

**예상 결과**:
- `enqueueSnackbarFn`이 '일정 수정 실패' 메시지로 호출됨
- variant는 'error'
- 콘솔 에러 출력: "repeatId가 없습니다" 또는 유사 메시지

**비고**:
- 입력 검증 로직 확인

---

### TC-111: API 실패 시 에러 처리
**카테고리**: 에러 케이스 - 반복 일정 수정
**난이도**: Easy

**사전 조건**:
- MSW 핸들러에서 500 에러 반환

**실행 단계**:
```typescript
server.use(
  http.put('/api/recurring-events/:repeatId', () => {
    return new HttpResponse(null, { status: 500 });
  })
);

const { result } = renderHook(() => useEventOperations(false));

await act(async () => {
  await result.current.updateRecurringEvents('repeat-id-1', { title: '새 제목' });
});
```

**예상 결과**:
- `enqueueSnackbarFn`이 '일정 수정 실패' 메시지로 호출됨
- variant는 'error'

**비고**:
- API 에러 처리 검증

---

### TC-112: 전체 반복 일정 삭제 성공
**카테고리**: 정상 케이스 - 반복 일정 삭제
**난이도**: Medium

**사전 조건**:
- 반복 일정이 이미 존재 (repeatId: 'repeat-id-1')
- MSW 핸들러에 `DELETE /api/recurring-events/:repeatId` 설정

**실행 단계**:
```typescript
server.use(
  http.get('/api/events', () => {
    return HttpResponse.json({
      events: [
        createRecurringEvent('daily', { id: '1', date: '2025-10-01' }),
        createRecurringEvent('daily', { id: '2', date: '2025-10-02' }),
        createRecurringEvent('daily', { id: '3', date: '2025-10-03' }),
      ],
    });
  }),
  http.delete('/api/recurring-events/:repeatId', ({ params }) => {
    const { repeatId } = params;
    return new HttpResponse(null, { status: 204 });
  })
);

const { result } = renderHook(() => useEventOperations(true));

await act(() => Promise.resolve(null));

const initialEventsCount = result.current.events.length;

await act(async () => {
  await result.current.deleteRecurringEvents('repeat-id-1');
});
```

**예상 결과**:
- API 호출 확인: `DELETE /api/recurring-events/repeat-id-1`
- `result.current.events`에서 모든 반복 일정 제거됨
- `result.current.events` 길이: 0 (모든 일정이 삭제됨)
- `enqueueSnackbarFn`이 '일정이 삭제되었습니다.' 메시지로 호출됨

**비고**:
- 전체 반복 일정 삭제 로직 검증

---

### TC-113: repeatId가 없을 때 에러 처리
**카테고리**: 에러 케이스 - 반복 일정 삭제
**난이도**: Easy

**사전 조건**:
- repeatId가 undefined 또는 빈 문자열

**실행 단계**:
```typescript
const { result } = renderHook(() => useEventOperations(false));

await act(async () => {
  await result.current.deleteRecurringEvents('');
});
```

**예상 결과**:
- `enqueueSnackbarFn`이 '일정 삭제 실패' 메시지로 호출됨
- variant는 'error'
- 콘솔 에러 출력: "repeatId가 없습니다" 또는 유사 메시지

**비고**:
- 입력 검증 로직 확인

---

### TC-114: API 실패 시 에러 처리
**카테고리**: 에러 케이스 - 반복 일정 삭제
**난이도**: Easy

**사전 조건**:
- MSW 핸들러에서 500 에러 반환

**실행 단계**:
```typescript
server.use(
  http.delete('/api/recurring-events/:repeatId', () => {
    return new HttpResponse(null, { status: 500 });
  })
);

const { result } = renderHook(() => useEventOperations(false));

await act(async () => {
  await result.current.deleteRecurringEvents('repeat-id-1');
});
```

**예상 결과**:
- `enqueueSnackbarFn`이 '일정 삭제 실패' 메시지로 호출됨
- variant는 'error'
- `result.current.events`는 변경되지 않음

**비고**:
- API 에러 처리 검증

---

### TC-115: 단일 일정 수정 시 repeat.type이 'none'으로 변경
**카테고리**: 정상 케이스 - 반복 해제
**난이도**: Medium

**사전 조건**:
- 반복 일정이 이미 존재
- MSW 핸들러에 `PUT /api/events/:id` 설정

**실행 단계**:
```typescript
server.use(
  http.get('/api/events', () => {
    return HttpResponse.json({
      events: [
        createRecurringEvent('daily', {
          id: '1',
          date: '2025-10-01',
          title: '원래 제목',
        }),
      ],
    });
  }),
  http.put('/api/events/:id', async ({ params, request }) => {
    const { id } = params;
    const updatedEvent = await request.json();
    return HttpResponse.json(updatedEvent);
  })
);

const { result } = renderHook(() => useEventOperations(true));

await act(() => Promise.resolve(null));

const originalEvent = result.current.events[0];

const updatedEvent = {
  ...originalEvent,
  title: '단일 수정된 제목',
  repeat: {
    type: 'none' as RepeatType,
    interval: 0,
  },
};

await act(async () => {
  await result.current.saveEvent(updatedEvent);
});
```

**예상 결과**:
- API 호출 확인: `PUT /api/events/1`
- 해당 일정의 `repeat.type`이 'none'으로 변경됨
- 해당 일정의 `repeat.id`가 제거됨 (undefined)
- 나머지 반복 일정은 영향받지 않음 (repeat.id 유지)
- UI에서 Repeat 아이콘이 사라짐 (통합 테스트에서 검증)

**비고**:
- 명세서 3.3.2의 "단일 일정 수정" 로직 검증
- 반복 시리즈에서 분리됨

---

## 파일 3: medium.recurring-integration.spec.tsx

### 테스트 파일 개요
- **위치**: `src/__tests__/medium.recurring-integration.spec.tsx`
- **테스트 대상**: 반복 일정 전체 플로우 (UI + 훅 통합)
- **난이도**: Medium
- **총 테스트 케이스 수**: 14개
- **모킹 전략**:
  - MSW 핸들러 사용 (API 모킹)
  - `setup` 헬퍼 함수 사용 (기존 `medium.integration.spec.tsx` 참고)
  - `saveSchedule` 유사 헬퍼 함수 생성

### 테스트 스위트 구조
```
describe('반복 일정 통합 테스트')
  ├── describe('반복 일정 생성')
  │   ├── TC-201: 반복 체크박스 활성화 시 반복 설정 UI 표시
  │   ├── TC-202: 매일 반복 일정 생성 및 캘린더 표시
  │   ├── TC-203: 매주 반복 일정 생성 및 Repeat 아이콘 표시
  │   ├── TC-204: 매월 반복 일정 생성 (31일 엣지 케이스)
  │   ├── TC-205: 반복 종료일 유효성 검사 - 시작일보다 이전
  │   ├── TC-206: 반복 종료일 유효성 검사 - 2025-12-31 초과
  │   └── TC-207: 생성된 날짜가 0개일 때 에러 메시지
  ├── describe('반복 일정 표시')
  │   ├── TC-208: 주간 뷰에서 Repeat 아이콘 표시
  │   ├── TC-209: 월간 뷰에서 Repeat 아이콘 표시
  │   └── TC-210: 일정 목록에서 반복 정보 표시
  ├── describe('반복 일정 수정')
  │   ├── TC-211: 수정 시 Dialog 표시 확인
  │   ├── TC-212: "예" 선택 - 단일 일정 수정 (반복 해제)
  │   └── TC-213: "아니오" 선택 - 전체 반복 일정 수정
  └── describe('반복 일정 삭제')
      ├── TC-214: 삭제 시 Dialog 표시 확인
      ├── TC-215: "예" 선택 - 단일 일정 삭제
      └── TC-216: "아니오" 선택 - 전체 반복 일정 삭제
```

---

### 공통 헬퍼 함수

```typescript
/**
 * 반복 일정 저장 헬퍼 함수
 */
const saveRecurringSchedule = async (
  user: UserEvent,
  form: Omit<Event, 'id' | 'notificationTime'> & {
    repeatType: RepeatType;
    repeatEndDate: string;
  }
) => {
  const {
    title,
    date,
    startTime,
    endTime,
    location,
    description,
    category,
    repeatType,
    repeatEndDate,
  } = form;

  await user.click(screen.getAllByText('일정 추가')[0]);

  await user.type(screen.getByLabelText('제목'), title);
  await user.type(screen.getByLabelText('날짜'), date);
  await user.type(screen.getByLabelText('시작 시간'), startTime);
  await user.type(screen.getByLabelText('종료 시간'), endTime);
  await user.type(screen.getByLabelText('설명'), description);
  await user.type(screen.getByLabelText('위치'), location);

  await user.click(screen.getByLabelText('카테고리'));
  await user.click(within(screen.getByLabelText('카테고리')).getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: `${category}-option` }));

  // 반복 설정
  await user.click(screen.getByLabelText('반복 일정'));

  await user.click(screen.getByLabelText('반복 유형'));
  await user.click(within(screen.getByLabelText('반복 유형')).getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: `${repeatType}-option` }));

  await user.type(screen.getByLabelText('반복 종료일'), repeatEndDate);

  await user.click(screen.getByTestId('event-submit-button'));
};
```

---

### TC-201: 반복 체크박스 활성화 시 반복 설정 UI 표시
**카테고리**: UI 동작 - 반복 일정 생성
**난이도**: Easy

**사전 조건**:
- App 컴포넌트 렌더링
- 일정 추가 폼 열림

**실행 단계**:
```typescript
const { user } = setup(<App />);

await user.click(screen.getAllByText('일정 추가')[0]);

// 반복 설정 UI가 숨겨져 있는지 확인
expect(screen.queryByLabelText('반복 유형')).not.toBeInTheDocument();

// 반복 체크박스 클릭
await user.click(screen.getByLabelText('반복 일정'));

// 반복 설정 UI가 표시되는지 확인
expect(screen.getByLabelText('반복 유형')).toBeInTheDocument();
expect(screen.getByLabelText('반복 종료일')).toBeInTheDocument();
```

**예상 결과**:
- 반복 체크박스 클릭 전: 반복 설정 UI 숨김
- 반복 체크박스 클릭 후: 반복 유형, 반복 종료일 입력 필드 표시
- interval 입력 필드는 표시되지 않음 (고정값 1)

**비고**:
- 명세서 4.1.4 참고: interval TextField는 주석 해제하지 않음
- UI 활성화 검증

---

### TC-202: 매일 반복 일정 생성 및 캘린더 표시
**카테고리**: 정상 케이스 - 반복 일정 생성
**난이도**: Medium

**사전 조건**:
- MSW 핸들러 설정 (`POST /api/events-list`)
- 현재 시간: 2025-10-01 (setupTests.ts에서 설정)

**실행 단계**:
```typescript
server.use(
  http.post('/api/events-list', async ({ request }) => {
    const { events } = await request.json();
    const repeatId = 'repeat-id-daily';
    const newEvents = events.map((event, index) => ({
      ...event,
      id: `daily-${index + 1}`,
      repeat: { ...event.repeat, id: repeatId },
    }));
    return HttpResponse.json({ events: newEvents }, { status: 201 });
  })
);

const { user } = setup(<App />);

await saveRecurringSchedule(user, {
  title: '매일 스탠드업',
  date: '2025-10-01',
  startTime: '09:00',
  endTime: '09:15',
  description: '매일 아침 미팅',
  location: '회의실 A',
  category: '업무',
  repeatType: 'daily',
  repeatEndDate: '2025-10-07',
  repeat: { type: 'daily', interval: 1, endDate: '2025-10-07' },
});
```

**예상 결과**:
- 스낵바 메시지: "일정이 추가되었습니다."
- 월간 뷰에 7개 일정 표시 (10/01 ~ 10/07)
- 각 날짜 셀에 "매일 스탠드업" 제목 표시
- 일정 목록에 7개 일정 표시
- 각 일정에 "반복: 매일, 종료: 2025-10-07" 텍스트 표시

**비고**:
- 전체 플로우 검증
- API 호출부터 UI 표시까지

---

### TC-203: 매주 반복 일정 생성 및 Repeat 아이콘 표시
**카테고리**: 정상 케이스 - 반복 일정 생성
**난이도**: Medium

**사전 조건**:
- MSW 핸들러 설정

**실행 단계**:
```typescript
const { user } = setup(<App />);

await saveRecurringSchedule(user, {
  title: '주간 회의',
  date: '2025-10-01',
  startTime: '14:00',
  endTime: '15:00',
  description: '주간 진행 상황',
  location: '회의실 B',
  category: '업무',
  repeatType: 'weekly',
  repeatEndDate: '2025-10-31',
  repeat: { type: 'weekly', interval: 1, endDate: '2025-10-31' },
});
```

**예상 결과**:
- 월간 뷰에 5개 일정 표시 (10/01, 10/08, 10/15, 10/22, 10/29)
- 각 일정 옆에 Repeat 아이콘 표시 (`@mui/icons-material/Repeat`)
- 아이콘 색상: primary.main
- 아이콘 크기: small

**비고**:
- Repeat 아이콘 렌더링 검증
- `screen.getAllByTestId('RepeatIcon')`로 아이콘 개수 확인 가능 (MUI 아이콘은 자동으로 testid 생성)

---

### TC-204: 매월 반복 일정 생성 (31일 엣지 케이스)
**카테고리**: 경계 케이스 - 반복 일정 생성
**난이도**: Medium

**사전 조건**:
- MSW 핸들러 설정

**실행 단계**:
```typescript
const { user } = setup(<App />);

await saveRecurringSchedule(user, {
  title: '월간 리뷰',
  date: '2025-01-31',
  startTime: '10:00',
  endTime: '11:00',
  description: '월간 성과 리뷰',
  location: '대회의실',
  category: '업무',
  repeatType: 'monthly',
  repeatEndDate: '2025-06-30',
  repeat: { type: 'monthly', interval: 1, endDate: '2025-06-30' },
});

// 월 변경 (1월 → 3월 → 5월)
// 2월은 31일이 없으므로 확인 불필요
```

**예상 결과**:
- 1월, 3월, 5월에만 일정 표시 (각 31일)
- 2월, 4월, 6월에는 일정 없음 (31일이 없는 달)
- 일정 목록에 3개 일정만 표시

**비고**:
- 31일 엣지 케이스 검증
- 명세서 3.1.2 알고리즘 참고

---

### TC-205: 반복 종료일 유효성 검사 - 시작일보다 이전
**카테고리**: 에러 케이스 - 유효성 검사
**난이도**: Easy

**사전 조건**:
- App 컴포넌트 렌더링

**실행 단계**:
```typescript
const { user } = setup(<App />);

await user.click(screen.getAllByText('일정 추가')[0]);

await user.type(screen.getByLabelText('제목'), '테스트 일정');
await user.type(screen.getByLabelText('날짜'), '2025-10-15');
await user.type(screen.getByLabelText('시작 시간'), '09:00');
await user.type(screen.getByLabelText('종료 시간'), '10:00');

await user.click(screen.getByLabelText('반복 일정'));
await user.type(screen.getByLabelText('반복 종료일'), '2025-10-10'); // 시작일보다 이전

await user.click(screen.getByTestId('event-submit-button'));
```

**예상 결과**:
- 스낵바 메시지: "종료일은 시작일 이후여야 합니다."
- variant: 'error'
- 일정이 생성되지 않음

**비고**:
- 명세서 3.1.4 참고
- 클라이언트 측 유효성 검사

---

### TC-206: 반복 종료일 유효성 검사 - 2025-12-31 초과
**카테고리**: 에러 케이스 - 유효성 검사
**난이도**: Easy

**사전 조건**:
- App 컴포넌트 렌더링

**실행 단계**:
```typescript
const { user } = setup(<App />);

await user.click(screen.getAllByText('일정 추가')[0]);

await user.type(screen.getByLabelText('제목'), '테스트 일정');
await user.type(screen.getByLabelText('날짜'), '2025-10-01');
await user.type(screen.getByLabelText('시작 시간'), '09:00');
await user.type(screen.getByLabelText('종료 시간'), '10:00');

await user.click(screen.getByLabelText('반복 일정'));
await user.type(screen.getByLabelText('반복 종료일'), '2026-01-01'); // 제한 초과

await user.click(screen.getByTestId('event-submit-button'));
```

**예상 결과**:
- 스낵바 메시지: "종료일은 2025-12-31 이하여야 합니다."
- variant: 'error'
- 일정이 생성되지 않음

**비고**:
- 명세서 1.3 제약사항 참고
- 최대 종료일 제한 검증

---

### TC-207: 생성된 날짜가 0개일 때 에러 메시지
**카테고리**: 에러 케이스 - 반복 일정 생성
**난이도**: Medium

**사전 조건**:
- App 컴포넌트 렌더링

**실행 단계**:
```typescript
const { user } = setup(<App />);

// 2월 29일에 매년 반복 설정 (평년만 있는 범위)
await saveRecurringSchedule(user, {
  title: '윤년 테스트',
  date: '2024-02-29',
  startTime: '09:00',
  endTime: '10:00',
  description: '윤년 일정',
  location: '테스트',
  category: '업무',
  repeatType: 'yearly',
  repeatEndDate: '2025-12-31', // 윤년이 없는 범위
  repeat: { type: 'yearly', interval: 1, endDate: '2025-12-31' },
});
```

**예상 결과**:
- 스낵바 메시지: "선택한 조건에 맞는 날짜가 없습니다."
- variant: 'error'
- 일정이 생성되지 않음

**비고**:
- 명세서 3.1.4 참고
- `generateRepeatDates`가 빈 배열 반환 시 처리

---

### TC-208: 주간 뷰에서 Repeat 아이콘 표시
**카테고리**: UI 표시 - 반복 일정 표시
**난이도**: Easy

**사전 조건**:
- 반복 일정이 이미 생성됨 (TC-203 참고)

**실행 단계**:
```typescript
const { user } = setup(<App />);

// 주간 뷰로 변경
await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
await user.click(screen.getByRole('option', { name: 'week-option' }));

const weekView = screen.getByTestId('week-view');
```

**예상 결과**:
- 주간 뷰에 반복 일정 표시
- 각 일정 옆에 Repeat 아이콘 표시
- 아이콘과 제목이 함께 표시됨

**비고**:
- 명세서 3.2.2 참고
- Stack direction="row"로 아이콘과 제목 배치

---

### TC-209: 월간 뷰에서 Repeat 아이콘 표시
**카테고리**: UI 표시 - 반복 일정 표시
**난이도**: Easy

**사전 조건**:
- 반복 일정이 이미 생성됨

**실행 단계**:
```typescript
const { user } = setup(<App />);

const monthView = screen.getByTestId('month-view');
const repeatIcons = within(monthView).getAllByTestId('RepeatIcon');
```

**예상 결과**:
- 월간 뷰에 Repeat 아이콘 표시
- 반복 일정 개수만큼 아이콘 표시
- 일반 일정에는 아이콘 없음

**비고**:
- 월간 뷰 기본 표시 검증

---

### TC-210: 일정 목록에서 반복 정보 표시
**카테고리**: UI 표시 - 반복 일정 표시
**난이도**: Easy

**사전 조건**:
- 반복 일정이 이미 생성됨

**실행 단계**:
```typescript
const { user } = setup(<App />);

const eventList = screen.getByTestId('event-list');
```

**예상 결과**:
- 일정 목록에 반복 정보 표시
- 텍스트 형식: "반복: 매일, 종료: 2025-10-07" (daily)
- 텍스트 형식: "반복: 매주, 종료: 2025-10-31" (weekly)
- 텍스트 형식: "반복: 매월, 종료: 2025-12-31" (monthly)
- 텍스트 형식: "반복: 매년, 종료: 2027-12-31" (yearly)

**비고**:
- 명세서 3.2.2 참고: 기존 코드(라인 558-568)가 이미 구현됨

---

### TC-211: 수정 시 Dialog 표시 확인
**카테고리**: UI 동작 - 반복 일정 수정
**난이도**: Easy

**사전 조건**:
- 반복 일정이 이미 생성됨
- MSW 핸들러 설정

**실행 단계**:
```typescript
server.use(
  http.get('/api/events', () => {
    return HttpResponse.json({
      events: [
        createRecurringEvent('daily', {
          id: '1',
          date: '2025-10-01',
          title: '매일 회의',
        }),
      ],
    });
  })
);

const { user } = setup(<App />);

// 일정 로딩 대기
await screen.findByText('일정 로딩 완료!');

// 수정 버튼 클릭
await user.click(screen.getByLabelText('Edit event'));
```

**예상 결과**:
- Dialog 표시 확인
- Dialog 제목: "반복 일정 수정"
- Dialog 내용: "해당 일정만 수정하시겠어요?"
- 버튼 3개 표시: "예", "아니오", "취소"

**비고**:
- 명세서 3.3.2 참고
- Dialog 컴포넌트 렌더링 검증

---

### TC-212: "예" 선택 - 단일 일정 수정 (반복 해제)
**카테고리**: 정상 케이스 - 반복 일정 수정
**난이도**: Medium

**사전 조건**:
- 반복 일정이 이미 생성됨
- MSW 핸들러 설정 (`PUT /api/events/:id`)

**실행 단계**:
```typescript
server.use(
  http.get('/api/events', () => {
    return HttpResponse.json({
      events: [
        createRecurringEvent('daily', {
          id: '1',
          date: '2025-10-01',
          title: '매일 회의',
        }),
        createRecurringEvent('daily', {
          id: '2',
          date: '2025-10-02',
          title: '매일 회의',
        }),
      ],
    });
  }),
  http.put('/api/events/:id', async ({ params, request }) => {
    const { id } = params;
    const updatedEvent = await request.json();
    return HttpResponse.json(updatedEvent);
  })
);

const { user } = setup(<App />);

await screen.findByText('일정 로딩 완료!');

// 첫 번째 일정 수정
const editButtons = screen.getAllByLabelText('Edit event');
await user.click(editButtons[0]);

// Dialog에서 "예" 클릭
await user.click(screen.getByRole('button', { name: '예' }));

// 제목 수정
await user.clear(screen.getByLabelText('제목'));
await user.type(screen.getByLabelText('제목'), '단일 수정된 회의');

await user.click(screen.getByTestId('event-submit-button'));
```

**예상 결과**:
- API 호출 확인: `PUT /api/events/1`
- 첫 번째 일정의 제목만 변경됨: "단일 수정된 회의"
- 첫 번째 일정의 `repeat.type`이 'none'으로 변경됨
- 첫 번째 일정에 Repeat 아이콘이 사라짐
- 두 번째 일정은 영향받지 않음 (여전히 "매일 회의", Repeat 아이콘 유지)

**비고**:
- 명세서 3.3.2 "단일 일정 수정" 참고
- 반복 해제 검증

---

### TC-213: "아니오" 선택 - 전체 반복 일정 수정
**카테고리**: 정상 케이스 - 반복 일정 수정
**난이도**: Medium

**사전 조건**:
- 반복 일정이 이미 생성됨
- MSW 핸들러 설정 (`PUT /api/recurring-events/:repeatId`)

**실행 단계**:
```typescript
server.use(
  http.get('/api/events', () => {
    return HttpResponse.json({
      events: [
        createRecurringEvent('daily', {
          id: '1',
          date: '2025-10-01',
          title: '매일 회의',
        }),
        createRecurringEvent('daily', {
          id: '2',
          date: '2025-10-02',
          title: '매일 회의',
        }),
      ],
    });
  }),
  http.put('/api/recurring-events/:repeatId', async ({ params, request }) => {
    const { repeatId } = params;
    const updateData = await request.json();
    return HttpResponse.json({ updated: true });
  })
);

const { user } = setup(<App />);

await screen.findByText('일정 로딩 완료!');

// 첫 번째 일정 수정
const editButtons = screen.getAllByLabelText('Edit event');
await user.click(editButtons[0]);

// Dialog에서 "아니오" 클릭
await user.click(screen.getByRole('button', { name: '아니오' }));

// 제목 수정
await user.clear(screen.getByLabelText('제목'));
await user.type(screen.getByLabelText('제목'), '전체 수정된 회의');

await user.click(screen.getByTestId('event-submit-button'));
```

**예상 결과**:
- API 호출 확인: `PUT /api/recurring-events/repeat-id-1`
- 모든 반복 일정의 제목이 변경됨: "전체 수정된 회의"
- 모든 일정의 `repeat.type`이 'daily'로 유지됨
- 모든 일정에 Repeat 아이콘이 유지됨

**비고**:
- 명세서 3.3.2 "전체 반복 일정 수정" 참고
- 시리즈 전체 수정 검증

---

### TC-214: 삭제 시 Dialog 표시 확인
**카테고리**: UI 동작 - 반복 일정 삭제
**난이도**: Easy

**사전 조건**:
- 반복 일정이 이미 생성됨

**실행 단계**:
```typescript
server.use(
  http.get('/api/events', () => {
    return HttpResponse.json({
      events: [
        createRecurringEvent('daily', {
          id: '1',
          date: '2025-10-01',
          title: '매일 회의',
        }),
      ],
    });
  })
);

const { user } = setup(<App />);

await screen.findByText('일정 로딩 완료!');

// 삭제 버튼 클릭
await user.click(screen.getByLabelText('Delete event'));
```

**예상 결과**:
- Dialog 표시 확인
- Dialog 제목: "반복 일정 삭제"
- Dialog 내용: "해당 일정만 삭제하시겠어요?"
- 버튼 3개 표시: "예", "아니오", "취소"

**비고**:
- 명세서 3.4.2 참고
- Dialog 컴포넌트 렌더링 검증

---

### TC-215: "예" 선택 - 단일 일정 삭제
**카테고리**: 정상 케이스 - 반복 일정 삭제
**난이도**: Medium

**사전 조건**:
- 반복 일정이 이미 생성됨
- MSW 핸들러 설정 (`DELETE /api/events/:id`)

**실행 단계**:
```typescript
server.use(
  http.get('/api/events', () => {
    return HttpResponse.json({
      events: [
        createRecurringEvent('daily', {
          id: '1',
          date: '2025-10-01',
          title: '매일 회의',
        }),
        createRecurringEvent('daily', {
          id: '2',
          date: '2025-10-02',
          title: '매일 회의',
        }),
      ],
    });
  }),
  http.delete('/api/events/:id', ({ params }) => {
    const { id } = params;
    return new HttpResponse(null, { status: 204 });
  })
);

const { user } = setup(<App />);

await screen.findByText('일정 로딩 완료!');

// 첫 번째 일정 삭제
const deleteButtons = screen.getAllByLabelText('Delete event');
await user.click(deleteButtons[0]);

// Dialog에서 "예" 클릭
await user.click(screen.getByRole('button', { name: '예' }));
```

**예상 결과**:
- API 호출 확인: `DELETE /api/events/1`
- 첫 번째 일정만 삭제됨
- 두 번째 일정은 여전히 표시됨
- 일정 목록에 1개 일정만 남음

**비고**:
- 명세서 3.4.2 "단일 일정 삭제" 참고

---

### TC-216: "아니오" 선택 - 전체 반복 일정 삭제
**카테고리**: 정상 케이스 - 반복 일정 삭제
**난이도**: Medium

**사전 조건**:
- 반복 일정이 이미 생성됨
- MSW 핸들러 설정 (`DELETE /api/recurring-events/:repeatId`)

**실행 단계**:
```typescript
server.use(
  http.get('/api/events', () => {
    return HttpResponse.json({
      events: [
        createRecurringEvent('daily', {
          id: '1',
          date: '2025-10-01',
          title: '매일 회의',
        }),
        createRecurringEvent('daily', {
          id: '2',
          date: '2025-10-02',
          title: '매일 회의',
        }),
      ],
    });
  }),
  http.delete('/api/recurring-events/:repeatId', ({ params }) => {
    const { repeatId } = params;
    return new HttpResponse(null, { status: 204 });
  })
);

const { user } = setup(<App />);

await screen.findByText('일정 로딩 완료!');

// 첫 번째 일정 삭제
const deleteButtons = screen.getAllByLabelText('Delete event');
await user.click(deleteButtons[0]);

// Dialog에서 "아니오" 클릭
await user.click(screen.getByRole('button', { name: '아니오' }));
```

**예상 결과**:
- API 호출 확인: `DELETE /api/recurring-events/repeat-id-1`
- 모든 반복 일정이 삭제됨
- 일정 목록이 비어있음
- "검색 결과가 없습니다." 메시지 표시

**비고**:
- 명세서 3.4.2 "전체 반복 일정 삭제" 참고
- 시리즈 전체 삭제 검증

---

## 전체 테스트 요약

### 테스트 개수 통계
| 파일 | 테스트 케이스 수 | 난이도 분포 |
|------|----------------|-----------|
| easy.repeatUtils.spec.ts | 18개 | Easy: 12, Medium: 6 |
| medium.useEventOperations-recurring.spec.ts | 15개 | Easy: 5, Medium: 10 |
| medium.recurring-integration.spec.tsx | 14개 | Easy: 7, Medium: 7 |
| **총계** | **47개** | **Easy: 24, Medium: 23** |

### 카테고리별 분포
- **정상 케이스**: 25개 (53%)
- **경계 케이스**: 14개 (30%)
- **에러 케이스**: 8개 (17%)

### 테스트 실행 순서 및 의존성

#### 1단계: 단위 테스트 (독립 실행)
```
easy.repeatUtils.spec.ts
  ↓ (의존성 없음, 순수 함수 테스트)
```

#### 2단계: 훅 테스트 (단위 테스트 의존)
```
medium.useEventOperations-recurring.spec.ts
  ↑ 의존: generateRepeatDates 함수 (단위 테스트에서 검증됨)
  ↓ API 모킹 필요
```

#### 3단계: 통합 테스트 (훅 테스트 의존)
```
medium.recurring-integration.spec.tsx
  ↑ 의존: useEventOperations 훅 (훅 테스트에서 검증됨)
  ↑ 의존: generateRepeatDates 함수
  ↓ 전체 플로우 검증
```

### 의존성 그래프
```
                  ┌─────────────────────────┐
                  │ easy.repeatUtils.spec.ts│
                  │  (generateRepeatDates)  │
                  └───────────┬─────────────┘
                              │
                              ↓
        ┌─────────────────────────────────────────┐
        │ medium.useEventOperations-recurring.spec.ts│
        │     (useEventOperations 훅)              │
        └───────────────────┬─────────────────────┘
                            │
                            ↓
          ┌─────────────────────────────────────┐
          │ medium.recurring-integration.spec.tsx│
          │      (전체 UI + 훅 통합)              │
          └─────────────────────────────────────┘
```

### 테스트 실행 명령어

```bash
# 전체 테스트 실행 (순차적)
pnpm test

# 단위 테스트만 실행
pnpm test src/__tests__/unit/easy.repeatUtils.spec.ts

# 훅 테스트만 실행
pnpm test src/__tests__/hooks/medium.useEventOperations-recurring.spec.ts

# 통합 테스트만 실행
pnpm test src/__tests__/medium.recurring-integration.spec.tsx

# UI로 인터랙티브 실행 (디버깅 시 유용)
pnpm test:ui

# 커버리지 포함 실행
pnpm test:coverage
```

---

## 추가 고려사항

### 놓칠 수 있는 엣지 케이스

#### 1. 윤년 처리
- **TC-013**에서 다루었지만, 추가 케이스:
  - 2000년 (400으로 나누어떨어지므로 윤년)
  - 1900년 (100으로 나누어떨어지지만 400으로는 안되므로 평년)

#### 2. 월말 처리
- 1월 31일 → 2월: 건너뛰기
- 3월 31일 → 4월: 건너뛰기
- **TC-008, TC-009**에서 다루었음

#### 3. 시간대 처리
- setupTests.ts에서 UTC로 고정했으므로 별도 테스트 불필요
- 단, 사용자가 다른 시간대에 있을 경우를 고려한 E2E 테스트는 별도 필요

#### 4. 반복 일정과 일반 일정 혼재
- 통합 테스트에서 반복 일정과 일반 일정이 함께 표시되는지 확인 필요
- 추가 테스트 케이스 제안:
  ```typescript
  TC-217: 반복 일정과 일반 일정이 함께 표시되는지 확인
  TC-218: 반복 일정 수정 시 일반 일정은 영향받지 않는지 확인
  ```

#### 5. 일정 겹침 검사
- 명세서 1.3에서 "반복 일정에는 적용하지 않음"
- 추가 테스트 케이스 제안:
  ```typescript
  TC-219: 반복 일정 생성 시 일정 겹침 경고가 표시되지 않는지 확인
  TC-220: 단일 일정 수정으로 반복 해제 시 일정 겹침 검사가 작동하는지 확인
  ```

### 성능 테스트

#### 대량 반복 일정 처리
- **TC-017**에서 365일 매일 반복 테스트
- 추가 테스트 케이스 제안:
  ```typescript
  TC-221: 1000개 이상의 반복 일정 생성 시 성능 (100ms 이하)
  TC-222: 반복 일정 검색 성능 (50ms 이하)
  ```

### 접근성 테스트

#### Dialog 접근성
- 추가 테스트 케이스 제안:
  ```typescript
  TC-223: 반복 일정 수정 Dialog의 ARIA 속성 확인
  TC-224: 키보드 네비게이션으로 Dialog 조작 가능 여부
  ```

---

## 테스트 작성 우선순위

Kent Beck의 원칙에 따라 다음 순서로 테스트를 작성하는 것을 권장합니다:

### 1순위 (핵심 기능)
1. **TC-001**: 매일 반복 기본 동작
2. **TC-004**: 매주 반복 기본 동작
3. **TC-007**: 매월 반복 기본 동작
4. **TC-101**: 매일 반복 일정 생성 (훅)
5. **TC-202**: 매일 반복 일정 생성 및 캘린더 표시 (통합)

### 2순위 (위험한 엣지 케이스)
6. **TC-008**: 31일 매월 반복
7. **TC-013**: 윤년 2월 29일 매년 반복
8. **TC-103**: 매월 반복 일정 생성 (31일 엣지 케이스, 훅)
9. **TC-204**: 매월 반복 일정 생성 (31일 엣지 케이스, 통합)

### 3순위 (수정/삭제 기능)
10. **TC-107**: 전체 반복 일정 수정
11. **TC-112**: 전체 반복 일정 삭제
12. **TC-212**: 단일 일정 수정 (반복 해제)
13. **TC-215**: 단일 일정 삭제

### 4순위 (에러 처리)
14. **TC-106**: API 실패 시 에러 처리 (생성)
15. **TC-205**: 반복 종료일 유효성 검사 - 시작일보다 이전
16. **TC-206**: 반복 종료일 유효성 검사 - 2025-12-31 초과

### 5순위 (나머지 테스트)
17. 나머지 모든 테스트 케이스

---

## 체크리스트

### 테스트 작성 전
- [ ] setupTests.ts 설정 확인 (가짜 타이머, UTC 시간대)
- [ ] 기존 MSW 핸들러 패턴 확인
- [ ] 기존 테스트 파일 네이밍 확인 (`{난이도}.{대상}.spec.ts(x)`)
- [ ] 테스트 데이터 팩토리 함수 준비

### 테스트 작성 중
- [ ] 각 테스트는 단일 동작만 검증
- [ ] 테스트 설명은 한글로 구체적으로 작성
- [ ] Arrange-Act-Assert 패턴 준수
- [ ] 모킹은 필요한 경우만 사용
- [ ] setupTests.ts의 설정을 중복하지 않음

### 테스트 작성 후
- [ ] 모든 테스트가 독립적으로 실행 가능
- [ ] 테스트 간 의존성 없음
- [ ] 매직 넘버/스트링 대신 상수 사용
- [ ] console.log 제거
- [ ] ESLint 에러 없음
- [ ] TypeScript 타입 에러 없음

---

## 결론

이 테스트 명세서는 반복 일정 기능에 대한 완전한 TDD 가이드를 제공합니다. 총 47개의 테스트 케이스를 통해:

1. **순수 함수 검증** (generateRepeatDates)
2. **훅 로직 검증** (useEventOperations)
3. **전체 플로우 검증** (UI + 훅 통합)

을 체계적으로 테스트할 수 있습니다.

테스트를 먼저 작성한 후 (Red), 구현을 진행하고 (Green), 리팩토링 (Refactor)하는 순서로 개발하면 높은 품질의 코드를 얻을 수 있습니다.

### 다음 단계
1. 이 명세서를 기반으로 테스트 파일 3개를 작성합니다.
2. 모든 테스트가 실패하는지 확인합니다 (Red).
3. 기능 명세서에 따라 구현을 진행합니다 (Green).
4. 코드 품질을 개선합니다 (Refactor).
