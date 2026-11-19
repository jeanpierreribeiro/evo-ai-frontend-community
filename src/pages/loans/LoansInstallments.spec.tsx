// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({get:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansInstallments from './LoansInstallments';
afterEach(()=>{cleanup();api.get.mockReset();});

it('apresenta parcela parcial e vencida e envia filtros e página à carteira selecionada',async()=>{
  api.get.mockResolvedValue({data:{data:[{id:'i1',contractId:'c1',clientName:'Cliente sintético',number:1,dueDate:'2025-01-31',balance:'300.00',received:'50.00',discounted:'10.00',settlement:'partial',deadline:'overdue'}],page:1,hasMore:true,asOf:'2026-10-29'}});
  render(<LoansInstallments walletId="w1" revision={0}/>);
  await screen.findByText('Cliente sintético');
  expect(screen.getByText(/Parcial · Vencida/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Situação'),{target:{value:'partial'}});
  await waitFor(()=>expect(api.get).toHaveBeenLastCalledWith('/wallets/w1/installments',{params:expect.objectContaining({status:'partial',page:1})}));
  fireEvent.click(screen.getByRole('button',{name:'Próxima'}));
  await waitFor(()=>expect(api.get).toHaveBeenLastCalledWith('/wallets/w1/installments',{params:expect.objectContaining({status:'partial',page:2})}));
});

it('não apresenta resposta de carteira anterior quando ocorre troca',async()=>{
  let resolveFirst!:(value:unknown)=>void;
  api.get.mockImplementation((url:string)=>url.includes('/w1/')?new Promise(resolve=>{resolveFirst=resolve;}):Promise.resolve({data:{data:[],page:1,hasMore:false,asOf:'2026-10-29'}}));
  const {rerender}=render(<LoansInstallments walletId="w1" revision={0}/>);
  rerender(<LoansInstallments walletId="w2" revision={0}/>);
  await screen.findByText('Nenhuma parcela encontrada.');
  resolveFirst({data:{data:[{id:'i1',clientName:'Dados anteriores',number:1,dueDate:'2025-01-31',balance:'10.00',settlement:'open',deadline:'overdue'}],page:1,hasMore:false,asOf:'2026-10-29'}});
  await waitFor(()=>expect(screen.queryByText(/Dados anteriores/)).toBeNull());
});

it('mantém apenas uma parcela selecionada por contrato',async()=>{
  const row={contractId:'c1',clientName:'Cliente',dueDate:'2025-01-31',balance:'100.00',received:'0.00',discounted:'0.00',settlement:'open',deadline:'overdue'};
  api.get.mockResolvedValue({data:{data:[{...row,id:'i1',number:1},{...row,id:'i2',number:2}],page:1,hasMore:false,asOf:'2026-10-29'}});
  render(<LoansInstallments walletId="w1" revision={0}/>);
  const first=await screen.findByRole('checkbox',{name:'Selecionar Cliente, parcela 1'});
  const second=screen.getByRole('checkbox',{name:'Selecionar Cliente, parcela 2'});
  fireEvent.click(first);expect((first as HTMLInputElement).checked).toBe(true);
  fireEvent.click(second);expect((first as HTMLInputElement).checked).toBe(false);expect((second as HTMLInputElement).checked).toBe(true);
  expect(screen.getByText('Cliente · parcela 2')).toBeTruthy();
});
