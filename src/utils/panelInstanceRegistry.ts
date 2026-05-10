/**
 * Module-scoped registry of mounted Enhanced Grid panel instances.
 *
 * Used to detect Filter / Sort variable-name collisions when multiple grid
 * panels coexist on the same dashboard. Each panel registers itself at
 * mount with `register()` and deregisters at unmount; subscribers (the
 * panels themselves, via `useSyncExternalStore`) receive change
 * notifications so the visible warning banner can update reactively when a
 * sibling panel mounts, unmounts, or has its variable-name option changed.
 *
 * Pure module state -- the registry lives for the lifetime of the page
 * (one Grafana session). It is intentionally NOT global beyond the
 * plugin's bundle.
 */

export interface PanelInstance {
  panelId: number;
  filterVariableName: string;
  sortVariableName: string;
}

const instances = new Map<number, PanelInstance>();
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => l());
}

export function register(instance: PanelInstance): void {
  instances.set(instance.panelId, instance);
  notify();
}

export function deregister(panelId: number): void {
  instances.delete(panelId);
  notify();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Returns true iff at least one OTHER registered panel uses the same value
 * for the given variable-name kind.
 */
export function hasCollision(
  panelId: number,
  varName: string,
  kind: 'filter' | 'sort'
): boolean {
  for (const [otherId, other] of instances) {
    if (otherId === panelId) {
      continue;
    }
    const otherName = kind === 'filter' ? other.filterVariableName : other.sortVariableName;
    if (otherName === varName) {
      return true;
    }
  }
  return false;
}

/**
 * For test isolation — clears the registry. Not exported via the package
 * entrypoint; consumers should never call this in production code.
 */
export function _resetForTests(): void {
  instances.clear();
  listeners.clear();
}
