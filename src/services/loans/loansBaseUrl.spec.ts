// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/store/authStore', () => ({ useAuthStore: { getState: () => ({ getAuthHeader: () => ({}) }) } }));
vi.mock('@/services/core/apiAuth', () => ({ default: { post: vi.fn() } }));

describe('configuração da URL de empréstimos', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  it.each([
    ['VITE_LOANS_API_URL_PLACEHOLDER', `${window.location.origin}/api/v1/loans`],
    ['https://gateway.example.invalid/', 'https://gateway.example.invalid/api/v1/loans'],
    ['https://gateway.example.invalid/api/v1/loans', 'https://gateway.example.invalid/api/v1/loans'],
  ])('usa %s como URL base', async (value, expected) => {
    vi.stubEnv('VITE_LOANS_API_URL', value);
    const { loansApi } = await import('./loansApi');
    expect(loansApi.defaults.baseURL).toBe(expected);
  });
});
