import { useEffect, useState, RefObject } from 'react';

interface Position {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  width?: number | string;
}

export function usePopoverPosition(
  triggerRef: RefObject<HTMLElement>,
  popoverRef: RefObject<HTMLElement>,
  isOpen: boolean
): Position {
  const [position, setPosition] = useState<Position>({ left: 0, top: 0 });

  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return;
    }

    const calculatePosition = () => {
      if (!triggerRef.current) {
        return;
      }

      const trigger = triggerRef.current.getBoundingClientRect();
      const DEFAULT_WIDTH = 400;
      const SPACING = 8;

      // Find the sidebar container (look for parent with specific width constraints)
      let sidebarElement = triggerRef.current.parentElement;
      let sidebarWidth = trigger.width;
      let sidebarLeft = trigger.left;

      // Traverse up the DOM to find a wider container (likely the sidebar)
      while (sidebarElement && sidebarWidth < 300) {
        const rect = sidebarElement.getBoundingClientRect();
        if (rect.width > sidebarWidth && rect.width < window.innerWidth) {
          sidebarWidth = rect.width;
          sidebarLeft = rect.left;
        }
        sidebarElement = sidebarElement.parentElement;
      }

      const availableWidth = sidebarWidth - SPACING * 2;
      const newPosition: Position = {
        bottom: window.innerHeight - trigger.top + SPACING,
      };

      if (availableWidth < DEFAULT_WIDTH) {
        // Narrow mode: fill the width of the sidebar
        newPosition.left = sidebarLeft + SPACING;
        newPosition.width = availableWidth;
      } else {
        // Wide mode: use default width and center it
        newPosition.width = DEFAULT_WIDTH;
        newPosition.left = sidebarLeft + (sidebarWidth - DEFAULT_WIDTH) / 2;
      }

      setPosition(newPosition);
    };

    calculatePosition();

    // Recalculate on scroll or resize
    window.addEventListener('scroll', calculatePosition, true);
    window.addEventListener('resize', calculatePosition);

    return () => {
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isOpen, triggerRef, popoverRef]);

  return position;
}
