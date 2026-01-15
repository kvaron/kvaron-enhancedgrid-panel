import React, { CSSProperties, useMemo } from 'react';
import { FieldColorModeId, fieldColorModeRegistry, FieldColorMode, GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Select, useTheme2, useStyles2, ColorPicker, InlineSwitch, InlineField } from '@grafana/ui';
import { css } from '@emotion/css';

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
  `,
  select: css`
    flex-grow: 1;
  `,
  colorPickerWrapper: css`
    padding: ${theme.spacing(0.5)};
    border: 1px solid ${theme.colors.border.medium};
    border-radius: ${theme.shape.radius.default};
    background: ${theme.colors.background.primary};
    display: inline-flex;
  `,
});

/**
 * Component for rendering gradient preview in color scheme dropdown options.
 * Matches Grafana's built-in FieldColorModeViz pattern.
 */
interface ColorModeVizProps {
  mode: FieldColorMode;
  theme: GrafanaTheme2;
  reverse?: boolean;
}

const FieldColorModeViz: React.FC<ColorModeVizProps> = ({ mode, theme, reverse }) => {
  if (!mode.getColors) {
    return null;
  }

  const colors = mode.getColors(theme).map(theme.visualization.getColorByName);
  const displayColors = reverse ? [...colors].reverse() : colors;
  const style: CSSProperties = {
    height: '8px',
    width: '100%',
    margin: '2px 0',
    borderRadius: '3px',
    opacity: 1,
  };

  if (mode.isContinuous) {
    style.background = `linear-gradient(90deg, ${displayColors.join(',')})`;
  } else {
    let gradient = '';
    let lastColor = '';

    for (let i = 0; i < displayColors.length; i++) {
      const color = displayColors[i];
      if (gradient === '') {
        gradient = `linear-gradient(90deg, ${color} 0%`;
      } else {
        const valuePercent = i / displayColors.length;
        const pos = valuePercent * 100;
        gradient += `, ${lastColor} ${pos}%, ${color} ${pos}%`;
      }
      lastColor = color;
    }
    style.background = gradient;
  }

  return <div style={style} />;
};

export interface ColorSchemeSelectProps {
  /** Current selected value (color mode ID or 'fixed') */
  value: string | undefined;
  /** Callback when selection changes */
  onChange: (value: SelectableValue<string>) => void;
  /** Whether to include the "Single color" (fixed) option */
  includeFixed?: boolean;
  /** Current color value for fixed/shades mode */
  color?: string;
  /** Callback when color changes (for fixed/shades mode) */
  onColorChange?: (color: string) => void;
  /** Default color when none is set */
  defaultColor?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Width of the select */
  width?: number;
  /** Whether to show the reverse gradient toggle */
  showReverseToggle?: boolean;
  /** Current reverse gradient state */
  reverseGradient?: boolean;
  /** Callback when reverse changes */
  onReverseChange?: (reverse: boolean) => void;
}

/**
 * A reusable color scheme selector that displays Grafana color schemes
 * with gradient previews, matching the built-in Grafana field color editor.
 * Includes inline color picker for "Single color" and "Shades of a color" modes.
 */
export const ColorSchemeSelect: React.FC<ColorSchemeSelectProps> = ({
  value,
  onChange,
  includeFixed = true,
  color,
  onColorChange,
  defaultColor = '#3274D9',
  placeholder = 'Select color scheme',
  width = 40,
  showReverseToggle = false,
  reverseGradient = false,
  onReverseChange,
}) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);

  const colorSchemeOptions = useMemo(() => {
    const options: Array<SelectableValue<string>> = [];

    // Add "fixed" option for single color (not in registry)
    if (includeFixed) {
      options.push({
        label: 'Single color',
        value: 'fixed',
        description: 'Use a fixed color',
      });
    }

    // Get color modes from the registry and add gradient previews
    const availableModes = fieldColorModeRegistry.list();
    for (const mode of availableModes) {
      // Skip fixed mode if we're adding our own
      if (mode.id === FieldColorModeId.Fixed) {
        continue;
      }

      options.push({
        value: mode.id,
        label: mode.name,
        description: mode.description,
        component: mode.getColors ? () => <FieldColorModeViz mode={mode} theme={theme} reverse={reverseGradient} /> : undefined,
      });
    }

    return options;
  }, [theme, includeFixed, reverseGradient]);

  // Show color picker for fixed color or shades mode
  const showColorPicker = onColorChange && (
    value === 'fixed' ||
    value === undefined ||
    value === FieldColorModeId.Shades
  );

  return (
    <div className={styles.container}>
      <Select
        options={colorSchemeOptions}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        width={width}
        menuShouldPortal={true}
        className={styles.select}
      />
      {showColorPicker && (
        <div className={styles.colorPickerWrapper}>
          <ColorPicker
            color={color || defaultColor}
            onChange={(newColor) => onColorChange(newColor)}
          />
        </div>
      )}
      {showReverseToggle && value !== 'fixed' && value !== undefined && (
        <InlineField label="Reverse" transparent>
          <InlineSwitch
            value={reverseGradient ?? false}
            onChange={(e) => onReverseChange?.(e.currentTarget.checked)}
          />
        </InlineField>
      )}
    </div>
  );
};
