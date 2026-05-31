export interface CalculationResult {
  success: boolean;
  result?: number;
  error?: string;
  expression: string;
}

export interface StatisticsResult {
  success: boolean;
  data?: {
    count: number;
    sum: number;
    mean: number;
    median: number;
    mode: number[];
    range: number;
    min: number;
    max: number;
    variance: number;
    standardDeviation: number;
  };
  error?: string;
}

export interface TimeCalculationResult {
  success: boolean;
  result?: {
    totalSeconds: number;
    minutes: number;
    seconds: number;
    formatted: string;
  };
  error?: string;
}

export interface ComparisonResult {
  success: boolean;
  result?: {
    greater: boolean;
    equal: boolean;
    less: boolean;
    difference: number;
    ratio: number;
  };
  error?: string;
}

class CalculatorTools {
  evaluate(expression: string): CalculationResult {
    try {
      const sanitized = this.sanitizeExpression(expression);

      if (!this.isValidExpression(sanitized)) {
        return {
          success: false,
          error: 'Invalid expression format',
          expression,
        };
      }

      const result = this.safeEvaluate(sanitized);

      return {
        success: true,
        result,
        expression,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calculation error',
        expression,
      };
    }
  }

  private sanitizeExpression(expression: string): string {
    return expression
      .replace(/[^\d+\-*/().\s.]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isValidExpression(expression: string): boolean {
    if (!expression || expression.length === 0) return false;

    const openParens = (expression.match(/\(/g) || []).length;
    const closeParens = (expression.match(/\)/g) || []).length;
    if (openParens !== closeParens) return false;

    const invalidPatterns = [/\d\s+\d/, /[+\*\/]{2,}/, /\(\)/, /\d+\.\d+\./];
    return !invalidPatterns.some((pattern) => pattern.test(expression));
  }

  private safeEvaluate(expression: string): number {
    const tokens = this.tokenize(expression);
    const result = this.parseExpression(tokens);

    if (tokens.length > 0) {
      throw new Error('Invalid expression');
    }

    return result;
  }

  private tokenize(expression: string): string[] {
    const tokens: string[] = [];
    let current = '';

    for (const char of expression) {
      if (/\s/.test(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else if (/[\d.]/.test(char)) {
        current += char;
      } else if (/[+\-*/()]/.test(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        tokens.push(char);
      }
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  private parseExpression(tokens: string[]): number {
    return this.parseAdditionSubtraction(tokens);
  }

  private parseAdditionSubtraction(tokens: string[]): number {
    let left = this.parseMultiplicationDivision(tokens);

    while (tokens.length > 0 && (tokens[0] === '+' || tokens[0] === '-')) {
      const operator = tokens.shift()!;
      const right = this.parseMultiplicationDivision(tokens);

      if (operator === '+') {
        left = left + right;
      } else {
        left = left - right;
      }
    }

    return left;
  }

  private parseMultiplicationDivision(tokens: string[]): number {
    let left = this.parsePrimary(tokens);

    while (tokens.length > 0 && (tokens[0] === '*' || tokens[0] === '/')) {
      const operator = tokens.shift()!;
      const right = this.parsePrimary(tokens);

      if (operator === '*') {
        left = left * right;
      } else {
        if (right === 0) {
          throw new Error('Division by zero');
        }
        left = left / right;
      }
    }

    return left;
  }

  private parsePrimary(tokens: string[]): number {
    if (tokens.length === 0) {
      throw new Error('Unexpected end of expression');
    }

    const token = tokens.shift()!;

    if (token === '(') {
      const result = this.parseExpression(tokens);
      if (tokens.shift() !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      return result;
    }

    const num = parseFloat(token);
    if (isNaN(num)) {
      throw new Error(`Invalid number: ${token}`);
    }

    return num;
  }

  calculateStatistics(numbers: number[]): StatisticsResult {
    try {
      if (!numbers || numbers.length === 0) {
        return {
          success: false,
          error: 'No numbers provided',
        };
      }

      const sorted = [...numbers].sort((a, b) => a - b);
      const count = sorted.length;
      const sum = sorted.reduce((a, b) => a + b, 0);
      const mean = sum / count;
      const min = sorted[0];
      const max = sorted[count - 1];
      const range = max - min;

      let median: number;
      if (count % 2 === 0) {
        median = (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
      } else {
        median = sorted[Math.floor(count / 2)];
      }

      const frequency: Record<number, number> = {};
      for (const num of sorted) {
        frequency[num] = (frequency[num] || 0) + 1;
      }
      const maxFreq = Math.max(...Object.values(frequency));
      const mode = Object.entries(frequency)
        .filter(([, freq]) => freq === maxFreq && freq > 1)
        .map(([num]) => parseFloat(num));

      const variance = sorted.reduce((acc, num) => acc + Math.pow(num - mean, 2), 0) / count;
      const standardDeviation = Math.sqrt(variance);

      return {
        success: true,
        data: {
          count,
          sum,
          mean,
          median,
          mode: mode.length > 0 ? mode : [],
          range,
          min,
          max,
          variance,
          standardDeviation,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Statistics calculation error',
      };
    }
  }

  calculateTime(totalSeconds: number): TimeCalculationResult {
    try {
      if (totalSeconds < 0) {
        return {
          success: false,
          error: 'Time cannot be negative',
        };
      }

      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      return {
        success: true,
        result: {
          totalSeconds,
          minutes,
          seconds,
          formatted,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Time calculation error',
      };
    }
  }

  compareValues(a: number, b: number): ComparisonResult {
    try {
      const difference = a - b;
      const ratio = b !== 0 ? a / b : Infinity;

      return {
        success: true,
        result: {
          greater: a > b,
          equal: a === b,
          less: a < b,
          difference,
          ratio,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Comparison error',
      };
    }
  }

  calculateSpeechTimeRemaining(usedSeconds: number, totalSeconds: number): TimeCalculationResult {
    const remaining = totalSeconds - usedSeconds;

    if (remaining < 0) {
      return {
        success: false,
        error: 'Time has expired',
      };
    }

    return this.calculateTime(remaining);
  }

  calculatePrepTimeRemaining(usedMs: number, totalMs: number): TimeCalculationResult {
    const remainingMs = totalMs - usedMs;
    const remainingSeconds = Math.floor(remainingMs / 1000);

    if (remainingMs < 0) {
      return {
        success: false,
        error: 'Prep time has expired',
      };
    }

    return this.calculateTime(remainingSeconds);
  }

  calculatePercentage(value: number, total: number): CalculationResult {
    if (total === 0) {
      return {
        success: false,
        error: 'Cannot calculate percentage with zero total',
        expression: `${value} / ${total} * 100`,
      };
    }

    const result = (value / total) * 100;

    return {
      success: true,
      result,
      expression: `${value} / ${total} * 100`,
    };
  }

  sum(...numbers: number[]): CalculationResult {
    try {
      const result = numbers.reduce((a, b) => a + b, 0);
      return {
        success: true,
        result,
        expression: numbers.join(' + '),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sum calculation error',
        expression: numbers.join(' + '),
      };
    }
  }

  average(...numbers: number[]): CalculationResult {
    try {
      if (numbers.length === 0) {
        return {
          success: false,
          error: 'Cannot calculate average of empty set',
          expression: 'average()',
        };
      }

      const result = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      return {
        success: true,
        result,
        expression: `average(${numbers.join(', ')})`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Average calculation error',
        expression: numbers.join(', '),
      };
    }
  }
}

export const calculatorTools = new CalculatorTools();

export const calculatorToolDefinitions = {
  evaluate: {
    name: 'calculator_evaluate',
    description: 'Evaluate a mathematical expression safely',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate (e.g., "2 + 2 * 3")',
        },
      },
      required: ['expression'],
    },
    handler: (params: { expression: string }) => calculatorTools.evaluate(params.expression),
  },

  calculateStatistics: {
    name: 'calculator_statistics',
    description: 'Calculate statistics for a set of numbers',
    parameters: {
      type: 'object',
      properties: {
        numbers: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of numbers to analyze',
        },
      },
      required: ['numbers'],
    },
    handler: (params: { numbers: number[] }) => calculatorTools.calculateStatistics(params.numbers),
  },

  calculateTime: {
    name: 'calculator_time',
    description: 'Format time in seconds to minutes and seconds',
    parameters: {
      type: 'object',
      properties: {
        totalSeconds: {
          type: 'number',
          description: 'Total seconds to format',
        },
      },
      required: ['totalSeconds'],
    },
    handler: (params: { totalSeconds: number }) => calculatorTools.calculateTime(params.totalSeconds),
  },

  compareValues: {
    name: 'calculator_compare',
    description: 'Compare two numeric values',
    parameters: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First value' },
        b: { type: 'number', description: 'Second value' },
      },
      required: ['a', 'b'],
    },
    handler: (params: { a: number; b: number }) => calculatorTools.compareValues(params.a, params.b),
  },

  calculatePercentage: {
    name: 'calculator_percentage',
    description: 'Calculate what percentage value is of total',
    parameters: {
      type: 'object',
      properties: {
        value: { type: 'number', description: 'The part value' },
        total: { type: 'number', description: 'The whole value' },
      },
      required: ['value', 'total'],
    },
    handler: (params: { value: number; total: number }) =>
      calculatorTools.calculatePercentage(params.value, params.total),
  },
};
