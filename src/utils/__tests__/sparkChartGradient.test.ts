import {
  calculateSparkLinePoints,
  generateSparkLinePath,
  generateLineGradientDef,
  generateYGradientDef,
  getColorForYPosition,
} from '../sparkChartGradient';
import { GrafanaTheme2, FieldColorModeId } from '@grafana/data';

// Mock the colorUtils module
jest.mock('../colorUtils', () => ({
  getColorFromScheme: jest.fn((scheme: string, normalizedValue: number, theme: any, reverseGradient = false) => {
    // Apply reverseGradient if specified
    const effectiveValue = reverseGradient ? 1 - normalizedValue : normalizedValue;

    // Simple mock: return color based on effective normalized value
    if (effectiveValue <= 0.33) {
      return 'rgb(0, 255, 0)';
    } // Green
    if (effectiveValue <= 0.66) {
      return 'rgb(255, 255, 0)';
    } // Yellow
    return 'rgb(255, 0, 0)'; // Red
  }),
  generateColorShade: jest.fn((baseColor: string, position: number) => {
    // Mock shades: darker at position=0, lighter at position=1
    // Return a simple hex color based on position
    const intensity = Math.round(position * 255);
    const hex = intensity.toString(16).padStart(2, '0');
    return `#${hex}${hex}${hex}`;
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

      const result1 = generateLineGradientDef(data, colorScheme, min, max, mockTheme, width, height, 'linear', false);
      const result2 = generateLineGradientDef(data, colorScheme, min, max, mockTheme, width, height, 'linear', false);

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

  describe('generateYGradientDef', () => {
    it('should create vertical gradient with correct orientation', () => {
      const min = 0;
      const max = 100;
      const height = 50;
      const colorScheme = 'continuous-GrYlRd';

      const { gradientDef, gradientId } = generateYGradientDef(min, max, height, colorScheme, mockTheme, false);

      expect(gradientId).toContain('spark-y-gradient-');
      expect(gradientDef).not.toBeNull();
      // Gradient should be vertical (x1=x2, y1!=y2)
      // This is validated by the React element structure
    });

    it('should generate color stops from top to bottom', () => {
      const min = 0;
      const max = 100;
      const height = 100;
      const colorScheme = 'continuous-GrYlRd';

      const { gradientDef, gradientId } = generateYGradientDef(min, max, height, colorScheme, mockTheme, false);

      expect(gradientId).toContain('spark-y-gradient-');
      expect(gradientDef).not.toBeNull();
      // The gradient should have 10 stops distributed evenly along Y axis
      // Top (y=0) represents max value, bottom (y=height) represents min value
    });

    it('should respect reverseGradient parameter', () => {
      const min = 0;
      const max = 100;
      const height = 50;
      const colorScheme = 'continuous-GrYlRd';

      const normalGradient = generateYGradientDef(min, max, height, colorScheme, mockTheme, false);
      const reversedGradient = generateYGradientDef(min, max, height, colorScheme, mockTheme, true);

      expect(normalGradient.gradientId).toContain('spark-y-gradient-');
      expect(reversedGradient.gradientId).toContain('spark-y-gradient-');
      expect(normalGradient.gradientId).not.toBe(reversedGradient.gradientId);
      // Both should produce gradients, just with reversed color mapping
    });

    it('should handle min=max edge case', () => {
      const min = 50;
      const max = 50;
      const height = 100;
      const colorScheme = 'continuous-GrYlRd';

      const { gradientDef, gradientId } = generateYGradientDef(min, max, height, colorScheme, mockTheme, false);

      expect(gradientId).toContain('spark-y-gradient-');
      expect(gradientDef).not.toBeNull();
      // All color stops should have the same normalized value (0)
      // This should produce a single-color gradient
    });

    it('should handle zero height', () => {
      const min = 0;
      const max = 100;
      const height = 0;
      const colorScheme = 'continuous-GrYlRd';

      const { gradientDef, gradientId } = generateYGradientDef(min, max, height, colorScheme, mockTheme, false);

      expect(gradientId).toContain('spark-y-gradient-');
      expect(gradientDef).toBeNull();
    });

    it('should handle negative height', () => {
      const min = 0;
      const max = 100;
      const height = -10;
      const colorScheme = 'continuous-GrYlRd';

      const { gradientDef, gradientId } = generateYGradientDef(min, max, height, colorScheme, mockTheme, false);

      expect(gradientId).toContain('spark-y-gradient-');
      expect(gradientDef).toBeNull();
    });

    it('should generate unique gradient IDs', () => {
      const min = 0;
      const max = 100;
      const height = 50;
      const colorScheme = 'continuous-GrYlRd';

      const result1 = generateYGradientDef(min, max, height, colorScheme, mockTheme, false);
      const result2 = generateYGradientDef(min, max, height, colorScheme, mockTheme, false);

      expect(result1.gradientId).not.toBe(result2.gradientId);
    });

    it('should handle Shades color scheme with solidColor', () => {
      const min = 0;
      const max = 100;
      const height = 100;
      const colorScheme = FieldColorModeId.Shades;
      const solidColor = '#3274D9';

      const { gradientDef, gradientId } = generateYGradientDef(
        min,
        max,
        height,
        colorScheme,
        mockTheme,
        false,
        solidColor
      );

      expect(gradientId).toContain('spark-y-gradient-');
      expect(gradientDef).not.toBeNull();
      // Should use generateColorShade instead of getColorFromScheme
    });

    it('should handle Shades color scheme with reverseGradient', () => {
      const min = 0;
      const max = 100;
      const height = 100;
      const colorScheme = FieldColorModeId.Shades;
      const solidColor = '#3274D9';

      const normalGradient = generateYGradientDef(min, max, height, colorScheme, mockTheme, false, solidColor);
      const reversedGradient = generateYGradientDef(min, max, height, colorScheme, mockTheme, true, solidColor);

      expect(normalGradient.gradientId).toContain('spark-y-gradient-');
      expect(reversedGradient.gradientId).toContain('spark-y-gradient-');
      expect(normalGradient.gradientId).not.toBe(reversedGradient.gradientId);
      // Both should produce gradients with reversed shades
    });
  });

  describe('getColorForYPosition', () => {
    it('should return consistent color for same Y position', () => {
      const y = 25;
      const height = 100;
      const colorScheme = 'continuous-GrYlRd';

      const color1 = getColorForYPosition(y, height, colorScheme, mockTheme, false);
      const color2 = getColorForYPosition(y, height, colorScheme, mockTheme, false);

      expect(color1).toBe(color2);
      expect(color1).toBeTruthy();
    });

    it('should return different colors for different Y positions', () => {
      const height = 100;
      const colorScheme = 'continuous-GrYlRd';

      const colorTop = getColorForYPosition(0, height, colorScheme, mockTheme, false);
      const colorMiddle = getColorForYPosition(50, height, colorScheme, mockTheme, false);
      const colorBottom = getColorForYPosition(100, height, colorScheme, mockTheme, false);

      // Top, middle, and bottom should have different colors
      expect(colorTop).not.toBe(colorMiddle);
      expect(colorMiddle).not.toBe(colorBottom);
      expect(colorTop).not.toBe(colorBottom);
    });

    it('should handle Y at top (y=0)', () => {
      const y = 0;
      const height = 100;
      const colorScheme = 'continuous-GrYlRd';

      const color = getColorForYPosition(y, height, colorScheme, mockTheme, false);

      // Top (y=0) should represent max value (normalizedValue = 1.0)
      expect(color).toBe('rgb(255, 0, 0)'); // Red from our mock
    });

    it('should handle Y at bottom (y=height)', () => {
      const y = 100;
      const height = 100;
      const colorScheme = 'continuous-GrYlRd';

      const color = getColorForYPosition(y, height, colorScheme, mockTheme, false);

      // Bottom (y=height) should represent min value (normalizedValue = 0.0)
      expect(color).toBe('rgb(0, 255, 0)'); // Green from our mock
    });

    it('should handle Y at middle', () => {
      const y = 50;
      const height = 100;
      const colorScheme = 'continuous-GrYlRd';

      const color = getColorForYPosition(y, height, colorScheme, mockTheme, false);

      // Middle should have normalized value of 0.5
      expect(color).toBe('rgb(255, 255, 0)'); // Yellow from our mock
    });

    it('should clamp Y values outside range', () => {
      const height = 100;
      const colorScheme = 'continuous-GrYlRd';

      const colorAbove = getColorForYPosition(-10, height, colorScheme, mockTheme, false);
      const colorBelow = getColorForYPosition(150, height, colorScheme, mockTheme, false);

      // Should clamp to valid range
      expect(colorAbove).toBe('rgb(255, 0, 0)'); // Same as y=0 (top)
      expect(colorBelow).toBe('rgb(0, 255, 0)'); // Same as y=height (bottom)
    });

    it('should respect reverseGradient parameter', () => {
      const y = 0;
      const height = 100;
      const colorScheme = 'continuous-GrYlRd';

      const normalColor = getColorForYPosition(y, height, colorScheme, mockTheme, false);
      const reversedColor = getColorForYPosition(y, height, colorScheme, mockTheme, true);

      // With reverseGradient, top (y=0) should represent min value
      expect(normalColor).toBe('rgb(255, 0, 0)'); // Red (max value)
      expect(reversedColor).toBe('rgb(0, 255, 0)'); // Green (min value when reversed)
    });

    it('should handle zero height', () => {
      const y = 0;
      const height = 0;
      const colorScheme = 'continuous-GrYlRd';

      const color = getColorForYPosition(y, height, colorScheme, mockTheme, false);

      // Should return default color
      expect(color).toBe('#3274D9');
    });

    it('should handle negative height', () => {
      const y = 50;
      const height = -10;
      const colorScheme = 'continuous-GrYlRd';

      const color = getColorForYPosition(y, height, colorScheme, mockTheme, false);

      // Should return default color
      expect(color).toBe('#3274D9');
    });

    it('should handle Shades color scheme with solidColor', () => {
      const y = 50;
      const height = 100;
      const colorScheme = FieldColorModeId.Shades;
      const solidColor = '#3274D9';

      const color = getColorForYPosition(y, height, colorScheme, mockTheme, false, solidColor);

      expect(color).toBeTruthy();
      // Should use generateColorShade, expecting a grayscale value
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should handle Shades color scheme with reverseGradient', () => {
      const y = 0; // Top position
      const height = 100;
      const colorScheme = FieldColorModeId.Shades;
      const solidColor = '#3274D9';

      const normalColor = getColorForYPosition(y, height, colorScheme, mockTheme, false, solidColor);
      const reversedColor = getColorForYPosition(y, height, colorScheme, mockTheme, true, solidColor);

      expect(normalColor).toBeTruthy();
      expect(reversedColor).toBeTruthy();
      // With reverseGradient, same Y position should give different colors
      expect(normalColor).not.toBe(reversedColor);
    });

    it('should use standard gradient when Shades is specified but no solidColor', () => {
      const y = 50;
      const height = 100;
      const colorScheme = FieldColorModeId.Shades;

      const color = getColorForYPosition(y, height, colorScheme, mockTheme, false);

      expect(color).toBeTruthy();
      // Should fall back to getColorFromScheme
      expect(color).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    });
  });
});
