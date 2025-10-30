import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { useEventOperations } from '../../hooks/useEventOperations';
import { server } from '../../setupTests';
import type { Event, EventForm, RepeatType } from '../../types';

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

// 테스트용 이벤트 팩토리 함수
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

const createRecurringEvent = (repeatType: RepeatType, overrides: Partial<Event> = {}): Event =>
  createMockEvent({
    repeat: {
      type: repeatType,
      interval: 1,
      endDate: '2025-12-31',
      id: 'repeat-id-1',
    },
    ...overrides,
  });

describe('useEventOperations - 반복 일정 기능', () => {
  describe('반복 일정 생성 (saveEvent with repeat)', () => {
    it('매일 반복 일정을 생성한다', async () => {
      server.use(
        http.post('/api/events-list', async ({ request }) => {
          const { events } = (await request.json()) as { events: Event[] };
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

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

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

      expect(result.current.events).toHaveLength(7);
      expect(result.current.events[0].date).toBe('2025-10-01');
      expect(result.current.events[6].date).toBe('2025-10-07');
      expect(result.current.events.every((e) => e.repeat.type === 'daily')).toBe(true);
      expect(result.current.events.every((e) => e.repeat.id === 'repeat-id-1')).toBe(true);
    });

    it('매주 반복 일정을 생성한다', async () => {
      server.use(
        http.post('/api/events-list', async ({ request }) => {
          const { events } = (await request.json()) as { events: Event[] };
          const repeatId = 'repeat-id-2';
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

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

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

      expect(result.current.events).toHaveLength(5);
      expect(result.current.events.map((e) => e.date)).toEqual([
        '2025-10-01',
        '2025-10-08',
        '2025-10-15',
        '2025-10-22',
        '2025-10-29',
      ]);
      expect(result.current.events.every((e) => e.repeat.id === 'repeat-id-2')).toBe(true);
    });

    it('매월 반복 일정을 생성한다 (31일 엣지 케이스)', async () => {
      server.use(
        http.post('/api/events-list', async ({ request }) => {
          const { events } = (await request.json()) as { events: Event[] };
          const repeatId = 'repeat-id-3';
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

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

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

      expect(result.current.events.length).toBeGreaterThan(0);
      expect(result.current.events.map((e) => e.date)).toContain('2025-01-31');
      expect(result.current.events.map((e) => e.date)).toContain('2025-03-31');
      expect(result.current.events.map((e) => e.date)).toContain('2025-05-31');
      expect(result.current.events.map((e) => e.date)).not.toContain('2025-02-31');
    });

    it('매년 반복 일정을 생성한다', async () => {
      server.use(
        http.post('/api/events-list', async ({ request }) => {
          const { events } = (await request.json()) as { events: Event[] };
          const repeatId = 'repeat-id-4';
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

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

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

      expect(result.current.events).toHaveLength(3);
      expect(result.current.events.map((e) => e.date)).toEqual([
        '2025-01-01',
        '2026-01-01',
        '2027-01-01',
      ]);
      expect(result.current.events.every((e) => e.repeat.type === 'yearly')).toBe(true);
    });

    it('API 성공 시 성공 스낵바를 표시한다', async () => {
      server.use(
        http.post('/api/events-list', async ({ request }) => {
          const { events } = (await request.json()) as { events: Event[] };
          return HttpResponse.json({ events }, { status: 201 });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      const eventFormData: EventForm = {
        title: '테스트 일정',
        date: '2025-10-01',
        startTime: '09:00',
        endTime: '10:00',
        description: '테스트',
        location: '테스트',
        category: '업무',
        repeat: {
          type: 'daily',
          interval: 1,
          endDate: '2025-10-03',
        },
        notificationTime: 10,
      };

      await act(async () => {
        await result.current.saveEvent(eventFormData);
      });

      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정이 추가되었습니다.', {
        variant: 'success',
      });
    });

    it('API 실패 시 에러 메시지를 표시한다', async () => {
      server.use(
        http.post('/api/events-list', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      const eventFormData: EventForm = {
        title: '실패할 일정',
        date: '2025-10-01',
        startTime: '09:00',
        endTime: '10:00',
        description: '테스트',
        location: '테스트',
        category: '업무',
        repeat: {
          type: 'daily',
          interval: 1,
          endDate: '2025-10-03',
        },
        notificationTime: 10,
      };

      await act(async () => {
        await result.current.saveEvent(eventFormData);
      });

      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정 저장 실패', { variant: 'error' });
    });
  });

  describe('반복 일정 수정 (updateRecurringEvents)', () => {
    it('전체 반복 일정을 수정한다', async () => {
      const mockEvents: Event[] = [
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
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.put('/api/recurring-events/:repeatId', async ({ request }) => {
          const updateData = (await request.json()) as Partial<Event>;

          const updatedEvents = mockEvents.map((event) => ({
            ...event,
            ...updateData,
            repeat: event.repeat,
          }));

          return HttpResponse.json({ events: updatedEvents });
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

      expect(result.current.events.every((e) => e.title === '수정된 제목')).toBe(true);
      expect(result.current.events.every((e) => e.repeat.id === 'repeat-id-1')).toBe(true);
    });

    it('제목만 수정한다', async () => {
      const mockEvents: Event[] = [
        createRecurringEvent('daily', {
          id: '1',
          date: '2025-10-01',
          title: '원래 제목',
          description: '원래 설명',
        }),
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.put('/api/recurring-events/:repeatId', async ({ request }) => {
          const updateData = (await request.json()) as Partial<Event>;
          const updatedEvents = mockEvents.map((event) => ({
            ...event,
            ...updateData,
          }));
          return HttpResponse.json({ events: updatedEvents });
        })
      );

      const { result } = renderHook(() => useEventOperations(true));

      await act(() => Promise.resolve(null));

      await act(async () => {
        await result.current.updateRecurringEvents('repeat-id-1', {
          title: '새 제목',
        });
      });

      expect(result.current.events[0].title).toBe('새 제목');
      expect(result.current.events[0].description).toBe('원래 설명');
    });

    it('반복 종료일을 수정한다', async () => {
      const mockEvents: Event[] = [
        createRecurringEvent('daily', {
          id: '1',
          date: '2025-10-01',
        }),
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.put('/api/recurring-events/:repeatId', async ({ request }) => {
          const updateData = (await request.json()) as Partial<Event>;
          const updatedEvents = mockEvents.map((event) => ({
            ...event,
            repeat: {
              ...event.repeat,
              ...(updateData.repeat || {}),
            },
          }));
          return HttpResponse.json({ events: updatedEvents });
        })
      );

      const { result } = renderHook(() => useEventOperations(true));

      await act(() => Promise.resolve(null));

      await act(async () => {
        await result.current.updateRecurringEvents('repeat-id-1', {
          repeat: {
            type: 'daily',
            interval: 1,
            endDate: '2025-11-30',
          },
        });
      });

      expect(result.current.events[0].repeat.endDate).toBe('2025-11-30');
    });

    it('repeatId가 없을 때 에러를 처리한다', async () => {
      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      await act(async () => {
        await result.current.updateRecurringEvents('', { title: '새 제목' });
      });

      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정 수정 실패', { variant: 'error' });
    });

    it('API 실패 시 에러를 처리한다', async () => {
      server.use(
        http.put('/api/recurring-events/:repeatId', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      await act(async () => {
        await result.current.updateRecurringEvents('repeat-id-1', { title: '새 제목' });
      });

      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정 수정 실패', { variant: 'error' });
    });
  });

  describe('반복 일정 삭제 (deleteRecurringEvents)', () => {
    it('전체 반복 일정을 삭제한다', async () => {
      const mockEvents: Event[] = [
        createRecurringEvent('daily', { id: '1', date: '2025-10-01' }),
        createRecurringEvent('daily', { id: '2', date: '2025-10-02' }),
        createRecurringEvent('daily', { id: '3', date: '2025-10-03' }),
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/recurring-events/:repeatId', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { result } = renderHook(() => useEventOperations(true));

      await act(() => Promise.resolve(null));

      expect(result.current.events).toHaveLength(3);

      await act(async () => {
        await result.current.deleteRecurringEvents('repeat-id-1');
      });

      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정이 삭제되었습니다.', {
        variant: 'info',
      });
    });

    it('repeatId가 없을 때 에러를 처리한다', async () => {
      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      await act(async () => {
        await result.current.deleteRecurringEvents('');
      });

      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정 삭제 실패', { variant: 'error' });
    });

    it('API 실패 시 에러를 처리한다', async () => {
      server.use(
        http.delete('/api/recurring-events/:repeatId', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      await act(async () => {
        await result.current.deleteRecurringEvents('repeat-id-1');
      });

      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정 삭제 실패', { variant: 'error' });
    });
  });

  describe('단일 일정 수정/삭제 (반복 해제)', () => {
    it('단일 일정 수정 시 repeat.type이 none으로 변경된다', async () => {
      const mockEvents: Event[] = [
        createRecurringEvent('daily', {
          id: '1',
          date: '2025-10-01',
          title: '원래 제목',
        }),
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.put('/api/events/:id', async ({ request }) => {
          const updatedEvent = (await request.json()) as Event;
          return HttpResponse.json(updatedEvent);
        })
      );

      const { result } = renderHook(() => useEventOperations(true));

      await act(() => Promise.resolve(null));

      const originalEvent = result.current.events[0];

      const updatedEvent: Event = {
        ...originalEvent,
        title: '단일 수정된 제목',
        repeat: {
          type: 'none',
          interval: 0,
        },
      };

      await act(async () => {
        await result.current.saveEvent(updatedEvent);
      });

      expect(result.current.events[0].repeat.type).toBe('none');
      expect(result.current.events[0].repeat.id).toBeUndefined();
      expect(result.current.events[0].title).toBe('단일 수정된 제목');
    });
  });
});
