import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';

import { generateRepeatDates } from '../utils/repeatUtils';
import { Event, EventForm } from '../types';

export const useEventOperations = (editing: boolean, onSave?: () => void) => {
  const [events, setEvents] = useState<Event[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const { events } = await response.json();
      setEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      enqueueSnackbar('이벤트 로딩 실패', { variant: 'error' });
    }
  };

  const saveRecurringEvents = async (eventFormData: EventForm) => {
    try {
      if (
        !eventFormData.repeat ||
        eventFormData.repeat.type === 'none' ||
        !eventFormData.repeat.endDate
      ) {
        throw new Error('Invalid repeat data');
      }

      const dates = generateRepeatDates(
        eventFormData.date,
        eventFormData.repeat.endDate,
        eventFormData.repeat.type
      );

      if (dates.length === 0) {
        enqueueSnackbar('선택한 조건에 맞는 날짜가 없습니다.', { variant: 'error' });
        return;
      }

      const eventsToCreate = dates.map((date) => ({
        ...eventFormData,
        date,
      }));

      const response = await fetch('/api/events-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToCreate }),
      });

      if (!response.ok) {
        throw new Error('Failed to save recurring events');
      }

      await fetchEvents();
      onSave?.();
      enqueueSnackbar('일정이 추가되었습니다.', { variant: 'success' });
    } catch (error) {
      console.error('Error saving recurring events:', error);
      enqueueSnackbar('일정 저장 실패', { variant: 'error' });
    }
  };

  const saveEvent = async (eventData: Event | EventForm) => {
    try {
      // 반복 일정 생성인 경우 확인
      const isRecurring =
        !editing &&
        'repeat' in eventData &&
        eventData.repeat.type !== 'none' &&
        eventData.repeat.endDate;

      if (isRecurring) {
        await saveRecurringEvents(eventData as EventForm);
        return;
      }

      let response;
      if (editing) {
        response = await fetch(`/api/events/${(eventData as Event).id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
      } else {
        response = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save event');
      }

      await fetchEvents();
      onSave?.();
      enqueueSnackbar(editing ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.', {
        variant: 'success',
      });
    } catch (error) {
      console.error('Error saving event:', error);
      enqueueSnackbar('일정 저장 실패', { variant: 'error' });
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      await fetchEvents();
      enqueueSnackbar('일정이 삭제되었습니다.', { variant: 'info' });
    } catch (error) {
      console.error('Error deleting event:', error);
      enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
    }
  };

  const updateRecurringEvents = async (
    repeatId: string,
    updateData: Partial<Event>
  ): Promise<void> => {
    try {
      if (!repeatId) {
        throw new Error('repeatId is required');
      }

      const response = await fetch(`/api/recurring-events/${repeatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update recurring events');
      }

      await fetchEvents();
      enqueueSnackbar('일정이 수정되었습니다.', { variant: 'success' });
    } catch (error) {
      console.error('Error updating recurring events:', error);
      enqueueSnackbar('일정 수정 실패', { variant: 'error' });
    }
  };

  const deleteRecurringEvents = async (repeatId: string): Promise<void> => {
    try {
      if (!repeatId) {
        throw new Error('repeatId is required');
      }

      const response = await fetch(`/api/recurring-events/${repeatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete recurring events');
      }

      await fetchEvents();
      enqueueSnackbar('일정이 삭제되었습니다.', { variant: 'info' });
    } catch (error) {
      console.error('Error deleting recurring events:', error);
      enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
    }
  };

  async function init() {
    await fetchEvents();
    enqueueSnackbar('일정 로딩 완료!', { variant: 'info' });
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    events,
    fetchEvents,
    saveEvent,
    deleteEvent,
    saveRecurringEvents,
    updateRecurringEvents,
    deleteRecurringEvents,
  };
};
