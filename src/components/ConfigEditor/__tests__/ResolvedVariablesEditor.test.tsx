import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResolvedVariablesEditor } from '../ResolvedVariablesEditor';
import { EnhancedGridOptions } from '../../../types';

jest.mock('@grafana/ui', () => ({
  useStyles2: (getStyles: any) => getStyles({ spacing: () => '0', colors: { background: {}, text: {} }, typography: { bodySmall: {}, fontFamilyMonospace: 'monospace' }, shape: { radius: {} } }),
  IconButton: ({ 'aria-label': ariaLabel }: any) => <button type="button" aria-label={ariaLabel} />,
}));

const baseOptions = {
  gridId: 'inventory',
} as unknown as EnhancedGridOptions;

const renderEditor = (options: Partial<EnhancedGridOptions>) =>
  render(
    <ResolvedVariablesEditor
      // Only `context.options` is read by the component.
      context={{ options } as any}
      value={undefined}
      onChange={jest.fn()}
      item={{} as any}
      id="resolved-vars"
    />
  );

describe('ResolvedVariablesEditor', () => {
  it('P3-2: lists the resolved _mode variable name', () => {
    renderEditor(baseOptions);
    expect(screen.getByText('inventory_mode')).toBeInTheDocument();
    // Other concerns still listed.
    expect(screen.getByText('inventory_filter')).toBeInTheDocument();
    expect(screen.getByText('inventory_sort')).toBeInTheDocument();
  });

  it('P3-2: labels the mode variable as optional', () => {
    renderEditor(baseOptions);
    expect(
      screen.getByText('optional — only needed to drive the view from a dashboard control')
    ).toBeInTheDocument();
  });

  it('shows the runtime pattern (including _mode) when no Grid ID is set', () => {
    renderEditor({ gridId: '' } as EnhancedGridOptions);
    expect(screen.getByText('grid<panel id>_mode')).toBeInTheDocument();
  });
});
