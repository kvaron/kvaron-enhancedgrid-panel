import { applyCellStyles } from '../src/utils/highlightEngine';
import { HighlightRule, RowContext } from '../src/types';
import { GrafanaTheme2 } from '@grafana/data';

describe('Spark Chart Scale Modes', () => {
  const mockTheme = {} as GrafanaTheme2;

  const createContext = (row: any, globalRanges?: any): RowContext => ({
    row,
    rowIndex: 0,
    currentField: 'chart',
    theme: mockTheme,
    sparkChartGlobalRanges: globalRanges,
  });

  const baseRule: HighlightRule = {
    id: 'test-rule',
    targetFields: ['chart'],
    conditions: [],
    operator: 'AND',
    sparkChartMode: 'line',
    sparkChartSourceField: 'chart',
    sparkChartColorMode: 'scheme',
    sparkChartColorScheme: 'Greens',
    sparkChartHeight: 80,
  };

  describe('Cell mode (local min/max)', () => {
    it('should use undefined scaleMin/scaleMax for cell mode', () => {
      const rule: HighlightRule = {
        ...baseRule,
        sparkChartScaleMode: 'cell',
      };

      const context = createContext({
        chart: [10, 20, 30, 40, 50],
      });

      const result = applyCellStyles([rule], context);

      console.log('Cell mode result:', result.sparkChartConfig);
      expect(result.sparkChartConfig).toBeDefined();
      expect(result.sparkChartConfig?.scaleMin).toBeUndefined();
      expect(result.sparkChartConfig?.scaleMax).toBeUndefined();
      expect(result.sparkChartConfig?.scaleMode).toBe('cell');
    });
  });

  describe('Column mode (field-based scale)', () => {
    it('should extract scaleMin/scaleMax from array field', () => {
      const rule: HighlightRule = {
        ...baseRule,
        sparkChartScaleMode: 'column',
        sparkChartScaleField: 'scaleData',
      };

      const context = createContext({
        chart: [10, 20, 30],
        scaleData: [0, 100], // Scale from 0 to 100
      });

      const result = applyCellStyles([rule], context);

      console.log('Column mode (array) result:', result.sparkChartConfig);
      expect(result.sparkChartConfig).toBeDefined();
      expect(result.sparkChartConfig?.scaleMin).toBe(0);
      expect(result.sparkChartConfig?.scaleMax).toBe(100);
      expect(result.sparkChartConfig?.scaleMode).toBe('column');
    });

    it('should use number field as scaleMax with 0 as scaleMin', () => {
      const rule: HighlightRule = {
        ...baseRule,
        sparkChartScaleMode: 'column',
        sparkChartScaleField: 'maxValue',
      };

      const context = createContext({
        chart: [10, 20, 30],
        maxValue: 100,
      });

      const result = applyCellStyles([rule], context);

      console.log('Column mode (number) result:', result.sparkChartConfig);
      expect(result.sparkChartConfig).toBeDefined();
      expect(result.sparkChartConfig?.scaleMin).toBe(0);
      expect(result.sparkChartConfig?.scaleMax).toBe(100);
    });

    it('should parse string field as "min,max" format', () => {
      const rule: HighlightRule = {
        ...baseRule,
        sparkChartScaleMode: 'column',
        sparkChartScaleField: 'scaleRange',
      };

      const context = createContext({
        chart: [10, 20, 30],
        scaleRange: '-50, 200',
      });

      const result = applyCellStyles([rule], context);

      console.log('Column mode (string) result:', result.sparkChartConfig);
      expect(result.sparkChartConfig).toBeDefined();
      expect(result.sparkChartConfig?.scaleMin).toBe(-50);
      expect(result.sparkChartConfig?.scaleMax).toBe(200);
    });
  });

  describe('Global mode (column-wide min/max)', () => {
    it('should use global ranges when available', () => {
      const rule: HighlightRule = {
        ...baseRule,
        sparkChartScaleMode: 'global',
      };

      const context = createContext(
        {
          chart: [10, 20, 30],
        },
        {
          chart: { min: 5, max: 150 },
        }
      );

      const result = applyCellStyles([rule], context);

      console.log('Global mode result:', result.sparkChartConfig);
      expect(result.sparkChartConfig).toBeDefined();
      expect(result.sparkChartConfig?.scaleMin).toBe(5);
      expect(result.sparkChartConfig?.scaleMax).toBe(150);
      expect(result.sparkChartConfig?.scaleMode).toBe('global');
    });

    it('should handle missing global ranges gracefully', () => {
      const rule: HighlightRule = {
        ...baseRule,
        sparkChartScaleMode: 'global',
      };

      const context = createContext({
        chart: [10, 20, 30],
      });

      const result = applyCellStyles([rule], context);

      console.log('Global mode (no ranges) result:', result.sparkChartConfig);
      expect(result.sparkChartConfig).toBeDefined();
      expect(result.sparkChartConfig?.scaleMin).toBeUndefined();
      expect(result.sparkChartConfig?.scaleMax).toBeUndefined();
    });
  });

  describe('Bar chart scale modes', () => {
    it('should apply scale modes to bar charts', () => {
      const rule: HighlightRule = {
        ...baseRule,
        sparkChartMode: 'bar',
        sparkChartScaleMode: 'column',
        sparkChartScaleField: 'scaleData',
      };

      const context = createContext({
        chart: [10, 20, 30],
        scaleData: [0, 50],
      });

      const result = applyCellStyles([rule], context);

      console.log('Bar chart scale result:', result.sparkChartConfig);
      expect(result.sparkChartConfig).toBeDefined();
      expect(result.sparkChartConfig?.mode).toBe('bar');
      expect(result.sparkChartConfig?.scaleMin).toBe(0);
      expect(result.sparkChartConfig?.scaleMax).toBe(50);
    });
  });

  describe('Scale with solid color mode', () => {
    it('should still calculate scale for solid color mode', () => {
      const rule: HighlightRule = {
        ...baseRule,
        sparkChartColorMode: 'solid',
        sparkChartSolidColor: '#FF0000',
        sparkChartScaleMode: 'column',
        sparkChartScaleField: 'scaleData',
      };

      const context = createContext({
        chart: [10, 20, 30],
        scaleData: [0, 100],
      });

      const result = applyCellStyles([rule], context);

      console.log('Solid color with scale result:', result.sparkChartConfig);
      expect(result.sparkChartConfig).toBeDefined();
      expect(result.sparkChartConfig?.scaleMin).toBe(0);
      expect(result.sparkChartConfig?.scaleMax).toBe(100);
      expect(result.sparkChartConfig?.colorMode).toBe('solid');
    });
  });
});
