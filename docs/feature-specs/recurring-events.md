# 반복 일정 기능 명세서

## 1. 개요

### 1.1 목적
사용자가 매일, 매주, 매월, 매년 반복되는 일정을 생성하고 관리할 수 있는 기능을 제공합니다. 기존의 주석 처리된 반복 일정 기능을 활성화하고, 반복 일정의 생성, 표시, 수정, 삭제를 완전하게 구현합니다.

### 1.2 범위
**변경되는 파일:**
- `/src/App.tsx` - 반복 일정 UI 활성화, Dialog 추가
- `/src/hooks/useEventOperations.ts` - 반복 일정 생성/수정/삭제 로직 추가
- `/src/types.ts` - RepeatInfo 타입에 id 필드 추가
- `/src/utils/repeatUtils.ts` - (신규) 반복 일정 생성 유틸리티
- `/src/__mocks__/handlers.ts` - MSW 핸들러에 반복 일정 API 추가

**새로 생성되는 파일:**
- `/src/utils/repeatUtils.ts` - 반복 일정 날짜 계산 로직
- (테스트 파일들은 별도 명세서에서 다룸)

### 1.3 제약사항
- 일정 겹침 검사는 반복 일정에 적용하지 않음 (기획 요구사항)
- 반복 종료 날짜는 최대 2025-12-31까지만 허용
- Interval은 항상 1로 고정 (매일, 매주, 매월, 매년만 지원)
- 31일에 매월 반복 선택 시 31일이 있는 달에만 생성
- 윤년 2월 29일에 매년 반복 선택 시 2월 29일에만 생성

---

## 2. 기존 시스템 분석

### 2.1 관련 기존 코드

#### 타입 정의 (src/types.ts)
```typescript
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RepeatInfo {
  type: RepeatType;
  interval: number;
  endDate?: string;
  // id?: string; // 추가 필요
}
```

#### 기존 API 엔드포인트 (server.js)
- `POST /api/events-list` - 일괄 일정 생성 (라인 76-99)
  - 반복 일정 배열을 받아 일괄 생성
  - 자동으로 repeatId 생성 및 할당
- `PUT /api/recurring-events/:repeatId` - 반복 시리즈 전체 수정 (라인 142-174)
- `DELETE /api/recurring-events/:repeatId` - 반복 시리즈 전체 삭제 (라인 176-192)
- `PUT /api/events/:id` - 단일 일정 수정 (기존)
- `DELETE /api/events/:id` - 단일 일정 삭제 (기존)

#### 기존 훅
- `useEventForm.ts` - 이미 반복 관련 상태 관리 포함 (isRepeating, repeatType, repeatInterval, repeatEndDate)
- `useEventOperations.ts` - saveEvent, deleteEvent 함수가 단일 일정만 처리 중

#### 주석 처리된 UI (App.tsx 라인 441-478)
반복 유형 선택, 간격 입력, 종료일 설정 UI가 이미 구현되어 있음.

### 2.2 기존 패턴

#### 네이밍 컨벤션
- 훅: `use[기능명]` (useEventOperations)
- 유틸리티 함수: camelCase, 동사로 시작 (getWeekDates, formatDate)
- 컴포넌트: PascalCase
- 타입: PascalCase (Event, EventForm)

#### 상태 관리
- React hooks (useState, useEffect)
- 커스텀 훅으로 로직 분리
- 각 훅은 명확한 단일 책임

#### 에러 처리
- try-catch로 API 에러 처리
- enqueueSnackbar로 사용자에게 에러 메시지 표시
- 에러 발생 시 콘솔에 로그 출력

#### API 통신
- fetch API 사용
- JSON 요청/응답
- 성공 시 fetchEvents()로 목록 재조회

#### UI 패턴
- MUI 컴포넌트 사용
- Dialog로 확인/경고 표시 (기존 overlapping dialog 참고)
- 아이콘은 @mui/icons-material에서 import

