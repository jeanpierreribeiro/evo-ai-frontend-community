// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/services/loans/loansApi', () => ({ default: api }));
import LoansWalletsPage from './LoansWalletsPage';

describe('carteiras de empréstimos', () => {
  beforeEach(() => {
    api.get.mockReset(); api.post.mockReset();
    api.get.mockImplementation(async (url: string) => url === '/wallets'
      ? { data: { data: [{ id: 'w1', name: 'Carteira A' }, { id: 'w2', name: 'Carteira B' }] } }
      : url.endsWith('/settings') ? {data:{data:{version:0,defaultRate:null,defaultMethod:null,penaltyRate:null,lateRate:null,firstPenaltyDays:null,penaltyEveryDays:null,lateMethod:'proportional'}}}
      : { data: { data: [], page: 1, hasMore: false } });
  });
  afterEach(cleanup);

  it('pesquisa e concede acesso somente à carteira selecionada, limpando a lista ao trocar', async () => {
    api.post.mockImplementation(async (url: string) => url.endsWith('/search')
      ? { data: { data: [{ id: 'p1', name: 'Pessoa', confirmed: true }], page: 1, has_more: false } }
      : { data: {} });
    render(<LoansWalletsPage />);
    await screen.findByText('Carteira A');
    fireEvent.change(screen.getByLabelText('Carteira'), { target: { value: 'w1' } });
    await screen.findByText('Nenhum cliente nesta carteira.');
    await screen.findByText('Deixe em branco os valores que ainda não foram definidos.');
    await screen.findByText('Nenhum contrato confirmado.');
    fireEvent.change(screen.getByLabelText('Pesquisar pessoa'), { target: { value: 'Pessoa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));
    await screen.findByText('Pessoa');
    expect(api.post).toHaveBeenCalledWith('/wallets/w1/directory/search', { query: 'Pessoa', page: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Conceder acesso' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/wallets/w1/members', { userId: 'p1', active: true }, { headers: { 'Idempotency-Key': expect.any(String) } }));
    await screen.findByText('Acesso concedido a Pessoa.');
    fireEvent.change(screen.getByLabelText('Carteira'), { target: { value: 'w2' } });
    await screen.findByText('Nenhum cliente nesta carteira.');
    await screen.findByText('Deixe em branco os valores que ainda não foram definidos.');
    await screen.findByText('Nenhum contrato confirmado.');
    expect(screen.queryByText('Pessoa')).toBeNull();
  });

  it('mostra indisponibilidade e não trata falha como lista vazia', async () => {
    const { default: axios } = await import('axios');
    api.post.mockRejectedValue(new axios.AxiosError('offline', 'ERR_BAD_RESPONSE', undefined, undefined,
      { status: 503, statusText: 'Unavailable', headers: {}, config: { headers: new axios.AxiosHeaders() }, data: {} }));
    render(<LoansWalletsPage />);
    await screen.findByText('Carteira A');
    fireEvent.change(screen.getByLabelText('Carteira'), { target: { value: 'w1' } });
    await screen.findByText('Nenhum cliente nesta carteira.');
    await screen.findByText('Deixe em branco os valores que ainda não foram definidos.');
    await screen.findByText('Nenhum contrato confirmado.');
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));
    expect(await screen.findByText('O serviço está indisponível. Tente novamente mais tarde.')).toBeTruthy();
    expect(screen.queryByText('Nenhuma pessoa encontrada.')).toBeNull();
  });

  it('reutiliza a chave ao tentar criar novamente após uma resposta perdida', async () => {
    api.post.mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ data: { data: { id: 'w3', name: 'Nova' } } });
    render(<LoansWalletsPage />);
    await screen.findByText('Carteira A');
    fireEvent.change(screen.getByLabelText('Nome da nova carteira'), { target: { value: 'Nova' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar carteira' }));
    await screen.findByText('Não foi possível concluir a ação. Tente novamente.');
    fireEvent.click(screen.getByRole('button', { name: 'Criar carteira' }));
    await screen.findByText('Carteira criada.');
    expect(api.post.mock.calls[0][2].headers['Idempotency-Key']).toBeTruthy();
    expect(api.post.mock.calls[1][2].headers['Idempotency-Key']).toEqual(api.post.mock.calls[0][2].headers['Idempotency-Key']);
  });
});
