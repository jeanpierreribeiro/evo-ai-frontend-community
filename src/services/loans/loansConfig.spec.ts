import { afterEach, describe, expect, it, vi } from 'vitest';

describe('flag de interface de empréstimos', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  it.each([
    [undefined, false], ['false', false], ['VITE_LOANS_UI_ENABLED_PLACEHOLDER', false], ['true', true],
  ])('interpreta %s como %s', async (value, expected) => {
    vi.stubEnv('VITE_LOANS_UI_ENABLED', value);
    const { loansUiEnabled } = await import('./loansConfig');
    expect(loansUiEnabled).toBe(expected);
  });
});
