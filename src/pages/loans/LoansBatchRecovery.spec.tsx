// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createBatchJournal,updateBatchJournal} from '@/services/loans/loansBatchJournal';
const api=vi.hoisted(()=>({post:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansBatchRecovery from './LoansBatchRecovery';
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',wallet='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const items=[{contractId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',key:'11111111111111111111111111111111',payment:{selectedInstallmentId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',amount:'10.00',paidOn:'2025-02-01',expectedVersion:2}},{contractId:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',key:'22222222222222222222222222222222',payment:{selectedInstallmentId:'ffffffff-ffff-4fff-8fff-ffffffffffff',amount:'20.00',paidOn:'2025-02-01',expectedVersion:2}}];
afterEach(()=>{cleanup();localStorage.clear();api.post.mockReset();});

it('mostra resultados por item, repete com as mesmas chaves e só depois encerra',async()=>{
  Object.defineProperty(navigator,'locks',{configurable:true,value:{request:async (_name:string,_options:unknown,callback:(lock:object)=>unknown)=>callback({})}});
  createBatchJournal(localStorage,actor,wallet,items);
  updateBatchJournal(localStorage,actor,wallet,[{contractId:items[0].contractId,key:items[0].key,status:'confirmed'},{contractId:items[1].contractId,key:items[1].key,status:'unknown'}]);
  api.post.mockResolvedValue({data:{data:[{contractId:items[0].contractId,key:items[0].key,status:'replayed'},{contractId:items[1].contractId,key:items[1].key,status:'rejected',code:'PAYMENT_EXCEEDS_BALANCE'}]}});
  render(<LoansBatchRecovery actorId={actor} walletId={wallet} revision={0}/>);
  await screen.findByText(/Resultado incerto/);
  expect((screen.getByRole('button',{name:'Concluir conferência'}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Repetir lote com as mesmas chaves'}));
  await screen.findByText(/Já confirmado/);expect(screen.getByText(/Rejeitado/)).toBeTruthy();
  expect(api.post).toHaveBeenCalledWith(`/wallets/${wallet}/payment-batches`,{actorId:actor,items});
  fireEvent.click(screen.getByRole('button',{name:'Concluir conferência'}));
  await waitFor(()=>expect(screen.queryByText('Resultado do lote')).toBeNull());
});
