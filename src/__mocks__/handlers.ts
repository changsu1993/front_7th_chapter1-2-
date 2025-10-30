import { http, HttpResponse } from 'msw';

import { events as initialEvents } from '../__mocks__/response/events.json' assert { type: 'json' };
import { Event } from '../types';

// 인메모리 이벤트 저장소 (테스트 간 공유됨)
let mockEvents: Event[] = [...(initialEvents as Event[])];

// 테스트에서 mockEvents에 접근 가능하도록 export
export const getMockEvents = () => mockEvents;
export const setMockEvents = (events: Event[]) => {
  mockEvents = events;
};
export const addMockEvents = (events: Event[]) => {
  mockEvents.push(...events);
};

// 테스트마다 초기화할 수 있도록 export
export const resetMockEvents = () => {
  mockEvents = [...(initialEvents as Event[])];
};

export const handlers = [
  http.get('/api/events', () => {
    return HttpResponse.json({ events: mockEvents });
  }),

  http.post('/api/events', async ({ request }) => {
    const newEvent = (await request.json()) as Event;
    newEvent.id = String(mockEvents.length + 1);
    mockEvents.push(newEvent);
    return HttpResponse.json(newEvent, { status: 201 });
  }),

  // 반복 일정 일괄 생성
  http.post('/api/events-list', async ({ request }) => {
    const { events: eventsToCreate } = (await request.json()) as { events: Event[] };
    const repeatId = `repeat-id-${Date.now()}`;
    const newEvents = eventsToCreate.map((event, index) => ({
      ...event,
      id: String(mockEvents.length + index + 1),
      repeat: {
        ...event.repeat,
        id: repeatId,
      },
    }));
    mockEvents.push(...newEvents);
    return HttpResponse.json({ events: newEvents }, { status: 201 });
  }),

  http.put('/api/events/:id', async ({ params, request }) => {
    const { id } = params;
    const updatedEvent = (await request.json()) as Event;
    const index = mockEvents.findIndex((event) => event.id === id);

    if (index !== -1) {
      mockEvents[index] = { ...mockEvents[index], ...updatedEvent };
      return HttpResponse.json(mockEvents[index]);
    }

    return new HttpResponse(null, { status: 404 });
  }),

  // 반복 일정 전체 수정
  http.put('/api/recurring-events/:repeatId', async ({ params, request }) => {
    const { repeatId } = params;
    const updateData = (await request.json()) as Partial<Event>;

    mockEvents = mockEvents.map((event) => {
      if (event.repeat.id === repeatId) {
        return {
          ...event,
          ...updateData,
          repeat: {
            ...event.repeat,
            ...(updateData.repeat || {}),
          },
        };
      }
      return event;
    });

    return HttpResponse.json({
      events: mockEvents.filter((event) => event.repeat.id === repeatId),
    });
  }),

  http.delete('/api/events/:id', ({ params }) => {
    const { id } = params;
    const index = mockEvents.findIndex((event) => event.id === id);

    if (index !== -1) {
      mockEvents.splice(index, 1);
      return new HttpResponse(null, { status: 204 });
    }

    return new HttpResponse(null, { status: 404 });
  }),

  // 반복 일정 전체 삭제
  http.delete('/api/recurring-events/:repeatId', ({ params }) => {
    const { repeatId } = params;
    const initialLength = mockEvents.length;

    mockEvents = mockEvents.filter((event) => event.repeat.id !== repeatId);

    if (mockEvents.length === initialLength) {
      return new HttpResponse(null, { status: 404 });
    }

    return new HttpResponse(null, { status: 204 });
  }),
];
