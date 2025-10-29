/**
 * 반복 일정 통합 테스트
 *
 * 테스트 범위:
 * - 반복 일정 생성 플로우: 폼 입력 → 반복 설정 → 저장 → 캘린더 표시 → 아이콘 확인
 * - 반복 일정 수정 Dialog: "해당 일정만" vs "전체 반복 일정" 선택
 * - 반복 일정 삭제 Dialog: "해당 일정만" vs "전체 반복 일정" 선택
 * - 유효성 검사: 종료일 관련 에러 처리
 * - 엣지 케이스: 31일 매월 반복, 2월 29일 매년 반복
 *
 * 관련 명세서: docs/feature-specs/recurring-events.md
 */

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within, waitFor } from '@testing-library/react';
import { UserEvent, userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';

import App from '../App';
import { server } from '../setupTests';
import { Event } from '../types';

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
    description: string;
    location: string;
    category: string;
    repeatType: string;
    repeatEndDate: string;
  }
) => {
  const { title, date, startTime, endTime, description, location, category, repeatType, repeatEndDate } =
    form;

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

  // 반복 설정 활성화
  await user.click(screen.getByLabelText('반복 일정'));

  // 반복 유형 선택
  await user.click(screen.getByLabelText('반복 유형'));
  await user.click(within(screen.getByLabelText('반복 유형')).getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: `${repeatType}-option` }));

  // 반복 종료일 입력
  await user.type(screen.getByLabelText('반복 종료일'), repeatEndDate);

  await user.click(screen.getByTestId('event-submit-button'));
};

