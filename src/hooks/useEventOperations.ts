import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';

import { Event, EventForm, RepeatInfo } from '../types';
import { generateRepeatDates } from '../utils/repeatUtils';

const ERROR_MESSAGES = {
  FETCH_FAILED: '이벤트 로딩 실패',
  SAVE_FAILED: '일정 저장 실패',
  DELETE_FAILED: '일정 삭제 실패',
  UPDATE_FAILED: '일정 수정 실패',
  NO_DATES: '선택한 조건에 맞는 날짜가 없습니다.',
  INVALID_REPEAT_DATA: 'Invalid repeat data',
  INVALID_REPEAT_ID: 'repeatId is required',
} as const;

const SUCCESS_MESSAGES = {
  LOADED: '일정 로딩 완료!',
  CREATED: '일정이 추가되었습니다.',
  UPDATED: '일정이 수정되었습니다.',
  DELETED: '일정이 삭제되었습니다.',
} as const;

const API_ERROR_MESSAGES = {
  FETCH_EVENTS: 'Failed to fetch events',
  SAVE_EVENT: 'Failed to save event',
  DELETE_EVENT: 'Failed to delete event',
  SAVE_RECURRING: 'Failed to save recurring events',
  UPDATE_RECURRING: 'Failed to update recurring events',
  DELETE_RECURRING: 'Failed to delete recurring events',
} as const;

export const useEventOperations = (editing: boolean, onSave?: () => void) => {
  const [events, setEvents] = useState<Event[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error(API_ERROR_MESSAGES.FETCH_EVENTS);
      }
      const { events } = await response.json();
      setEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      enqueueSnackbar(ERROR_MESSAGES.FETCH_FAILED, { variant: 'error' });
    }
  };

  const isValidRecurringData = (
    data: EventForm
  ): data is EventForm & {
    repeat: RepeatInfo & { endDate: string };
  } => {
    return Boolean(data.repeat && data.repeat.type !== 'none' && data.repeat.endDate);
  };

  const saveRecurringEvents = async (eventFormData: EventForm) => {
    try {
      if (!isValidRecurringData(eventFormData)) {
        throw new Error(ERROR_MESSAGES.INVALID_REPEAT_DATA);
      }

      const dates = generateRepeatDates(
        eventFormData.date,
        eventFormData.repeat.endDate,
        eventFormData.repeat.type
      );

      if (dates.length === 0) {
        enqueueSnackbar(ERROR_MESSAGES.NO_DATES, { variant: 'error' });
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
        throw new Error(API_ERROR_MESSAGES.SAVE_RECURRING);
      }

      const data = await response.json();
      if (!data.events || data.events.length === 0) {
        enqueueSnackbar(ERROR_MESSAGES.NO_DATES, { variant: 'error' });
        return;
      }

      await fetchEvents();
      onSave?.();
      enqueueSnackbar(SUCCESS_MESSAGES.CREATED, { variant: 'success' });
    } catch (error) {
      console.error('Error saving recurring events:', error);
      enqueueSnackbar(ERROR_MESSAGES.SAVE_FAILED, { variant: 'error' });
    }
  };

  const isCreatingRecurringEvent = (data: Event | EventForm): data is EventForm => {
    return (
      !editing && 'repeat' in data && data.repeat.type !== 'none' && Boolean(data.repeat.endDate)
    );
  };

  const saveEvent = async (eventData: Event | EventForm) => {
    try {
      // 반복 일정 생성인 경우 확인
      if (isCreatingRecurringEvent(eventData)) {
        await saveRecurringEvents(eventData);
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
        throw new Error(API_ERROR_MESSAGES.SAVE_EVENT);
      }

      await fetchEvents();
      onSave?.();
      enqueueSnackbar(editing ? SUCCESS_MESSAGES.UPDATED : SUCCESS_MESSAGES.CREATED, {
        variant: 'success',
      });
    } catch (error) {
      console.error('Error saving event:', error);
      enqueueSnackbar(ERROR_MESSAGES.SAVE_FAILED, { variant: 'error' });
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error(API_ERROR_MESSAGES.DELETE_EVENT);
      }

      await fetchEvents();
      enqueueSnackbar(SUCCESS_MESSAGES.DELETED, { variant: 'info' });
    } catch (error) {
      console.error('Error deleting event:', error);
      enqueueSnackbar(ERROR_MESSAGES.DELETE_FAILED, { variant: 'error' });
    }
  };

  const updateRecurringEvents = async (
    repeatId: string,
    updateData: Partial<Event>
  ): Promise<void> => {
    try {
      if (!repeatId) {
        throw new Error(ERROR_MESSAGES.INVALID_REPEAT_ID);
      }

      const response = await fetch(`/api/recurring-events/${repeatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(API_ERROR_MESSAGES.UPDATE_RECURRING);
      }

      await fetchEvents();
      enqueueSnackbar(SUCCESS_MESSAGES.UPDATED, { variant: 'success' });
    } catch (error) {
      console.error('Error updating recurring events:', error);
      enqueueSnackbar(ERROR_MESSAGES.UPDATE_FAILED, { variant: 'error' });
    }
  };

  const deleteRecurringEvents = async (repeatId: string): Promise<void> => {
    try {
      if (!repeatId) {
        throw new Error(ERROR_MESSAGES.INVALID_REPEAT_ID);
      }

      const response = await fetch(`/api/recurring-events/${repeatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(API_ERROR_MESSAGES.DELETE_RECURRING);
      }

      await fetchEvents();
      enqueueSnackbar(SUCCESS_MESSAGES.DELETED, { variant: 'info' });
    } catch (error) {
      console.error('Error deleting recurring events:', error);
      enqueueSnackbar(ERROR_MESSAGES.DELETE_FAILED, { variant: 'error' });
    }
  };

  async function init() {
    await fetchEvents();
    enqueueSnackbar(SUCCESS_MESSAGES.LOADED, { variant: 'info' });
  }

  useEffect(() => {
    init();
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
