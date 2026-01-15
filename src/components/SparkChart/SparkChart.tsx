import React, { useMemo } from 'react';
import { SparkChartConfig } from '../../types';
import { getSparkChartSegmentColor, getColorFromScheme } from '../../utils/colorUtils';
import {
  generateLineGradientDef,
  generateSparkLinePath,
  calculateSparkLinePoints,
} from '../../utils/sparkChartGradient';

interface SparkChartProps {
  config: SparkChartConfig;
  width: number;
  height: number;
}

export const SparkChart: React.FC<SparkChartProps> = ({ config, width, height }) => {
  // Return early if no dimensions or data
  if (width === 0 || height === 0 || config.data.length === 0) {
    return null;
  }

  // Calculate effective chart height based on config percentage
  const effectiveHeight = height * (config.height / 100);
  const verticalPadding = (height - effectiveHeight) / 2;

  // Render appropriate chart type
  switch (config.mode) {
    case 'line':
      return <SparkLine config={config} width={width} height={effectiveHeight} yOffset={verticalPadding} />;
    case 'bar':
      return <SparkBar config={config} width={width} height={effectiveHeight} yOffset={verticalPadding} />;
    case 'stack':
      return <SparkStack config={config} width={width} height={effectiveHeight} yOffset={verticalPadding} />;
    case 'bullet':
      return <SparkBullet config={config} width={width} height={effectiveHeight} yOffset={verticalPadding} />;
    default:
      return null;
  }
};

interface ChartComponentProps {
  config: SparkChartConfig;
  width: number;
  height: number;
  yOffset: number;
}

