import React, { useMemo } from 'react';
import { PanelProps } from '@grafana/data';
import { PanelDataErrorView } from '@grafana/runtime';
import { EnhancedGridOptions } from '../types';
import { Grid } from './Grid/Grid';
import { ErrorBoundary } from './ErrorBoundary';

interface Props extends PanelProps<EnhancedGridOptions> {}

export const EnhancedGridPanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, id }) => {
  // Get global highlight rules
  const allHighlightRules = useMemo(() => {
    return options.highlightRules || [];
  }, [options.highlightRules]);

  // Error handling
  if (data.series.length === 0) {
    return <PanelDataErrorView fieldConfig={fieldConfig} panelId={id} data={data} needsStringField={false} />;
  }

  return (
    <ErrorBoundary>
      <Grid data={data.series[0]} options={options} width={width} height={height} highlightRules={allHighlightRules} />
    </ErrorBoundary>
  );
};
