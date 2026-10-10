import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { productName } from './product';

const packageJson = () => JSON.parse(readFileSync('package.json', 'utf8'));

/** A product name as a package name: lower case, one dash for anything else. */
const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Whether git has this file under its own hand — the only thing a fresh checkout ever gets. */
function tracked(path: string): boolean {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', path], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('foundation', () => {
  it('installs and tests', () => {
    const manifest = packageJson();

    // A fresh checkout installs the same tree this one did: the lock file is part of the checkout.
    expect(tracked('package-lock.json')).toBe(true);

    // And it installs THIS product, under the name its owner chose, not the template's placeholder.
    expect(manifest.name).toBe(slugOf(productName()));
    expect(manifest.name).not.toBe('app');

    // Then it runs its tests the way CI runs them, and writes the report CI publishes.
    expect(manifest.scripts?.test).toBe('vitest run');
    expect(manifest.scripts?.['test:ci']).toContain('.constat/check-report/raw.json');

    // Everything the checks need is declared, so installing is enough to run them.
    const dev = { ...manifest.dependencies, ...manifest.devDependencies } as Record<string, string>;
    for (const needed of ['vitest', 'react', 'react-dom']) expect(dev[needed]).toBeTruthy();

    // The product has a name, and it is not the one nobody chose.
    expect(productName()).not.toBe('A new app');
  });
});
