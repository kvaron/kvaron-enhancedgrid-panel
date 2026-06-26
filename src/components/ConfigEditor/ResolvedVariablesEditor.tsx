import React from 'react';
import { StandardEditorProps, GrafanaTheme2 } from '@grafana/data';
import { css } from '@emotion/css';
import { IconButton, useStyles2 } from '@grafana/ui';
import { EnhancedGridOptions } from '../../types';
import { resolveServerSideVarNames } from '../../utils/serverSideVars';

const SUFFIXES = ['filter', 'sort', 'skip', 'top', 'count', 'mode'] as const;

// Per-suffix explanatory notes (only `mode` needs one today).
const SUFFIX_NOTES: Partial<Record<(typeof SUFFIXES)[number], string>> = {
  mode: 'optional — only needed to drive the view from a dashboard control',
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
  }),
  row: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    padding: theme.spacing(0.5, 1),
    background: theme.colors.background.secondary,
    borderRadius: theme.shape.radius.default,
  }),
  label: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    textTransform: 'capitalize',
  }),
  name: css({
    fontFamily: theme.typography.fontFamilyMonospace,
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.primary,
  }),
  note: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    marginTop: theme.spacing(0.5),
  }),
});

/**
 * Read-only display of the five resolved server-side variable names.
 *
 * The panel-options editor context does not reliably expose the panel id, so
 * when no Grid ID is set we show the runtime pattern `grid<panel id>_…` and
 * note that exact names appear once a Grid ID is entered. When a Grid ID is
 * set the names shown here match exactly what the panel publishes at runtime.
 */
export const ResolvedVariablesEditor: React.FC<StandardEditorProps<unknown, unknown, EnhancedGridOptions>> = ({
  context,
}) => {
  const styles = useStyles2(getStyles);
  const options = context.options;
  const gridId = options?.gridId?.trim();

  const resolved = gridId
    ? resolveServerSideVarNames(options as EnhancedGridOptions, 0)
    : null;

  const display: Array<{ suffix: string; name: string; note?: string }> = SUFFIXES.map((suffix) => ({
    suffix,
    name: resolved ? resolved[suffix] : `grid<panel id>_${suffix}`,
    note: SUFFIX_NOTES[suffix],
  }));

  return (
    <div>
      <div className={styles.container}>
        {display.map(({ suffix, name, note }) => (
          <div key={suffix}>
            <div className={styles.row}>
              <span className={styles.label}>{suffix}</span>
              <span className={styles.name}>{name}</span>
              <IconButton
                name="copy"
                size="sm"
                tooltip={`Copy ${name}`}
                aria-label={`Copy ${name}`}
                onClick={() => {
                  navigator.clipboard?.writeText(name);
                }}
              />
            </div>
            {note && <div className={styles.note}>{note}</div>}
          </div>
        ))}
      </div>
      <div className={styles.note}>
        {resolved
          ? 'These are the exact dashboard variable names this panel reads/writes.'
          : 'Names resolve at runtime from the panel id. Set a Grid ID above to see the exact names.'}
      </div>
    </div>
  );
};
