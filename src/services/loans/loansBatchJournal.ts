/** Registro local mínimo para repetir uma operação cujo resultado ainda é incerto. */
export type BatchPayment={selectedInstallmentId:string;amount:string;paidOn:string;expectedVersion:number};
export type BatchItem={contractId:string;key:string;payment:BatchPayment};
export type BatchStatus='pending'|'confirmed'|'replayed'|'rejected'|'unknown';
export type BatchJournal={version:1;actorId:string;walletId:string;items:Array<BatchItem & {status:BatchStatus;code?:string}>};
export class BatchJournalError extends Error {}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const keyPattern=/^[A-Za-z0-9_-]{16,128}$/;
const money=/^\d{1,25}(?:\.\d{1,2})?$/;
const statusValues:BatchStatus[]=['pending','confirmed','replayed','rejected','unknown'];
const storageKey=(actorId:string,walletId:string)=>`loans-batch-v1:${actorId}:${walletId}`;
function validateIdentity(actorId:string,walletId:string) {if(!uuid.test(actorId) || !uuid.test(walletId)) throw new BatchJournalError('Identidade inválida');}
function validate(journal:BatchJournal,actorId:string,walletId:string) {
  if(!journal || journal.version!==1 || journal.actorId!==actorId || journal.walletId!==walletId || !Array.isArray(journal.items) || journal.items.length<1 || journal.items.length>100) throw new BatchJournalError('Registro inválido');
  const contracts=new Set<string>(),keys=new Set<string>();
  for(const item of journal.items) {
    if(!item || !uuid.test(item.contractId) || !keyPattern.test(item.key) || !item.payment || !uuid.test(item.payment.selectedInstallmentId) || !money.test(item.payment.amount) || !/^\d{4}-\d{2}-\d{2}$/.test(item.payment.paidOn) || !Number.isSafeInteger(item.payment.expectedVersion) || item.payment.expectedVersion<1 || !statusValues.includes(item.status) || (item.code!==undefined && (typeof item.code!=='string' || !/^[A-Z_]{1,80}$/.test(item.code))) || contracts.has(item.contractId) || keys.has(item.key)) throw new BatchJournalError('Item inválido');
    contracts.add(item.contractId);keys.add(item.key);
  }
}
function write(storage:Storage,journal:BatchJournal) {
  const storageId=storageKey(journal.actorId,journal.walletId),serialized=JSON.stringify(journal);
  try {storage.setItem(storageId,serialized);if(storage.getItem(storageId)!==serialized) throw new Error('Storage verification failed');}
  catch {throw new BatchJournalError('Não foi possível preservar o lote neste navegador');}
}
export function readBatchJournal(storage:Storage,actorId:string,walletId:string):BatchJournal|null {
  validateIdentity(actorId,walletId);
  let raw:string|null;
  try {raw=storage.getItem(storageKey(actorId,walletId));} catch {throw new BatchJournalError('Não foi possível ler o lote');}
  if(raw===null) return null;
  try {const journal=JSON.parse(raw) as BatchJournal;validate(journal,actorId,walletId);return journal;} catch {throw new BatchJournalError('Registro do lote inválido');}
}
export function createBatchJournal(storage:Storage,actorId:string,walletId:string,items:BatchItem[]):BatchJournal {
  validateIdentity(actorId,walletId);
  if(readBatchJournal(storage,actorId,walletId)) throw new BatchJournalError('Já existe um lote pendente nesta carteira');
  const journal:BatchJournal={version:1,actorId,walletId,items:items.map(item=>({...item,payment:{...item.payment},status:'pending'}))};
  validate(journal,actorId,walletId);write(storage,journal);return journal;
}
export function updateBatchJournal(storage:Storage,actorId:string,walletId:string,results:Array<{contractId:string;key:string;status:Exclude<BatchStatus,'pending'>;code?:string}>):BatchJournal {
  const journal=readBatchJournal(storage,actorId,walletId);
  if(!journal || !Array.isArray(results) || results.length!==journal.items.length) throw new BatchJournalError('Resultado incompleto');
  const next={...journal,items:journal.items.map(item=>{
    const matches=results.filter(result=>result.contractId===item.contractId && result.key===item.key);
    if(matches.length!==1 || !statusValues.slice(1).includes(matches[0].status)) throw new BatchJournalError('Resultado incompatível');
    if((item.status==='confirmed' || item.status==='replayed') && matches[0].status!=='confirmed' && matches[0].status!=='replayed') throw new BatchJournalError('Resultado confirmado não pode ser revertido');
    return {...item,status:matches[0].status,...(matches[0].code?{code:matches[0].code}:{code:undefined})};
  })};
  validate(next,actorId,walletId);write(storage,next);return next;
}
export function clearBatchJournal(storage:Storage,actorId:string,walletId:string) {
  const journal=readBatchJournal(storage,actorId,walletId);
  if(!journal || journal.items.some(item=>item.status==='pending' || item.status==='unknown')) throw new BatchJournalError('Há resultados ainda não esclarecidos');
  try {storage.removeItem(storageKey(actorId,walletId));if(storage.getItem(storageKey(actorId,walletId))!==null) throw new Error('Storage verification failed');}
  catch {throw new BatchJournalError('Não foi possível remover o registro do lote');}
}

