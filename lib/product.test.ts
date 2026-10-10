import { describe, expect, it } from 'vitest';
import { productName } from './product';

describe('foundation', () => {
  it('installs and tests', () => {
    expect(typeof productName).toBe('function');
  });

  it('first screen', () => {
    expect(productName().length).toBeGreaterThan(0);
  });
});
