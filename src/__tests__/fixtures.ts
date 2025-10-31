import type { Event, EventForm, RepeatType } from '../types';

// 테스트용 상수
export const TEST_DATES = {
  START: '2025-10-01',
  END: '2025-10-07',
  MONTH_END: '2025-10-31',
  YEAR_END: '2025-12-31',
  JANUARY_31: '2025-01-31',
  JUNE_30: '2025-06-30',
} as const;

export const TEST_TIMES = {
  MORNING_START: '09:00',
  MORNING_END: '10:00',
  AFTERNOON_START: '14:00',
  AFTERNOON_END: '15:00',
} as const;

export const TEST_REPEAT_IDS = {
  DAILY: 'repeat-id-1',
  WEEKLY: 'repeat-id-2',
  MONTHLY: 'repeat-id-3',
  YEARLY: 'repeat-id-4',
} as const;

export const SNACKBAR_MESSAGES = {
  EVENT_ADDED: '일정이 추가되었습니다.',
  EVENT_DELETED: '일정이 삭제되었습니다.',
  SAVE_FAILED: '일정 저장 실패',
  UPDATE_FAILED: '일정 수정 실패',
  DELETE_FAILED: '일정 삭제 실패',
} as const;

// 기본 이벤트 팩토리
export const createMockEvent = (overrides: Partial<Event> = {}): Event => ({
  id: '1',
  title: '테스트 일정',
  date: TEST_DATES.START,
  startTime: TEST_TIMES.MORNING_START,
  endTime: TEST_TIMES.MORNING_END,
  description: '테스트 설명',
  location: '테스트 장소',
  category: '업무',
  repeat: { type: 'none', interval: 0 },
  notificationTime: 10,
  ...overrides,
});

// 반복 일정 팩토리
export const createRecurringEvent = (
  repeatType: RepeatType,
  overrides: Partial<Event> = {}
): Event =>
  createMockEvent({
    repeat: {
      type: repeatType,
      interval: 1,
      endDate: TEST_DATES.YEAR_END,
      id: TEST_REPEAT_IDS.DAILY,
    },
    ...overrides,
  });

// 이벤트 폼 데이터 팩토리
export const createEventFormData = (overrides: Partial<EventForm> = {}): EventForm => ({
  title: '테스트 일정',
  date: TEST_DATES.START,
  startTime: TEST_TIMES.MORNING_START,
  endTime: TEST_TIMES.MORNING_END,
  description: '테스트 설명',
  location: '테스트 장소',
  category: '업무',
  repeat: {
    type: 'none',
    interval: 0,
  },
  notificationTime: 10,
  ...overrides,
});

// 반복 이벤트 폼 데이터 팩토리
export const createRecurringEventFormData = (
  repeatType: RepeatType,
  overrides: Partial<EventForm> = {}
): EventForm =>
  createEventFormData({
    repeat: {
      type: repeatType,
      interval: 1,
      endDate: TEST_DATES.END,
    },
    ...overrides,
  });