type BatchResponse=Array<{contractId:string;key:string;status:Exclude<BatchStatus,'pending'>;code?:string}>;
type BatchSender=(items:BatchItem[])=>Promise<BatchResponse>;
/** Cada aba precisa compartilhar o mesmo bloqueio antes de ler, gravar ou enviar. */
export async function executeBatchJournal(storage:Storage,locks:LockManager|undefined,actorId:string,walletId:string,
  input:{kind:'new';items:BatchItem[];chargesComplete:boolean}|{kind:'retry'},send:BatchSender):Promise<BatchJournal> {
  validateIdentity(actorId,walletId);
  if(!locks) throw new BatchJournalError('O navegador não oferece bloqueio entre abas');
  if(input.kind==='new' && !input.chargesComplete) throw new BatchJournalError('A prévia de encargos está incompleta');
  return locks.request(storageKey(actorId,walletId),{mode:'exclusive',ifAvailable:true},async lock=>{
    if(!lock) throw new BatchJournalError('Outra aba está processando este lote');
    const journal=input.kind==='new'?createBatchJournal(storage,actorId,walletId,input.items):readBatchJournal(storage,actorId,walletId);
    if(!journal) throw new BatchJournalError('Não há lote para repetir');
    const items=journal.items.map(({contractId,key,payment})=>({contractId,key,payment}));
    let response:BatchResponse;
    try {response=await send(items);}
    catch {
      response=journal.items.map(item=>({contractId:item.contractId,key:item.key,status:item.status==='confirmed' || item.status==='replayed'?item.status:'unknown'}));
    }
    try {return updateBatchJournal(storage,actorId,walletId,response);}
    catch(error) {
      if(error instanceof BatchJournalError && error.message==='Não foi possível preservar o lote neste navegador') throw error;
      const unknown=journal.items.map(item=>({contractId:item.contractId,key:item.key,status:item.status==='confirmed' || item.status==='replayed'?item.status:'unknown'} as const));
      return updateBatchJournal(storage,actorId,walletId,unknown);
    }
  });
}
export async function finishBatchJournal(storage:Storage,locks:LockManager|undefined,actorId:string,walletId:string):Promise<void> {
  validateIdentity(actorId,walletId);
  if(!locks) throw new BatchJournalError('O navegador não oferece bloqueio entre abas');
  await locks.request(storageKey(actorId,walletId),{mode:'exclusive',ifAvailable:true},async lock=>{
    if(!lock) throw new BatchJournalError('Outra aba está processando este lote');
    clearBatchJournal(storage,actorId,walletId);
  });
}
