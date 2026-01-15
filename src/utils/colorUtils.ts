import { GrafanaTheme2, FieldColorModeId, getFieldColorMode } from '@grafana/data';

/**
 * Get a color from a Grafana color scheme at a specific position (0-1).
 *
 * @param colorSchemeId - The color scheme ID (e.g., 'continuous-GrYlRd', 'continuous-blues')
 * @param position - Position in the gradient (0 = start, 1 = end)
 * @param theme - Grafana theme for color resolution
 * @returns Hex color string
 */
export function getColorFromScheme(
  colorSchemeId: string,
  position: number,
  theme: GrafanaTheme2,
  reverseGradient = false
): string {
  // Clamp position to 0-1 range
  const clampedPosition = Math.max(0, Math.min(1, position));

  // Reverse the position if requested
  const effectivePosition = reverseGradient ? 1 - clampedPosition : clampedPosition;

  // Get the color mode from registry
  const colorMode = getFieldColorMode(colorSchemeId);

  if (!colorMode) {
    // Fallback to a default color if scheme not found
    console.warn(`Color scheme '${colorSchemeId}' not found, using fallback`);
    return theme.colors.text.primary;
  }

  // Create a minimal field object for the calculator
  const field = {
    name: '',
    type: 'number' as const,
    config: {
      color: {
        mode: colorSchemeId,
      },
    },
    values: [],
  };

  // Get calculator function
  const calculator = colorMode.getCalculator(field as any, theme);

  // Get color at the specified position
  // calculator(value, percent, threshold) - we use percent for gradient position
  const color = calculator(0, effectivePosition);

  return color;
}

/**
 * Calculate contrasting text color for best readability.
 * Uses simple luminance calculation - white text on dark backgrounds, black text on light backgrounds.
 *
 * @param backgroundColor - Hex color string (e.g., '#ff0000' or 'rgb(255, 0, 0)')
 * @returns '#ffffff' for dark backgrounds, '#000000' for light backgrounds
 */
export function getContrastingTextColor(backgroundColor: string): string {
  const luminance = getRelativeLuminance(backgroundColor);

  // Use white text for dark backgrounds (luminance < 0.5)
  // Use black text for light backgrounds (luminance >= 0.5)
  return luminance < 0.5 ? '#ffffff' : '#000000';
}

/**
 * Calculate relative luminance for a color (0 = black, 1 = white).
 * Uses the WCAG formula for perceived brightness.
 *
 * @param color - Hex color string (e.g., '#ff0000') or rgb/rgba string
 * @returns Luminance value between 0 and 1
 */
function getRelativeLuminance(color: string): number {
  const rgb = parseColor(color);

  if (!rgb) {
    // Default to medium luminance if color parsing fails
    return 0.5;
  }

  // Convert RGB values to 0-1 range
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  // Apply gamma correction
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate relative luminance (WCAG formula)
  const luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;

  return luminance;
}

/**
 * Parse a color string into RGB components.
 * Supports hex (#RGB, #RRGGBB) and rgb/rgba formats.
 *
 * @param color - Color string
 * @returns RGB object or null if parsing fails
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Trim whitespace
  color = color.trim();

  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);

    // Handle #RGB format
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b };
    }

    // Handle #RRGGBB format
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
  }

  // Handle rgb() or rgba() format
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return { r, g, b };
  }

  // Parsing failed
  return null;
}

/**
 * Get list of available continuous color scheme IDs for dropdown selection.
 * Returns color schemes suitable for gradient application.
 */
export function getAvailableColorSchemes(): Array<{ label: string; value: string }> {
  return [
    // Multi-hue diverging schemes
    { label: 'Green-Yellow-Red', value: FieldColorModeId.ContinuousGrYlRd },
    { label: 'Red-Yellow-Green', value: FieldColorModeId.ContinuousRdYlGr },
    { label: 'Blue-Yellow-Red', value: FieldColorModeId.ContinuousBlYlRd },
    { label: 'Yellow-Red', value: FieldColorModeId.ContinuousYlRd },
    { label: 'Blue-Purple', value: FieldColorModeId.ContinuousBlPu },
    { label: 'Yellow-Blue', value: FieldColorModeId.ContinuousYlBl },

    // Single-hue sequential schemes
    { label: 'Blues', value: FieldColorModeId.ContinuousBlues },
    { label: 'Reds', value: FieldColorModeId.ContinuousReds },
    { label: 'Greens', value: FieldColorModeId.ContinuousGreens },
    { label: 'Purples', value: FieldColorModeId.ContinuousPurples },
  ];
}

/**
 * Generate a gradient of shades from dark to light for a given base color.
 * @param baseColor - The base color in hex format (e.g., '#3274D9')
 * @param position - Position in the gradient (0 = darkest, 1 = lightest)
 * @returns Hex color string
 */
