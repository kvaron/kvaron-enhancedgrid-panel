import React from 'react';
import { GrafanaTheme2, FieldColorModeId } from '@grafana/data';
import { getColorFromScheme, generateColorShade } from './colorUtils';

/**
 * Point data with screen coordinates and normalized value.
 */
export interface SparkLinePoint {
  x: number;
  y: number;
  normalizedValue: number;
}

/**
 * Calculate screen coordinates from data values.
 *
 * @param data - Array of numeric values
 * @param width - Available width in pixels
 * @param height - Available height in pixels
 * @param min - Minimum value for normalization
 * @param max - Maximum value for normalization
 * @returns Array of points with x, y, and normalizedValue
 */
export function calculateSparkLinePoints(
  data: number[],
  width: number,
  height: number,
  min: number,
  max: number
): SparkLinePoint[] {
  if (data.length === 0) {
    return [];
  }

  const range = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);

  return data.map((value, index) => {
    const normalizedValue = (value - min) / range;
    const x = index * step;

    // When all values are the same (range is effectively 0), render at middle height
    // Add tiny alternating variation (0.1px) to force SVG rendering of horizontal lines
    const y = max === min ? height / 2 + (index % 2 === 0 ? 0.1 : -0.1) : height - normalizedValue * height;

    return { x, y, normalizedValue };
  });
}

/**
 * Generate SVG path data with interpolation mode support.
 *
 * @param data - Array of numeric values
 * @param width - Available width in pixels
 * @param height - Available height in pixels
 * @param min - Minimum value for normalization
 * @param max - Maximum value for normalization
 * @param interpolation - Interpolation mode: 'linear', 'step', or 'curve'
 * @returns SVG path d attribute string
 */
export function generateSparkLinePath(
  data: number[],
  width: number,
  height: number,
  min: number,
  max: number,
  interpolation: 'linear' | 'step' | 'curve' = 'linear'
): string {
  if (data.length === 0) {
    return '';
  }

  const points = calculateSparkLinePoints(data, width, height, min, max);

  if (points.length === 0) {
    return '';
  }

  // Handle single point case
  if (points.length === 1) {
    const p = points[0];
    // Draw a small circle using a path (arc)
    const r = 2; // radius
    return `M ${p.x - r},${p.y} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`;
  }

  switch (interpolation) {
    case 'linear':
      return generateLinearPath(points);
    case 'step':
      return generateStepPath(points);
    case 'curve':
      return generateCurvePath(points);
    default:
      return generateLinearPath(points);
  }
}

/**
 * Generate linear path (straight lines between points).
 */
function generateLinearPath(points: SparkLinePoint[]): string {
  const pathData: string[] = [];

  points.forEach((point, index) => {
    if (index === 0) {
      pathData.push(`M ${point.x} ${point.y}`);
    } else {
      pathData.push(`L ${point.x} ${point.y}`);
    }
  });

  return pathData.join(' ');
}

/**
 * Generate step path (horizontal then vertical lines).
 * Creates a "staircase" pattern.
 */
function generateStepPath(points: SparkLinePoint[]): string {
  const pathData: string[] = [];

  points.forEach((point, index) => {
    if (index === 0) {
      pathData.push(`M ${point.x} ${point.y}`);
    } else {
      // Horizontal line to current x, then vertical to current y
      pathData.push(`H ${point.x}`);
      pathData.push(`V ${point.y}`);
    }
  });

  return pathData.join(' ');
}

/**
 * Generate curve path with smooth Bézier curves between points.
 * Uses cubic Bézier with automatically calculated control points.
 */
