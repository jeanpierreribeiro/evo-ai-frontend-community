// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansBatchPreview from './LoansBatchPreview';
afterEach(()=>{cleanup();api.get.mockReset();api.post.mockReset();localStorage.clear();});

it('apresenta prévia por componentes e erro por contrato sem liberar confirmação incompleta',async()=>{
  api.get.mockImplementation(async(url:string)=>url.includes('/c1/')?{data:{data:{contractVersion:3,installments:[{id:'i1',number:1,dueDate:'2025-01-31'}]}}}:Promise.reject(new Error('unavailable')));
  api.post.mockResolvedValue({data:{data:{chargesComplete:false,maximum:'860.00',remaining:'720.00',allocations:[{installmentId:'i1',penalty:'20.00',interest:'120.00',lateInterest:'0.00',otherFees:'0.00',principal:'0.00'}]}}});
  render(<LoansBatchPreview walletId="w1" selection={[{contractId:'c1',installmentId:'i1',clientName:'Ana',number:1},{contractId:'c2',installmentId:'i2',clientName:'Beto',number:2}]}/>);
  for(const name of ['Ana','Beto']) {
    fireEvent.change(screen.getByLabelText(`Valor para ${name}`),{target:{value:'140.00'}});
    fireEvent.change(screen.getByLabelText(`Data para ${name}`),{target:{value:'2025-02-03'}});
  }
  fireEvent.click(screen.getByRole('button',{name:'Calcular prévias'}));
  await screen.findByText(/Prévia incompleta/);
  expect(screen.getByText(/Parcela 1: multa R\$ 20.00/)).toBeTruthy();
  expect(screen.getByText(/Não foi possível calcular/)).toBeTruthy();
  expect(screen.getByText('A confirmação em lote ainda não está disponível.')).toBeTruthy();
  expect(api.post).toHaveBeenCalledWith('/wallets/w1/contracts/c1/payments/preview',{selectedInstallmentId:'i1',amount:'140.00',paidOn:'2025-02-03',expectedVersion:3});
  expect(api.post).toHaveBeenCalledTimes(1);
});

it('preserva chave antes do envio quando prévia completa e registra o resultado',async()=>{
  const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',wallet='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',contract='cccccccc-cccc-4ccc-8ccc-cccccccccccc',installment='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  Object.defineProperty(navigator,'locks',{configurable:true,value:{request:async (_name:string,_options:unknown,callback:(lock:object)=>unknown)=>callback({})}});
  api.get.mockResolvedValue({data:{data:{contractVersion:3,installments:[{id:installment,number:1,dueDate:'2025-01-31'}]}}});
  api.post.mockImplementation(async(url:string,body:{items?:Array<{contractId:string;key:string}>})=>{
    if(url.endsWith('/preview'))return {data:{data:{chargesComplete:true,maximum:'100.00',remaining:'90.00',allocations:[{installmentId:installment,penalty:'0.00',interest:'0.00',lateInterest:'0.00',otherFees:'0.00',principal:'10.00'}]}}};
    const saved=JSON.parse(localStorage.getItem(`loans-batch-v1:${actor}:${wallet}`)!);
    expect(saved.items[0].key).toBe(body.items![0].key);expect(saved.items[0].status).toBe('pending');
    return {data:{data:[{...body.items![0],status:'confirmed'}]}};
  });
  const changed=vi.fn();
  render(<LoansBatchPreview walletId={wallet} actorId={actor} onJournalChange={changed} selection={[{contractId:contract,installmentId:installment,clientName:'Ana',number:1}]}/>);
  fireEvent.change(screen.getByLabelText('Valor para Ana'),{target:{value:'10.00'}});
  fireEvent.change(screen.getByLabelText('Data para Ana'),{target:{value:'2025-02-01'}});
  fireEvent.click(screen.getByRole('button',{name:'Calcular prévias'}));
  fireEvent.click(await screen.findByRole('button',{name:'Confirmar recebimentos'}));
  await waitFor(()=>expect(changed).toHaveBeenCalled());
  const saved=JSON.parse(localStorage.getItem(`loans-batch-v1:${actor}:${wallet}`)!);
  expect(saved.items[0].status).toBe('confirmed');
});
