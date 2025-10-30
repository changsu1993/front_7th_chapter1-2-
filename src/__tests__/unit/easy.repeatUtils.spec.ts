import { generateRepeatDates } from '../../utils/repeatUtils';

describe('generateRepeatDates', () => {
  describe('매일 반복 (daily)', () => {
    it('일주일 동안 매일 반복하면 7개의 날짜를 반환한다', () => {
      const result = generateRepeatDates('2025-10-01', '2025-10-07', 'daily');

      expect(result).toHaveLength(7);
      expect(result[0]).toBe('2025-10-01');
      expect(result[6]).toBe('2025-10-07');
      expect(result).toEqual([
        '2025-10-01',
        '2025-10-02',
        '2025-10-03',
        '2025-10-04',
        '2025-10-05',
        '2025-10-06',
        '2025-10-07',
      ]);
    });

    it('시작일과 종료일이 동일하면 1개의 날짜를 반환한다', () => {
      const result = generateRepeatDates('2025-10-01', '2025-10-01', 'daily');

      expect(result).toHaveLength(1);
      expect(result).toEqual(['2025-10-01']);
    });

    it('3개월 장기간 반복하면 92개의 날짜를 반환한다', () => {
      const result = generateRepeatDates('2025-10-01', '2025-12-31', 'daily');

      expect(result).toHaveLength(92);
      expect(result[0]).toBe('2025-10-01');
      expect(result[91]).toBe('2025-12-31');
    });
  });

  describe('매주 반복 (weekly)', () => {
    it('한 달 동안 매주 반복하면 5개의 날짜를 반환한다', () => {
      const result = generateRepeatDates('2025-10-01', '2025-10-31', 'weekly');

      expect(result).toHaveLength(5);
      expect(result).toEqual([
        '2025-10-01',
        '2025-10-08',
        '2025-10-15',
        '2025-10-22',
        '2025-10-29',
      ]);
    });

    it('월 경계를 넘는 경우 올바른 날짜를 생성한다', () => {
      const result = generateRepeatDates('2025-10-25', '2025-11-15', 'weekly');

      expect(result).toHaveLength(4);
      expect(result).toEqual(['2025-10-25', '2025-11-01', '2025-11-08', '2025-11-15']);
    });

    it('연도 경계를 넘는 경우 올바른 날짜를 생성한다', () => {
      const result = generateRepeatDates('2024-12-25', '2025-01-15', 'weekly');

      expect(result).toHaveLength(4);
      expect(result).toEqual(['2024-12-25', '2025-01-01', '2025-01-08', '2025-01-15']);
    });
  });

  describe('매월 반복 (monthly)', () => {
    it('1일 기준 6개월 반복하면 모든 달의 1일을 반환한다', () => {
      const result = generateRepeatDates('2025-01-01', '2025-06-01', 'monthly');

      expect(result).toHaveLength(6);
      expect(result).toEqual([
        '2025-01-01',
        '2025-02-01',
        '2025-03-01',
        '2025-04-01',
        '2025-05-01',
        '2025-06-01',
      ]);
    });

    it('31일 반복 시 31일이 있는 달만 생성한다', () => {
      const result = generateRepeatDates('2025-01-31', '2025-12-31', 'monthly');

      expect(result).toHaveLength(7);
      expect(result).toEqual([
        '2025-01-31',
        '2025-03-31',
        '2025-05-31',
        '2025-07-31',
        '2025-08-31',
        '2025-10-31',
        '2025-12-31',
      ]);
    });

    it('31일 반복 시 2월을 제외한다', () => {
      const result = generateRepeatDates('2025-01-31', '2025-03-31', 'monthly');

      expect(result).toHaveLength(2);
      expect(result).toEqual(['2025-01-31', '2025-03-31']);
      expect(result).not.toContain('2025-02-31');
    });

    it('30일 반복 시 30일이 있는 달만 생성한다', () => {
      const result = generateRepeatDates('2025-01-30', '2025-06-30', 'monthly');

      expect(result).toHaveLength(5);
      expect(result).toEqual([
        '2025-01-30',
        '2025-03-30',
        '2025-04-30',
        '2025-05-30',
        '2025-06-30',
      ]);
    });

    it('28일 반복 시 모든 달을 포함한다', () => {
      const result = generateRepeatDates('2025-01-28', '2025-12-28', 'monthly');

      expect(result).toHaveLength(12);
      expect(result[0]).toBe('2025-01-28');
      expect(result[11]).toBe('2025-12-28');
    });
  });

  describe('매년 반복 (yearly)', () => {
    it('기본 동작으로 매년 같은 날짜를 생성한다', () => {
      const result = generateRepeatDates('2025-01-01', '2028-01-01', 'yearly');

      expect(result).toHaveLength(4);
      expect(result).toEqual(['2025-01-01', '2026-01-01', '2027-01-01', '2028-01-01']);
    });

    it('윤년 2월 29일은 윤년만 생성한다', () => {
      const result = generateRepeatDates('2024-02-29', '2030-12-31', 'yearly');

      expect(result).toHaveLength(2);
      expect(result).toEqual(['2024-02-29', '2028-02-29']);
    });

    it('일반 날짜는 매년 생성한다', () => {
      const result = generateRepeatDates('2025-07-15', '2027-12-31', 'yearly');

      expect(result).toHaveLength(3);
      expect(result).toEqual(['2025-07-15', '2026-07-15', '2027-07-15']);
    });
  });

  describe('엣지 케이스', () => {
    it('시작일과 종료일이 동일하면 모든 반복 유형에서 1개를 반환한다', () => {
      const dailyResult = generateRepeatDates('2025-10-01', '2025-10-01', 'daily');
      const weeklyResult = generateRepeatDates('2025-10-01', '2025-10-01', 'weekly');
      const monthlyResult = generateRepeatDates('2025-10-01', '2025-10-01', 'monthly');
      const yearlyResult = generateRepeatDates('2025-10-01', '2025-10-01', 'yearly');

      expect(dailyResult).toEqual(['2025-10-01']);
      expect(weeklyResult).toEqual(['2025-10-01']);
      expect(monthlyResult).toEqual(['2025-10-01']);
      expect(yearlyResult).toEqual(['2025-10-01']);
    });

    it('시작일이 종료일보다 늦으면 빈 배열을 반환한다', () => {
      const result = generateRepeatDates('2025-10-31', '2025-10-01', 'daily');

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('매우 긴 기간(1년) 반복 시 365개를 100ms 이하로 생성한다', () => {
      const startTime = performance.now();
      const result = generateRepeatDates('2025-01-01', '2025-12-31', 'daily');
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result).toHaveLength(365);
      expect(result[0]).toBe('2025-01-01');
      expect(result[364]).toBe('2025-12-31');
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('잘못된 입력', () => {
    it('잘못된 날짜 형식은 빈 배열을 반환한다', () => {
      const result = generateRepeatDates('2025/10/01', '2025-10-31', 'daily');

      expect(result).toEqual([]);
    });
  });
});