function generateCurvePath(points: SparkLinePoint[]): string {
  const pathData: string[] = [];

  points.forEach((point, index) => {
    if (index === 0) {
      pathData.push(`M ${point.x} ${point.y}`);
    } else {
      const prevPoint = points[index - 1];

      // Calculate control points for smooth curves
      // Control point 1: extend from previous point towards current
      const cp1x = prevPoint.x + (point.x - prevPoint.x) * 0.5;
      const cp1y = prevPoint.y;

      // Control point 2: approach current point from direction of next (or mirror of previous if last)
      const cp2x = point.x - (point.x - prevPoint.x) * 0.5;
      const cp2y = point.y;

      // Cubic Bézier curve
      pathData.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`);
    }
  });

  return pathData.join(' ');
}

/**
 * Generate SVG linearGradient definition for continuous gradient coloring
 * across the entire line path, with color stops at each data point.
 *
 * @param data - Array of numeric values
 * @param colorScheme - Grafana color scheme ID (e.g., 'continuous-GrYlRd')
 * @param min - Minimum value for normalization
 * @param max - Maximum value for normalization
 * @param theme - Grafana theme for color resolution
 * @param width - Width of the chart for path length calculation
 * @param height - Height of the chart for path length calculation
 * @param interpolation - Interpolation mode for path length calculation
 * @returns Object with unique gradient ID and React SVG element
 */
export function generateLineGradientDef(
  data: number[],
  colorScheme: string,
  min: number,
  max: number,
  theme: GrafanaTheme2,
  width: number,
  height: number,
  interpolation: 'linear' | 'step' | 'curve' = 'linear',
  reverseGradient = false
): { gradientDef: React.ReactNode; gradientId: string } {
  // Generate unique ID for this gradient
  const gradientId = `spark-gradient-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  if (data.length === 0) {
    return { gradientDef: null, gradientId };
  }

  const range = max - min || 1;

  // Calculate color stops for each data point based on horizontal position
  // Since the gradient is horizontal and points are evenly spaced, use X position
  const stops = data.map((value, index) => {
    // Position along the X-axis (0-100%) - points are evenly spaced
    const offset = data.length > 1 ? (index / (data.length - 1)) * 100 : 50;

    // Normalized value for color calculation (0-1)
    const normalizedValue = (value - min) / range;

    // Get color from scheme using existing utility
    const color = getColorFromScheme(colorScheme, normalizedValue, theme, reverseGradient);

    return { offset, color };
  });

  // For step mode, we need to handle horizontal and vertical segments differently
  // Horizontal segments: maintain current color
  // Vertical segments: interpolate to next color
  let allStops = stops;
  if (interpolation === 'step' && stops.length > 1) {
    allStops = [];
    for (let i = 0; i < stops.length; i++) {
      const currentOffset = stops[i].offset;
      const currentColor = stops[i].color;

      if (i === 0) {
        // First point: start with its color
        allStops.push({ offset: currentOffset, color: currentColor });
      } else {
        const prevOffset = stops[i - 1].offset;
        const prevColor = stops[i - 1].color;
        const midOffset = (prevOffset + currentOffset) / 2;

        // The horizontal segment goes from previous point to midpoint
        // Maintain the previous color
        allStops.push({ offset: prevOffset, color: prevColor });

        // At the midpoint (where vertical segment would be), start transitioning
        // This is where the vertical line happens in step mode
        allStops.push({ offset: midOffset - 0.1, color: prevColor });
        allStops.push({ offset: midOffset + 0.1, color: currentColor });

        // After the vertical segment, maintain current color until next vertical
        allStops.push({ offset: currentOffset, color: currentColor });
      }
    }

    // Remove duplicate offsets and ensure proper ordering
    const uniqueStops = allStops.filter((stop, index, arr) => index === 0 || stop.offset !== arr[index - 1].offset);
    allStops = uniqueStops;
  }

  // Create SVG linearGradient element
  const gradientDef = React.createElement(
    'linearGradient',
    {
      id: gradientId,
      key: gradientId,
      x1: '0%',
      y1: '0%',
      x2: '100%',
      y2: '0%', // Horizontal gradient along path
    },
    allStops.map((stop, index) =>
      React.createElement('stop', {
        key: `${gradientId}-stop-${index}`,
        offset: `${stop.offset}%`,
        stopColor: stop.color,
      })
    )
  );

  return { gradientDef, gradientId };
}

/**
 * Generate vertical gradient definition for Y-direction coloring.
 * Color is determined by Y position only - same height always gets same color.
 *
 * @param min - Minimum value for normalization (from scaling mode)
 * @param max - Maximum value for normalization (from scaling mode)
 * @param height - Chart height in pixels
 * @param colorScheme - Grafana color scheme ID
 * @param theme - Grafana theme for color resolution
 * @param reverseGradient - Flip gradient direction
 * @param solidColor - Base color for Shades mode (optional)
 * @returns Object with unique gradient ID and React SVG element
 */
export function generateYGradientDef(
  min: number,
  max: number,
  height: number,
  colorScheme: string,
  theme: GrafanaTheme2,
  reverseGradient = false,
  solidColor?: string
): { gradientDef: React.ReactNode; gradientId: string } {
  // Generate unique ID for this gradient
  const gradientId = `spark-y-gradient-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  if (height <= 0) {
    return { gradientDef: null, gradientId };
  }

  // Create color stops evenly distributed along Y axis
  // Using 10 stops for smooth gradient transitions
  const numStops = 10;
  const stops: Array<{ y: number; color: string }> = [];

  for (let i = 0; i < numStops; i++) {
    // Y position from top (0) to bottom (height)
    const y = (i / (numStops - 1)) * height;

    // Normalized value for color calculation
    // Top (y=0) represents max value (1.0), bottom (y=height) represents min value (0.0)
    let normalizedValue = 1 - y / height;

    // Apply reverseGradient to normalizedValue
    if (reverseGradient) {
      normalizedValue = 1 - normalizedValue;
    }

    // Get color based on scheme type
    let color: string;
    if (colorScheme === FieldColorModeId.Shades && solidColor) {
      // Shades: generate gradient from dark to light using base color
      color = generateColorShade(solidColor, normalizedValue);
    } else {
      // Standard gradient schemes: use getColorFromScheme without reverseGradient
      // (we already applied reverseGradient to normalizedValue above)
      color = getColorFromScheme(colorScheme, normalizedValue, theme, false);
    }

    stops.push({ y, color });
  }

  // Create SVG linearGradient element with vertical orientation
  const gradientDef = React.createElement(
    'linearGradient',
    {
      id: gradientId,
      key: gradientId,
      gradientUnits: 'userSpaceOnUse',
      x1: 0,
      y1: 0,
      x2: 0,
      y2: height,
    },
    stops.map((stop, index) =>
      React.createElement('stop', {
        key: `${gradientId}-stop-${index}`,
        offset: `${(stop.y / height) * 100}%`,
        stopColor: stop.color,
      })
    )
  );

  return { gradientDef, gradientId };
}

/**
 * Get color for a specific Y position in the chart.
 * Used for elements that need solid fill at their Y position.
 *
 * @param y - Y coordinate in pixels (0 = top, height = bottom)
 * @param height - Chart height in pixels
 * @param colorScheme - Grafana color scheme ID
 * @param theme - Grafana theme for color resolution
 * @param reverseGradient - Flip gradient direction
 * @param solidColor - Base color for Shades mode (optional)
 * @returns Color string for the given Y position
 */
export function getColorForYPosition(
  y: number,
  height: number,
  colorScheme: string,
  theme: GrafanaTheme2,
  reverseGradient = false,
  solidColor?: string
): string {
  if (height <= 0) {
    return '#3274D9'; // Default blue
  }

  // Clamp y to valid range
  const clampedY = Math.max(0, Math.min(height, y));

  // Normalized value for color calculation
  // Top (y=0) represents max value (1.0), bottom (y=height) represents min value (0.0)
  let normalizedValue = 1 - clampedY / height;

  // Apply reverseGradient to normalizedValue
  if (reverseGradient) {
    normalizedValue = 1 - normalizedValue;
  }

  // Get color based on scheme type
  if (colorScheme === FieldColorModeId.Shades && solidColor) {
    // Shades: generate gradient from dark to light using base color
    return generateColorShade(solidColor, normalizedValue);
  } else {
    // Standard gradient schemes: use getColorFromScheme without reverseGradient
    // (we already applied reverseGradient to normalizedValue above)
    return getColorFromScheme(colorScheme, normalizedValue, theme, false);
  }
}
