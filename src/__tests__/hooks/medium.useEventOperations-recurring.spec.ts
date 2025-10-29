/**
 * useEventOperations 훅 - 반복 일정 테스트
 *
 * 테스트 범위:
 * - 반복 일정 생성: POST /api/events-list 호출 확인
 * - 전체 반복 일정 수정: PUT /api/recurring-events/:repeatId 호출 확인
 * - 전체 반복 일정 삭제: DELETE /api/recurring-events/:repeatId 호출 확인
 * - API 에러 케이스: 네트워크 오류, repeatId 누락
 *
 * 관련 명세서: docs/feature-specs/recurring-events.md
 */

import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { useEventOperations } from '../../hooks/useEventOperations';
import { server } from '../../setupTests';
import { Event } from '../../types';

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
  describe('반복 일정 생성', () => {
    it('매주 반복 일정 생성 시 POST /api/events-list를 호출하고 생성된 일정들을 events에 추가한다', async () => {
      const mockRepeatId = 'repeat-123';
      const mockCreatedEvents: Event[] = [
        {
          id: '1',
          title: '매주 회의',
          date: '2025-10-01',
          startTime: '09:00',
          endTime: '10:00',
          description: '주간 회의',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-31', id: mockRepeatId },
          notificationTime: 10,
        },
        {
          id: '2',
          title: '매주 회의',
          date: '2025-10-08',
          startTime: '09:00',
          endTime: '10:00',
          description: '주간 회의',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-31', id: mockRepeatId },
          notificationTime: 10,
        },
        {
          id: '3',
          title: '매주 회의',
          date: '2025-10-15',
          startTime: '09:00',
          endTime: '10:00',
          description: '주간 회의',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-31', id: mockRepeatId },
          notificationTime: 10,
        },
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [] });
        }),
        http.post('/api/events-list', async ({ request }) => {
          const { events } = (await request.json()) as { events: Event[] };

          // 서버가 repeatId를 할당한다고 가정
          const eventsWithRepeatId = events.map((event, index) => ({
            ...event,
            id: String(index + 1),
            repeat: {
              ...event.repeat,
              id: mockRepeatId,
            },
          }));

          return HttpResponse.json({ events: eventsWithRepeatId }, { status: 201 });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      const recurringEventData: Event = {
        id: '',
        title: '매주 회의',
        date: '2025-10-01',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 회의',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1, endDate: '2025-10-31' },
        notificationTime: 10,
      };

      await act(async () => {
        await result.current.saveEvent(recurringEventData);
      });

      // 생성된 반복 일정이 events에 추가되었는지 확인
      expect(result.current.events).toHaveLength(3);
      expect(result.current.events[0].repeat.id).toBe(mockRepeatId);
      expect(result.current.events[1].repeat.id).toBe(mockRepeatId);
      expect(result.current.events[2].repeat.id).toBe(mockRepeatId);
      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정이 추가되었습니다.', {
        variant: 'success',
      });
    });

    it('매일 반복 일정 생성 시 POST /api/events-list를 호출하고 올바른 개수의 일정을 생성한다', async () => {
      const mockRepeatId = 'repeat-456';

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [] });
        }),
        http.post('/api/events-list', async ({ request }) => {
          const { events } = (await request.json()) as { events: Event[] };

          const eventsWithRepeatId = events.map((event, index) => ({
            ...event,
            id: String(index + 1),
            repeat: {
              ...event.repeat,
              id: mockRepeatId,
            },
          }));

          return HttpResponse.json({ events: eventsWithRepeatId }, { status: 201 });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      const recurringEventData: Event = {
        id: '',
        title: '매일 운동',
        date: '2025-10-01',
        startTime: '07:00',
        endTime: '08:00',
        description: '아침 운동',
        location: '헬스장',
        category: '개인',
        repeat: { type: 'daily', interval: 1, endDate: '2025-10-05' },
        notificationTime: 10,
      };

      await act(async () => {
        await result.current.saveEvent(recurringEventData);
      });

      // 10-01부터 10-05까지 5일
      expect(result.current.events).toHaveLength(5);
      expect(result.current.events.every((e) => e.repeat.id === mockRepeatId)).toBe(true);
    });

    it('반복 일정 생성 시 생성된 날짜가 0개이면 "선택한 조건에 맞는 날짜가 없습니다." 에러를 표시한다', async () => {
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [] });
        }),
        http.post('/api/events-list', async () => {
          return HttpResponse.json({ events: [] }, { status: 201 });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      // 2월 31일은 존재하지 않으므로 빈 배열 생성
      const recurringEventData: Event = {
        id: '',
        title: '불가능한 반복',
        date: '2025-02-31',
        startTime: '09:00',
        endTime: '10:00',
        description: '불가능한 날짜',
        location: '없음',
        category: '기타',
        repeat: { type: 'monthly', interval: 1, endDate: '2025-12-31' },
        notificationTime: 10,
      };

      await act(async () => {
        await result.current.saveEvent(recurringEventData);
      });

      expect(enqueueSnackbarFn).toHaveBeenCalledWith('선택한 조건에 맞는 날짜가 없습니다.', {
        variant: 'error',
      });
      expect(result.current.events).toHaveLength(0);
    });

    it('반복 일정 생성 API 실패 시 "일정 저장 실패" 에러를 표시한다', async () => {
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [] });
        }),
        http.post('/api/events-list', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      const recurringEventData: Event = {
        id: '',
        title: '매주 회의',
        date: '2025-10-01',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 회의',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1, endDate: '2025-10-31' },
        notificationTime: 10,
      };

      await act(async () => {
        await result.current.saveEvent(recurringEventData);
      });

      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정 저장 실패', { variant: 'error' });
      expect(result.current.events).toHaveLength(0);
    });
  });

  describe('전체 반복 일정 수정', () => {
    it('PUT /api/recurring-events/:repeatId를 호출하여 전체 반복 일정을 수정한다', async () => {
      const mockRepeatId = 'repeat-789';
      const mockEvents: Event[] = [
        {
          id: '1',
          title: '원래 제목',
          date: '2025-10-01',
          startTime: '09:00',
          endTime: '10:00',
          description: '원래 설명',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-31', id: mockRepeatId },
          notificationTime: 10,
        },
        {
          id: '2',
          title: '원래 제목',
          date: '2025-10-08',
          startTime: '09:00',
          endTime: '10:00',
          description: '원래 설명',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-31', id: mockRepeatId },
          notificationTime: 10,
        },
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.put(`/api/recurring-events/${mockRepeatId}`, async ({ request }) => {
          const updateData = (await request.json()) as Partial<Event>;

          // 동일한 repeatId를 가진 모든 이벤트 업데이트
          mockEvents.forEach((event) => {
            if (event.repeat.id === mockRepeatId) {
              Object.assign(event, updateData);
            }
          });

          return HttpResponse.json({ updated: true });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      expect(result.current.events).toHaveLength(2);

      const updateData = {
        title: '수정된 제목',
        description: '수정된 설명',
      };

      await act(async () => {
        await result.current.updateRecurringEvents(mockRepeatId, updateData);
      });

      await act(() => Promise.resolve(null));

      expect(result.current.events[0].title).toBe('수정된 제목');
      expect(result.current.events[1].title).toBe('수정된 제목');
      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정이 수정되었습니다.', {
        variant: 'success',
      });
    });

    it('전체 반복 일정 수정 API 실패 시 "일정 수정 실패" 에러를 표시한다', async () => {
      const mockRepeatId = 'repeat-999';

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [] });
        }),
        http.put(`/api/recurring-events/${mockRepeatId}`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      const updateData = {
        title: '수정된 제목',
      };

      await act(async () => {
        await result.current.updateRecurringEvents(mockRepeatId, updateData);
      });

      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정 수정 실패', { variant: 'error' });
    });

    it('repeatId가 없는 경우 콘솔 에러와 함께 "일정 수정 실패" 에러를 표시한다', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [] });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      await act(async () => {
        await result.current.updateRecurringEvents('', { title: '제목' });
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정 수정 실패', { variant: 'error' });

      consoleSpy.mockRestore();
    });
  });

  describe('전체 반복 일정 삭제', () => {
    it('DELETE /api/recurring-events/:repeatId를 호출하여 전체 반복 일정을 삭제한다', async () => {
      const mockRepeatId = 'repeat-delete-123';
      const mockEvents: Event[] = [
        {
          id: '1',
          title: '삭제할 반복 일정',
          date: '2025-10-01',
          startTime: '09:00',
          endTime: '10:00',
          description: '설명',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-31', id: mockRepeatId },
          notificationTime: 10,
        },
        {
          id: '2',
          title: '삭제할 반복 일정',
          date: '2025-10-08',
          startTime: '09:00',
          endTime: '10:00',
          description: '설명',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-31', id: mockRepeatId },
          notificationTime: 10,
        },
        {
          id: '3',
          title: '유지할 일정',
          date: '2025-10-15',
          startTime: '11:00',
          endTime: '12:00',
          description: '다른 일정',
          location: '회의실 B',
          category: '개인',
          repeat: { type: 'none', interval: 0 },
          notificationTime: 10,
        },
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: mockEvents.filter((e) => e.repeat.id !== mockRepeatId),
          });
        }),
        http.delete(`/api/recurring-events/${mockRepeatId}`, () => {
          const remainingEvents = mockEvents.filter((e) => e.repeat.id !== mockRepeatId);
          mockEvents.length = 0;
          mockEvents.push(...remainingEvents);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      // 초기 상태: 3개의 이벤트
      expect(result.current.events).toHaveLength(3);

      await act(async () => {
        await result.current.deleteRecurringEvents(mockRepeatId);
      });

      await act(() => Promise.resolve(null));

      // 삭제 후: repeatId가 같은 2개 삭제, 1개만 남음
      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].title).toBe('유지할 일정');
      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정이 삭제되었습니다.', {
        variant: 'success',
      });
    });

    it('전체 반복 일정 삭제 API 실패 시 "일정 삭제 실패" 에러를 표시한다', async () => {
      const mockRepeatId = 'repeat-fail';

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [] });
        }),
        http.delete(`/api/recurring-events/${mockRepeatId}`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      await act(async () => {
        await result.current.deleteRecurringEvents(mockRepeatId);
      });

      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정 삭제 실패', { variant: 'error' });
    });

    it('repeatId가 없는 경우 콘솔 에러와 함께 "일정 삭제 실패" 에러를 표시한다', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [] });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      await act(async () => {
        await result.current.deleteRecurringEvents('');
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정 삭제 실패', { variant: 'error' });

      consoleSpy.mockRestore();
    });
  });

  describe('단일 일정 수정 (반복 해제)', () => {
    it('반복 일정 중 하나를 수정하면 해당 일정만 repeat.type이 none으로 변경되고 repeatId가 제거된다', async () => {
      const mockRepeatId = 'repeat-single-edit';
      const mockEvents: Event[] = [
        {
          id: '1',
          title: '반복 일정',
          date: '2025-10-01',
          startTime: '09:00',
          endTime: '10:00',
          description: '설명',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-31', id: mockRepeatId },
          notificationTime: 10,
        },
        {
          id: '2',
          title: '반복 일정',
          date: '2025-10-08',
          startTime: '09:00',
          endTime: '10:00',
          description: '설명',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-31', id: mockRepeatId },
          notificationTime: 10,
        },
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.put('/api/events/:id', async ({ params, request }) => {
          const { id } = params;
          const updatedEvent = (await request.json()) as Event;
          const index = mockEvents.findIndex((event) => event.id === id);

          mockEvents[index] = { ...mockEvents[index], ...updatedEvent };
          return HttpResponse.json(mockEvents[index]);
        })
      );

      const { result } = renderHook(() => useEventOperations(true));

      await act(() => Promise.resolve(null));

      const updatedEvent: Event = {
        ...mockEvents[0],
        title: '수정된 단일 일정',
        repeat: { type: 'none', interval: 0 }, // 반복 해제
      };

      await act(async () => {
        await result.current.saveEvent(updatedEvent);
      });

      expect(result.current.events[0].title).toBe('수정된 단일 일정');
      expect(result.current.events[0].repeat.type).toBe('none');
      expect(result.current.events[0].repeat.id).toBeUndefined();

      // 두 번째 일정은 그대로 유지
      expect(result.current.events[1].title).toBe('반복 일정');
      expect(result.current.events[1].repeat.type).toBe('weekly');
      expect(result.current.events[1].repeat.id).toBe(mockRepeatId);
    });
  });

  describe('단일 일정 삭제', () => {
    it('반복 일정 중 하나를 삭제하면 해당 일정만 삭제되고 나머지는 유지된다', async () => {
      const mockRepeatId = 'repeat-single-delete';
      const mockEvents: Event[] = [
        {
          id: '1',
          title: '반복 일정',
          date: '2025-10-01',
          startTime: '09:00',
          endTime: '10:00',
          description: '설명',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-31', id: mockRepeatId },
          notificationTime: 10,
        },
        {
          id: '2',
          title: '반복 일정',
          date: '2025-10-08',
          startTime: '09:00',
          endTime: '10:00',
          description: '설명',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-31', id: mockRepeatId },
          notificationTime: 10,
        },
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/events/:id', ({ params }) => {
          const { id } = params;
          const index = mockEvents.findIndex((event) => event.id === id);

          mockEvents.splice(index, 1);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { result } = renderHook(() => useEventOperations(false));

      await act(() => Promise.resolve(null));

      expect(result.current.events).toHaveLength(2);

      await act(async () => {
        await result.current.deleteEvent('1');
      });

      await act(() => Promise.resolve(null));

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].id).toBe('2');
      expect(result.current.events[0].repeat.id).toBe(mockRepeatId);
    });
  });
});