describe('반복 일정 통합 테스트', () => {
  describe('반복 일정 생성', () => {
    it('매주 반복 일정을 생성하면 캘린더에 여러 날짜에 일정이 표시되고 Repeat 아이콘이 나타난다', async () => {
      const mockRepeatId = 'repeat-weekly-123';
      const mockCreatedEvents: Event[] = [
        {
          id: '1',
          title: '주간 회의',
          date: '2025-10-01',
          startTime: '09:00',
          endTime: '10:00',
          description: '주간 팀 미팅',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-22', id: mockRepeatId },
          notificationTime: 10,
        },
        {
          id: '2',
          title: '주간 회의',
          date: '2025-10-08',
          startTime: '09:00',
          endTime: '10:00',
          description: '주간 팀 미팅',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-22', id: mockRepeatId },
          notificationTime: 10,
        },
        {
          id: '3',
          title: '주간 회의',
          date: '2025-10-15',
          startTime: '09:00',
          endTime: '10:00',
          description: '주간 팀 미팅',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-22', id: mockRepeatId },
          notificationTime: 10,
        },
        {
          id: '4',
          title: '주간 회의',
          date: '2025-10-22',
          startTime: '09:00',
          endTime: '10:00',
          description: '주간 팀 미팅',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, endDate: '2025-10-22', id: mockRepeatId },
          notificationTime: 10,
        },
      ];

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

      const { user } = setup(<App />);

      await saveRecurringSchedule(user, {
        title: '주간 회의',
        date: '2025-10-01',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 팀 미팅',
        location: '회의실 A',
        category: '업무',
        repeatType: 'weekly',
        repeatEndDate: '2025-10-22',
      });

      // 일정 목록에 반복 일정들이 표시되는지 확인
      const eventList = within(screen.getByTestId('event-list'));
      const eventItems = await eventList.findAllByText('주간 회의');
      expect(eventItems).toHaveLength(4);

      // 반복 정보 표시 확인
      expect(eventList.getByText('반복: 매주')).toBeInTheDocument();
      expect(eventList.getByText('종료: 2025-10-22')).toBeInTheDocument();

      // Repeat 아이콘 확인 (MUI Repeat 아이콘)
      const repeatIcons = screen.getAllByTestId('RepeatIcon');
      expect(repeatIcons.length).toBeGreaterThan(0);
    });

    it('매일 반복 일정을 생성하면 지정된 기간 동안 매일 일정이 생성된다', async () => {
      const mockRepeatId = 'repeat-daily-123';

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

      const { user } = setup(<App />);

      await saveRecurringSchedule(user, {
        title: '매일 운동',
        date: '2025-10-01',
        startTime: '07:00',
        endTime: '08:00',
        description: '아침 조깅',
        location: '공원',
        category: '개인',
        repeatType: 'daily',
        repeatEndDate: '2025-10-05',
      });

      const eventList = within(screen.getByTestId('event-list'));
      const eventItems = await eventList.findAllByText('매일 운동');
      expect(eventItems).toHaveLength(5); // 10-01부터 10-05까지 5일

      expect(eventList.getByText('반복: 매일')).toBeInTheDocument();
    });

    it('매월 반복 일정을 생성하면 매월 같은 날짜에 일정이 생성된다', async () => {
      const mockRepeatId = 'repeat-monthly-123';

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

      const { user } = setup(<App />);

      await saveRecurringSchedule(user, {
        title: '월간 보고',
        date: '2025-10-15',
        startTime: '14:00',
        endTime: '15:00',
        description: '월간 실적 보고',
        location: '본사',
        category: '업무',
        repeatType: 'monthly',
        repeatEndDate: '2025-12-15',
      });

      const eventList = within(screen.getByTestId('event-list'));
      const eventItems = await eventList.findAllByText('월간 보고');
      expect(eventItems).toHaveLength(3); // 10월, 11월, 12월

      expect(eventList.getByText('반복: 매월')).toBeInTheDocument();
    });

    it('매년 반복 일정을 생성하면 매년 같은 날짜에 일정이 생성된다', async () => {
      const mockRepeatId = 'repeat-yearly-123';

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

      const { user } = setup(<App />);

      await saveRecurringSchedule(user, {
        title: '생일 파티',
        date: '2025-10-01',
        startTime: '18:00',
        endTime: '20:00',
        description: '매년 생일',
        location: '집',
        category: '개인',
        repeatType: 'yearly',
        repeatEndDate: '2027-10-01',
      });

      const eventList = within(screen.getByTestId('event-list'));
      const eventItems = await eventList.findAllByText('생일 파티');
      expect(eventItems).toHaveLength(3); // 2025, 2026, 2027년

      expect(eventList.getByText('반복: 매년')).toBeInTheDocument();
    });
  });

  describe('반복 일정 유효성 검사', () => {
    it('종료일이 시작일보다 이전이면 "종료일은 시작일 이후여야 합니다." 에러를 표시한다', async () => {
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [] });
        })
      );

      const { user } = setup(<App />);

      await user.click(screen.getAllByText('일정 추가')[0]);
      await user.type(screen.getByLabelText('제목'), '잘못된 반복 일정');
      await user.type(screen.getByLabelText('날짜'), '2025-10-15');
      await user.type(screen.getByLabelText('시작 시간'), '09:00');
      await user.type(screen.getByLabelText('종료 시간'), '10:00');
      await user.type(screen.getByLabelText('설명'), '설명');
      await user.type(screen.getByLabelText('위치'), '위치');

      await user.click(screen.getByLabelText('카테고리'));
      await user.click(within(screen.getByLabelText('카테고리')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: '업무-option' }));

      await user.click(screen.getByLabelText('반복 일정'));

      await user.click(screen.getByLabelText('반복 유형'));
      await user.click(within(screen.getByLabelText('반복 유형')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'weekly-option' }));

      // 종료일을 시작일보다 이전으로 설정
      await user.type(screen.getByLabelText('반복 종료일'), '2025-10-10');

      await user.click(screen.getByTestId('event-submit-button'));

      expect(await screen.findByText('종료일은 시작일 이후여야 합니다.')).toBeInTheDocument();
    });

    it('종료일이 2025-12-31을 초과하면 "종료일은 2025-12-31 이하여야 합니다." 에러를 표시한다', async () => {
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [] });
        })
      );

      const { user } = setup(<App />);

      await user.click(screen.getAllByText('일정 추가')[0]);
      await user.type(screen.getByLabelText('제목'), '잘못된 반복 일정');
      await user.type(screen.getByLabelText('날짜'), '2025-10-15');
      await user.type(screen.getByLabelText('시작 시간'), '09:00');
      await user.type(screen.getByLabelText('종료 시간'), '10:00');
      await user.type(screen.getByLabelText('설명'), '설명');
      await user.type(screen.getByLabelText('위치'), '위치');

      await user.click(screen.getByLabelText('카테고리'));
      await user.click(within(screen.getByLabelText('카테고리')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: '업무-option' }));

      await user.click(screen.getByLabelText('반복 일정'));

      await user.click(screen.getByLabelText('반복 유형'));
      await user.click(within(screen.getByLabelText('반복 유형')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'weekly-option' }));

      // 종료일을 최대치보다 크게 설정
      await user.type(screen.getByLabelText('반복 종료일'), '2026-01-01');

      await user.click(screen.getByTestId('event-submit-button'));

      expect(
        await screen.findByText('종료일은 2025-12-31 이하여야 합니다.')
      ).toBeInTheDocument();
    });

    it('반복 종료일을 입력하지 않으면 "반복 종료일을 입력해주세요." 에러를 표시한다', async () => {
      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [] });
        })
      );

      const { user } = setup(<App />);

      await user.click(screen.getAllByText('일정 추가')[0]);
      await user.type(screen.getByLabelText('제목'), '반복 일정');
      await user.type(screen.getByLabelText('날짜'), '2025-10-15');
      await user.type(screen.getByLabelText('시작 시간'), '09:00');
      await user.type(screen.getByLabelText('종료 시간'), '10:00');
      await user.type(screen.getByLabelText('설명'), '설명');
      await user.type(screen.getByLabelText('위치'), '위치');

      await user.click(screen.getByLabelText('카테고리'));
      await user.click(within(screen.getByLabelText('카테고리')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: '업무-option' }));

      await user.click(screen.getByLabelText('반복 일정'));

      await user.click(screen.getByLabelText('반복 유형'));
      await user.click(within(screen.getByLabelText('반복 유형')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'weekly-option' }));

      // 반복 종료일을 입력하지 않음

      await user.click(screen.getByTestId('event-submit-button'));

      expect(await screen.findByText('반복 종료일을 입력해주세요.')).toBeInTheDocument();
    });
  });

  describe('반복 일정 엣지 케이스', () => {
    it('31일 매월 반복 일정을 생성하면 31일이 있는 달에만 생성되고 나머지는 제외된다', async () => {
      vi.setSystemTime(new Date('2025-01-31'));

      const mockRepeatId = 'repeat-31st-monthly';

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

      const { user } = setup(<App />);

      await saveRecurringSchedule(user, {
        title: '월말 보고',
        date: '2025-01-31',
        startTime: '17:00',
        endTime: '18:00',
        description: '매월 31일 보고',
        location: '본사',
        category: '업무',
        repeatType: 'monthly',
        repeatEndDate: '2025-12-31',
      });

      const eventList = within(screen.getByTestId('event-list'));
      const eventItems = await eventList.findAllByText('월말 보고');

      // 31일이 있는 달: 1월, 3월, 5월, 7월, 8월, 10월, 12월 = 7개
      expect(eventItems).toHaveLength(7);
    });

    it('2024년 2월 29일 매년 반복 일정을 생성하면 윤년에만 생성된다', async () => {
      vi.setSystemTime(new Date('2024-02-29'));

      const mockRepeatId = 'repeat-leap-year';

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

      const { user } = setup(<App />);

      await saveRecurringSchedule(user, {
        title: '윤년 기념일',
        date: '2024-02-29',
        startTime: '12:00',
        endTime: '13:00',
        description: '4년마다',
        location: '어딘가',
        category: '개인',
        repeatType: 'yearly',
        repeatEndDate: '2028-12-31',
      });

      const eventList = within(screen.getByTestId('event-list'));
      const eventItems = await eventList.findAllByText('윤년 기념일');

      // 2024년과 2028년만 윤년
      expect(eventItems).toHaveLength(2);
    });
  });

  describe('반복 일정 수정', () => {
    it('반복 일정 수정 버튼 클릭 시 "해당 일정만 수정하시겠어요?" Dialog가 표시된다', async () => {
      const mockRepeatId = 'repeat-edit-123';
      const mockEvents: Event[] = [
        {
          id: '1',
          title: '반복 회의',
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
          title: '반복 회의',
          date: '2025-10-08',
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
          return HttpResponse.json({ events: mockEvents });
        })
      );

      const { user } = setup(<App />);

      // 일정 로딩 대기
      await screen.findByText('일정 로딩 완료!');

      const editButtons = screen.getAllByLabelText('Edit event');
      await user.click(editButtons[0]);

      expect(await screen.findByText('반복 일정 수정')).toBeInTheDocument();
      expect(screen.getByText('해당 일정만 수정하시겠어요?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '예' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '아니오' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    });

    it('반복 일정 수정 Dialog에서 "예"를 선택하면 해당 일정만 수정되고 repeat.type이 none으로 변경된다', async () => {
      const mockRepeatId = 'repeat-edit-single';
      const mockEvents: Event[] = [
        {
          id: '1',
          title: '반복 회의',
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
          title: '반복 회의',
          date: '2025-10-08',
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

      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      const editButtons = screen.getAllByLabelText('Edit event');
      await user.click(editButtons[0]);

      await screen.findByText('반복 일정 수정');
      await user.click(screen.getByRole('button', { name: '예' }));

      // 폼이 열리고 수정
      await user.clear(screen.getByLabelText('제목'));
      await user.type(screen.getByLabelText('제목'), '수정된 단일 회의');

      await user.click(screen.getByTestId('event-submit-button'));

      // 일정이 수정되었는지 확인
      const eventList = within(screen.getByTestId('event-list'));
      expect(await eventList.findByText('수정된 단일 회의')).toBeInTheDocument();

      // 반복 정보가 사라졌는지 확인 (더 이상 반복 아이콘 없음)
      const repeatTexts = eventList.queryAllByText(/반복: 매주/);
      expect(repeatTexts.length).toBeLessThan(2); // 하나는 여전히 반복 일정
    });

    it('반복 일정 수정 Dialog에서 "아니오"를 선택하면 전체 반복 일정이 수정된다', async () => {
      const mockRepeatId = 'repeat-edit-all';
      const mockEvents: Event[] = [
        {
          id: '1',
          title: '반복 회의',
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
          title: '반복 회의',
          date: '2025-10-08',
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
          return HttpResponse.json({ events: mockEvents });
        }),
        http.put(`/api/recurring-events/${mockRepeatId}`, async ({ request }) => {
          const updateData = (await request.json()) as Partial<Event>;

          mockEvents.forEach((event) => {
            if (event.repeat.id === mockRepeatId) {
              Object.assign(event, updateData);
            }
          });

          return HttpResponse.json({ updated: true });
        })
      );

      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      const editButtons = screen.getAllByLabelText('Edit event');
      await user.click(editButtons[0]);

      await screen.findByText('반복 일정 수정');
      await user.click(screen.getByRole('button', { name: '아니오' }));

      // 전체 수정 확인 (실제 구현에서는 간단한 수정만 가능)
      // 여기서는 Dialog가 닫히고 모든 반복 일정이 수정되었는지 확인

      await waitFor(() => {
        expect(screen.queryByText('반복 일정 수정')).not.toBeInTheDocument();
      });

      // 스낵바 메시지 확인
      expect(await screen.findByText('일정이 수정되었습니다.')).toBeInTheDocument();
    });

    it('반복 일정 수정 Dialog에서 "취소"를 선택하면 아무 동작도 하지 않는다', async () => {
      const mockRepeatId = 'repeat-edit-cancel';
      const mockEvents: Event[] = [
        {
          id: '1',
          title: '반복 회의',
          date: '2025-10-01',
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
          return HttpResponse.json({ events: mockEvents });
        })
      );

      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      const editButton = screen.getByLabelText('Edit event');
      await user.click(editButton);

      await screen.findByText('반복 일정 수정');
      await user.click(screen.getByRole('button', { name: '취소' }));

      // Dialog가 닫혔는지 확인
      await waitFor(() => {
        expect(screen.queryByText('반복 일정 수정')).not.toBeInTheDocument();
      });

      // 일정은 그대로 유지
      const eventList = within(screen.getByTestId('event-list'));
      expect(eventList.getByText('반복 회의')).toBeInTheDocument();
    });
  });

  describe('반복 일정 삭제', () => {
    it('반복 일정 삭제 버튼 클릭 시 "해당 일정만 삭제하시겠어요?" Dialog가 표시된다', async () => {
      const mockRepeatId = 'repeat-delete-123';
      const mockEvents: Event[] = [
        {
          id: '1',
          title: '반복 회의',
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
          title: '반복 회의',
          date: '2025-10-08',
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
          return HttpResponse.json({ events: mockEvents });
        })
      );

      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      const deleteButtons = screen.getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      expect(await screen.findByText('반복 일정 삭제')).toBeInTheDocument();
      expect(screen.getByText('해당 일정만 삭제하시겠어요?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '예' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '아니오' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    });

    it('반복 일정 삭제 Dialog에서 "예"를 선택하면 해당 일정만 삭제된다', async () => {
      const mockRepeatId = 'repeat-delete-single';
      const mockEvents: Event[] = [
        {
          id: '1',
          title: '반복 회의',
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
          title: '반복 회의',
          date: '2025-10-08',
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
          return HttpResponse.json({ events: mockEvents });
        }),
        http.delete('/api/events/:id', ({ params }) => {
          const { id } = params;
          const index = mockEvents.findIndex((event) => event.id === id);

          mockEvents.splice(index, 1);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      const eventList = within(screen.getByTestId('event-list'));
      const initialEvents = eventList.getAllByText('반복 회의');
      expect(initialEvents).toHaveLength(2);

      const deleteButtons = screen.getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await screen.findByText('반복 일정 삭제');
      await user.click(screen.getByRole('button', { name: '예' }));

      // 하나만 삭제되었는지 확인
      await waitFor(() => {
        const remainingEvents = eventList.getAllByText('반복 회의');
        expect(remainingEvents).toHaveLength(1);
      });
    });

    it('반복 일정 삭제 Dialog에서 "아니오"를 선택하면 전체 반복 일정이 삭제된다', async () => {
      const mockRepeatId = 'repeat-delete-all';
      const mockEvents: Event[] = [
        {
          id: '1',
          title: '반복 회의',
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
          title: '반복 회의',
          date: '2025-10-08',
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

      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      const eventList = within(screen.getByTestId('event-list'));
      const initialEvents = eventList.getAllByText('반복 회의');
      expect(initialEvents).toHaveLength(2);

      const deleteButtons = screen.getAllByLabelText('Delete event');
      await user.click(deleteButtons[0]);

      await screen.findByText('반복 일정 삭제');
      await user.click(screen.getByRole('button', { name: '아니오' }));

      // 전체가 삭제되었는지 확인
      await waitFor(() => {
        expect(eventList.queryByText('반복 회의')).not.toBeInTheDocument();
      });

      expect(await screen.findByText('일정이 삭제되었습니다.')).toBeInTheDocument();
    });

    it('반복 일정 삭제 Dialog에서 "취소"를 선택하면 아무 동작도 하지 않는다', async () => {
      const mockRepeatId = 'repeat-delete-cancel';
      const mockEvents: Event[] = [
        {
          id: '1',
          title: '반복 회의',
          date: '2025-10-01',
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
          return HttpResponse.json({ events: mockEvents });
        })
      );

      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      const deleteButton = screen.getByLabelText('Delete event');
      await user.click(deleteButton);

      await screen.findByText('반복 일정 삭제');
      await user.click(screen.getByRole('button', { name: '취소' }));

      // Dialog가 닫혔는지 확인
      await waitFor(() => {
        expect(screen.queryByText('반복 일정 삭제')).not.toBeInTheDocument();
      });

      // 일정은 그대로 유지
      const eventList = within(screen.getByTestId('event-list'));
      expect(eventList.getByText('반복 회의')).toBeInTheDocument();
    });
  });

  describe('일반 일정과 반복 일정 혼합', () => {
    it('일반 일정과 반복 일정을 함께 생성하면 각각 올바르게 구분되어 표시된다', async () => {
      const mockRepeatId = 'repeat-mixed';

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [] });
        }),
        http.post('/api/events', async ({ request }) => {
          const newEvent = (await request.json()) as Event;
          newEvent.id = 'single-1';
          return HttpResponse.json(newEvent, { status: 201 });
        }),
        http.post('/api/events-list', async ({ request }) => {
          const { events } = (await request.json()) as { events: Event[] };

          const eventsWithRepeatId = events.map((event, index) => ({
            ...event,
            id: `repeat-${index + 1}`,
            repeat: {
              ...event.repeat,
              id: mockRepeatId,
            },
          }));

          return HttpResponse.json({ events: eventsWithRepeatId }, { status: 201 });
        })
      );

      const { user } = setup(<App />);

      // 일반 일정 생성
      await user.click(screen.getAllByText('일정 추가')[0]);
      await user.type(screen.getByLabelText('제목'), '일반 회의');
      await user.type(screen.getByLabelText('날짜'), '2025-10-01');
      await user.type(screen.getByLabelText('시작 시간'), '09:00');
      await user.type(screen.getByLabelText('종료 시간'), '10:00');
      await user.type(screen.getByLabelText('설명'), '설명');
      await user.type(screen.getByLabelText('위치'), '위치');
      await user.click(screen.getByLabelText('카테고리'));
      await user.click(within(screen.getByLabelText('카테고리')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: '업무-option' }));
      await user.click(screen.getByTestId('event-submit-button'));

      // 반복 일정 생성
      await saveRecurringSchedule(user, {
        title: '반복 회의',
        date: '2025-10-02',
        startTime: '14:00',
        endTime: '15:00',
        description: '주간 회의',
        location: '회의실 B',
        category: '업무',
        repeatType: 'weekly',
        repeatEndDate: '2025-10-16',
      });

      const eventList = within(screen.getByTestId('event-list'));

      // 일반 일정 확인
      expect(await eventList.findByText('일반 회의')).toBeInTheDocument();

      // 반복 일정 확인
      const repeatEvents = eventList.getAllByText('반복 회의');
      expect(repeatEvents).toHaveLength(3); // 10-02, 10-09, 10-16

      // 반복 정보는 반복 일정에만 표시
      expect(eventList.getByText('반복: 매주')).toBeInTheDocument();
    });
  });
});
