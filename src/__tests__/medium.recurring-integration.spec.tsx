import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import { UserEvent, userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';

import App from '../App';
import { server } from '../setupTests';
import type { Event, RepeatType } from '../types';

const theme = createTheme();

const setup = (element: ReactElement) => {
  const user = userEvent.setup();

  return {
    ...render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider>{element}</SnackbarProvider>
      </ThemeProvider>
    ),
    user,
  };
};

const saveRecurringSchedule = async (
  user: UserEvent,
  form: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    description: string;
    category: string;
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

describe('반복 일정 통합 테스트', () => {
  describe('반복 일정 생성', () => {
    it('반복 체크박스 활성화 시 반복 설정 UI 표시', async () => {
      const { user } = setup(<App />);

      await user.click(screen.getAllByText('일정 추가')[0]);

      expect(screen.queryByLabelText('반복 유형')).not.toBeInTheDocument();

      await user.click(screen.getByLabelText('반복 일정'));

      expect(screen.getByLabelText('반복 유형')).toBeInTheDocument();
      expect(screen.getByLabelText('반복 종료일')).toBeInTheDocument();
    });

    it('매일 반복 일정 생성 및 캘린더 표시', async () => {
      server.use(
        http.post('/api/events-list', async ({ request }) => {
          const { events } = (await request.json()) as { events: Event[] };
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
      });

      const monthView = within(screen.getByTestId('month-view'));
      const eventTitles = monthView.getAllByText('매일 스탠드업');
      expect(eventTitles).toHaveLength(7);

      const eventList = within(screen.getByTestId('event-list'));
      expect(eventList.getAllByText('매일 스탠드업')).toHaveLength(7);
      expect(eventList.getByText(/반복: 매일/)).toBeInTheDocument();
    });

    it('매주 반복 일정 생성 및 Repeat 아이콘 표시', async () => {
      server.use(
        http.post('/api/events-list', async ({ request }) => {
          const { events } = (await request.json()) as { events: Event[] };
          const repeatId = 'repeat-id-weekly';
          const newEvents = events.map((event, index) => ({
            ...event,
            id: `weekly-${index + 1}`,
            repeat: { ...event.repeat, id: repeatId },
          }));
          return HttpResponse.json({ events: newEvents }, { status: 201 });
        })
      );

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
      });

      const monthView = within(screen.getByTestId('month-view'));
      const eventTitles = monthView.getAllByText('주간 회의');
      expect(eventTitles.length).toBeGreaterThan(0);

      const repeatIcons = screen.getAllByTestId('RepeatIcon');
      expect(repeatIcons.length).toBeGreaterThan(0);
    });

    it('매월 반복 일정 생성 (31일 엣지 케이스)', async () => {
      vi.setSystemTime(new Date('2025-01-01'));

      server.use(
        http.post('/api/events-list', async ({ request }) => {
          const { events } = (await request.json()) as { events: Event[] };
          const repeatId = 'repeat-id-monthly';
          const newEvents = events.map((event, index) => ({
            ...event,
            id: `monthly-${index + 1}`,
            repeat: { ...event.repeat, id: repeatId },
          }));
          return HttpResponse.json({ events: newEvents }, { status: 201 });
        })
      );

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
      });

      const eventList = within(screen.getByTestId('event-list'));
      const eventTitles = eventList.getAllByText('월간 리뷰');
      expect(eventTitles.length).toBeLessThanOrEqual(4);
    });

    it('반복 종료일 유효성 검사 - 시작일보다 이전', async () => {
      const { user } = setup(<App />);

      await user.click(screen.getAllByText('일정 추가')[0]);

      await user.type(screen.getByLabelText('제목'), '테스트 일정');
      await user.type(screen.getByLabelText('날짜'), '2025-10-15');
      await user.type(screen.getByLabelText('시작 시간'), '09:00');
      await user.type(screen.getByLabelText('종료 시간'), '10:00');

      await user.click(screen.getByLabelText('반복 일정'));
      await user.type(screen.getByLabelText('반복 종료일'), '2025-10-10');

      await user.click(screen.getByTestId('event-submit-button'));

      expect(await screen.findByText('종료일은 시작일 이후여야 합니다.')).toBeInTheDocument();
    });

    it('반복 종료일 유효성 검사 - 2025-12-31 초과', async () => {
      const { user } = setup(<App />);

      await user.click(screen.getAllByText('일정 추가')[0]);

      await user.type(screen.getByLabelText('제목'), '테스트 일정');
      await user.type(screen.getByLabelText('날짜'), '2025-10-01');
      await user.type(screen.getByLabelText('시작 시간'), '09:00');
      await user.type(screen.getByLabelText('종료 시간'), '10:00');

      await user.click(screen.getByLabelText('반복 일정'));
      await user.type(screen.getByLabelText('반복 종료일'), '2026-01-01');

      await user.click(screen.getByTestId('event-submit-button'));

      expect(await screen.findByText('종료일은 2025-12-31 이하여야 합니다.')).toBeInTheDocument();
    });

    it('생성된 날짜가 0개일 때 에러 메시지', async () => {
      vi.setSystemTime(new Date('2024-02-29'));

      server.use(
        http.post('/api/events-list', async () => {
          return HttpResponse.json({ events: [] }, { status: 201 });
        })
      );

      const { user } = setup(<App />);

      await user.click(screen.getAllByText('일정 추가')[0]);

      await user.type(screen.getByLabelText('제목'), '윤년 테스트');
      await user.type(screen.getByLabelText('날짜'), '2024-02-29');
      await user.type(screen.getByLabelText('시작 시간'), '09:00');
      await user.type(screen.getByLabelText('종료 시간'), '10:00');
      await user.type(screen.getByLabelText('설명'), '윤년 일정');
      await user.type(screen.getByLabelText('위치'), '테스트');

      await user.click(screen.getByLabelText('카테고리'));
      await user.click(within(screen.getByLabelText('카테고리')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: '업무-option' }));

      await user.click(screen.getByLabelText('반복 일정'));

      await user.click(screen.getByLabelText('반복 유형'));
      await user.click(within(screen.getByLabelText('반복 유형')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'yearly-option' }));

      await user.type(screen.getByLabelText('반복 종료일'), '2025-12-31');

      await user.click(screen.getByTestId('event-submit-button'));

      expect(await screen.findByText('선택한 조건에 맞는 날짜가 없습니다.')).toBeInTheDocument();
    });
  });

  describe('반복 일정 표시', () => {
    it('주간 뷰에서 Repeat 아이콘 표시', async () => {
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              createRecurringEvent('weekly', {
                id: '1',
                date: '2025-10-01',
                title: '주간 회의',
              }),
            ],
          });
        })
      );

      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'week-option' }));

      const weekView = screen.getByTestId('week-view');
      expect(within(weekView).getByText('주간 회의')).toBeInTheDocument();
      expect(screen.getByTestId('RepeatIcon')).toBeInTheDocument();
    });

    it('월간 뷰에서 Repeat 아이콘 표시', async () => {
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
        })
      );

      setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      const monthView = screen.getByTestId('month-view');
      const repeatIcons = within(monthView).getAllByTestId('RepeatIcon');
      expect(repeatIcons.length).toBeGreaterThan(0);
    });

    it('일정 목록에서 반복 정보 표시', async () => {
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({
            events: [
              createRecurringEvent('daily', {
                id: '1',
                date: '2025-10-01',
                title: '매일 회의',
                repeat: {
                  type: 'daily',
                  interval: 1,
                  endDate: '2025-10-07',
                  id: 'repeat-id-1',
                },
              }),
            ],
          });
        })
      );

      setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      const eventList = screen.getByTestId('event-list');
      expect(within(eventList).getByText(/반복: 매일/)).toBeInTheDocument();
      expect(within(eventList).getByText(/종료: 2025-10-07/)).toBeInTheDocument();
    });
  });

  describe('반복 일정 수정', () => {
    it('수정 시 Dialog 표시 확인', async () => {
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

      await user.click(screen.getByLabelText('Edit event'));

      expect(await screen.findByText('반복 일정 수정')).toBeInTheDocument();
      expect(screen.getByText('해당 일정만 수정하시겠어요?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '예' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '아니오' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    });

    it('"예" 선택 - 단일 일정 수정 (반복 해제)', async () => {
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
        http.put('/api/events/:id', async ({ request }) => {
          const updatedEvent = (await request.json()) as Event;
          return HttpResponse.json(updatedEvent);
        })
      );

      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      const editButtons = screen.getAllByLabelText('Edit event');
      await user.click(editButtons[0]);

      await user.click(screen.getByRole('button', { name: '예' }));

      await user.clear(screen.getByLabelText('제목'));
      await user.type(screen.getByLabelText('제목'), '단일 수정된 회의');

      await user.click(screen.getByTestId('event-submit-button'));

      const eventList = within(screen.getByTestId('event-list'));
      expect(eventList.getByText('단일 수정된 회의')).toBeInTheDocument();
      expect(eventList.getByText('매일 회의')).toBeInTheDocument();
    });

    it('"아니오" 선택 - 전체 반복 일정 수정', async () => {
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
        http.put('/api/recurring-events/:repeatId', async () => {
          return HttpResponse.json({ updated: true });
        })
      );

      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      const editButtons = screen.getAllByLabelText('Edit event');
      await user.click(editButtons[0]);

      await user.click(screen.getByRole('button', { name: '아니오' }));

      await user.clear(screen.getByLabelText('제목'));
      await user.type(screen.getByLabelText('제목'), '전체 수정된 회의');

      await user.click(screen.getByTestId('event-submit-button'));

      const eventList = within(screen.getByTestId('event-list'));
      const updatedTitles = eventList.getAllByText('전체 수정된 회의');
      expect(updatedTitles).toHaveLength(2);
    });
  });

  describe('반복 일정 삭제', () => {
    it('삭제 시 Dialog 표시 확인', async () => {
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

      await user.click(screen.getByLabelText('Delete event'));

      expect(await screen.findByText('반복 일정 삭제')).toBeInTheDocument();
      expect(screen.getByText('해당 일정만 삭제하시겠어요?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '예' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '아니오' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    });

    it('"예" 선택 - 단일 일정 삭제', async () => {
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
        http.delete('/api/events/:id', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      const deleteButtons = screen.getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await user.click(screen.getByRole('button', { name: '예' }));

      const eventList = within(screen.getByTestId('event-list'));
      const remainingEvents = eventList.getAllByText('매일 회의');
      expect(remainingEvents).toHaveLength(1);
    });

    it('"아니오" 선택 - 전체 반복 일정 삭제', async () => {
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
        http.delete('/api/recurring-events/:repeatId', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      const deleteButtons = screen.getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await user.click(screen.getByRole('button', { name: '아니오' }));

      const eventList = within(screen.getByTestId('event-list'));
      expect(eventList.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
    });
  });
});
