import React, { useState, useRef } from 'react';
import { ColorPicker, IconName, useTheme2, Button, Input } from '@grafana/ui';
import { CellStyle, IconValue, IconSource } from '../../types';
import { css } from '@emotion/css';
import { EnhancedIconPicker } from '../IconPickers/EnhancedIconPicker';

interface CellStyleEditorProps {
  value: CellStyle;
  onChange: (style: CellStyle) => void;
  label?: string;
}

export const CellStyleEditor: React.FC<CellStyleEditorProps> = ({ value, onChange, label }) => {
  const theme = useTheme2();
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const iconButtonRef = useRef<HTMLButtonElement>(null);

  const handleIconChange = (icon: IconValue | null, source: IconSource) => {
    onChange({
      ...value,
      icon: icon || undefined,
      iconSource: source,
    });
  };

  const styles = {
    container: css({}),
    label: css({
      fontSize: theme.typography.bodySmall.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing(1),
      display: 'block',
    }),
    gridWrapper: css({
      containerType: 'inline-size',
      containerName: 'cellstyle',
    }),
    grid: css({
      display: 'flex',
      flexWrap: 'wrap',
      gap: theme.spacing(1),
      alignItems: 'start',
    }),
    colorGroup: css({
      display: 'flex',
      gap: theme.spacing(1),
      flexWrap: 'nowrap',

      '@container cellstyle (max-width: 359px)': {
        flexBasis: '100%',
      },
    }),
    styleIconGroup: css({
      display: 'flex',
      gap: theme.spacing(1),
      flexWrap: 'nowrap',

      '@container cellstyle (max-width: 359px)': {
        flexBasis: '100%',
      },
    }),
    column: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(0.5),
    }),
    columnLabel: css({
      fontSize: theme.typography.bodySmall.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing(0.5),
    }),
    textStyleToggleGroup: css({
      display: 'flex',
      gap: theme.spacing(0.5),
      flexDirection: 'row',
    }),
    toggleButton: css({
      minWidth: '32px',
      width: '32px',
      height: '32px',
      padding: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      '& span': {
        fontSize: theme.typography.h5.fontSize,
      },
    }),
    colorPickerWrapper: css({
      padding: theme.spacing(0.5),
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,
      background: theme.colors.background.primary,
      display: 'inline-flex',
      width: '32px',
      height: '32px',
      alignItems: 'center',
      justifyContent: 'center',
    }),
  };

  const handleBackgroundColorChange = (color: string) => {
    onChange({ ...value, backgroundColor: color });
  };

  const handleTextColorChange = (color: string) => {
    onChange({ ...value, textColor: color });
  };

  const handleBorderColorChange = (color: string) => {
    onChange({ ...value, borderColor: color, borderWidth: value.borderWidth || 1 });
  };

  const handleBorderWidthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const width = parseInt(event.currentTarget.value, 10);
    if (!isNaN(width) && width >= 0) {
      onChange({ ...value, borderWidth: width });
    }
  };

  const handleBoldToggle = () => {
    onChange({ ...value, fontWeight: value.fontWeight === 'bold' ? 'normal' : 'bold' });
  };

  const handleItalicToggle = () => {
    onChange({ ...value, fontStyle: value.fontStyle === 'italic' ? 'normal' : 'italic' });
  };

  const handleUnderlineToggle = () => {
    const current = value.textDecoration || 'none';
    let newDecoration: string;

    if (current.includes('underline') && current.includes('line-through')) {
      // Has both, remove underline, keep strikethrough
      newDecoration = 'line-through';
    } else if (current.includes('underline')) {
      // Has only underline, remove it
      newDecoration = 'none';
    } else if (current.includes('line-through')) {
      // Has strikethrough, add underline
      newDecoration = 'underline line-through';
    } else {
      // Has neither, add underline
      newDecoration = 'underline';
    }

    onChange({ ...value, textDecoration: newDecoration as any });
  };

  const handleStrikethroughToggle = () => {
    const current = value.textDecoration || 'none';
    let newDecoration: string;

    if (current.includes('underline') && current.includes('line-through')) {
      // Has both, remove strikethrough, keep underline
      newDecoration = 'underline';
    } else if (current.includes('line-through')) {
      // Has only strikethrough, remove it
      newDecoration = 'none';
    } else if (current.includes('underline')) {
      // Has underline, add strikethrough
      newDecoration = 'underline line-through';
    } else {
      // Has neither, add strikethrough
      newDecoration = 'line-through';
    }

    onChange({ ...value, textDecoration: newDecoration as any });
  };

  return (
    <div className={styles.container}>
      {label && <div className={styles.label}>{label}</div>}

      <div className={styles.gridWrapper}>
        <div className={styles.grid}>
          {/* Color Group - BG, FG, Border stay together */}
          <div className={styles.colorGroup}>
            {/* Background Color */}
            <div className={styles.column}>
              <div className={styles.columnLabel} title="Background">
                BG
              </div>
              <div className={styles.colorPickerWrapper}>
                <ColorPicker color={value.backgroundColor || 'transparent'} onChange={handleBackgroundColorChange} />
              </div>
            </div>

            {/* Foreground Color */}
            <div className={styles.column}>
              <div className={styles.columnLabel} title="Foreground">
                FG
              </div>
              <div className={styles.colorPickerWrapper}>
                <ColorPicker color={value.textColor || '#000000'} onChange={handleTextColorChange} />
              </div>
            </div>

            {/* Border */}
            <div className={styles.column}>
              <div className={styles.columnLabel}>Border</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
                <div className={styles.colorPickerWrapper}>
                  <ColorPicker color={value.borderColor || 'transparent'} onChange={handleBorderColorChange} />
                </div>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={value.borderWidth || 0}
                  onChange={handleBorderWidthChange}
                  placeholder="W"
                  width={5}
                />
              </div>
            </div>
          </div>

          {/* Style and Icon Group - stays together */}
          <div className={styles.styleIconGroup}>
            {/* Text Style */}
            <div className={styles.column}>
              <div className={styles.columnLabel}>Style</div>
              <div className={styles.textStyleToggleGroup}>
                <Button
                  size="sm"
                  variant={value.fontWeight === 'bold' ? 'primary' : 'secondary'}
                  fill="outline"
                  onClick={handleBoldToggle}
                  className={styles.toggleButton}
                  tooltip="Bold"
                >
                  <span style={{ fontWeight: 'bold' }}>B</span>
                </Button>
                <Button
                  size="sm"
                  variant={value.fontStyle === 'italic' ? 'primary' : 'secondary'}
                  fill="outline"
                  onClick={handleItalicToggle}
                  className={styles.toggleButton}
                  tooltip="Italic"
                >
                  <span style={{ fontStyle: 'italic' }}>I</span>
                </Button>
                <Button
                  size="sm"
                  variant={(value.textDecoration || '').includes('underline') ? 'primary' : 'secondary'}
                  fill="outline"
                  onClick={handleUnderlineToggle}
                  className={styles.toggleButton}
                  tooltip="Underline"
                >
                  <span style={{ textDecoration: 'underline' }}>U</span>
                </Button>
                <Button
                  size="sm"
                  variant={(value.textDecoration || '').includes('line-through') ? 'primary' : 'secondary'}
                  fill="outline"
                  onClick={handleStrikethroughToggle}
                  className={styles.toggleButton}
                  tooltip="Strikethrough"
                >
                  <span style={{ textDecoration: 'line-through' }}>S</span>
                </Button>
              </div>
            </div>

            {/* Icon Selector */}
            <div className={styles.column}>
              <div className={styles.columnLabel}>Icon</div>
              <div style={{ position: 'relative' }} ref={iconButtonRef as any}>
                <Button
                  icon={value.iconSource === 'grafana' ? (value.icon as IconName) : undefined}
                  onClick={() => setIconPickerOpen(!iconPickerOpen)}
                  tooltip="Select icon or emoji"
                  variant="secondary"
                  size="md"
                >
                  {value.iconSource === 'emoji' && value.icon ? value.icon : ''}
                </Button>

                <EnhancedIconPicker
                  value={value.icon || null}
                  iconSource={value.iconSource}
                  onChange={handleIconChange}
                  onClose={() => setIconPickerOpen(false)}
                  isOpen={iconPickerOpen}
                  triggerRef={iconButtonRef as any}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
