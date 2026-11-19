// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/services/loans/loansApi', () => ({ default: api }));
import LoansReports from './LoansReports';

afterEach(() => {
  cleanup();
  api.get.mockReset();
});

it('apresenta fluxo operacional de 6 meses, distribuições e maiores devedores', async () => {
  api.get.mockImplementation((url: string) => {
    if (url.includes('/operational-flow')) {
      return Promise.resolve({
        data: {
          data: {
            flow: [
              {
                month: '2026-10',
                newConcessionsAmount: '5000.00',
                agreementsAmount: '1200.00',
                principalReceived: '2000.00',
                interestReceived: '400.00',
                chargesReceived: '50.00',
                totalReceived: '2450.00',
                netCashFlow: '-2550.00',
              },
            ],
          },
        },
      });
    }
    if (url.includes('/status-distribution')) {
      return Promise.resolve({
        data: {
          data: {
            distribution: [
              { status: 'active', count: 5, totalPrincipal: '10000.00', totalBalance: '7000.00' },
              { status: 'overdue', count: 2, totalPrincipal: '4000.00', totalBalance: '3500.00' },
            ],
          },
        },
      });
    }
    if (url.includes('/top-debtors')) {
      return Promise.resolve({
        data: {
          data: {
            debtors: [
              {
                clientId: 'cli-1',
                name: 'Cliente Alpha',
                maskedCpf: '***.***.123-**',
                openContracts: 2,
                principalBalance: '4500.00',
                overdueBalance: '1500.00',
                maxOverdueDays: 14,
              },
            ],
          },
        },
      });
    }
    return Promise.reject(new Error('Unknown url'));
  });

  render(<LoansReports walletId="w1" />);

  expect(await screen.findByText('Relatórios Operacionais')).toBeTruthy();
  expect(screen.getByText('2026-10')).toBeTruthy();
  expect(screen.getByText('-R$ 5000.00')).toBeTruthy();
  expect(screen.getByText('R$ 1200.00')).toBeTruthy(); // Agreements novation separate
  expect(screen.getByText('Cliente Alpha')).toBeTruthy();
  expect(screen.getByText('***.***.123-**')).toBeTruthy(); // Masked CPF
  expect(screen.getByText('14 dias')).toBeTruthy();
});

it('aciona exportação de relatórios com parâmetros corretos', async () => {
  api.get.mockImplementation((url: string) => {
    if (url.includes('/export')) {
      return Promise.resolve({ data: new Blob(['csv content']) });
    }
    return Promise.resolve({ data: { data: { flow: [], distribution: [], debtors: [] } } });
  });

  // Mock createObjectURL & revokeObjectURL
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  window.URL.revokeObjectURL = vi.fn();

  render(<LoansReports walletId="w1" />);
  await screen.findByText('Relatórios Operacionais');

  fireEvent.click(screen.getByTestId('export-kpis'));
  expect(api.get).toHaveBeenCalledWith(
    '/wallets/w1/reports/export',
    expect.objectContaining({ params: { type: 'kpis', format: 'csv' } })
  );
});
