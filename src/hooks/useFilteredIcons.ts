import { useMemo } from 'react';
import { getAvailableIcons } from '@grafana/ui';

/**
 * Hook to get filtered list of available Grafana icons.
 * Memoizes the icon list and filters based on search string.
 *
 * @param search - Search string to filter icons by name
 * @returns Array of icon names matching the search
 */
export function useFilteredIcons(search: string): string[] {
  const availableIcons = useMemo(() => getAvailableIcons(), []);

  return useMemo(() => {
    if (!search) {
      return availableIcons;
    }
    const searchLower = search.toLowerCase();
    return availableIcons.filter((icon) => icon.toLowerCase().includes(searchLower));
  }, [availableIcons, search]);
}
