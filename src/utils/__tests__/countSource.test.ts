import { DataFrame } from '@grafana/data';
import { resolveServerSideCount } from '../countSource';

const mockReplace = jest.fn();
jest.mock('@grafana/runtime', () => ({
  getTemplateSrv: () => ({ replace: mockReplace }),
}));

const frameWith = (custom?: Record<string, unknown>): DataFrame =>
  ({ fields: [], length: 0, meta: custom ? { custom } : undefined } as unknown as DataFrame);

describe('resolveServerSideCount', () => {
  beforeEach(() => {
    // Reset call history AND implementation between cases (some assertions
    // check the call count, which would otherwise accumulate across tests).
    mockReplace.mockReset();
    // Default: variable undefined -> Grafana echoes the target back.
    mockReplace.mockImplementation((t: string) => t);
  });

  // ---- frame meta source ----
  it('reads count from frame.meta.custom.count', () => {
    expect(resolveServerSideCount(frameWith({ count: 1234 }), 'gridCount')).toBe(1234);
  });

  it('accepts total / totalCount / @odata.count meta keys', () => {
    expect(resolveServerSideCount(frameWith({ total: 5 }), '')).toBe(5);
    expect(resolveServerSideCount(frameWith({ totalCount: 6 }), '')).toBe(6);
    expect(resolveServerSideCount(frameWith({ '@odata.count': 7 }), '')).toBe(7);
  });

  it('parses string meta counts with separators', () => {
    expect(resolveServerSideCount(frameWith({ count: '12,345' }), '')).toBe(12345);
  });

  it('frame meta takes priority over the variable', () => {
    mockReplace.mockReturnValue('999');
    expect(resolveServerSideCount(frameWith({ count: 100 }), 'gridCount')).toBe(100);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  // ---- variable source ----
  it('reads count from the named variable', () => {
    mockReplace.mockImplementation((t: string) => (t === '$gridCount' ? '4200' : t));
    expect(resolveServerSideCount(frameWith(), 'gridCount')).toBe(4200);
  });

  it('strips thousands separators / whitespace from the variable', () => {
    mockReplace.mockReturnValue(' 1 200 ');
    expect(resolveServerSideCount(frameWith(), 'gridCount')).toBe(1200);
  });

  it('floors fractional values', () => {
    mockReplace.mockReturnValue('10.9');
    expect(resolveServerSideCount(frameWith(), 'gridCount')).toBe(10);
  });

  // ---- null / unusable cases ----
  it('returns null when the variable is undefined (target echoed back)', () => {
    expect(resolveServerSideCount(frameWith(), 'gridCount')).toBeNull();
  });

  it('returns null for empty/whitespace variable name', () => {
    expect(resolveServerSideCount(frameWith(), '')).toBeNull();
    expect(resolveServerSideCount(frameWith(), '   ')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('returns null for non-numeric or negative values', () => {
    mockReplace.mockReturnValue('not-a-number');
    expect(resolveServerSideCount(frameWith(), 'gridCount')).toBeNull();
    mockReplace.mockReturnValue('-5');
    expect(resolveServerSideCount(frameWith(), 'gridCount')).toBeNull();
  });

  it('returns null when getTemplateSrv throws', () => {
    mockReplace.mockImplementation(() => {
      throw new Error('no template srv');
    });
    expect(resolveServerSideCount(frameWith(), 'gridCount')).toBeNull();
  });

  it('returns null when no frame and no usable variable', () => {
    expect(resolveServerSideCount(undefined, 'gridCount')).toBeNull();
  });
});
