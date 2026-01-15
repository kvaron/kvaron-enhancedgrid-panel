import {
  calculateSparkLinePoints,
  generateSparkLinePath,
  generateLineGradientDef,
} from '../sparkChartGradient';
import { GrafanaTheme2 } from '@grafana/data';

// Mock the colorUtils module
jest.mock('../colorUtils', () => ({
  getColorFromScheme: jest.fn((scheme: string, normalizedValue: number) => {
    // Simple mock: return color based on normalized value
    if (normalizedValue <= 0.33) {return 'rgb(0, 255, 0)';} // Green
    if (normalizedValue <= 0.66) {return 'rgb(255, 255, 0)';} // Yellow
    return 'rgb(255, 0, 0)'; // Red
  }),
}));

// Mock theme for testing
const mockTheme: GrafanaTheme2 = {
  colors: {
    mode: 'light',
    getColorByName: jest.fn(() => '#000000'),
    primary: {
      main: '#3274D9',
      text: '#FFFFFF',
    },
  },
  visualization: {
    getColorByName: jest.fn(() => '#000000'),
  },
} as any;

describe('sparkChartGradient', () => {
  describe('calculateSparkLinePoints', () => {
    it('should calculate points for varying data', () => {
      const data = [0, 5, 10, 5, 0];
      const width = 100;
      const height = 50;
      const min = 0;
      const max = 10;

      const points = calculateSparkLinePoints(data, width, height, min, max);

      expect(points).toHaveLength(5);
      expect(points[0].x).toBe(0);
      expect(points[1].x).toBe(25);
      expect(points[2].x).toBe(50);
      expect(points[3].x).toBe(75);
      expect(points[4].x).toBe(100);

      // Check Y coordinates (inverted: height - normalizedValue * height)
      expect(points[0].y).toBe(50); // min value at bottom
      expect(points[2].y).toBe(0); // max value at top
    });

    it('should handle constant values with micro-variation', () => {
      const data = [5, 5, 5, 5, 5];
      const width = 100;
      const height = 50;
      const min = 5;
      const max = 5;

      const points = calculateSparkLinePoints(data, width, height, min, max);

      expect(points).toHaveLength(5);

      // All points should be near middle height (25px) with alternating +0.1/-0.1 variation
      expect(points[0].y).toBe(25.1); // index 0: even, +0.1
      expect(points[1].y).toBe(24.9); // index 1: odd, -0.1
      expect(points[2].y).toBe(25.1); // index 2: even, +0.1
      expect(points[3].y).toBe(24.9); // index 3: odd, -0.1
      expect(points[4].y).toBe(25.1); // index 4: even, +0.1

      // Verify normalized values are still 0
      points.forEach((point) => {
        expect(point.normalizedValue).toBe(0);
      });
    });

    it('should handle constant zero values', () => {
      const data = [0, 0, 0, 0];
      const width = 80;
      const height = 40;
      const min = 0;
      const max = 0;

      const points = calculateSparkLinePoints(data, width, height, min, max);

      expect(points).toHaveLength(4);

      // Should add micro-variation even for zeros
      expect(points[0].y).toBe(20.1); // height/2 + 0.1
      expect(points[1].y).toBe(19.9); // height/2 - 0.1
      expect(points[2].y).toBe(20.1);
      expect(points[3].y).toBe(19.9);
    });

    it('should handle constant negative values', () => {
      const data = [-5, -5, -5];
      const width = 60;
      const height = 30;
      const min = -5;
      const max = -5;

      const points = calculateSparkLinePoints(data, width, height, min, max);

      expect(points).toHaveLength(3);
      expect(points[0].y).toBe(15.1); // height/2 + 0.1
      expect(points[1].y).toBe(14.9); // height/2 - 0.1
      expect(points[2].y).toBe(15.1);
    });

    it('should handle single data point', () => {
      const data = [5];
      const width = 100;
      const height = 50;
      const min = 5;
      const max = 5;

      const points = calculateSparkLinePoints(data, width, height, min, max);

      expect(points).toHaveLength(1);
      expect(points[0].x).toBe(0);
      expect(points[0].y).toBe(25.1); // middle + 0.1 (index 0 is even)
    });

    it('should handle empty data', () => {
      const data: number[] = [];
      const width = 100;
      const height = 50;
      const min = 0;
      const max = 0;

      const points = calculateSparkLinePoints(data, width, height, min, max);

      expect(points).toHaveLength(0);
    });

    it('should correctly normalize values', () => {
      const data = [0, 25, 50, 75, 100];
      const width = 100;
      const height = 100;
      const min = 0;
      const max = 100;

      const points = calculateSparkLinePoints(data, width, height, min, max);

      expect(points[0].normalizedValue).toBe(0); // 0/100
      expect(points[1].normalizedValue).toBe(0.25); // 25/100
      expect(points[2].normalizedValue).toBe(0.5); // 50/100
      expect(points[3].normalizedValue).toBe(0.75); // 75/100
      expect(points[4].normalizedValue).toBe(1); // 100/100
    });

    it('should handle large constant values', () => {
      const data = [1000, 1000, 1000];
      const width = 60;
      const height = 30;
      const min = 1000;
      const max = 1000;

      const points = calculateSparkLinePoints(data, width, height, min, max);

      expect(points).toHaveLength(3);
      // Should still add micro-variation
      expect(points[0].y).toBe(15.1);
      expect(points[1].y).toBe(14.9);
      expect(points[2].y).toBe(15.1);
    });
  });

  describe('generateSparkLinePath', () => {
    it('should generate linear path for varying data', () => {
      const data = [0, 5, 10];
      const width = 100;
      const height = 50;
      const min = 0;
      const max = 10;

      const path = generateSparkLinePath(data, width, height, min, max, 'linear');

      expect(path).toContain('M'); // Move command at start
      expect(path).toContain('L'); // Line commands
      expect(path).not.toBe('');
    });

    it('should generate path for constant values with micro-variation', () => {
      const data = [5, 5, 5, 5];
      const width = 100;
      const height = 50;
      const min = 5;
      const max = 5;

      const path = generateSparkLinePath(data, width, height, min, max, 'linear');

      // Path should be generated (not empty)
      expect(path).not.toBe('');
      expect(path).toContain('M'); // Move command
      expect(path).toContain('L'); // Line commands

      // Path should contain slightly different Y values due to micro-variation
      const yValues = path.match(/\d+\.\d+/g);
      expect(yValues).not.toBeNull();
      if (yValues) {
        // Should have alternating values near 25 (25.1 and 24.9)
        const uniqueYValues = new Set(yValues.map((v) => parseFloat(v)));
        // X coordinates will be different, so we expect more than just 2 unique values
        // but the Y values should alternate
        expect(uniqueYValues.size).toBeGreaterThan(1);
      }
    });

    it('should generate step path for varying data', () => {
      const data = [0, 10, 5];
      const width = 100;
      const height = 50;
      const min = 0;
      const max = 10;

      const path = generateSparkLinePath(data, width, height, min, max, 'step');

      expect(path).toContain('M'); // Move command
      expect(path).toContain('H'); // Horizontal line commands
      expect(path).toContain('V'); // Vertical line commands
    });

    it('should generate curve path for varying data', () => {
      const data = [0, 10, 5];
      const width = 100;
      const height = 50;
      const min = 0;
      const max = 10;

      const path = generateSparkLinePath(data, width, height, min, max, 'curve');

      expect(path).toContain('M'); // Move command
      expect(path).toContain('C'); // Cubic Bézier curve commands
    });

    it('should handle single point as circle', () => {
      const data = [5];
      const width = 100;
      const height = 50;
      const min = 5;
      const max = 5;

      const path = generateSparkLinePath(data, width, height, min, max, 'linear');

      // Single point should render as arc (circle)
      expect(path).toContain('M');
      expect(path).toContain('a'); // arc command
    });

    it('should return empty string for empty data', () => {
      const data: number[] = [];
      const width = 100;
      const height = 50;
      const min = 0;
      const max = 0;

      const path = generateSparkLinePath(data, width, height, min, max, 'linear');

      expect(path).toBe('');
    });

    it('should handle constant values with different interpolation modes', () => {
      const data = [5, 5, 5];
      const width = 60;
      const height = 30;
      const min = 5;
      const max = 5;

      const linearPath = generateSparkLinePath(data, width, height, min, max, 'linear');
      const stepPath = generateSparkLinePath(data, width, height, min, max, 'step');
      const curvePath = generateSparkLinePath(data, width, height, min, max, 'curve');

      // All should generate non-empty paths
      expect(linearPath).not.toBe('');
      expect(stepPath).not.toBe('');
      expect(curvePath).not.toBe('');

      // Should contain appropriate commands
      expect(linearPath).toContain('L');
      expect(stepPath).toContain('H');
      expect(curvePath).toContain('C');
    });
  });

  describe('generateLineGradientDef', () => {
    it('should generate gradient definition for varying data', () => {
      const data = [0, 5, 10];
      const colorScheme = 'continuous-GrYlRd';
      const min = 0;
      const max = 10;
      const width = 100;
      const height = 50;

      const { gradientDef, gradientId } = generateLineGradientDef(
        data,
        colorScheme,
        min,
        max,
        mockTheme,
        width,
        height,
        'linear',
        false
      );

      expect(gradientId).toContain('spark-gradient-');
      expect(gradientDef).not.toBeNull();
    });

    it('should generate gradient for constant values', () => {
      const data = [5, 5, 5, 5];
      const colorScheme = 'continuous-GrYlRd';
      const min = 5;
      const max = 5;
      const width = 100;
      const height = 50;

      const { gradientDef, gradientId } = generateLineGradientDef(
        data,
        colorScheme,
        min,
        max,
        mockTheme,
        width,
        height,
        'linear',
        false
      );

      expect(gradientId).toContain('spark-gradient-');
      expect(gradientDef).not.toBeNull();

      // Gradient should still be created even with constant values
      // All colors will be from middle of gradient (normalizedValue = 0)
    });

    it('should handle empty data', () => {
      const data: number[] = [];
      const colorScheme = 'continuous-GrYlRd';
      const min = 0;
      const max = 0;
      const width = 100;
      const height = 50;

      const { gradientDef, gradientId } = generateLineGradientDef(
        data,
        colorScheme,
        min,
        max,
        mockTheme,
        width,
        height,
        'linear',
        false
      );

      expect(gradientId).toContain('spark-gradient-');
      expect(gradientDef).toBeNull();
    });

    it('should generate unique gradient IDs', () => {
      const data = [0, 5, 10];
      const colorScheme = 'continuous-GrYlRd';
      const min = 0;
      const max = 10;
      const width = 100;
      const height = 50;

      const result1 = generateLineGradientDef(
        data,
        colorScheme,
        min,
        max,
        mockTheme,
        width,
        height,
        'linear',
        false
      );
      const result2 = generateLineGradientDef(
        data,
        colorScheme,
        min,
        max,
        mockTheme,
        width,
        height,
        'linear',
        false
      );

      expect(result1.gradientId).not.toBe(result2.gradientId);
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle very small height', () => {
      const data = [5, 5, 5];
      const width = 100;
      const height = 1;
      const min = 5;
      const max = 5;

      const points = calculateSparkLinePoints(data, width, height, min, max);

      expect(points).toHaveLength(3);
      // Height/2 = 0.5, with variation: 0.6 and 0.4
      expect(points[0].y).toBeCloseTo(0.6, 1);
      expect(points[1].y).toBeCloseTo(0.4, 1);
    });

    it('should handle very small width', () => {
      const data = [5, 5, 5];
      const width = 1;
      const height = 50;
      const min = 5;
      const max = 5;

      const points = calculateSparkLinePoints(data, width, height, min, max);

      expect(points).toHaveLength(3);
      expect(points[0].x).toBe(0);
      expect(points[1].x).toBeCloseTo(0.5, 1);
      expect(points[2].x).toBeCloseTo(1, 1);
    });

    it('should handle negative range (min > max)', () => {
      const data = [10, 5, 0];
      const width = 100;
      const height = 50;
      const min = 10;
      const max = 0;

      // This is an edge case - normally max should be >= min
      const points = calculateSparkLinePoints(data, width, height, min, max);

      expect(points).toHaveLength(3);
      // The function should still work (range will be -10 || 1 = 1)
    });

    it('should verify micro-variation is imperceptible', () => {
      const data = [5, 5, 5, 5, 5, 5, 5, 5];
      const width = 200;
      const height = 100;
      const min = 5;
      const max = 5;

      const points = calculateSparkLinePoints(data, width, height, min, max);

      // Calculate variation
      const yValues = points.map((p) => p.y);
      const maxY = Math.max(...yValues);
      const minY = Math.min(...yValues);
      const variation = maxY - minY;

      // Variation should be approximately 0.2 pixels (imperceptible)
      // Use toBeCloseTo to handle floating-point precision
      expect(variation).toBeCloseTo(0.2, 10);

      // Should be centered around middle height
      const avgY = yValues.reduce((sum, y) => sum + y, 0) / yValues.length;
      expect(avgY).toBeCloseTo(50, 1); // Close to height/2
    });
  });
});
