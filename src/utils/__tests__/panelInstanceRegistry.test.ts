import {
  _resetForTests,
  deregister,
  hasCollision,
  register,
  subscribe,
} from '../panelInstanceRegistry';

beforeEach(() => {
  _resetForTests();
});

describe('panelInstanceRegistry', () => {
  it('reports no collision for a single panel', () => {
    register({ panelId: 1, filterVariableName: 'gridFilter', sortVariableName: 'gridSort' });
    expect(hasCollision(1, 'gridFilter', 'filter')).toBe(false);
    expect(hasCollision(1, 'gridSort', 'sort')).toBe(false);
  });

  it('detects filter-name collision between two panels', () => {
    register({ panelId: 1, filterVariableName: 'gridFilter', sortVariableName: 'sortA' });
    register({ panelId: 2, filterVariableName: 'gridFilter', sortVariableName: 'sortB' });
    expect(hasCollision(1, 'gridFilter', 'filter')).toBe(true);
    expect(hasCollision(2, 'gridFilter', 'filter')).toBe(true);
    expect(hasCollision(1, 'sortA', 'sort')).toBe(false);
    expect(hasCollision(2, 'sortB', 'sort')).toBe(false);
  });

  it('detects sort-name collision independently of filter-name', () => {
    register({ panelId: 1, filterVariableName: 'filterA', sortVariableName: 'gridSort' });
    register({ panelId: 2, filterVariableName: 'filterB', sortVariableName: 'gridSort' });
    expect(hasCollision(1, 'gridSort', 'sort')).toBe(true);
    expect(hasCollision(2, 'gridSort', 'sort')).toBe(true);
    expect(hasCollision(1, 'filterA', 'filter')).toBe(false);
  });

  it('clears the collision when a colliding panel deregisters', () => {
    register({ panelId: 1, filterVariableName: 'gridFilter', sortVariableName: 'sortA' });
    register({ panelId: 2, filterVariableName: 'gridFilter', sortVariableName: 'sortB' });
    expect(hasCollision(1, 'gridFilter', 'filter')).toBe(true);
    deregister(2);
    expect(hasCollision(1, 'gridFilter', 'filter')).toBe(false);
  });

  it('updates collision when a panel re-registers with a new name', () => {
    register({ panelId: 1, filterVariableName: 'gridFilter', sortVariableName: 'sortA' });
    register({ panelId: 2, filterVariableName: 'gridFilter', sortVariableName: 'sortB' });
    expect(hasCollision(1, 'gridFilter', 'filter')).toBe(true);
    register({ panelId: 2, filterVariableName: 'inventoryFilter', sortVariableName: 'sortB' });
    expect(hasCollision(1, 'gridFilter', 'filter')).toBe(false);
  });

  it('notifies subscribers on register and deregister', () => {
    const listener = jest.fn();
    const unsub = subscribe(listener);
    register({ panelId: 1, filterVariableName: 'a', sortVariableName: 'b' });
    expect(listener).toHaveBeenCalledTimes(1);
    register({ panelId: 2, filterVariableName: 'c', sortVariableName: 'd' });
    expect(listener).toHaveBeenCalledTimes(2);
    deregister(1);
    expect(listener).toHaveBeenCalledTimes(3);
    unsub();
    register({ panelId: 3, filterVariableName: 'e', sortVariableName: 'f' });
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