---

## 3. 상세 기능 명세

### 3.1 반복 일정 생성

#### 3.1.1 입력
**폼 데이터:**
```typescript
{
  title: string;           // 필수
  date: string;            // 시작 날짜 (YYYY-MM-DD)
  startTime: string;       // HH:mm
  endTime: string;         // HH:mm
  description: string;
  location: string;
  category: string;
  isRepeating: boolean;    // 반복 일정 체크박스
  repeatType: RepeatType;  // 'daily' | 'weekly' | 'monthly' | 'yearly'
  repeatInterval: 1;       // 항상 1 고정
  repeatEndDate: string;   // 반복 종료일 (YYYY-MM-DD), 최대 2025-12-31
  notificationTime: number;
}
```

**유효성 검사:**
- `repeatEndDate`는 `date`보다 이후여야 함
- `repeatEndDate`는 2025-12-31 이하여야 함
- `repeatType`이 'none'이 아닐 때만 반복 일정 생성

#### 3.1.2 처리 로직

**1단계: 반복 날짜 생성 (신규 유틸리티 함수)**

`src/utils/repeatUtils.ts` 생성:
```typescript
/**
 * 반복 유형과 기간에 따라 일정 날짜 배열을 생성합니다.
 *
 * @param startDate - 시작 날짜 (YYYY-MM-DD)
 * @param endDate - 종료 날짜 (YYYY-MM-DD)
 * @param repeatType - 반복 유형
 * @returns 날짜 문자열 배열 (YYYY-MM-DD[])
 */
export function generateRepeatDates(
  startDate: string,
  endDate: string,
  repeatType: RepeatType
): string[]
```

**알고리즘:**
- `daily`: startDate부터 endDate까지 매일
- `weekly`: startDate부터 7일씩 증가
- `monthly`: 매월 같은 날짜 (31일 → 31일 있는 달만)
- `yearly`: 매년 같은 날짜 (2월 29일 → 윤년만)

**예시:**
```typescript
// 매주 반복 예시
generateRepeatDates('2025-10-01', '2025-10-31', 'weekly')
// 반환: ['2025-10-01', '2025-10-08', '2025-10-15', '2025-10-22', '2025-10-29']

// 매월 31일 반복 예시
generateRepeatDates('2025-01-31', '2025-12-31', 'monthly')
// 반환: ['2025-01-31', '2025-03-31', '2025-05-31', '2025-07-31', '2025-08-31', '2025-10-31', '2025-12-31']
// (2월, 4월, 6월, 9월, 11월은 제외 - 31일이 없음)

// 윤년 2월 29일 매년 반복 예시
generateRepeatDates('2024-02-29', '2027-12-31', 'yearly')
// 반환: ['2024-02-29'] (2025, 2026, 2027년은 윤년이 아니므로 제외)
```

**2단계: 이벤트 배열 생성**

각 날짜에 대해 Event 객체 생성:
```typescript
const dates = generateRepeatDates(date, repeatEndDate, repeatType);
const events = dates.map(d => ({
  title,
  date: d,
  startTime,
  endTime,
  description,
  location,
  category,
  repeat: {
    type: repeatType,
    interval: 1,
    endDate: repeatEndDate,
    // id는 서버에서 자동 생성
  },
  notificationTime
}));
```

**3단계: API 호출**

`POST /api/events-list` 호출:
```typescript
const response = await fetch('/api/events-list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ events })
});
```

서버는 자동으로:
- 각 이벤트에 고유 `id` 생성
- 모든 반복 이벤트에 동일한 `repeat.id` (repeatId) 할당
- 일괄 저장 후 생성된 이벤트 배열 반환

#### 3.1.3 출력
**성공 응답:**
```typescript
// 201 Created
{
  events: Event[] // repeat.id가 동일한 이벤트 배열
}
```

