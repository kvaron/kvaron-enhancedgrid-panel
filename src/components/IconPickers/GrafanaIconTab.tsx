import React, { useMemo } from 'react';
import { IconName } from '@grafana/data';
import { Icon, useTheme2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { IconValue } from '../../types';

interface GrafanaIconTabProps {
  filteredIcons: string[];
  selectedIcon: IconValue | null;
  onSelect: (icon: IconName | null) => void;
}

export const GrafanaIconTab: React.FC<GrafanaIconTabProps> = ({ filteredIcons, selectedIcon, onSelect }) => {
  const theme = useTheme2();

  // Sort icons alphabetically
  const sortedIcons = useMemo(() => {
    return [...filteredIcons].sort((a, b) => a.localeCompare(b));
  }, [filteredIcons]);

  const styles = {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      padding: theme.spacing(1),
    }),
    grid: css({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
      gap: theme.spacing(0.5),
      flex: 1,
      overflowY: 'auto',
    }),
    gridItem: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing(1),
      cursor: 'pointer',
      borderRadius: theme.shape.radius.default,
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: theme.colors.action.hover,
      },
      '&[data-selected="true"]': {
        backgroundColor: theme.colors.action.selected,
        outline: `2px solid ${theme.colors.primary.border}`,
      },
    }),
    noIconItem: css({
      gridColumn: '1 / -1',
      justifyContent: 'flex-start',
      padding: theme.spacing(1.5),
    }),
    emptyState: css({
      textAlign: 'center',
      padding: theme.spacing(2),
      color: theme.colors.text.secondary,
    }),
  };

  return (
    <div className={styles.container}>
      {/* "No icon" option */}
      <div
        className={`${styles.gridItem} ${styles.noIconItem}`}
        onClick={() => onSelect(null)}
        data-selected={!selectedIcon}
      >
        <span>No icon</span>
      </div>

      {/* Icon grid */}
      <div className={styles.grid}>
        {sortedIcons.map((iconName) => (
          <div
            key={iconName}
            className={styles.gridItem}
            onClick={() => onSelect(iconName as IconName)}
            data-selected={selectedIcon === iconName}
            title={iconName}
          >
            <Icon name={iconName as IconName} size="lg" />
          </div>
        ))}

        {/* Empty state */}
        {sortedIcons.length === 0 && <div className={styles.emptyState}>No icons found</div>}
      </div>
    </div>
  );
};
