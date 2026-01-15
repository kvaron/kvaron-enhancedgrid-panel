/**
 * Utility functions for scrollbar detection and scroll synchronization.
 */

let cachedScrollbarWidth: number | null = null;

/**
 * Detects the browser's scrollbar width.
 * Creates a temporary element to measure the difference between
 * outer and inner width when overflow is set to scroll.
 * Result is cached for performance.
 */
export function getScrollbarWidth(): number {
  if (cachedScrollbarWidth !== null) {
    return cachedScrollbarWidth;
  }

  // Create outer element with scrollbar
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll';
  outer.style.width = '100px';
  outer.style.height = '100px';
  outer.style.position = 'absolute';
  outer.style.top = '-9999px';
  document.body.appendChild(outer);

  // Create inner element
  const inner = document.createElement('div');
  inner.style.width = '100%';
  inner.style.height = '100%';
  outer.appendChild(inner);

  // Calculate scrollbar width
  cachedScrollbarWidth = outer.offsetWidth - inner.offsetWidth;

  // Cleanup
  document.body.removeChild(outer);

  return cachedScrollbarWidth;
}

/**
 * Checks if an element has a vertical scrollbar.
 */
export function hasVerticalScrollbar(element: HTMLElement | null): boolean {
  if (!element) {
    return false;
  }
  return element.scrollHeight > element.clientHeight;
}

/**
 * Checks if an element has a horizontal scrollbar.
 */
export function hasHorizontalScrollbar(element: HTMLElement | null): boolean {
  if (!element) {
    return false;
  }
  return element.scrollWidth > element.clientWidth;
}
