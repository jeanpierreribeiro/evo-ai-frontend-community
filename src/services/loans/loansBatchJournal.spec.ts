// @vitest-environment jsdom
import {beforeEach,expect,it,vi} from 'vitest';
import {BatchJournalError,clearBatchJournal,createBatchJournal,executeBatchJournal,readBatchJournal,updateBatchJournal,type BatchItem} from './loansBatchJournal';
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',wallet='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const items:BatchItem[]=[{contractId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',key:'11111111111111111111111111111111',payment:{selectedInstallmentId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',amount:'10.00',paidOn:'2025-02-01',expectedVersion:2}},{contractId:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',key:'22222222222222222222222222222222',payment:{selectedInstallmentId:'ffffffff-ffff-4fff-8fff-ffffffffffff',amount:'20.00',paidOn:'2025-02-01',expectedVersion:3}}];
beforeEach(()=>localStorage.clear());

it('preserva payload e chaves no navegador, separando usuário e carteira',()=>{
  createBatchJournal(localStorage,actor,wallet,items);
  expect(readBatchJournal(localStorage,actor,wallet)?.items.map(({status,...item})=>item)).toEqual(items);
  expect(readBatchJournal(localStorage,'11111111-1111-4111-8111-111111111111',wallet)).toBeNull();
  expect(()=>createBatchJournal(localStorage,actor,wallet,items)).toThrow(BatchJournalError);
  expect(()=>clearBatchJournal(localStorage,actor,wallet)).toThrow(BatchJournalError);
});

it('mantém resultado incerto até repetição e não muda um item confirmado',()=>{
  createBatchJournal(localStorage,actor,wallet,items);
  const journal=updateBatchJournal(localStorage,actor,wallet,[{contractId:items[0].contractId,key:items[0].key,status:'confirmed'},{contractId:items[1].contractId,key:items[1].key,status:'unknown',code:'DEPENDENCY_UNAVAILABLE'}]);
  expect(journal.items[1].status).toBe('unknown');
  expect(()=>clearBatchJournal(localStorage,actor,wallet)).toThrow(BatchJournalError);
  expect(()=>updateBatchJournal(localStorage,actor,wallet,[{contractId:items[0].contractId,key:items[0].key,status:'rejected'},{contractId:items[1].contractId,key:items[1].key,status:'rejected'}])).toThrow(BatchJournalError);
  const updated=updateBatchJournal(localStorage,actor,wallet,[{contractId:items[0].contractId,key:items[0].key,status:'replayed'},{contractId:items[1].contractId,key:items[1].key,status:'rejected',code:'PAYMENT_EXCEEDS_BALANCE'}]);
  expect(updated.items[0].payment).toEqual(items[0].payment);clearBatchJournal(localStorage,actor,wallet);
  expect(readBatchJournal(localStorage,actor,wallet)).toBeNull();
});

it('bloqueia armazenamento indisponível, resultado incompleto e registro adulterado',()=>{
  const unavailable={getItem:()=>null,setItem:()=>{throw Error('quota');}} as unknown as Storage;
  expect(()=>createBatchJournal(unavailable,actor,wallet,items)).toThrow(BatchJournalError);
  createBatchJournal(localStorage,actor,wallet,items);
  expect(()=>updateBatchJournal(localStorage,actor,wallet,[])).toThrow(BatchJournalError);
  localStorage.setItem(`loans-batch-v1:${actor}:${wallet}`,'{"version":1}');
  expect(()=>readBatchJournal(localStorage,actor,wallet)).toThrow(BatchJournalError);
});

it('preserva as chaves após timeout e repete o mesmo payload sob bloqueio entre abas',async()=>{
  const locks={request:async (_name:string,_options:unknown,fn:(lock:object)=>unknown)=>fn({})} as unknown as LockManager;
  const timedOut=vi.fn().mockRejectedValue(new Error('timeout'));
  const unresolved=await executeBatchJournal(localStorage,locks,actor,wallet,{kind:'new',items,chargesComplete:true},timedOut);
  expect(unresolved.items.map(item=>item.status)).toEqual(['unknown','unknown']);
  const retry=vi.fn().mockResolvedValue([{contractId:items[0].contractId,key:items[0].key,status:'replayed'},{contractId:items[1].contractId,key:items[1].key,status:'rejected',code:'PAYMENT_EXCEEDS_BALANCE'}]);
  const resolved=await executeBatchJournal(localStorage,locks,actor,wallet,{kind:'retry'},retry);
  expect(retry).toHaveBeenCalledWith(items);expect(resolved.items.map(item=>item.status)).toEqual(['replayed','rejected']);
  clearBatchJournal(localStorage,actor,wallet);
});

it('não envia quando a prévia está incompleta, o bloqueio não existe ou outra aba está ativa',async()=>{
  const locks={request:async (_name:string,_options:unknown,fn:(lock:null)=>unknown)=>fn(null)} as unknown as LockManager;
  const send=vi.fn();
  await expect(executeBatchJournal(localStorage,locks,actor,wallet,{kind:'new',items,chargesComplete:false},send)).rejects.toThrow(BatchJournalError);
  await expect(executeBatchJournal(localStorage,undefined,actor,wallet,{kind:'new',items,chargesComplete:true},send)).rejects.toThrow(BatchJournalError);
  await expect(executeBatchJournal(localStorage,locks,actor,wallet,{kind:'new',items,chargesComplete:true},send)).rejects.toThrow(BatchJournalError);
  expect(send).not.toHaveBeenCalled();expect(readBatchJournal(localStorage,actor,wallet)).toBeNull();
});
