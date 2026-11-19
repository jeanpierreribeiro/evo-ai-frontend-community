// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const api=vi.hoisted(() => ({get:vi.fn(),post:vi.fn()}));
vi.mock('@/services/loans/loansApi',() => ({default:api}));
import LoansSimulation from './LoansSimulation';

afterEach(cleanup);
it('sugere a taxa da carteira e permite alterá-la antes de calcular',async () => {
  api.get.mockImplementation(async (url:string) => url.endsWith('/settings') ? {data:{data:{version:0,defaultRate:'13.9',defaultMethod:null,penaltyRate:null,lateRate:null,firstPenaltyDays:null,penaltyEveryDays:null,lateMethod:'proportional'}}} : {data:{data:[],hasMore:false}});
  api.post.mockResolvedValue({data:{data:[{number:1,principal:'700.00',interest:'140.00',total:'840.00',dueDate:'2025-01-31'}]}});
  render(<LoansSimulation walletId="w1" settingsRevision={0} />);
  const rate=await screen.findByDisplayValue('13,9');
  fireEvent.change(rate,{target:{value:'20'}});
  fireEvent.change(screen.getByLabelText('Valor emprestado'),{target:{value:'700,00'}});
  fireEvent.change(screen.getByLabelText('Primeiro vencimento'),{target:{value:'2025-01-31'}});
  fireEvent.click(screen.getByRole('button',{name:'Calcular prévia'}));
  await screen.findByText('R$ 840,00');
  expect(api.post).toHaveBeenCalledWith('/wallets/w1/simulations',{principal:'700.00',ratePercent:'20',periods:1,interval:'monthly',firstDueDate:'2025-01-31'});
});

it('salva rascunho para cliente com CPF pendente e condições próprias',async () => {
  api.get.mockImplementation(async (url:string) => url.endsWith('/settings')
    ? {data:{data:{version:2,defaultRate:'20',defaultMethod:'single',penaltyRate:'2',lateRate:'1',firstPenaltyDays:1,penaltyEveryDays:30,lateMethod:'proportional'}}}
    : {data:{data:[{id:'c1',name:'Cliente',cpfPending:true}],hasMore:false}});
  api.post.mockImplementation(async (url:string) => url.endsWith('/simulations')
    ? {data:{data:[{number:1,principal:'700.00',interest:'140.00',total:'840.00',dueDate:'2025-01-31'}]}}
    : {data:{data:{id:'d1'}}});
  render(<LoansSimulation walletId="w1" settingsRevision={0} />);
  await screen.findByDisplayValue('20');
  fireEvent.change(screen.getByLabelText('Valor emprestado'),{target:{value:'700'}});
  fireEvent.change(screen.getByLabelText('Primeiro vencimento'),{target:{value:'2025-01-31'}});
  fireEvent.click(screen.getByRole('button',{name:'Calcular prévia'}));
  await screen.findByText('R$ 840,00');
  fireEvent.change(screen.getByLabelText('Multa (%)'),{target:{value:'3,5'}});
  fireEvent.change(screen.getByLabelText('Cliente'),{target:{value:'c1'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar rascunho'}));
  await screen.findByText('Rascunho salvo. Ele ainda não gera cobrança.');
  expect(api.post).toHaveBeenCalledWith('/wallets/w1/contracts/drafts',expect.objectContaining({clientId:'c1',settingsVersion:2,conditions:expect.objectContaining({penaltyRate:'3.5'})}),
    {headers:{'Idempotency-Key':expect.any(String)}});
});

it('mostra falha de cálculo e não oferece salvar uma prévia inválida',async () => {
  api.get.mockImplementation(async (url:string) => url.endsWith('/settings') ? {data:{data:{version:0,defaultRate:'20',defaultMethod:null,penaltyRate:null,lateRate:null,firstPenaltyDays:null,penaltyEveryDays:null,lateMethod:'proportional'}}} : {data:{data:[],hasMore:false}});
  api.post.mockRejectedValue(new Error('invalid'));
  render(<LoansSimulation walletId="w1" settingsRevision={0} />);
  await screen.findByDisplayValue('20');
  fireEvent.change(screen.getByLabelText('Valor emprestado'),{target:{value:'-1'}});
  fireEvent.change(screen.getByLabelText('Primeiro vencimento'),{target:{value:'2025-01-31'}});
  fireEvent.click(screen.getByRole('button',{name:'Calcular prévia'}));
  await screen.findByText('Não foi possível calcular. Confira os valores, a data e a quantidade de parcelas.');
  expect(screen.queryByRole('button',{name:'Salvar rascunho'})).toBeNull();
});

it('descarta prévia ao trocar de carteira',async () => {
  api.get.mockImplementation(async (url:string) => url.endsWith('/settings') ? {data:{data:{version:0,defaultRate:url.includes('/w1/')?'20':'10',defaultMethod:null,penaltyRate:null,lateRate:null,firstPenaltyDays:null,penaltyEveryDays:null,lateMethod:'proportional'}}} : {data:{data:[],hasMore:false}});
  api.post.mockResolvedValue({data:{data:[{number:1,principal:'700.00',interest:'140.00',total:'840.00',dueDate:'2025-01-31'}]}});
  const {rerender}=render(<LoansSimulation key="w1" walletId="w1" settingsRevision={0} />);
  await screen.findByDisplayValue('20');
  fireEvent.change(screen.getByLabelText('Valor emprestado'),{target:{value:'700'}});
  fireEvent.change(screen.getByLabelText('Primeiro vencimento'),{target:{value:'2025-01-31'}});
  fireEvent.click(screen.getByRole('button',{name:'Calcular prévia'}));
  await screen.findByText('R$ 840,00');
  rerender(<LoansSimulation key="w2" walletId="w2" settingsRevision={0} />);
  await screen.findByDisplayValue('10');
  expect(screen.queryByText('R$ 840,00')).toBeNull();
});
