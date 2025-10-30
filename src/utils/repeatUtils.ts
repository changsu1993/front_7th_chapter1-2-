import type { RepeatType } from '../types';

/**
 * 주어진 연도가 윤년인지 확인합니다.
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * 주어진 월의 일수를 반환합니다.
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * 날짜 문자열(YYYY-MM-DD)을 Date 객체로 변환합니다.
 */
function parseDate(dateStr: string): Date | null {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return null;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  // 유효한 날짜 확인
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/**
 * Date 객체를 문자열(YYYY-MM-DD)로 변환합니다.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 날짜에 일(days)을 더합니다.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 날짜에 월(months)을 더합니다.
 * 해당 월에 일자가 없으면 null을 반환합니다 (예: 2월 31일).
 */
function addMonths(date: Date, months: number): Date | null {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  let newMonth = month + months;
  let newYear = year;

  // 연도 조정
  while (newMonth >= 12) {
    newMonth -= 12;
    newYear += 1;
  }

  // 해당 월의 일수 확인
  const daysInNewMonth = getDaysInMonth(newYear, newMonth + 1);
  if (day > daysInNewMonth) {
    return null; // 해당 월에 그 날이 없음
  }

  const result = new Date(newYear, newMonth, day);
  return result;
}

/**
 * 날짜에 연(years)을 더합니다.
 * 2월 29일의 경우 윤년이 아니면 null을 반환합니다.
 */
function addYears(date: Date, years: number): Date | null {
  const newYear = date.getFullYear() + years;
  const month = date.getMonth();
  const day = date.getDate();

  // 2월 29일인 경우
  if (month === 1 && day === 29) {
    if (!isLeapYear(newYear)) {
      return null; // 윤년이 아니면 해당 날짜 없음
    }
  }

  const result = new Date(newYear, month, day);
  return result;
}

/**
 * 반복 유형과 기간에 따라 일정 날짜 배열을 생성합니다.
 *
 * @param startDate - 시작 날짜 (YYYY-MM-DD)
 * @param endDate - 종료 날짜 (YYYY-MM-DD)
 * @param repeatType - 반복 유형 ('daily', 'weekly', 'monthly', 'yearly')
 * @returns 날짜 문자열 배열 (YYYY-MM-DD[])
 */
export function generateRepeatDates(
  startDate: string,
  endDate: string,
  repeatType: RepeatType
): string[] {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  // 유효한 날짜 확인
  if (!start || !end) {
    return [];
  }

  // 시작일이 종료일보다 뒤면 빈 배열 반환
  if (start > end) {
    return [];
  }

  const dates: string[] = [];

  if (repeatType === 'daily') {
    let current = new Date(start);
    while (current <= end) {
      dates.push(formatDate(current));
      current = addDays(current, 1);
    }
  } else if (repeatType === 'weekly') {
    let current = new Date(start);
    while (current <= end) {
      dates.push(formatDate(current));
      current = addDays(current, 7);
    }
  } else if (repeatType === 'monthly') {
    let current = new Date(start);
    let monthIndex = 0;
    while (current <= end) {
      dates.push(formatDate(current));
      monthIndex += 1;
      const next = addMonths(start, monthIndex);
      if (next === null) {
        // 해당 월에 일자가 없으면 다음 달로 스킵
        monthIndex += 1;
        const skipNext = addMonths(start, monthIndex);
        if (skipNext === null || skipNext > end) {
          break;
        }
        current = skipNext;
      } else if (next > end) {
        break;
      } else {
        current = next;
      }
    }
  } else if (repeatType === 'yearly') {
    let current = new Date(start);
    let yearIndex = 0;
    while (current <= end) {
      dates.push(formatDate(current));
      yearIndex += 1;
      let next = addYears(start, yearIndex);

      // 해당 연도에 그 날짜가 없으면(예: 2월 29일) 윤년이 될 때까지 스킵
      while (next === null && yearIndex < 400) {
        yearIndex += 1;
        next = addYears(start, yearIndex);
      }

      if (next === null || next > end) {
        break;
      }
      current = next;
    }
  }

  return dates;
}
