import React, { useState, useRef } from 'react';
import { IconName } from '@grafana/data';
import { useTheme2, Input, Icon } from '@grafana/ui';
import { css } from '@emotion/css';
import { useFilteredIcons } from '../../hooks/useFilteredIcons';
import { usePopoverPosition } from '../../hooks/usePopoverPosition';
import { IconValue, IconSource } from '../../types';
import { GrafanaIconTab } from './GrafanaIconTab';
import { EmojiTab } from './EmojiTab';

interface EnhancedIconPickerProps {
  value: IconValue | null;
  iconSource?: IconSource;
  onChange: (value: IconValue | null, source: IconSource) => void;
  onClose: () => void;
  isOpen: boolean;
  triggerRef?: React.RefObject<HTMLElement>;
}

export const EnhancedIconPicker: React.FC<EnhancedIconPickerProps> = ({
  value,
  iconSource = 'grafana',
  onChange,
  onClose,
  isOpen,
  triggerRef: externalTriggerRef,
}) => {
  const theme = useTheme2();
  const [activeTab, setActiveTab] = useState<'emoji' | 'grafana'>(iconSource || 'emoji');
  const [searchQuery, setSearchQuery] = useState('');

  const internalTriggerRef = useRef<HTMLDivElement>(null);
  const triggerRef = externalTriggerRef || internalTriggerRef;
  const popoverRef = useRef<HTMLDivElement>(null);
  const position = usePopoverPosition(triggerRef, popoverRef, isOpen);

  const filteredIcons = useFilteredIcons(searchQuery);

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji, 'emoji');
    onClose();
  };

  const handleGrafanaIconSelect = (iconName: IconName | null) => {
    onChange(iconName, 'grafana');
    if (iconName) {
      onClose();
    }
  };

  const styles = {
    backdrop: css({
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 999,
    }),
    popover: css({
      position: 'fixed',
      ...position,
      maxHeight: '400px',
      backgroundColor: theme.colors.background.primary,
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,
      boxShadow: theme.shadows.z3,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }),
    tabBar: css({
      display: 'flex',
      borderBottom: `1px solid ${theme.colors.border.weak}`,
      padding: theme.spacing(1),
      gap: theme.spacing(1),
    }),
    tab: css({
      flex: 1,
      padding: theme.spacing(0.75, 1.5),
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      fontWeight: 500,
      borderRadius: theme.shape.radius.default,
      transition: 'all 0.2s',
      color: theme.colors.text.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing(0.5),
      '&:hover': {
        backgroundColor: theme.colors.action.hover,
      },
    }),
    activeTab: css({
      backgroundColor: theme.colors.action.selected,
      color: theme.colors.primary.text,
    }),
    searchContainer: css({
      padding: theme.spacing(1),
      borderBottom: `1px solid ${theme.colors.border.weak}`,
    }),
    content: css({
      flex: 1,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    }),
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div ref={popoverRef} className={styles.popover}>
        {/* Tab Bar */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${activeTab === 'emoji' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('emoji')}
          >
            😊 Emojis
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'grafana' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('grafana')}
          >
            <Icon name="grafana" /> Icons
          </button>
        </div>

        {/* Search Input (only for Grafana icons tab) */}
        {activeTab === 'grafana' && (
          <div className={styles.searchContainer}>
            <Input
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              prefix={<Icon name="search" />}
              autoFocus
            />
          </div>
        )}

        {/* Content */}
        <div className={styles.content}>
          {activeTab === 'emoji' ? (
            <EmojiTab onSelect={handleEmojiSelect} />
          ) : (
            <GrafanaIconTab
              filteredIcons={filteredIcons}
              selectedIcon={iconSource === 'grafana' ? value : null}
              onSelect={handleGrafanaIconSelect}
            />
          )}
        </div>
      </div>
    </>
  );
};