**UI 피드백:**
- 스낵바: "일정이 추가되었습니다."
- 폼 초기화
- 캘린더 자동 갱신

#### 3.1.4 에러 처리
| 에러 케이스 | 처리 방법 |
|------------|---------|
| 종료일이 시작일보다 이전 | "종료일은 시작일 이후여야 합니다." 스낵바 표시 |
| 종료일이 2025-12-31 초과 | "종료일은 2025-12-31 이하여야 합니다." 스낵바 표시 |
| API 실패 (네트워크 등) | "일정 저장 실패" 스낵바 표시 |
| 생성된 날짜가 0개 | "선택한 조건에 맞는 날짜가 없습니다." 스낵바 표시 |

---

### 3.2 반복 일정 표시

#### 3.2.1 입력
- `events: Event[]` - 전체 이벤트 목록
- `event.repeat.type` - 'none'이 아니면 반복 일정

#### 3.2.2 처리 로직

**아이콘 추가:**
```tsx
import { Repeat } from '@mui/icons-material';

// 캘린더 셀 내부 (App.tsx 라인 202, 289)
<Stack direction="row" spacing={1} alignItems="center">
  {isNotified && <Notifications fontSize="small" />}
  {event.repeat.type !== 'none' && <Repeat fontSize="small" />}
  <Typography variant="caption" noWrap>
    {event.title}
  </Typography>
</Stack>
```

**일정 목록 (사이드바):**
기존 코드 (라인 558-568)가 이미 반복 정보를 표시 중이므로 수정 불필요.

#### 3.2.3 출력
- 주간/월간 뷰: 반복 일정 제목 옆에 Repeat 아이콘 표시
- 일정 목록: 반복 유형 및 종료일 텍스트 표시

---

### 3.3 반복 일정 수정

#### 3.3.1 입력
- 수정할 `Event` 객체 (editingEvent)
- 수정된 폼 데이터
- 사용자 선택: "해당 일정만" 또는 "전체 반복 일정"

#### 3.3.2 처리 로직

**1단계: Dialog 표시**

반복 일정 수정 시도 시 확인 Dialog 표시:
```tsx
<Dialog open={isEditRecurringDialogOpen}>
  <DialogTitle>반복 일정 수정</DialogTitle>
  <DialogContent>
    <DialogContentText>
      해당 일정만 수정하시겠어요?
    </DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button onClick={handleEditSingleEvent}>예</Button>
    <Button onClick={handleEditAllEvents}>아니오</Button>
    <Button onClick={handleCancelEdit}>취소</Button>
  </DialogActions>
</Dialog>
```

**2단계-A: 단일 일정 수정 ("예" 선택)**

기존 `PUT /api/events/:id` 사용:
```typescript
const updatedEvent = {
  ...editingEvent,
  ...formData,
  repeat: {
    type: 'none',  // 반복 해제
    interval: 0,
    // id 제거
  }
};

await fetch(`/api/events/${editingEvent.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updatedEvent)
});
```

결과:
- 해당 이벤트만 수정됨
- `repeat.type`이 'none'으로 변경되어 반복 아이콘 사라짐
- `repeat.id` 제거되어 시리즈에서 분리됨

**2단계-B: 전체 반복 일정 수정 ("아니오" 선택)**

`PUT /api/recurring-events/:repeatId` 사용:
```typescript
const updateData = {
  title: formData.title,
  description: formData.description,
  location: formData.location,
  category: formData.category,
  notificationTime: formData.notificationTime,
  repeat: {
    type: formData.repeatType,
    interval: 1,
    endDate: formData.repeatEndDate
  }
  // 주의: 날짜, 시작시간, 종료시간은 변경 불가 (서버 구현 참고)
};

