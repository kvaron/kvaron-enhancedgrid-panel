import React, { Component, ErrorInfo, ReactNode } from 'react';
import { css } from '@emotion/css';
import { config } from '@grafana/runtime';
import { GrafanaTheme2 } from '@grafana/data';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch rendering errors in child components.
 * Prevents the entire panel from crashing when a single component fails.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[EnhancedGrid] Rendering error caught by ErrorBoundary:', error);
    console.error('[EnhancedGrid] Component stack:', errorInfo.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const styles = getStyles(config.theme2);
      return (
        <div className={styles.container}>
          <div className={styles.icon}>⚠️</div>
          <div className={styles.title}>Something went wrong</div>
          <div className={styles.message}>The grid encountered an error while rendering.</div>
          <details className={styles.details}>
            <summary>Error details</summary>
            <pre className={styles.errorText}>{this.state.error?.message || 'Unknown error'}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css`
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      height: 100%;
      text-align: center;
      color: ${theme.colors.text.secondary};
    `,
    icon: css`
      font-size: 48px;
      margin-bottom: 16px;
    `,
    title: css`
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 8px;
      color: ${theme.colors.text.primary};
    `,
    message: css`
      font-size: 14px;
      margin-bottom: 16px;
    `,
    details: css`
      font-size: 12px;
      cursor: pointer;
      max-width: 100%;
      overflow: hidden;
    `,
    errorText: css`
      text-align: left;
      padding: 8px;
      background: ${theme.colors.error.transparent};
      border-radius: 4px;
      margin-top: 8px;
      overflow-x: auto;
      max-width: 400px;
      font-family: monospace;
      font-size: 11px;
    `,
  };
}