const SparkLine: React.FC<ChartComponentProps> = ({ config, width, height, yOffset }) => {
  // Generate unique ID for this chart instance to avoid gradient ID collisions
  const chartId = React.useId();

  // Find min/max for normalization - use config values if available (for global/column scale mode)
  const min = config.scaleMin !== undefined ? config.scaleMin : Math.min(...config.data);
  const max = config.scaleMax !== undefined ? config.scaleMax : Math.max(...config.data);

  // Determine rendering modes
  const useGradient = config.colorMode === 'scheme' && config.colorScheme;
  const interpolationMode = config.lineInterpolation || 'linear';

  // For step mode with gradient, render separate segments
  const stepSegments = useMemo(() => {
    if (interpolationMode !== 'step' || !useGradient || !config.colorScheme) {
      return null;
    }

    const points = calculateSparkLinePoints(config.data, width, height, min, max);
    if (points.length < 2) {
      return null;
    }

    const range = max - min || 1;
    const segments: Array<{ path: string; color: string; isVertical: boolean }> = [];

    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currPoint = points[i];

      // Normalized values for color calculation
      const prevNormalized = (config.data[i - 1] - min) / range;

      // Get color for previous point
      const prevColor = getColorFromScheme(
        config.colorScheme,
        prevNormalized,
        config.theme,
        config.reverseGradient ?? false
      );

      // Horizontal segment: from prevPoint to (currPoint.x, prevPoint.y)
      segments.push({
        path: `M ${prevPoint.x} ${prevPoint.y} H ${currPoint.x}`,
        color: prevColor,
        isVertical: false,
      });

      // Vertical segment: from (currPoint.x, prevPoint.y) to currPoint
      // Only add if there's actual vertical distance AND this is not the last point
      if (i < points.length - 1 && Math.abs(currPoint.y - prevPoint.y) > 0.1) {
        const gradId = `step-grad-${chartId}-${i}`;
        segments.push({
          path: `M ${currPoint.x} ${prevPoint.y} V ${currPoint.y}`,
          color: gradId,
          isVertical: true,
        });
      }
    }

    return segments;
  }, [
    interpolationMode,
    useGradient,
    config.data,
    config.colorScheme,
    config.theme,
    config.reverseGradient,
    min,
    max,
    width,
    height,
    chartId,
  ]);

  // Generate vertical gradients for step mode
  const verticalGradients = useMemo(() => {
    if (!stepSegments) {
      return null;
    }

    const points = calculateSparkLinePoints(config.data, width, height, min, max);
    const range = max - min || 1;
    const gradients: React.ReactNode[] = [];

    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currPoint = points[i];

      // Only create gradient if there's a vertical segment AND this is not the last point
      if (i < points.length - 1 && Math.abs(currPoint.y - prevPoint.y) > 0.1) {
        const prevNormalized = (config.data[i - 1] - min) / range;
        const currNormalized = (config.data[i] - min) / range;

        const prevColor = getColorFromScheme(
          config.colorScheme!,
          prevNormalized,
          config.theme,
          config.reverseGradient ?? false
        );
        const currColor = getColorFromScheme(
          config.colorScheme!,
          currNormalized,
          config.theme,
          config.reverseGradient ?? false
        );

        gradients.push(
          React.createElement(
            'linearGradient',
            {
              key: `step-grad-${chartId}-${i}`,
              id: `step-grad-${chartId}-${i}`,
              gradientUnits: 'userSpaceOnUse',
              x1: currPoint.x,
              y1: prevPoint.y,
              x2: currPoint.x,
              y2: currPoint.y,
            },
            [
              React.createElement('stop', { key: 'start', offset: '0%', stopColor: prevColor }),
              React.createElement('stop', { key: 'end', offset: '100%', stopColor: currColor }),
            ]
          )
        );
      }
    }

    return gradients;
  }, [
    stepSegments,
    config.data,
    config.colorScheme,
    config.theme,
    config.reverseGradient,
    min,
    max,
    width,
    height,
    chartId,
  ]);

  // Generate gradient definition for non-step modes
  const { gradientDef, gradientId } = useMemo(() => {
    if (interpolationMode === 'step' || !useGradient || !config.colorScheme) {
      return { gradientDef: null, gradientId: null };
    }
    return generateLineGradientDef(
      config.data,
      config.colorScheme,
      min,
      max,
      config.theme,
      width,
      height,
      interpolationMode,
      config.reverseGradient ?? false
    );
  }, [
    interpolationMode,
    useGradient,
    config.data,
    config.colorScheme,
    config.theme,
    min,
    max,
    width,
    height,
    config.reverseGradient,
  ]);

  // Generate path data for non-step modes
  const pathData = useMemo(() => {
    if (interpolationMode === 'step' && useGradient) {
      return null; // Use segments instead
    }
    return generateSparkLinePath(config.data, width, height, min, max, interpolationMode);
  }, [interpolationMode, useGradient, config.data, width, height, min, max]);

  // For solid color mode or when no gradient is specified
  const solidColor = useMemo(() => {
    if (config.colorMode === 'solid' && config.solidColor) {
      return config.solidColor;
    }
    return '#3274D9'; // Default blue
  }, [config.colorMode, config.solidColor]);

  return (
    <svg width={width} height={height + yOffset * 2} style={{ display: 'block' }}>
      <defs>
        {gradientDef}
        {verticalGradients}
      </defs>
      <g transform={`translate(0, ${yOffset})`}>
        {stepSegments ? (
          // Step mode with gradient: render separate path segments
          stepSegments.map((segment, idx) => (
            <path
              key={idx}
              d={segment.path}
              stroke={segment.isVertical ? `url(#${segment.color})` : segment.color}
              strokeWidth={2}
              fill="none"
              strokeLinejoin="miter"
              strokeLinecap="butt"
            />
          ))
        ) : pathData ? (
          // Normal mode: single path
          <path
            d={pathData}
            stroke={useGradient ? `url(#${gradientId})` : solidColor}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
            shapeRendering="geometricPrecision"
          />
        ) : null}
      </g>
    </svg>
  );
};