await fetch(`/api/recurring-events/${editingEvent.repeat.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateData)
});
```

결과:
- 동일한 `repeat.id`를 가진 모든 이벤트가 수정됨
- 반복 정보 유지
- 아이콘 유지

#### 3.3.3 출력
- 스낵바: "일정이 수정되었습니다."
- Dialog 닫힘
- 캘린더 자동 갱신

#### 3.3.4 에러 처리
| 에러 케이스 | 처리 방법 |
|------------|---------|
| repeatId가 없는 경우 | 콘솔 에러, "일정 수정 실패" 스낵바 |
| API 실패 | "일정 수정 실패" 스낵바 표시 |

---

### 3.4 반복 일정 삭제

#### 3.4.1 입력
- 삭제할 `Event` 객체
- 사용자 선택: "해당 일정만" 또는 "전체 반복 일정"

#### 3.4.2 처리 로직

**1단계: Dialog 표시**

반복 일정 삭제 시도 시 확인 Dialog 표시:
```tsx
<Dialog open={isDeleteRecurringDialogOpen}>
  <DialogTitle>반복 일정 삭제</DialogTitle>
  <DialogContent>
    <DialogContentText>
      해당 일정만 삭제하시겠어요?
    </DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button onClick={handleDeleteSingleEvent}>예</Button>
    <Button onClick={handleDeleteAllEvents}>아니오</Button>
    <Button onClick={handleCancelDelete}>취소</Button>
  </DialogActions>
</Dialog>
```

**2단계-A: 단일 일정 삭제 ("예" 선택)**

기존 `DELETE /api/events/:id` 사용:
```typescript
await fetch(`/api/events/${eventId}`, {
  method: 'DELETE'
});
```

결과:
- 해당 이벤트만 삭제
- 나머지 시리즈는 유지

**2단계-B: 전체 반복 일정 삭제 ("아니오" 선택)**

`DELETE /api/recurring-events/:repeatId` 사용:
```typescript
await fetch(`/api/recurring-events/${event.repeat.id}`, {
  method: 'DELETE'
});
```

결과:
- 동일한 `repeat.id`를 가진 모든 이벤트 삭제

#### 3.4.3 출력
- 스낵바: "일정이 삭제되었습니다."
- Dialog 닫힘
- 캘린더 자동 갱신

#### 3.4.4 에러 처리
| 에러 케이스 | 처리 방법 |
|------------|---------|
| repeatId가 없는 경우 | 콘솔 에러, "일정 삭제 실패" 스낵바 |
| API 실패 | "일정 삭제 실패" 스낵바 표시 |

---

## 4. 구현 가이드

### 4.1 변경/생성할 파일

#### 4.1.1 `/src/types.ts`
**변경 이유:** RepeatInfo에 id 필드 추가 (반복 시리즈 식별)

**변경 내용:**
```typescript
export interface RepeatInfo {
  type: RepeatType;
  interval: number;
  endDate?: string;
  id?: string;  // 추가: 반복 시리즈 식별자 (서버가 생성)
}
```

---

#### 4.1.2 `/src/utils/repeatUtils.ts` (신규)
**생성 이유:** 반복 날짜 계산 로직을 독립적인 순수 함수로 분리

**주요 함수:**
1. `generateRepeatDates(startDate: string, endDate: string, repeatType: RepeatType): string[]`
2. `addDays(date: Date, days: number): Date`
3. `addMonths(date: Date, months: number): Date | null` - 해당 월에 일자가 없으면 null
4. `addYears(date: Date, years: number): Date | null` - 윤년 체크
5. `isLeapYear(year: number): boolean`

**구현 시 주의사항:**
- 날짜는 YYYY-MM-DD 문자열로 입출력
- 내부 계산은 Date 객체 사용
- 월 추가 시 존재하지 않는 날짜는 null 반환 (예: 4월 31일)
- 년 추가 시 2월 29일은 윤년 체크

---

#### 4.1.3 `/src/hooks/useEventOperations.ts`
**변경 이유:** 반복 일정 생성, 수정, 삭제 로직 추가

**추가할 함수:**
1. `saveRecurringEvents(eventFormData: EventForm): Promise<void>`
   - `generateRepeatDates` 호출
   - `POST /api/events-list` 호출

2. `updateRecurringEvents(repeatId: string, updateData: Partial<Event>): Promise<void>`
   - `PUT /api/recurring-events/:repeatId` 호출

3. `deleteRecurringEvents(repeatId: string): Promise<void>`
   - `DELETE /api/recurring-events/:repeatId` 호출

**수정할 함수:**
- `saveEvent`: 반복 일정 체크 후 saveRecurringEvents 호출

**변경 내용:**
```typescript
const saveEvent = async (eventData: Event | EventForm) => {
  try {
    // 반복 일정인지 확인
    const isRecurring = 'repeat' in eventData &&
                       eventData.repeat.type !== 'none' &&
                       !editing;

    if (isRecurring) {
      await saveRecurringEvents(eventData as EventForm);
      return;
    }

    // 기존 단일 일정 저장 로직...
  }
};
```

---

#### 4.1.4 `/src/App.tsx`
**변경 이유:** 반복 일정 UI 활성화, Dialog 추가

**변경 사항:**

1. **Import 추가:**
```typescript
import { Repeat } from '@mui/icons-material';
import { RepeatType } from './types';
```

2. **주석 해제 (라인 80-84):**
```typescript
setRepeatType,
// setRepeatInterval, // interval은 고정값 사용
setRepeatEndDate,
```

3. **State 추가:**
```typescript
const [isEditRecurringDialogOpen, setIsEditRecurringDialogOpen] = useState(false);
const [isDeleteRecurringDialogOpen, setIsDeleteRecurringDialogOpen] = useState(false);
const [eventToModify, setEventToModify] = useState<Event | null>(null);
```

4. **주석 해제 (라인 441-478):**
반복 설정 UI 전체 주석 해제, 단 interval TextField는 제외

5. **반복 아이콘 추가 (renderWeekView, renderMonthView):**
```tsx
{event.repeat.type !== 'none' && (
  <Repeat fontSize="small" sx={{ color: 'primary.main' }} />
)}
```

6. **수정 버튼 클릭 핸들러 변경:**
```typescript
const handleEditClick = (event: Event) => {
  if (event.repeat.type !== 'none') {
    setEventToModify(event);
    setIsEditRecurringDialogOpen(true);
  } else {
    editEvent(event);
  }
};
```

7. **삭제 버튼 클릭 핸들러 변경:**
```typescript
const handleDeleteClick = (event: Event) => {
  if (event.repeat.type !== 'none') {
    setEventToModify(event);
    setIsDeleteRecurringDialogOpen(true);
  } else {
    deleteEvent(event.id);
  }
};
```

8. **Dialog 컴포넌트 추가:**
- 수정 확인 Dialog (isEditRecurringDialogOpen)
- 삭제 확인 Dialog (isDeleteRecurringDialogOpen)

9. **반복 일정 생성 유효성 검사 추가 (addOrUpdateEvent 함수):**
```typescript
if (isRepeating) {
  if (!repeatEndDate) {
    enqueueSnackbar('반복 종료일을 입력해주세요.', { variant: 'error' });
    return;
  }
  if (new Date(repeatEndDate) <= new Date(date)) {
    enqueueSnackbar('종료일은 시작일 이후여야 합니다.', { variant: 'error' });
    return;
  }
  if (new Date(repeatEndDate) > new Date('2025-12-31')) {
    enqueueSnackbar('종료일은 2025-12-31 이하여야 합니다.', { variant: 'error' });
    return;
  }
}
```

---

#### 4.1.5 `/src/__mocks__/handlers.ts`
**변경 이유:** 테스트를 위한 반복 일정 API 모킹

**추가할 핸들러:**
```typescript
http.post('/api/events-list', async ({ request }) => {
  const { events } = await request.json();
  const repeatId = 'mock-repeat-id-' + Date.now();
  const newEvents = events.map((event, index) => ({
    ...event,
    id: 'mock-id-' + index,
    repeat: {
      ...event.repeat,
      id: event.repeat.type !== 'none' ? repeatId : undefined
    }
  }));
  mockEvents.push(...newEvents);
  return HttpResponse.json(newEvents, { status: 201 });
}),

http.put('/api/recurring-events/:repeatId', async ({ params, request }) => {
  const { repeatId } = params;
  const updateData = await request.json();
  mockEvents.forEach((event, index) => {
    if (event.repeat.id === repeatId) {
      mockEvents[index] = { ...event, ...updateData };
    }
  });
  return HttpResponse.json({ updated: true });
}),

http.delete('/api/recurring-events/:repeatId', ({ params }) => {
  const { repeatId } = params;
  mockEvents = mockEvents.filter(event => event.repeat.id !== repeatId);
  return new HttpResponse(null, { status: 204 });
})
```

---

### 4.2 의존성
**새로 설치할 패키지:** 없음 (기존 라이브러리로 충분)

**기존 코드 의존 관계:**
- `repeatUtils.ts` → `dateUtils.ts` (formatDate, fillZero 사용)
- `useEventOperations.ts` → `repeatUtils.ts` (generateRepeatDates 사용)
- `App.tsx` → `useEventOperations.ts`, `useEventForm.ts`

---

### 4.3 테스트 전략

#### 단위 테스트 (`src/__tests__/unit/`)

**`easy.repeatUtils.spec.ts`**
- `generateRepeatDates` 기본 동작 테스트
  - 매일 반복
  - 매주 반복
  - 매월 반복
  - 매년 반복
- Edge cases:
  - 31일 매월 반복
  - 2월 29일 매년 반복
  - 시작일 = 종료일
  - 빈 배열 반환 케이스

**모킹 필요 없음** (순수 함수)

#### 훅 테스트 (`src/__tests__/hooks/`)

**`medium.useEventOperations-recurring.spec.ts`**
- `saveRecurringEvents` 테스트
  - API 호출 확인
  - 생성된 이벤트 개수 확인
- `updateRecurringEvents` 테스트
- `deleteRecurringEvents` 테스트

**모킹:** MSW 핸들러 사용

#### 통합 테스트 (`src/__tests__/`)

**`medium.recurring-integration.spec.tsx`**
- 반복 일정 생성 플로우
  1. 폼 입력
  2. 반복 체크박스 선택
  3. 반복 유형 선택
  4. 종료일 입력
  5. 저장 버튼 클릭
  6. 캘린더에 표시 확인
  7. Repeat 아이콘 확인

- 반복 일정 수정 플로우
  1. 반복 일정 클릭
  2. Dialog 표시 확인
  3. "예" 선택 → 단일 수정 확인
  4. "아니오" 선택 → 전체 수정 확인

- 반복 일정 삭제 플로우
  1. 반복 일정 삭제 버튼 클릭
  2. Dialog 표시 확인
  3. "예" 선택 → 단일 삭제 확인
  4. "아니오" 선택 → 전체 삭제 확인

**모킹:** MSW 핸들러, renderApp 헬퍼 사용

---

## 5. 체크리스트

### 구현 전 확인
- [ ] RepeatInfo 타입에 id 필드 추가
- [ ] repeatUtils.ts 파일 생성
- [ ] generateRepeatDates 함수 구현
- [ ] 31일/2월 29일 엣지 케이스 처리

### 구현 중 확인
- [ ] useEventOperations에 반복 일정 함수 추가
- [ ] App.tsx의 주석 해제 (interval 제외)
- [ ] Repeat 아이콘 import 및 렌더링
- [ ] 수정/삭제 Dialog 추가
- [ ] 반복 일정 유효성 검사 추가

### 구현 후 확인
- [ ] 기존 테스트가 모두 통과하는가?
- [ ] 새로운 단위 테스트 작성 완료?
- [ ] 새로운 통합 테스트 작성 완료?
- [ ] 2025-12-31 제한이 정확히 작동하는가?
- [ ] 일정 겹침 체크가 반복 일정에서 작동하지 않는가?
- [ ] Dialog의 "예"/"아니오" 동작이 기획대로 작동하는가?
- [ ] 단일 수정 시 반복 아이콘이 사라지는가?
- [ ] 전체 수정 시 반복 아이콘이 유지되는가?

### 코드 품질 확인
- [ ] 기존 네이밍 컨벤션을 따르는가?
- [ ] 에러 처리가 모든 케이스에 포함되었는가?
- [ ] 불필요한 console.log가 제거되었는가?
- [ ] ESLint 에러가 없는가? (`pnpm lint`)
- [ ] TypeScript 타입 에러가 없는가? (`pnpm lint:tsc`)

---

## 6. 주요 의사결정 기록

### 6.1 API 방식: 일괄 생성 선택
**결정:** 프론트엔드에서 모든 반복 일정을 계산하여 `POST /api/events-list`로 일괄 생성

**이유:**
- 기존 API가 이미 구현되어 있음 (server.js 라인 76-99)
- repeatId 자동 할당 로직 포함
- 백엔드 수정 최소화

**대안:** 백엔드 확장 방식은 server.js 수정이 필요하고, 과제 범위를 벗어남

### 6.2 확인 Dialog: MUI Dialog 사용
**결정:** 수정/삭제 시 MUI Dialog로 "예"/"아니오"/"취소" 선택

**이유:**
- 기존 코드의 일정 겹침 Dialog와 일관성 (App.tsx 라인 593-633)
- window.confirm()보다 UI/UX 우수
- 테스트 용이성 (data-testid 사용 가능)

### 6.3 Repeat 아이콘 사용
**결정:** @mui/icons-material의 Repeat 아이콘 사용

**이유:**
- 기존 Notifications 아이콘과 동일한 패턴
- MUI 디자인 시스템 일관성 유지
- 추가 의존성 불필요

### 6.4 Interval 고정값
**결정:** interval은 항상 1로 고정, UI에서 입력 불가

**이유:**
- 기획 요구사항 명시 (매일, 매주, 매월, 매년만 지원)
- 복잡도 감소
- 주석 처리된 코드의 interval TextField는 활성화하지 않음

---

## 7. 구현 예상 시간
- repeatUtils.ts 구현 및 단위 테스트: 2시간
- useEventOperations 수정: 1.5시간
- App.tsx UI 활성화 및 Dialog 추가: 2시간
- MSW 핸들러 추가: 0.5시간
- 통합 테스트 작성: 2시간
- 버그 수정 및 리팩토링: 1시간
- **총 예상 시간: 9시간**

---

## 8. 참고 자료
- 기존 API 문서: CLAUDE.md 라인 35
- 기존 Dialog 구현: App.tsx 라인 593-633
- 기존 아이콘 패턴: App.tsx 라인 203, 543
- Date 조작 참고: src/utils/dateUtils.ts
- MSW 핸들러 패턴: src/__mocks__/handlersUtils.ts

---

## 개선 노트 (내부용)
- 이번 작업에서 확인한 점:
  - server.js의 반복 일정 API가 이미 완전히 구현되어 있음
  - App.tsx의 반복 UI가 주석으로 준비되어 있음
  - 주요 작업은 "활성화"이며, 새로운 패턴 도입은 최소화

- 다음 작업 시 고려사항:
  - 윤년/월말 처리는 복잡하므로 테스트 케이스를 충분히 작성할 것
  - Dialog의 "예"/"아니오" 텍스트가 직관적이지 않을 수 있음 → 추후 개선 검토
  - repeatId가 없는 구 버전 데이터 처리 방안 고려 필요 (현재는 에러 처리만)
