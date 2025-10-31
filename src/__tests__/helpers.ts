import { act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { getMockEvents, setMockEvents } from '../__mocks__/handlers';
import type { Event } from '../types';

/**
 * � 0T| \ �| h
 * act() �� Promise| resolveX� �t D� 0T�] h
 */
export const waitForHookInitialization = async () => {
  await act(() => Promise.resolve(null));
};

/**
 * MSW x��: � | �1 (POST /api/events-list)
 */
export const createRecurringEventsHandler = (repeatId: string) => {
  return http.post('/api/events-list', async ({ request }) => {
    const { events } = (await request.json()) as { events: Event[] };
    const currentEvents = getMockEvents();
    const startId = currentEvents.length + 1;
    const newEvents = events.map((event, index) => ({
      ...event,
      id: `event-${startId + index}`,
      repeat: {
        ...event.repeat,
        id: repeatId,
      },
    }));
    setMockEvents([...currentEvents, ...newEvents]);
    return HttpResponse.json({ events: newEvents }, { status: 201 });
  });
};

/**
 * MSW x��: � � |  (PUT /api/recurring-events/:repeatId)
 */
export const updateRecurringEventsHandler = () => {
  return http.put('/api/recurring-events/:repeatId', async ({ request, params }) => {
    const updateData = (await request.json()) as Partial<Event>;
    const { repeatId } = params;
    const currentEvents = getMockEvents();

    const updatedEvents = currentEvents.map((event) => {
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

    setMockEvents(updatedEvents);
    return HttpResponse.json({
      events: updatedEvents.filter((e) => e.repeat.id === repeatId),
    });
  });
};

/**
 * MSW x��: �| |  (PUT /api/events/:id)
 */
export const updateSingleEventHandler = () => {
  return http.put('/api/events/:id', async ({ params, request }) => {
    const { id } = params;
    const updatedEvent = (await request.json()) as Event;
    const currentEvents = getMockEvents();
    const index = currentEvents.findIndex((event) => event.id === id);

    if (index !== -1) {
      currentEvents[index] = { ...currentEvents[index], ...updatedEvent };
      setMockEvents([...currentEvents]);
      return HttpResponse.json(currentEvents[index]);
    }

    return new HttpResponse(null, { status: 404 });
  });
};

/**
 * MSW x��: � � | � (DELETE /api/recurring-events/:repeatId)
 */
export const deleteRecurringEventsHandler = () => {
  return http.delete('/api/recurring-events/:repeatId', () => {
    return new HttpResponse(null, { status: 204 });
  });
};

/**
 * MSW x��: �| | � (DELETE /api/events/:id)
 */
export const deleteSingleEventHandler = () => {
  return http.delete('/api/events/:id', ({ params }) => {
    const { id } = params;
    const currentEvents = getMockEvents();
    const filtered = currentEvents.filter((e) => e.id !== id);
    setMockEvents(filtered);
    return new HttpResponse(null, { status: 204 });
  });
};

/**
 * MSW x��: API �( ܬtX (500 ��)
 */
export const createFailureHandler = (method: 'post' | 'put' | 'delete', path: string) => {
  const httpMethod = http[method];
  return httpMethod(path, () => {
    return new HttpResponse(null, { status: 500 });
  });
};
