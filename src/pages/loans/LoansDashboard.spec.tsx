// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/services/loans/loansApi', () => ({ default: api }));
import LoansDashboard from './LoansDashboard';

afterEach(() => {
  cleanup();
  api.get.mockReset();
});

it('apresenta indicadores K1 a K8 e alerta de qualidade de dados estimados', async () => {
  api.get.mockResolvedValue({
    data: {
      data: {
        walletId: 'w1',
        asOfDate: '2026-10-29',
        k1Active: '1500.00',
        k1Loss: '700.00',
        k1Total: '1500.00',
        k2Receivable30Days: '550.00',
        k3OverdueBuckets: {
          '1-7': { amount: '100.00', installmentsCount: 1, clientsCount: 1 },
          '8-30': { amount: '200.00', installmentsCount: 2, clientsCount: 1 },
          '31-90': { amount: '0.00', installmentsCount: 0, clientsCount: 0 },
          '>90': { amount: '500.00', installmentsCount: 3, clientsCount: 2 },
        },
        k4Par30Ratio: 0.125,
        k4Par30Amount: '500.00',
        k5EfficiencyRatio: 0.85,
        k5DiscountsGiven: '20.00',
        k6InterestReceivedMonth: '250.00',
        k6PenaltiesReceivedMonth: '15.00',
        k6LateInterestReceivedMonth: '5.00',
        k7ReturnRatio: 0.1667,
        k8ConcentrationRatio: 0.45,
        quality: {
          totalPayments: 10,
          estimatedPayments: 2,
          hasEstimatedDates: true,
          coveragePercent: 80,
        },
      },
    },
  });

  render(<LoansDashboard walletId="w1" />);

  expect(await screen.findByText('Indicadores da Carteira (K1 a K8)')).toBeTruthy();
  expect(screen.getByTestId('k1-value').textContent).toContain('R$ 1500.00');
  expect(screen.getByText(/Saldo em perda segregado: R\$ 700.00/)).toBeTruthy();
  expect(screen.getByTestId('k2-value').textContent).toContain('R$ 550.00');
  expect(screen.getByTestId('k4-value').textContent).toContain('12.50%');
  expect(screen.getByTestId('k5-value').textContent).toContain('85.00%');
  expect(screen.getByTestId('k6-value').textContent).toContain('R$ 250.00');
  expect(screen.getByTestId('k7-value').textContent).toContain('16.67%');
  expect(screen.getByTestId('k8-value').textContent).toContain('45.00%');
  expect(screen.getByText(/Esta carteira possui pagamentos com datas estimadas/)).toBeTruthy();
});

it('trata denominador zero de indicadores com N/A sem erro', async () => {
  api.get.mockResolvedValue({
    data: {
      data: {
        walletId: 'w1',
        asOfDate: '2026-10-29',
        k1Active: '0.00',
        k1Loss: '0.00',
        k1Total: '0.00',
        k2Receivable30Days: '0.00',
        k3OverdueBuckets: {
          '1-7': { amount: '0.00', installmentsCount: 0, clientsCount: 0 },
          '8-30': { amount: '0.00', installmentsCount: 0, clientsCount: 0 },
          '31-90': { amount: '0.00', installmentsCount: 0, clientsCount: 0 },
          '>90': { amount: '0.00', installmentsCount: 0, clientsCount: 0 },
        },
        k4Par30Ratio: null,
        k4Par30Amount: '0.00',
        k5EfficiencyRatio: null,
        k5DiscountsGiven: '0.00',
        k6InterestReceivedMonth: '0.00',
        k6PenaltiesReceivedMonth: '0.00',
        k6LateInterestReceivedMonth: '0.00',
        k7ReturnRatio: null,
        k8ConcentrationRatio: null,
        quality: {
          totalPayments: 0,
          estimatedPayments: 0,
          hasEstimatedDates: false,
          coveragePercent: 100,
        },
      },
    },
  });

  render(<LoansDashboard walletId="w1" />);

  expect(await screen.findByText('Indicadores da Carteira (K1 a K8)')).toBeTruthy();
  expect(screen.getByTestId('k4-value').textContent).toContain('N/A');
  expect(screen.getByTestId('k5-value').textContent).toContain('N/A');
  expect(screen.getByTestId('k7-value').textContent).toContain('N/A');
  expect(screen.getByTestId('k8-value').textContent).toContain('N/A');
});
