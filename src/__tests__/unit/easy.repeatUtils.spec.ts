/**
 * repeatUtils 단위 테스트
 *
 * 테스트 범위:
 * - 정상 케이스: 매일/매주/매월/매년 반복 날짜 생성
 * - 경계 케이스: 31일 매월 반복, 2월 29일 매년 반복, 시작일=종료일
 * - 에러 케이스: repeatType이 'none', 시작일 > 종료일
 *
 * 관련 명세서: docs/feature-specs/recurring-events.md
 */

import { generateRepeatDates } from '../../utils/repeatUtils';

describe('generateRepeatDates', () => {
  describe('정상 케이스 - 매일 반복', () => {
    it('2025-10-01부터 2025-10-05까지 매일 반복하면 5개의 날짜를 반환한다', () => {
      const result = generateRepeatDates('2025-10-01', '2025-10-05', 'daily');

      expect(result).toEqual([
        '2025-10-01',
        '2025-10-02',
        '2025-10-03',
        '2025-10-04',
        '2025-10-05',
      ]);
    });

    it('2025-10-31부터 2025-11-02까지 매일 반복하면 월 경계를 넘어서 정확히 생성한다', () => {
      const result = generateRepeatDates('2025-10-31', '2025-11-02', 'daily');

      expect(result).toEqual(['2025-10-31', '2025-11-01', '2025-11-02']);
    });

    it('2025-12-31부터 2026-01-02까지 매일 반복하면 연도 경계를 넘어서 정확히 생성한다', () => {
      const result = generateRepeatDates('2025-12-31', '2026-01-02', 'daily');

      expect(result).toEqual(['2025-12-31', '2026-01-01', '2026-01-02']);
    });
  });

  describe('정상 케이스 - 매주 반복', () => {
    it('2025-10-01부터 2025-10-31까지 매주 반복하면 7일 간격으로 5개의 날짜를 반환한다', () => {
      const result = generateRepeatDates('2025-10-01', '2025-10-31', 'weekly');

      expect(result).toEqual([
        '2025-10-01',
        '2025-10-08',
        '2025-10-15',
        '2025-10-22',
        '2025-10-29',
      ]);
    });

    it('2025-10-01부터 2025-10-08까지 매주 반복하면 정확히 2개의 날짜를 반환한다', () => {
      const result = generateRepeatDates('2025-10-01', '2025-10-08', 'weekly');

      expect(result).toEqual(['2025-10-01', '2025-10-08']);
    });

    it('2025-10-01부터 2025-10-07까지 매주 반복하면 시작일만 반환한다', () => {
      const result = generateRepeatDates('2025-10-01', '2025-10-07', 'weekly');

      expect(result).toEqual(['2025-10-01']);
    });

    it('2025-12-30부터 2026-01-20까지 매주 반복하면 연도 경계를 넘어서 정확히 생성한다', () => {
      const result = generateRepeatDates('2025-12-30', '2026-01-20', 'weekly');

      expect(result).toEqual(['2025-12-30', '2026-01-06', '2026-01-13', '2026-01-20']);
    });
  });

  describe('정상 케이스 - 매월 반복', () => {
    it('2025-01-15부터 2025-06-15까지 매월 반복하면 15일을 가진 모든 달에 생성한다', () => {
      const result = generateRepeatDates('2025-01-15', '2025-06-15', 'monthly');

      expect(result).toEqual([
        '2025-01-15',
        '2025-02-15',
        '2025-03-15',
        '2025-04-15',
        '2025-05-15',
        '2025-06-15',
      ]);
    });

    it('2025-01-30부터 2025-04-30까지 매월 30일 반복하면 2월을 제외하고 생성한다', () => {
      const result = generateRepeatDates('2025-01-30', '2025-04-30', 'monthly');

      expect(result).toEqual(['2025-01-30', '2025-03-30', '2025-04-30']);
    });

    it('2025-01-01부터 2025-03-01까지 매월 반복하면 1일을 가진 모든 달에 생성한다', () => {
      const result = generateRepeatDates('2025-01-01', '2025-03-01', 'monthly');

      expect(result).toEqual(['2025-01-01', '2025-02-01', '2025-03-01']);
    });
  });

  describe('정상 케이스 - 매년 반복', () => {
    it('2025-01-15부터 2027-01-15까지 매년 반복하면 3개의 날짜를 반환한다', () => {
      const result = generateRepeatDates('2025-01-15', '2027-01-15', 'yearly');

      expect(result).toEqual(['2025-01-15', '2026-01-15', '2027-01-15']);
    });

    it('2025-03-01부터 2028-03-01까지 매년 반복하면 4개의 날짜를 반환한다', () => {
      const result = generateRepeatDates('2025-03-01', '2028-03-01', 'yearly');

      expect(result).toEqual(['2025-03-01', '2026-03-01', '2027-03-01', '2028-03-01']);
    });

    it('2025-12-31부터 2027-12-31까지 매년 반복하면 정확히 생성한다', () => {
      const result = generateRepeatDates('2025-12-31', '2027-12-31', 'yearly');

      expect(result).toEqual(['2025-12-31', '2026-12-31', '2027-12-31']);
    });
  });

  describe('경계 케이스 - 31일 매월 반복', () => {
    it('2025-01-31부터 2025-12-31까지 매월 31일 반복하면 31일이 있는 달에만 생성한다', () => {
      const result = generateRepeatDates('2025-01-31', '2025-12-31', 'monthly');

      expect(result).toEqual([
        '2025-01-31', // 1월
        // 2월 제외 (28일)
        '2025-03-31', // 3월
        // 4월 제외 (30일)
        '2025-05-31', // 5월
        // 6월 제외 (30일)
        '2025-07-31', // 7월
        '2025-08-31', // 8월
        // 9월 제외 (30일)
        '2025-10-31', // 10월
        // 11월 제외 (30일)
        '2025-12-31', // 12월
      ]);
    });

    it('2024-01-31부터 2024-03-31까지 매월 31일 반복하면 2월(윤년)을 제외하고 생성한다', () => {
      const result = generateRepeatDates('2024-01-31', '2024-03-31', 'monthly');

      expect(result).toEqual([
        '2024-01-31', // 1월
        // 2월 제외 (윤년이지만 29일까지만)
        '2024-03-31', // 3월
      ]);
    });

    it('2025-03-31부터 2025-05-31까지 매월 31일 반복하면 4월을 제외하고 생성한다', () => {
      const result = generateRepeatDates('2025-03-31', '2025-05-31', 'monthly');

      expect(result).toEqual(['2025-03-31', '2025-05-31']);
    });
  });

  describe('경계 케이스 - 2월 29일 매년 반복 (윤년)', () => {
    it('2024-02-29부터 2027-12-31까지 매년 반복하면 윤년에만 생성한다', () => {
      const result = generateRepeatDates('2024-02-29', '2027-12-31', 'yearly');

      expect(result).toEqual(['2024-02-29']);
      // 2025, 2026, 2027년은 윤년이 아니므로 제외
    });

    it('2024-02-29부터 2028-02-29까지 매년 반복하면 2024년과 2028년만 포함한다', () => {
      const result = generateRepeatDates('2024-02-29', '2028-02-29', 'yearly');

      expect(result).toEqual(['2024-02-29', '2028-02-29']);
    });

    it('2020-02-29부터 2025-12-31까지 매년 반복하면 2020년과 2024년만 포함한다', () => {
      const result = generateRepeatDates('2020-02-29', '2025-12-31', 'yearly');

      expect(result).toEqual(['2020-02-29', '2024-02-29']);
    });
  });

  describe('경계 케이스 - 2월 28일 매년 반복', () => {
    it('2025-02-28부터 2028-02-28까지 매년 반복하면 모든 해에 생성한다', () => {
      const result = generateRepeatDates('2025-02-28', '2028-02-28', 'yearly');

      expect(result).toEqual([
        '2025-02-28',
        '2026-02-28',
        '2027-02-28',
        '2028-02-28', // 윤년이지만 28일은 존재함
      ]);
    });
  });

  describe('경계 케이스 - 시작일과 종료일이 같은 경우', () => {
    it('매일 반복에서 시작일과 종료일이 같으면 1개의 날짜를 반환한다', () => {
      const result = generateRepeatDates('2025-10-01', '2025-10-01', 'daily');

      expect(result).toEqual(['2025-10-01']);
    });

    it('매주 반복에서 시작일과 종료일이 같으면 1개의 날짜를 반환한다', () => {
      const result = generateRepeatDates('2025-10-01', '2025-10-01', 'weekly');

      expect(result).toEqual(['2025-10-01']);
    });

    it('매월 반복에서 시작일과 종료일이 같으면 1개의 날짜를 반환한다', () => {
      const result = generateRepeatDates('2025-10-15', '2025-10-15', 'monthly');

      expect(result).toEqual(['2025-10-15']);
    });

    it('매년 반복에서 시작일과 종료일이 같으면 1개의 날짜를 반환한다', () => {
      const result = generateRepeatDates('2025-10-15', '2025-10-15', 'yearly');

      expect(result).toEqual(['2025-10-15']);
    });
  });

  describe('경계 케이스 - 시작일이 종료일보다 늦은 경우', () => {
    it('매일 반복에서 시작일이 종료일보다 늦으면 빈 배열을 반환한다', () => {
      const result = generateRepeatDates('2025-10-10', '2025-10-01', 'daily');

      expect(result).toEqual([]);
    });

    it('매주 반복에서 시작일이 종료일보다 늦으면 빈 배열을 반환한다', () => {
      const result = generateRepeatDates('2025-10-10', '2025-10-01', 'weekly');

      expect(result).toEqual([]);
    });

    it('매월 반복에서 시작일이 종료일보다 늦으면 빈 배열을 반환한다', () => {
      const result = generateRepeatDates('2025-10-15', '2025-09-15', 'monthly');

      expect(result).toEqual([]);
    });

    it('매년 반복에서 시작일이 종료일보다 늦으면 빈 배열을 반환한다', () => {
      const result = generateRepeatDates('2026-01-01', '2025-01-01', 'yearly');

      expect(result).toEqual([]);
    });
  });

  describe('에러 케이스 - repeatType이 none', () => {
    it("repeatType이 'none'이면 빈 배열을 반환한다", () => {
      const result = generateRepeatDates('2025-10-01', '2025-10-31', 'none');

      expect(result).toEqual([]);
    });
  });

  describe('경계 케이스 - 매월 반복에서 생성된 날짜가 0개인 경우', () => {
    it('2025-02-31부터 시작하는 매월 반복은 유효한 날짜가 없으므로 빈 배열을 반환한다', () => {
      // 2월 31일은 존재하지 않으므로 빈 배열 예상
      const result = generateRepeatDates('2025-02-31', '2025-05-31', 'monthly');

      expect(result).toEqual([]);
    });
  });

  describe('경계 케이스 - 윤년 2월 29일 매월 반복', () => {
    it('2024-02-29부터 2024-05-29까지 매월 반복하면 모든 달에 생성한다', () => {
      const result = generateRepeatDates('2024-02-29', '2024-05-29', 'monthly');

      expect(result).toEqual([
        '2024-02-29',
        '2024-03-29',
        '2024-04-29',
        '2024-05-29',
      ]);
    });
  });

  describe('경계 케이스 - 긴 기간의 반복', () => {
    it('2025-01-01부터 2025-12-31까지 매일 반복하면 365개의 날짜를 반환한다', () => {
      const result = generateRepeatDates('2025-01-01', '2025-12-31', 'daily');

      expect(result).toHaveLength(365);
      expect(result[0]).toBe('2025-01-01');
      expect(result[364]).toBe('2025-12-31');
    });

    it('2024-01-01부터 2024-12-31까지 매일 반복하면 366개의 날짜를 반환한다 (윤년)', () => {
      const result = generateRepeatDates('2024-01-01', '2024-12-31', 'daily');

      expect(result).toHaveLength(366);
      expect(result[0]).toBe('2024-01-01');
      expect(result[365]).toBe('2024-12-31');
    });
  });
});
