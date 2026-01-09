/**
 * utils.ts 테스트
 */

import { describe, it, expect } from 'vitest';
import { formatTime } from '../utils';

describe('formatTime', () => {
  describe('기본 동작', () => {
    it('0ms를 "0.00초"로 포맷해야 한다', () => {
      expect(formatTime(0)).toBe('0.00초');
    });

    it('1000ms를 "1.00초"로 포맷해야 한다', () => {
      expect(formatTime(1000)).toBe('1.00초');
    });

    it('1500ms를 "1.50초"로 포맷해야 한다', () => {
      expect(formatTime(1500)).toBe('1.50초');
    });

    it('12340ms를 "12.34초"로 포맷해야 한다', () => {
      expect(formatTime(12340)).toBe('12.34초');
    });

    it('59990ms를 "59.99초"로 포맷해야 한다', () => {
      expect(formatTime(59990)).toBe('59.99초');
    });
  });

  describe('1분 이상', () => {
    it('60000ms를 "1:00.00"으로 포맷해야 한다', () => {
      expect(formatTime(60000)).toBe('1:00.00');
    });

    it('61500ms를 "1:01.50"으로 포맷해야 한다', () => {
      expect(formatTime(61500)).toBe('1:01.50');
    });

    it('90000ms를 "1:30.00"으로 포맷해야 한다', () => {
      expect(formatTime(90000)).toBe('1:30.00');
    });

    it('125670ms를 "2:05.67"으로 포맷해야 한다', () => {
      expect(formatTime(125670)).toBe('2:05.67');
    });

    it('600000ms를 "10:00.00"으로 포맷해야 한다', () => {
      expect(formatTime(600000)).toBe('10:00.00');
    });
  });

  describe('엣지 케이스', () => {
    it('음수 입력시 "0.00초"를 반환해야 한다', () => {
      expect(formatTime(-1000)).toBe('0.00초');
      expect(formatTime(-1)).toBe('0.00초');
    });

    it('매우 작은 양수를 처리해야 한다', () => {
      expect(formatTime(1)).toBe('0.00초');
      expect(formatTime(9)).toBe('0.00초');
      expect(formatTime(10)).toBe('0.01초');
    });

    it('밀리초가 한 자리일 때 0으로 패딩해야 한다', () => {
      expect(formatTime(1050)).toBe('1.05초');
    });

    it('초가 한 자리일 때 0으로 패딩해야 한다 (1분 이상)', () => {
      expect(formatTime(65000)).toBe('1:05.00');
    });
  });
});