export function generateColorShade(baseColor: string, position: number): string {
  const rgb = parseColor(baseColor);
  if (!rgb) {
    return baseColor;
  }

  // Clamp position to 0-1
  const clampedPosition = Math.max(0, Math.min(1, position));

  // Generate shades from dark (0) to light (1)
  // At position 0: 30% of original color (dark)
  // At position 0.5: original color
  // At position 1: blend with white to 90% lightness

  let r: number, g: number, b: number;

  if (clampedPosition < 0.5) {
    // Dark to original (0 to 0.5)
    const t = clampedPosition * 2; // 0 to 1
    const darkFactor = 0.3 + t * 0.7; // 0.3 to 1.0
    r = Math.round(rgb.r * darkFactor);
    g = Math.round(rgb.g * darkFactor);
    b = Math.round(rgb.b * darkFactor);
  } else {
    // Original to light (0.5 to 1)
    const t = (clampedPosition - 0.5) * 2; // 0 to 1
    r = Math.round(rgb.r + (255 - rgb.r) * t * 0.7);
    g = Math.round(rgb.g + (255 - rgb.g) * t * 0.7);
    b = Math.round(rgb.b + (255 - rgb.b) * t * 0.7);
  }

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Get a color from the classic palette scheme by index.
 * Returns colors in sequence, cycling through the palette.
 * @param index - The index/position in the series
 * @param theme - Grafana theme
 * @returns Hex color string
 */
export function getClassicPaletteColor(index: number, theme: GrafanaTheme2): string {
  // Use Grafana's classic palette colors
  const classicColors = [
    theme.visualization.getColorByName('green'),
    theme.visualization.getColorByName('yellow'),
    theme.visualization.getColorByName('red'),
    theme.visualization.getColorByName('blue'),
    theme.visualization.getColorByName('orange'),
    theme.visualization.getColorByName('purple'),
    theme.visualization.getColorByName('light-blue'),
    theme.visualization.getColorByName('light-green'),
    theme.visualization.getColorByName('light-yellow'),
    theme.visualization.getColorByName('light-red'),
  ];

  return classicColors[index % classicColors.length];
}

/**
 * Get a color based on threshold values.
 * @param value - The numeric value to evaluate
 * @param thresholds - Panel threshold configuration from context
 * @param theme - Grafana theme
 * @returns Hex color string
 */
export function getThresholdColor(value: number, thresholds: any, theme: GrafanaTheme2): string {
  if (!thresholds || !thresholds.steps || thresholds.steps.length === 0) {
    return theme.colors.text.primary;
  }

  // Thresholds are sorted from lowest to highest
  // Find the highest threshold that the value exceeds
  let color = thresholds.steps[0].color;

  for (const step of thresholds.steps) {
    if (value >= step.value) {
      color = step.color;
    } else {
      break;
    }
  }

  // Resolve color name to actual hex color
  if (typeof color === 'string') {
    // If it's a named color, resolve it
    if (!color.startsWith('#') && !color.startsWith('rgb')) {
      return theme.visualization.getColorByName(color);
    }
    return color;
  }

  return theme.colors.text.primary;
}

/**
 * Parameters for spark chart segment color determination.
 */
export interface SparkChartColorParams {
  /** Index of the segment in the data array */
  index: number;
  /** Raw value at this segment */
  value: number;
  /** Normalized value (0-1) for gradient positioning */
  normalizedValue: number;
  /** Total number of data points */
  dataLength: number;
  /** Color mode: 'solid' or 'scheme' */
  colorMode: 'solid' | 'scheme';
  /** Solid color to use when colorMode is 'solid' */
  solidColor?: string;
  /** Color scheme ID for gradient coloring */
  colorScheme?: string;
  /** Pre-defined stack colors by position */
  stackColors?: Record<number, string>;
  /** Grafana theme for color resolution */
  theme: GrafanaTheme2;
  /** Reverse the gradient direction */
  reverseGradient?: boolean;
}

/** Default blue color used when no color configuration is provided */
const DEFAULT_SPARK_COLOR = '#3274D9';

/** Default colors for stack mode when no configuration is provided */
const DEFAULT_STACK_COLORS = ['#73BF69', '#F2CC0C', '#FF9830', '#F2495C', '#B877D9'];

/**
 * Get the color for a spark chart segment.
 * Consolidates color determination logic for line, bar, and stack charts.
 *
 * @param params - Color parameters including index, value, colorMode, etc.
 * @returns Hex color string
 */
export function getSparkChartSegmentColor(params: SparkChartColorParams): string {
  const { index, value, normalizedValue, dataLength, colorMode, solidColor, colorScheme, stackColors, theme } = params;

  // Check for pre-defined stack colors first
  if (stackColors && stackColors[index] !== undefined) {
    return stackColors[index];
  }

  // Solid color mode
  if (colorMode === 'solid' && solidColor) {
    return solidColor;
  }

  // Scheme-based coloring
  if (colorMode === 'scheme' && colorScheme) {
    // Shades mode: generate dark-to-light gradient from base color
    if (colorScheme === FieldColorModeId.Shades && solidColor) {
      return generateColorShade(solidColor, normalizedValue);
    }

    // Classic palette: use index-based colors
    if (colorScheme === FieldColorModeId.PaletteClassic) {
      return getClassicPaletteColor(index, theme);
    }

    // Thresholds: use threshold-based colors
    if (colorScheme === FieldColorModeId.Thresholds) {
      return getThresholdColor(value, theme.visualization.getColorByName('blue'), theme);
    }

    // Standard gradient schemes: use normalized value for gradient
    // Use normalizedValue for value-based coloring (line/bar)
    return getColorFromScheme(colorScheme, normalizedValue, theme, params.reverseGradient ?? false);
  }

  // Fallback: use default stack colors by position or default blue
  if (stackColors === undefined && dataLength > 1) {
    return DEFAULT_STACK_COLORS[index % DEFAULT_STACK_COLORS.length];
  }

  return DEFAULT_SPARK_COLOR;
}
