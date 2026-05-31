import { describe, it, expect } from 'bun:test';
import { calculatorTools } from '@/server/tools/calculatorTools';

describe('CalculatorTools', () => {
  describe('Expression Evaluation', () => {
    it('should evaluate simple addition', () => {
      const result = calculatorTools.evaluate('2 + 2');
      expect(result.success).toBe(true);
      expect(result.result).toBe(4);
    });

    it('should evaluate complex expression', () => {
      const result = calculatorTools.evaluate('2 + 3 * 4');
      expect(result.success).toBe(true);
      expect(result.result).toBe(14);
    });

    it('should respect parentheses', () => {
      const result = calculatorTools.evaluate('(2 + 3) * 4');
      expect(result.success).toBe(true);
      expect(result.result).toBe(20);
    });

    it('should handle division', () => {
      const result = calculatorTools.evaluate('10 / 2');
      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

    it('should handle decimal numbers', () => {
      const result = calculatorTools.evaluate('3.5 + 2.5');
      expect(result.success).toBe(true);
      expect(result.result).toBeCloseTo(6, 1);
    });

    it('should reject invalid characters', () => {
      const result = calculatorTools.evaluate('2 + abc');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject division by zero', () => {
      const result = calculatorTools.evaluate('10 / 0');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Division by zero');
    });

    it('should reject mismatched parentheses', () => {
      const result = calculatorTools.evaluate('(2 + 3');
      expect(result.success).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should calculate basic statistics', () => {
      const result = calculatorTools.calculateStatistics([1, 2, 3, 4, 5]);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.count).toBe(5);
      expect(result.data?.sum).toBe(15);
      expect(result.data?.mean).toBe(3);
      expect(result.data?.median).toBe(3);
      expect(result.data?.min).toBe(1);
      expect(result.data?.max).toBe(5);
    });

    it('should calculate mode correctly', () => {
      const result = calculatorTools.calculateStatistics([1, 2, 2, 3, 3, 3]);
      expect(result.success).toBe(true);
      expect(result.data?.mode).toContain(3);
    });

    it('should calculate standard deviation', () => {
      const result = calculatorTools.calculateStatistics([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(result.success).toBe(true);
      expect(result.data?.standardDeviation).toBeDefined();
      expect(result.data?.variance).toBeDefined();
    });

    it('should reject empty array', () => {
      const result = calculatorTools.calculateStatistics([]);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No numbers provided');
    });

    it('should handle single number', () => {
      const result = calculatorTools.calculateStatistics([5]);
      expect(result.success).toBe(true);
      expect(result.data?.mean).toBe(5);
      expect(result.data?.median).toBe(5);
    });
  });

  describe('Time Calculations', () => {
    it('should format time correctly', () => {
      const result = calculatorTools.calculateTime(125);
      expect(result.success).toBe(true);
      expect(result.result?.minutes).toBe(2);
      expect(result.result?.seconds).toBe(5);
      expect(result.result?.formatted).toBe('2:05');
    });

    it('should handle zero seconds', () => {
      const result = calculatorTools.calculateTime(0);
      expect(result.success).toBe(true);
      expect(result.result?.formatted).toBe('0:00');
    });

    it('should handle large time values', () => {
      const result = calculatorTools.calculateTime(3661);
      expect(result.success).toBe(true);
      expect(result.result?.minutes).toBe(61);
      expect(result.result?.seconds).toBe(1);
    });

    it('should reject negative time', () => {
      const result = calculatorTools.calculateTime(-10);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Time cannot be negative');
    });
  });

  describe('Value Comparison', () => {
    it('should compare greater values', () => {
      const result = calculatorTools.compareValues(10, 5);
      expect(result.success).toBe(true);
      expect(result.result?.greater).toBe(true);
      expect(result.result?.equal).toBe(false);
      expect(result.result?.less).toBe(false);
      expect(result.result?.difference).toBe(5);
      expect(result.result?.ratio).toBe(2);
    });

    it('should compare equal values', () => {
      const result = calculatorTools.compareValues(5, 5);
      expect(result.success).toBe(true);
      expect(result.result?.greater).toBe(false);
      expect(result.result?.equal).toBe(true);
      expect(result.result?.less).toBe(false);
      expect(result.result?.difference).toBe(0);
      expect(result.result?.ratio).toBe(1);
    });

    it('should compare lesser values', () => {
      const result = calculatorTools.compareValues(3, 7);
      expect(result.success).toBe(true);
      expect(result.result?.greater).toBe(false);
      expect(result.result?.equal).toBe(false);
      expect(result.result?.less).toBe(true);
      expect(result.result?.difference).toBe(-4);
    });

    it('should handle infinity ratio', () => {
      const result = calculatorTools.compareValues(5, 0);
      expect(result.success).toBe(true);
      expect(result.result?.ratio).toBe(Infinity);
    });
  });

  describe('Speech Time Calculations', () => {
    it('should calculate remaining speech time', () => {
      const result = calculatorTools.calculateSpeechTimeRemaining(120, 240);
      expect(result.success).toBe(true);
      expect(result.result?.totalSeconds).toBe(120);
      expect(result.result?.formatted).toBe('2:00');
    });

    it('should detect expired speech time', () => {
      const result = calculatorTools.calculateSpeechTimeRemaining(250, 240);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Time has expired');
    });
  });

  describe('Prep Time Calculations', () => {
    it('should calculate remaining prep time', () => {
      const result = calculatorTools.calculatePrepTimeRemaining(60000, 180000);
      expect(result.success).toBe(true);
      expect(result.result?.totalSeconds).toBe(120);
    });

    it('should detect expired prep time', () => {
      const result = calculatorTools.calculatePrepTimeRemaining(190000, 180000);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Prep time has expired');
    });
  });

  describe('Percentage Calculations', () => {
    it('should calculate percentage correctly', () => {
      const result = calculatorTools.calculatePercentage(25, 100);
      expect(result.success).toBe(true);
      expect(result.result).toBe(25);
    });

    it('should calculate partial percentage', () => {
      const result = calculatorTools.calculatePercentage(1, 3);
      expect(result.success).toBe(true);
      expect(result.result).toBeCloseTo(33.33, 1);
    });

    it('should reject zero total', () => {
      const result = calculatorTools.calculatePercentage(25, 0);
      expect(result.success).toBe(false);
      expect(result.error).toContain('zero total');
    });
  });

  describe('Sum and Average', () => {
    it('should calculate sum', () => {
      const result = calculatorTools.sum(1, 2, 3, 4, 5);
      expect(result.success).toBe(true);
      expect(result.result).toBe(15);
    });

    it('should calculate average', () => {
      const result = calculatorTools.average(10, 20, 30);
      expect(result.success).toBe(true);
      expect(result.result).toBe(20);
    });

    it('should reject empty average', () => {
      const result = calculatorTools.average();
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty set');
    });
  });
});
