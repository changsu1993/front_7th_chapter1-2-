import { act, renderHook } from '@testing-library/react';

import { setMockEvents } from '../../__mocks__/handlers';
import { useEventOperations } from '../../hooks/useEventOperations';
import { server } from '../../setupTests';
import {
  createMockEvent,
  createRecurringEvent,
  createRecurringEventFormData,
  SNACKBAR_MESSAGES,
  TEST_DATES,
  TEST_REPEAT_IDS,
  TEST_TIMES,
} from '../fixtures';
import {
  createFailureHandler,
  createRecurringEventsHandler,
  deleteRecurringEventsHandler,
  updateRecurringEventsHandler,
  updateSingleEventHandler,
  waitForHookInitialization,
} from '../helpers';

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

describe('useEventOperations - 반복 일정 기능', () => {
  describe('반복 일정 생성 (saveEvent with repeat)', () => {
    it('매일 반복 일정을 생성한다', async () => {
      // Given: 빈 상태에서 시작하고 매일 반복 일정 생성 핸들러 설정
      setMockEvents([]);
      server.use(createRecurringEventsHandler(TEST_REPEAT_IDS.DAILY));

      const { result } = renderHook(() => useEventOperations(false));
      await waitForHookInitialization();

      const eventFormData = createRecurringEventFormData('daily', {
        title: '매일 회의',
        description: '매일 스탠드업 미팅',
        location: '회의실 A',
      });

      // When: 매일 반복 일정을 저장
      await act(async () => {
        await result.current.saveEvent(eventFormData);
      });

      // Then: 7개의 일정이 생성되고 모두 같은 repeatId를 가짐
      expect(result.current.events).toHaveLength(7);
      expect(result.current.events[0].date).toBe(TEST_DATES.START);
      expect(result.current.events[6].date).toBe(TEST_DATES.END);
      expect(result.current.events.every((e) => e.repeat.type === 'daily')).toBe(true);
      expect(result.current.events.every((e) => e.repeat.id === TEST_REPEAT_IDS.DAILY)).toBe(true);
    });

    it('매주 반복 일정을 생성한다', async () => {
      // Given: 빈 상태에서 시작하고 매주 반복 일정 생성 핸들러 설정
      setMockEvents([]);
      server.use(createRecurringEventsHandler(TEST_REPEAT_IDS.WEEKLY));

      const { result } = renderHook(() => useEventOperations(false));
      await waitForHookInitialization();

      const eventFormData = createRecurringEventFormData('weekly', {
        title: '주간 회의',
        startTime: TEST_TIMES.AFTERNOON_START,
        endTime: TEST_TIMES.AFTERNOON_END,
        description: '주간 진행 상황 공유',
        location: '회의실 B',
        repeat: {
          type: 'weekly',
          interval: 1,
          endDate: TEST_DATES.MONTH_END,
        },
      });

      // When: 매주 반복 일정을 저장
      await act(async () => {
        await result.current.saveEvent(eventFormData);
      });

      // Then: 5개의 주간 일정이 생성됨
      expect(result.current.events).toHaveLength(5);
      expect(result.current.events.map((e) => e.date)).toEqual([
        '2025-10-01',
        '2025-10-08',
        '2025-10-15',
        '2025-10-22',
        '2025-10-29',
      ]);
      expect(result.current.events.every((e) => e.repeat.id === TEST_REPEAT_IDS.WEEKLY)).toBe(true);
    });

    it('매월 반복 일정을 생성한다 (31일 엣지 케이스)', async () => {
      // Given: 매월 반복 일정 생성 핸들러 설정
      server.use(createRecurringEventsHandler(TEST_REPEAT_IDS.MONTHLY));

      const { result } = renderHook(() => useEventOperations(false));
      await waitForHookInitialization();

      const eventFormData = createRecurringEventFormData('monthly', {
        title: '월간 리뷰',
        date: TEST_DATES.JANUARY_31,
        startTime: '10:00',
        endTime: '11:00',
        description: '월간 성과 리뷰',
        location: '대회의실',
        repeat: {
          type: 'monthly',
          interval: 1,
          endDate: TEST_DATES.JUNE_30,
        },
      });

      // When: 매월 31일 반복 일정을 저장
      await act(async () => {
        await result.current.saveEvent(eventFormData);
      });

      // Then: 31일이 있는 달만 일정이 생성됨 (2월 제외)
      expect(result.current.events.length).toBeGreaterThan(0);
      expect(result.current.events.map((e) => e.date)).toContain('2025-01-31');
      expect(result.current.events.map((e) => e.date)).toContain('2025-03-31');
      expect(result.current.events.map((e) => e.date)).toContain('2025-05-31');
      expect(result.current.events.map((e) => e.date)).not.toContain('2025-02-31');
    });

    it('매년 반복 일정을 생성한다', async () => {
      // Given: 빈 상태에서 시작하고 매년 반복 일정 생성 핸들러 설정
      setMockEvents([]);
      server.use(createRecurringEventsHandler(TEST_REPEAT_IDS.YEARLY));

      const { result } = renderHook(() => useEventOperations(false));
      await waitForHookInitialization();

      const eventFormData = createRecurringEventFormData('yearly', {
        title: '연례 회의',
        date: '2025-01-01',
        description: '신년 회의',
        location: '본사',
        repeat: {
          type: 'yearly',
          interval: 1,
          endDate: '2027-12-31',
        },
      });

      // When: 매년 반복 일정을 저장
      await act(async () => {
        await result.current.saveEvent(eventFormData);
      });

      // Then: 3년간 연례 일정이 생성됨
      expect(result.current.events).toHaveLength(3);
      expect(result.current.events.map((e) => e.date)).toEqual([
        '2025-01-01',
        '2026-01-01',
        '2027-01-01',
      ]);
      expect(result.current.events.every((e) => e.repeat.type === 'yearly')).toBe(true);
    });

    it('API 성공 시 성공 스낵바를 표시한다', async () => {
      // Given: 간단한 성공 핸들러 설정
      server.use(createRecurringEventsHandler(TEST_REPEAT_IDS.DAILY));

      const { result } = renderHook(() => useEventOperations(false));
      await waitForHookInitialization();

      const eventFormData = createRecurringEventFormData('daily', {
        repeat: {
          type: 'daily',
          interval: 1,
          endDate: '2025-10-03',
        },
      });

      // When: 반복 일정을 저장
      await act(async () => {
        await result.current.saveEvent(eventFormData);
      });

      // Then: 성공 스낵바가 표시됨
      expect(enqueueSnackbarFn).toHaveBeenCalledWith(SNACKBAR_MESSAGES.EVENT_ADDED, {
        variant: 'success',
      });
    });

    it('API 실패 시 에러 메시지를 표시한다', async () => {
      // Given: API 실패 핸들러 설정
      server.use(createFailureHandler('post', '/api/events-list'));

      const { result } = renderHook(() => useEventOperations(false));
      await waitForHookInitialization();

      const eventFormData = createRecurringEventFormData('daily', {
        repeat: {
          type: 'daily',
          interval: 1,
          endDate: '2025-10-03',
        },
      });

      // When: 반복 일정 저장 시도
      await act(async () => {
        await result.current.saveEvent(eventFormData);
      });

      // Then: 에러 스낵바가 표시됨
      expect(enqueueSnackbarFn).toHaveBeenCalledWith(SNACKBAR_MESSAGES.SAVE_FAILED, {
        variant: 'error',
      });
    });
  });

  describe('반복 일정 수정 (updateRecurringEvents)', () => {
    it('전체 반복 일정을 수정한다', async () => {
      // Given: 2개의 반복 일정이 있고 수정 핸들러 설정
      const mockEvents = [
        createRecurringEvent('daily', {
          id: '1',
          date: TEST_DATES.START,
          title: '원래 제목',
        }),
        createRecurringEvent('daily', {
          id: '2',
          date: '2025-10-02',
          title: '원래 제목',
        }),
      ];

      setMockEvents(mockEvents);
      server.use(updateRecurringEventsHandler());

      const { result } = renderHook(() => useEventOperations(true));
      await waitForHookInitialization();

      // When: 전체 반복 일정 업데이트
      await act(async () => {
        await result.current.updateRecurringEvents(TEST_REPEAT_IDS.DAILY, {
          title: '수정된 제목',
          description: '수정된 설명',
        });
      });

      // Then: 모든 반복 일정이 수정됨
      expect(result.current.events.every((e) => e.title === '수정된 제목')).toBe(true);
      expect(result.current.events.every((e) => e.repeat.id === TEST_REPEAT_IDS.DAILY)).toBe(true);
    });

    it('제목만 수정한다', async () => {
      // Given: 기존 반복 일정이 있고 수정 핸들러 설정
      const mockEvents = [
        createRecurringEvent('daily', {
          id: '1',
          date: TEST_DATES.START,
          title: '원래 제목',
          description: '원래 설명',
        }),
      ];

      setMockEvents(mockEvents);
      server.use(updateRecurringEventsHandler());

      const { result } = renderHook(() => useEventOperations(true));
      await waitForHookInitialization();

      // When: 제목만 업데이트
      await act(async () => {
        await result.current.updateRecurringEvents(TEST_REPEAT_IDS.DAILY, {
          title: '새 제목',
        });
      });

      // Then: 제목만 변경되고 나머지는 유지됨
      expect(result.current.events[0].title).toBe('새 제목');
      expect(result.current.events[0].description).toBe('원래 설명');
    });

    it('반복 종료일을 수정한다', async () => {
      // Given: 기존 반복 일정이 있고 수정 핸들러 설정
      const mockEvents = [
        createRecurringEvent('daily', {
          id: '1',
          date: TEST_DATES.START,
        }),
      ];

      setMockEvents(mockEvents);
      server.use(updateRecurringEventsHandler());

      const { result } = renderHook(() => useEventOperations(true));
      await waitForHookInitialization();

      // When: 반복 종료일 업데이트
      await act(async () => {
        await result.current.updateRecurringEvents(TEST_REPEAT_IDS.DAILY, {
          repeat: {
            type: 'daily',
            interval: 1,
            endDate: '2025-11-30',
          },
        });
      });

      // Then: 반복 종료일이 변경됨
      expect(result.current.events[0].repeat.endDate).toBe('2025-11-30');
    });

    it('repeatId가 없을 때 에러를 처리한다', async () => {
      // Given: 빈 repeatId로 업데이트 시도
      const { result } = renderHook(() => useEventOperations(false));
      await waitForHookInitialization();

      // When: 빈 repeatId로 업데이트
      await act(async () => {
        await result.current.updateRecurringEvents('', { title: '새 제목' });
      });

      // Then: 에러 스낵바 표시
      expect(enqueueSnackbarFn).toHaveBeenCalledWith(SNACKBAR_MESSAGES.UPDATE_FAILED, {
        variant: 'error',
      });
    });

    it('API 실패 시 에러를 처리한다', async () => {
      // Given: API 실패 핸들러 설정
      server.use(createFailureHandler('put', '/api/recurring-events/:repeatId'));

      const { result } = renderHook(() => useEventOperations(false));
      await waitForHookInitialization();

      // When: 업데이트 시도
      await act(async () => {
        await result.current.updateRecurringEvents(TEST_REPEAT_IDS.DAILY, { title: '새 제목' });
      });

      // Then: 에러 스낵바 표시
      expect(enqueueSnackbarFn).toHaveBeenCalledWith(SNACKBAR_MESSAGES.UPDATE_FAILED, {
        variant: 'error',
      });
    });
  });

  describe('반복 일정 삭제 (deleteRecurringEvents)', () => {
    it('전체 반복 일정을 삭제한다', async () => {
      // Given: 3개의 반복 일정이 있고 삭제 핸들러 설정
      const mockEvents = [
        createRecurringEvent('daily', { id: '1', date: TEST_DATES.START }),
        createRecurringEvent('daily', { id: '2', date: '2025-10-02' }),
        createRecurringEvent('daily', { id: '3', date: '2025-10-03' }),
      ];

      setMockEvents(mockEvents);
      server.use(deleteRecurringEventsHandler());

      const { result } = renderHook(() => useEventOperations(true));
      await waitForHookInitialization();

      expect(result.current.events).toHaveLength(3);

      // When: 전체 반복 일정 삭제
      await act(async () => {
        await result.current.deleteRecurringEvents(TEST_REPEAT_IDS.DAILY);
      });

      // Then: 삭제 성공 스낵바 표시
      expect(enqueueSnackbarFn).toHaveBeenCalledWith(SNACKBAR_MESSAGES.EVENT_DELETED, {
        variant: 'info',
      });
    });

    it('repeatId가 없을 때 에러를 처리한다', async () => {
      // Given: 빈 repeatId로 삭제 시도
      const { result } = renderHook(() => useEventOperations(false));
      await waitForHookInitialization();

      // When: 빈 repeatId로 삭제
      await act(async () => {
        await result.current.deleteRecurringEvents('');
      });

      // Then: 에러 스낵바 표시
      expect(enqueueSnackbarFn).toHaveBeenCalledWith(SNACKBAR_MESSAGES.DELETE_FAILED, {
        variant: 'error',
      });
    });

    it('API 실패 시 에러를 처리한다', async () => {
      // Given: API 실패 핸들러 설정
      server.use(createFailureHandler('delete', '/api/recurring-events/:repeatId'));

      const { result } = renderHook(() => useEventOperations(false));
      await waitForHookInitialization();

      // When: 삭제 시도
      await act(async () => {
        await result.current.deleteRecurringEvents(TEST_REPEAT_IDS.DAILY);
      });

      // Then: 에러 스낵바 표시
      expect(enqueueSnackbarFn).toHaveBeenCalledWith(SNACKBAR_MESSAGES.DELETE_FAILED, {
        variant: 'error',
      });
    });
  });

  describe('단일 일정 수정/삭제 (반복 해제)', () => {
    it('단일 일정 수정 시 repeat.type이 none으로 변경된다', async () => {
      // Given: 반복 일정이 있고 단일 수정 핸들러 설정
      const mockEvents = [
        createRecurringEvent('daily', {
          id: '1',
          date: TEST_DATES.START,
          title: '원래 제목',
        }),
      ];

      setMockEvents(mockEvents);
      server.use(updateSingleEventHandler());

      const { result } = renderHook(() => useEventOperations(true));
      await waitForHookInitialization();

      const originalEvent = result.current.events[0];

      // When: 단일 일정으로 변경 (repeat.type을 none으로)
      const updatedEvent = createMockEvent({
        ...originalEvent,
        title: '단일 수정된 제목',
        repeat: {
          type: 'none',
          interval: 0,
        },
      });

      await act(async () => {
        await result.current.saveEvent(updatedEvent);
      });

      // Then: repeat.type이 none으로 변경되고 repeatId 제거됨
      expect(result.current.events[0].repeat.type).toBe('none');
      expect(result.current.events[0].repeat.id).toBeUndefined();
      expect(result.current.events[0].title).toBe('단일 수정된 제목');
    });
  });
});
