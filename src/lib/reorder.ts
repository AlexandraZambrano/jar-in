/** Return a new array with the item at `index` moved one slot in `dir`.
 *  Out-of-range moves are no-ops (returns the same reference). */
export function move<T>(list: T[], index: number, dir: 'up' | 'down'): T[] {
  const target = dir === 'up' ? index - 1 : index + 1;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) {
    return list;
  }
  const next = list.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
