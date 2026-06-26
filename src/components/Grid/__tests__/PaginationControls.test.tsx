import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaginationControls } from '../PaginationControls';

jest.mock('@grafana/ui', () => {
  const theme = {
    colors: {
      background: { secondary: '#f7f8fa' },
      border: { medium: '#bbb' },
      text: { secondary: '#555' },
    },
    typography: {
      body: { lineHeight: 1.5 },
      bodySmall: { fontSize: '12px' },
    },
    components: { height: { md: 4 } },
    spacing: (...args: number[]) => args.map((value) => `${value * 8}px`).join(' '),
  };

  return {
    useStyles2: (getStyles: any) => getStyles(theme),
    Button: ({ onClick, disabled, title, ['aria-label']: ariaLabel }: any) => (
      <button type="button" onClick={onClick} disabled={disabled} title={title} aria-label={ariaLabel} />
    ),
    Input: ({ value, onChange, min, max, type }: any) => (
      <input type={type} value={value} onChange={onChange} min={min} max={max} />
    ),
    Combobox: ({ value, options, onChange }: any) => (
      <select
        aria-label="Rows per page"
        value={value}
        onChange={(e) =>
          onChange(options.find((o: any) => String(o.value) === e.currentTarget.value) ?? null)
        }
      >
        {options.map((o: any) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    ),
  };
});

const baseProps = {
  currentPage: 0,
  pageSize: 50,
  totalRows: null as number | null,
  currentPageRowCount: 50,
  onPageChange: jest.fn(),
  onPageSizeChange: jest.fn(),
};

describe('PaginationControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('unknown total (server-side paging)', () => {
    it('enables Next when the current page is full (rowCount === pageSize)', () => {
      render(<PaginationControls {...baseProps} currentPageRowCount={50} />);
      expect(screen.getByRole('button', { name: 'Next page' })).not.toBeDisabled();
    });

    it('disables Next when the current page is short (end of data)', () => {
      render(<PaginationControls {...baseProps} currentPageRowCount={20} />);
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    });

    it('disables Next on an empty page', () => {
      render(<PaginationControls {...baseProps} currentPage={2} currentPageRowCount={0} />);
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    });

    it('derives endRow from the actual rendered row count', () => {
      render(<PaginationControls {...baseProps} currentPage={0} currentPageRowCount={20} />);
      expect(screen.getByText(/Showing 1 to 20/)).toBeInTheDocument();
    });

    it('does not render the last-page button when total is unknown', () => {
      render(<PaginationControls {...baseProps} />);
      expect(screen.queryByRole('button', { name: 'Last page' })).not.toBeInTheDocument();
    });

    it('clamps a forward page jump to the next reachable page', () => {
      render(<PaginationControls {...baseProps} currentPage={1} currentPageRowCount={50} />);
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '99' } });
      // canGoNext true -> max reachable is currentPage + 1 = 2 (0-based)
      expect(baseProps.onPageChange).toHaveBeenCalledWith(2);
    });

    it('does not allow forward jumps past the current page at end of data', () => {
      render(<PaginationControls {...baseProps} currentPage={1} currentPageRowCount={10} />);
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '99' } });
      // canGoNext false -> clamp to currentPage (0-based 1)
      expect(baseProps.onPageChange).toHaveBeenCalledWith(1);
    });

    it('still allows backward navigation when total is unknown', () => {
      render(<PaginationControls {...baseProps} currentPage={5} currentPageRowCount={50} />);
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
      expect(baseProps.onPageChange).toHaveBeenCalledWith(1);
    });
  });

  describe('known total', () => {
    it('uses min(total, page end) for endRow', () => {
      render(<PaginationControls {...baseProps} totalRows={5} currentPageRowCount={5} />);
      expect(screen.getByText(/Showing 1 to 5 of 5 rows/)).toBeInTheDocument();
    });

    it('disables Next on the last page', () => {
      render(
        <PaginationControls {...baseProps} totalRows={60} currentPage={1} currentPageRowCount={10} />
      );
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    });

    it('clamps an over-range page jump to the last page', () => {
      render(<PaginationControls {...baseProps} totalRows={60} currentPageRowCount={50} />);
      // totalPages = ceil(60/50) = 2 -> last 0-based page is 1
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '99' } });
      expect(baseProps.onPageChange).toHaveBeenCalledWith(1);
    });

    it('resets to first page when page size changes', () => {
      render(
        <PaginationControls {...baseProps} totalRows={500} currentPage={3} currentPageRowCount={50} />
      );
      fireEvent.change(screen.getByRole('combobox', { name: 'Rows per page' }), {
        target: { value: '100' },
      });
      expect(baseProps.onPageSizeChange).toHaveBeenCalledWith(100);
      expect(baseProps.onPageChange).toHaveBeenCalledWith(0);
    });
  });
});