const SparkBar: React.FC<ChartComponentProps> = ({ config, width, height, yOffset }) => {
  const bars = useMemo(() => {
    const { data, stateTimeline, scaleMin, scaleMax } = config;
    if (data.length === 0) {
      return [];
    }

    // Find min/max for normalization - use config values if available (for global/column scale mode)
    const min = scaleMin !== undefined ? scaleMin : Math.min(...data);
    const max = scaleMax !== undefined ? scaleMax : Math.max(...data);
    const range = max - min || 1;

    // Calculate bar positions
    const barWidth = width / data.length;
    const barGap = stateTimeline ? 0 : Math.max(1, barWidth * 0.1); // No gap in state timeline mode
    const effectiveBarWidth = barWidth - barGap;

    return data.map((value, index) => {
      const x = index * barWidth + barGap / 2;
      const normalizedValue = (value - min) / range;
      // In state timeline mode, bars take full height regardless of value
      let barHeight = stateTimeline ? height : normalizedValue * height;
      // Ensure bars have minimum height when all values are constant
      if (!stateTimeline && value !== 0 && range === 0) {
        barHeight = Math.max(1, height * 0.1); // 10% of height for constant non-zero values
      }
      // Ensure non-zero values have at least 1px height
      else if (!stateTimeline && value !== 0 && barHeight < 1) {
        barHeight = 1;
      }
      const y = stateTimeline ? 0 : height - barHeight;

      // Use shared color utility
      const color = getSparkChartSegmentColor({
        index,
        value,
        normalizedValue,
        dataLength: data.length,
        colorMode: config.colorMode,
        solidColor: config.solidColor,
        colorScheme: config.colorScheme,
        theme: config.theme,
        reverseGradient: config.reverseGradient,
      });

      return { x, y, width: effectiveBarWidth, height: barHeight, color };
    });
  }, [config, width, height]);

  return (
    <svg width={width} height={height + yOffset * 2} style={{ display: 'block' }}>
      <g transform={`translate(0, ${yOffset})`}>
        {bars.map((bar, index) => (
          <rect key={index} x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill={bar.color} />
        ))}
      </g>
    </svg>
  );
};

const SparkStack: React.FC<ChartComponentProps> = ({ config, width, height, yOffset }) => {
  const segments = useMemo(() => {
    const { data } = config;
    if (data.length === 0) {
      return [];
    }

    // Calculate total for proportional widths
    const total = data.reduce((sum, val) => sum + val, 0);
    if (total === 0) {
      return [];
    }

    // Determine scale value (denominator for width calculation)
    // If stackScaleValue is provided, use it; otherwise use total (100% width)
    const scaleValue = config.stackScaleValue || total;
    const effectiveWidth = (total / scaleValue) * width;

    // Calculate segment positions
    let cumulativeX = 0;
    return data.map((value, index) => {
      const segmentWidth = (value / total) * effectiveWidth;
      const x = cumulativeX;
      cumulativeX += segmentWidth;

      // Calculate normalized value for position-based coloring
      const normalizedValue = data.length > 1 ? index / (data.length - 1) : 0;

      // Use shared color utility
      const color = getSparkChartSegmentColor({
        index,
        value,
        normalizedValue,
        dataLength: data.length,
        colorMode: config.colorMode,
        solidColor: config.solidColor,
        colorScheme: config.colorScheme,
        stackColors: config.stackColors,
        theme: config.theme,
        reverseGradient: config.reverseGradient,
      });

      return { x, width: segmentWidth, color };
    });
  }, [config, width]);

  return (
    <svg width={width} height={height + yOffset * 2} style={{ display: 'block' }}>
      <g transform={`translate(0, ${yOffset})`}>
        {segments.map((segment, index) => (
          <rect key={index} x={segment.x} y={0} width={segment.width} height={height} fill={segment.color} />
        ))}
      </g>
    </svg>
  );
};

