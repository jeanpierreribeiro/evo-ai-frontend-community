import {useEffect,useState} from 'react';
import loansApi from '@/services/loans/loansApi';
import {executeBatchJournal,finishBatchJournal,readBatchJournal,type BatchJournal} from '@/services/loans/loansBatchJournal';

const labels={pending:'Aguardando resultado',unknown:'Resultado incerto',confirmed:'Confirmado',replayed:'Já confirmado',rejected:'Rejeitado'};
const reasons:Record<string,string>={PAYMENT_EXCEEDS_BALANCE:'valor acima do saldo',VERSION_CONFLICT:'contrato alterado; confira novamente',IDEMPOTENCY_CONFLICT:'dados diferentes para a mesma operação',NOT_FOUND:'contrato indisponível',INVALID_INPUT:'dados inválidos',DEPENDENCY_UNAVAILABLE:'serviço indisponível'};
export default function LoansBatchRecovery({actorId,walletId,revision}:{actorId:string|null|undefined;walletId:string;revision:number}) {
  const [journal,setJournal]=useState<BatchJournal|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  function load() {
    if(!actorId) {setJournal(null);return;}
    try {setJournal(readBatchJournal(localStorage,actorId,walletId));setMessage('');}
    catch {setJournal(null);setMessage('Não foi possível ler o registro de recebimentos em lote.');}
  }
  useEffect(()=>{load();const onStorage=()=>load();window.addEventListener('storage',onStorage);return ()=>window.removeEventListener('storage',onStorage);},[actorId,walletId,revision]);
  async function retry() {
    if(!actorId)return;setBusy(true);setMessage('');
    try {const result=await executeBatchJournal(localStorage,navigator.locks,actorId,walletId,{kind:'retry'},async items=>(await loansApi.post(`/wallets/${walletId}/payment-batches`,{actorId,items})).data.data);setJournal(result);}
    catch {load();setMessage('Não foi possível consultar o resultado por repetição. O registro foi preservado.');}
    finally {setBusy(false);}
  }
  async function finish() {
    if(!actorId)return;setBusy(true);setMessage('');
    try {await finishBatchJournal(localStorage,navigator.locks,actorId,walletId);setJournal(null);}
    catch {setMessage('O registro não pode ser removido enquanto houver resultado pendente ou incerto.');}
    finally {setBusy(false);}
  }
  if(!journal && !message)return null;
  return <div className="border rounded p-3 space-y-2"><h3 className="font-semibold">Resultado do lote</h3>
    {message && <p role="status">{message}</p>}
    {journal && <><p>Os registros são preservados neste navegador para permitir repetição segura.</p><ul>{journal.items.map(item=><li key={item.key}>Contrato {item.contractId.slice(0,8)} · R$ {item.payment.amount} · {labels[item.status]}{item.code?` · ${reasons[item.code] || 'não foi possível concluir'}`:''}</li>)}</ul>
      <button disabled={busy} onClick={()=>void retry()} className="border rounded px-2">Repetir lote com as mesmas chaves</button>{' '}
      <button disabled={busy || journal.items.some(item=>item.status==='pending' || item.status==='unknown')} onClick={()=>void finish()} className="border rounded px-2">Concluir conferência</button></>}
  </div>;
}
