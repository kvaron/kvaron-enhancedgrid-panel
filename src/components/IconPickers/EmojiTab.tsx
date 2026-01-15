import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useTheme2, Icon } from '@grafana/ui';
import { css } from '@emotion/css';
import { CompactEmoji } from 'emojibase';

interface EmojiTabProps {
  onSelect: (emoji: string) => void;
}

// Group emojis by category
const CATEGORY_LABELS: Record<number, string> = {
  0: 'Smileys & Emotion',
  1: 'People & Body',
  2: 'Component',
  3: 'Animals & Nature',
  4: 'Food & Drink',
  5: 'Travel & Places',
  6: 'Activities',
  7: 'Objects',
  8: 'Symbols',
  9: 'Flags',
};

// Category icons (using representative emojis)
const CATEGORY_ICONS: Record<number, string> = {
  0: '😀',
  1: '👋',
  3: '🐶',
  4: '🍎',
  5: '🚗',
  6: '⚽',
  7: '💡',
  8: '❤️',
  9: '🏁',
};

export const EmojiTab: React.FC<EmojiTabProps> = ({ onSelect }) => {
  const theme = useTheme2();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmojis, setFilteredEmojis] = useState<CompactEmoji[]>([]);
  const [emojiData, setEmojiData] = useState<CompactEmoji[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Lazy load emoji data
  useEffect(() => {
    import('emojibase-data/en/compact.json')
      .then((module) => {
        setEmojiData(module.default as CompactEmoji[]);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load emoji data:', error);
        setLoading(false);
      });
  }, []);

  // Process emoji data
  const emojisByCategory = useMemo(() => {
    if (!emojiData) return new Map<number, CompactEmoji[]>();

    const categories = new Map<number, CompactEmoji[]>();

    emojiData.forEach((emoji) => {
      // Skip component emojis (skin tones, etc.)
      if (emoji.group === 2) return;

      // Skip country flags (regional indicators that don't render in Chrome/Windows)
      // Country flags are composed of two Regional Indicator characters (U+1F1E6 - U+1F1FF)
      // Keep other flags like checkered flag, white flag, rainbow flag, etc.
      const codePoints = Array.from(emoji.unicode).map(char => char.codePointAt(0) || 0);
      const isCountryFlag = codePoints.length === 2 &&
        codePoints.every(cp => cp >= 0x1F1E6 && cp <= 0x1F1FF);

      if (isCountryFlag) return;

      const category = emoji.group;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(emoji);
    });

    return categories;
  }, [emojiData]);

  // Filter emojis based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Show all emojis when no search
      const allEmojis: CompactEmoji[] = [];
      emojisByCategory.forEach((emojis) => allEmojis.push(...emojis));
      setFilteredEmojis(allEmojis);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered: CompactEmoji[] = [];

    emojisByCategory.forEach((emojis) => {
      emojis.forEach((emoji) => {
        if (emoji.label?.toLowerCase().includes(query) ||
            emoji.tags?.some(tag => tag.toLowerCase().includes(query))) {
          filtered.push(emoji);
        }
      });
    });

    setFilteredEmojis(filtered);
  }, [searchQuery, emojisByCategory]);

  const handleEmojiClick = useCallback((emoji: CompactEmoji) => {
    onSelect(emoji.unicode);
  }, [onSelect]);

  const handleClearEmoji = useCallback(() => {
    onSelect('');
  }, [onSelect]);

  const scrollToCategory = useCallback((categoryId: number) => {
    const categoryElement = categoryRefs.current.get(categoryId);
    if (categoryElement && viewportRef.current) {
      viewportRef.current.scrollTo({
        top: categoryElement.offsetTop - viewportRef.current.offsetTop,
        behavior: 'smooth',
      });
      setActiveCategory(categoryId);
    }
  }, []);

  const styles = useMemo(() => ({
    container: css({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }),
    searchWrapper: css({
      padding: theme.spacing(1, 1, 0, 1),
      position: 'relative',
      flexShrink: 0,
    }),
    searchIcon: css({
      position: 'absolute',
      left: theme.spacing(2),
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: theme.colors.text.secondary,
    }),
    search: css({
      width: '100%',
      padding: theme.spacing(1, 1, 1, 4),
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,
      backgroundColor: theme.colors.background.primary,
      color: theme.colors.text.primary,
      fontSize: theme.typography.fontSize,
      '&:focus': {
        outline: `2px solid ${theme.colors.primary.border}`,
        outlineOffset: '-2px',
      },
      '&::placeholder': {
        color: theme.colors.text.secondary,
      },
    }),
    viewport: css({
      flex: 1,
      overflow: 'auto',
      minHeight: 0,
      padding: theme.spacing(1),
    }),
    category: css({
      marginBottom: theme.spacing(2),
    }),
    categoryHeader: css({
      position: 'sticky',
      top: 0,
      backgroundColor: theme.colors.background.primary,
      color: theme.colors.text.secondary,
      fontWeight: theme.typography.fontWeightMedium,
      fontSize: theme.typography.bodySmall.fontSize,
      padding: theme.spacing(1, 0.5),
      marginBottom: theme.spacing(0.5),
      borderRadius: theme.shape.radius.default,
      zIndex: 1,
      backdropFilter: 'blur(4px)',
      boxShadow: `0 1px 2px ${theme.colors.background.primary}`,
    }),
    grid: css({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))',
      gap: theme.spacing(0.5),
    }),
    emojiButton: css({
      padding: theme.spacing(0.75),
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      borderRadius: theme.shape.radius.default,
      fontSize: '1.25em',
      transition: 'background-color 0.2s',
      minWidth: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      '&:hover': {
        backgroundColor: theme.colors.action.hover,
      },
      '&:focus-visible': {
        outline: `2px solid ${theme.colors.primary.border}`,
        outlineOffset: '-2px',
      },
    }),
    empty: css({
      textAlign: 'center',
      padding: theme.spacing(2),
      color: theme.colors.text.secondary,
    }),
    loading: css({
      textAlign: 'center',
      padding: theme.spacing(2),
      color: theme.colors.text.secondary,
    }),
    categoryButtons: css({
      display: 'flex',
      gap: theme.spacing(0.5),
      padding: theme.spacing(1),
      overflowX: 'auto',
      flexShrink: 0,
      borderBottom: `1px solid ${theme.colors.border.weak}`,
      '&::-webkit-scrollbar': {
        height: '6px',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: theme.colors.border.medium,
        borderRadius: '3px',
      },
    }),
    categoryButton: css({
      padding: theme.spacing(0.75),
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      borderRadius: theme.shape.radius.default,
      fontSize: '1.25em',
      transition: 'background-color 0.2s',
      minWidth: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      '&:hover': {
        backgroundColor: theme.colors.action.hover,
      },
      '&[data-active="true"]': {
        backgroundColor: theme.colors.action.selected,
      },
    }),
    noEmojiOption: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: theme.spacing(1.5, 1),
      cursor: 'pointer',
      borderRadius: theme.shape.radius.default,
      transition: 'background-color 0.2s',
      marginBottom: theme.spacing(1),
      '&:hover': {
        backgroundColor: theme.colors.action.hover,
      },
    }),
  }), [theme]);

  // Render emojis grouped by category (when no search) or flat list (when searching)
  const renderContent = () => {
    if (loading) {
      return <div className={styles.loading}>Loading emojis...</div>;
    }

    if (!emojiData || emojisByCategory.size === 0) {
      return <div className={styles.empty}>Failed to load emojis</div>;
    }
    if (searchQuery.trim()) {
      // Flat list when searching
      if (filteredEmojis.length === 0) {
        return <div className={styles.empty}>No emojis found</div>;
      }

      return (
        <div className={styles.grid}>
          {filteredEmojis.map((emoji) => (
            <button
              key={emoji.hexcode}
              className={styles.emojiButton}
              onClick={() => handleEmojiClick(emoji)}
              title={emoji.label}
            >
              {emoji.unicode}
            </button>
          ))}
        </div>
      );
    }

    // Grouped by category when not searching
    return (
      <>
        {Array.from(emojisByCategory.entries()).map(([categoryId, emojis]) => (
          <div
            key={categoryId}
            className={styles.category}
            ref={(el) => {
              if (el) {
                categoryRefs.current.set(categoryId, el);
              }
            }}
          >
            <div className={styles.categoryHeader}>
              {CATEGORY_LABELS[categoryId] || `Category ${categoryId}`}
            </div>
            <div className={styles.grid}>
              {emojis.map((emoji) => (
                <button
                  key={emoji.hexcode}
                  className={styles.emojiButton}
                  onClick={() => handleEmojiClick(emoji)}
                  title={emoji.label}
                >
                  {emoji.unicode}
                </button>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  };

  return (
    <div className={styles.container}>
      {/* Fixed search bar */}
      <div className={styles.searchWrapper}>
        <Icon name="search" className={styles.searchIcon} />
        <input
          type="text"
          className={styles.search}
          placeholder="Search emojis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          autoFocus
        />
      </div>

      {/* Category tabs (hidden when searching) */}
      {!searchQuery.trim() && !loading && emojiData && (
        <div className={styles.categoryButtons}>
          {Array.from(emojisByCategory.keys()).map((categoryId) => (
            <button
              key={categoryId}
              className={styles.categoryButton}
              onClick={() => scrollToCategory(categoryId)}
              data-active={activeCategory === categoryId}
              title={CATEGORY_LABELS[categoryId]}
            >
              {CATEGORY_ICONS[categoryId] || '📦'}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable emoji viewport */}
      <div ref={viewportRef} className={styles.viewport}>
        {/* "No emoji" clear option */}
        {!loading && emojiData && (
          <div className={styles.noEmojiOption} onClick={handleClearEmoji}>
            <span>No emoji</span>
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
};
