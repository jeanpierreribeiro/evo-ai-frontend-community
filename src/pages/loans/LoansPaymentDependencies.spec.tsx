// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({get:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansPaymentDependencies from './LoansPaymentDependencies';
afterEach(()=>{cleanup();api.get.mockReset();});

it('apresenta fatos do contrato sem autorizar correção mesmo sem eventos',async()=>{
  api.get.mockResolvedValue({data:{data:{relatedEvents:{otherPayments:0,extensions:0,charges:0,discounts:0,adjustments:0,losses:0,agreements:[]},payment:{dateCorrections:[]},canConfirm:false,dependenciesComplete:false}}});
  render(<LoansPaymentDependencies walletId="w1" contractId="c1" paymentId="p1"/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar registros relacionados'}));
  expect(await screen.findByText(/não indicam, por si só, uma dependência/)).toBeTruthy();
  expect(screen.getByText(/Outros pagamentos: 0/)).toBeTruthy();
  expect(screen.getByText(/Estornos e correções de recebimento ainda não estão disponíveis/)).toBeTruthy();
  expect(screen.queryByRole('button',{name:/estornar|corrigir/i})).toBeNull();
  expect(api.get).toHaveBeenCalledWith('/wallets/w1/contracts/c1/payments/p1/dependencies');
});

it('mostra eventos e correção de data sem presumir sua ordem',async()=>{
  api.get.mockResolvedValue({data:{data:{relatedEvents:{otherPayments:2,extensions:1,charges:3,discounts:4,adjustments:5,losses:1,agreements:[{id:'a',targetContractId:'b'}]},payment:{dateCorrections:[{revision:1,previousPaidOn:'2025-01-01',correctedPaidOn:'2025-01-02'}]},canConfirm:false,dependenciesComplete:false}}});
  render(<LoansPaymentDependencies walletId="w1" contractId="c1" paymentId="p1"/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar registros relacionados'}));
  expect(await screen.findByText(/Outros pagamentos: 2 · prorrogações: 1 · encargos: 3 · descontos: 4/)).toBeTruthy();
  expect(screen.getByText(/Ajustes: 5 · perdas: 1 · acordos originados neste contrato: 1 · correções de data deste recebimento: 1/)).toBeTruthy();
  expect(screen.getByText(/não percorre toda a cadeia/)).toBeTruthy();
});

it('informa indisponibilidade sem expor um resultado anterior',async()=>{
  api.get.mockRejectedValue(new Error('unavailable'));
  render(<LoansPaymentDependencies walletId="w1" contractId="c1" paymentId="p1"/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar registros relacionados'}));
  expect(await screen.findByText('Não foi possível consultar os registros relacionados a este recebimento.')).toBeTruthy();
  expect(screen.queryByText(/Outros pagamentos:/)).toBeNull();
});
