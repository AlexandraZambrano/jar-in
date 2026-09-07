import { describe, expect, it } from 'vitest';
import { move } from './reorder';

describe('move', () => {
  it('moves an item up', () => {
    expect(move(['a', 'b', 'c'], 2, 'up')).toEqual(['a', 'c', 'b']);
  });
  it('moves an item down', () => {
    expect(move(['a', 'b', 'c'], 0, 'down')).toEqual(['b', 'a', 'c']);
  });
  it('is a no-op at the edges', () => {
    const list = ['a', 'b', 'c'];
    expect(move(list, 0, 'up')).toBe(list);
    expect(move(list, 2, 'down')).toBe(list);
    expect(move(list, 5, 'up')).toBe(list);
  });
});
