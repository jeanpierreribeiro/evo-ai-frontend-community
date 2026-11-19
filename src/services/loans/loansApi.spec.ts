// @vitest-environment jsdom
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ token: 'expired', refresh: vi.fn() }));
vi.mock('@/store/authStore', () => ({
  useAuthStore: { getState: () => ({
    getAuthHeader: () => ({ Authorization: `Bearer ${state.token}` }),
    setAccessToken: (token: string) => { state.token = token; },
  }) },
}));
vi.mock('@/services/core/apiAuth', () => ({ default: { post: state.refresh } }));

import { loansApi } from './loansApi';

describe('loans API retry', () => {
  beforeEach(() => { state.token = 'expired'; state.refresh.mockReset(); });

  it('renews an expired token and preserves the operation key', async () => {
    state.refresh.mockResolvedValue({ data: { data: { access_token: 'renewed' } } });
    const attempts: Array<{ key: unknown; authorization: unknown }> = [];
    loansApi.defaults.adapter = async config => {
      const headers = AxiosHeaders.from(config.headers);
      attempts.push({ key: headers.get('Idempotency-Key'), authorization: headers.get('Authorization') });
      if (attempts.length === 1) {
        const response: AxiosResponse = { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config };
        throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response);
      }
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    };
    const response = await loansApi.post('/payments', { value: '100.00' }, { headers: { 'Idempotency-Key': 'test-key' } });
    expect(response.data).toEqual({ ok: true });
    expect(attempts).toEqual([
      { key: 'test-key', authorization: 'Bearer expired' },
      { key: 'test-key', authorization: 'Bearer renewed' },
    ]);
    expect(state.refresh).toHaveBeenCalledTimes(1);
  });
});