const SparkBullet: React.FC<ChartComponentProps> = ({ config, width, height, yOffset }) => {
  const elements = useMemo(() => {
    const { data } = config;
    if (data.length < 3) {
      return null; // Bullet chart requires at least 3 values: [background_blocks..., foreground_value, target_line_value]
    }

    // Last value is the target line, second-to-last is the foreground bar
    const targetValue = data[data.length - 1];
    const foregroundValue = data[data.length - 2];
    const backgroundValues = data.slice(0, -2);

    // Find max for scaling
    const max = Math.max(...data);
    const scale = max > 0 ? width / max : 1;

    // Background blocks (stacked from left)
    const bgBlocks = backgroundValues.map((value, index) => {
      const bgWidth = value * scale;
      const normalizedValue = backgroundValues.length > 1 ? index / (backgroundValues.length - 1) : 0;

      // Get background color
      let bgColor = '#CCCCCC';
      if (config.bulletBgColorMode === 'solid' && config.bulletBgColor) {
        bgColor = config.bulletBgColor;
      } else if (config.bulletBgColorMode === 'scheme' && config.bulletBgColorScheme) {
        bgColor = getSparkChartSegmentColor({
          index,
          value,
          normalizedValue,
          dataLength: backgroundValues.length,
          colorMode: 'scheme',
          colorScheme: config.bulletBgColorScheme,
          solidColor: config.bulletBgColor,
          theme: config.theme,
          reverseGradient: config.bulletBgReverse,
        });
      }

      return { bgWidth, bgColor };
    });

    // Foreground bar
    const fgWidth = foregroundValue * scale;
    const fgNormalized = foregroundValue / max;
    let fgColor = '#3274D9';
    if (config.bulletFgColorMode === 'solid' && config.bulletFgColor) {
      fgColor = config.bulletFgColor;
    } else if (config.bulletFgColorMode === 'scheme' && config.bulletFgColorScheme) {
      fgColor = getSparkChartSegmentColor({
        index: 0,
        value: foregroundValue,
        normalizedValue: fgNormalized,
        dataLength: 1,
        colorMode: 'scheme',
        colorScheme: config.bulletFgColorScheme,
        solidColor: config.bulletFgColor,
        theme: config.theme,
        reverseGradient: config.bulletFgReverse,
      });
    }

    // Target line
    const targetX = targetValue * scale;
    // Calculate total of background values for normalization
    const bgTotal = backgroundValues.reduce((sum, val) => sum + val, 0);
    const lineNormalized = bgTotal > 0 ? targetValue / bgTotal : 0;
    let lineColor = '#FF0000';
    if (config.bulletLineColorMode === 'solid' && config.bulletLineColor) {
      lineColor = config.bulletLineColor;
    } else if (config.bulletLineColorMode === 'scheme' && config.bulletLineColorScheme) {
      lineColor = getSparkChartSegmentColor({
        index: 0,
        value: targetValue,
        normalizedValue: Math.min(lineNormalized, 1), // Cap at 1 (100%)
        dataLength: 1,
        colorMode: 'scheme',
        colorScheme: config.bulletLineColorScheme,
        solidColor: config.bulletLineColor,
        theme: config.theme,
        reverseGradient: config.bulletLineReverse,
      });
    }

    return { bgBlocks, fgWidth, fgColor, targetX, lineColor };
  }, [config, width]);

  if (!elements) {
    return null;
  }

  const { bgBlocks, fgWidth, fgColor, targetX, lineColor } = elements;
  const fgHeight = height * 0.5; // Foreground bar is 50% of height
  const fgY = (height - fgHeight) / 2;

  return (
    <svg width={width} height={height + yOffset * 2} style={{ display: 'block' }}>
      <g transform={`translate(0, ${yOffset})`}>
        {/* Background blocks - layered from back to front */}
        {bgBlocks.map((block, index) => (
          <rect
            key={`bg-${index}`}
            x={0}
            y={0}
            width={block.bgWidth}
            height={height}
            fill={block.bgColor}
            opacity={0.3}
          />
        ))}

        {/* Foreground bar */}
        <rect x={0} y={fgY} width={fgWidth} height={fgHeight} fill={fgColor} />

        {/* Target line */}
        <line x1={targetX} y1={0} x2={targetX} y2={height} stroke={lineColor} strokeWidth={2} />
      </g>
    </svg>
  );
};
