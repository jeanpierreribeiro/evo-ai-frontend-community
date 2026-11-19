// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const api=vi.hoisted(() => ({get:vi.fn(),post:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansDrafts from './LoansDrafts';

afterEach(cleanup);
it('apresenta o cliente e exige confirmar que o dinheiro foi entregue',async () => {
  const client={name:'Cliente sintético',cpfPending:true};
  api.get.mockImplementation(async (url:string)=>url.endsWith('/d1')
    ? {data:{data:{id:'d1',clientId:'c1',client,version:1,principal:'700.00',ratePercent:'20',interval:'monthly',conditions:{penaltyRate:null,lateRate:null,firstPenaltyDays:null,penaltyEveryDays:null,lateMethod:'proportional'},preview:[{number:1,dueDate:'2025-01-31',principal:'700.00',interest:'140.00',total:'840.00'}]}}}
    : {data:{data:[{id:'d1',clientId:'c1',client,principal:'700.00',ratePercent:'20'}],page:1,hasMore:false}});
  api.post.mockResolvedValue({data:{data:{id:'d1',state:'confirmed'}}});
  render(<LoansDrafts walletId="w1" revision={0} />);
  await screen.findByText('Cliente sintético (CPF pendente) — R$ 700,00 — taxa 20%');
  fireEvent.click(screen.getByRole('button',{name:'Abrir rascunho'}));
  await screen.findByText('Cliente: Cliente sintético (CPF pendente). Confira as parcelas antes de confirmar.');
  const confirm=screen.getByRole('button',{name:'Confirmar contrato'}) as HTMLButtonElement;
  expect(confirm.disabled).toBe(true);
  fireEvent.click(screen.getByLabelText('Confirmo que o dinheiro foi entregue ao cliente.'));
  expect(confirm.disabled).toBe(false);
  fireEvent.click(confirm);
  await screen.findByText('Contrato confirmado.');
  expect(api.post).toHaveBeenCalledWith('/wallets/w1/contracts/d1/confirm',{expectedVersion:1},{headers:{'Idempotency-Key':expect.any(String)}});
});
