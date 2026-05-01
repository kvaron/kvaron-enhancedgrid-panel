import { createContext, useContext } from 'react';

// Each EnhancedGrid panel instance generates its own namespace (a stable
// `useId()` value at the panel root) and pushes it through this context so
// every SparkChart inside that panel can scope its gradient `<id>` values.
// Two panel instances with identical gradient configurations would otherwise
// emit `<linearGradient id="...">` entries that collide in the DOM; with a
// per-panel namespace, identical gradients still dedupe within the same
// panel but stay distinct across panels.
export const SparkChartNamespaceContext = createContext<string>('');

export function useSparkChartNamespace(): string {
  return useContext(SparkChartNamespaceContext);
}
