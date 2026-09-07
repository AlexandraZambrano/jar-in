import { beforeEach, describe, expect, it } from 'vitest';
import { isImported, markImported, resetImported } from './importDedupe';

beforeEach(resetImported);

describe('importDedupe', () => {
  it('remembers marked hashes for the session', () => {
    expect(isImported('a')).toBe(false);
    markImported(['a', 'b']);
    expect(isImported('a')).toBe(true);
    expect(isImported('b')).toBe(true);
    expect(isImported('c')).toBe(false);
  });

  it('reset clears everything', () => {
    markImported(['a']);
    resetImported();
    expect(isImported('a')).toBe(false);
  });
});
