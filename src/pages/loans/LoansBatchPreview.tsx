import {useEffect,useState} from 'react';
import loansApi from '@/services/loans/loansApi';
import {executeBatchJournal, type BatchItem} from '@/services/loans/loansBatchJournal';

export type BatchSelection={contractId:string;installmentId:string;clientName:string;number:number};
type BalancePreview={contractVersion:number;installments:Array<{id:string;number:number;dueDate:string}>};
type Allocation={installmentId:string;principal:string;interest:string;penalty:string;lateInterest:string;otherFees:string};
type AllocationPreview={chargesComplete:boolean;maximum:string;remaining:string;allocations:Allocation[]};
type Draft={amount:string;paidOn:string};
type RowResult={row:BatchSelection;preview?:AllocationPreview;contractVersion?:number;installments?:BalancePreview['installments'];error?:string};

export default function LoansBatchPreview({walletId,selection,actorId,onJournalChange}:{walletId:string;selection:BatchSelection[];actorId?:string|null;onJournalChange?:()=>void}) {
  const [drafts,setDrafts]=useState<Record<string,Draft>>({}),[results,setResults]=useState<RowResult[]|null>(null),[busy,setBusy]=useState(false);
  const [submissionError,setSubmissionError]=useState('');
  useEffect(()=>{setResults(null);},[selection]);
  async function preview() {
    setBusy(true);setResults(null);
    try {
      const next:RowResult[]=[];
      for(const row of selection) {
        const draft=drafts[row.contractId];
        if(!draft?.amount || !draft.paidOn) {next.push({row,error:'Informe valor e data do recebimento.'});continue;}
        try {
          const base=`/wallets/${walletId}/contracts/${row.contractId}`;
          const current=await loansApi.get<{data:BalancePreview}>(`${base}/payment-preview`);
          if(!current.data.data.installments.some(item=>item.id===row.installmentId)) {next.push({row,error:'A parcela não tem saldo disponível. Atualize a lista.'});continue;}
          const response=await loansApi.post<{data:AllocationPreview}>(`${base}/payments/preview`,{selectedInstallmentId:row.installmentId,amount:draft.amount,paidOn:draft.paidOn,expectedVersion:current.data.data.contractVersion});
          next.push({row,preview:response.data.data,contractVersion:current.data.data.contractVersion,installments:current.data.data.installments});
        } catch {next.push({row,error:'Não foi possível calcular. Confira os dados e atualize a parcela.'});}
      }
      setResults(next);
    } finally {setBusy(false);}
  }
  async function submit() {
    if(!actorId || !results || results.length!==selection.length || results.some(result=>!result.preview?.chargesComplete || !result.contractVersion)) return;
    setBusy(true);setSubmissionError('');
    try {
      const items:BatchItem[]=results.map(result=>({contractId:result.row.contractId,key:Array.from(crypto.getRandomValues(new Uint8Array(16)),value=>value.toString(16).padStart(2,'0')).join(''),
        payment:{selectedInstallmentId:result.row.installmentId,amount:drafts[result.row.contractId].amount,paidOn:drafts[result.row.contractId].paidOn,expectedVersion:result.contractVersion!}}));
      await executeBatchJournal(localStorage,navigator.locks,actorId,walletId,{kind:'new',items,chargesComplete:true},async data=>(await loansApi.post(`/wallets/${walletId}/payment-batches`,{actorId,items:data})).data.data);
      setResults(null);
    } catch {setSubmissionError('Não foi possível concluir o lote. Verifique os resultados e tente novamente com o registro existente.');}
    finally {onJournalChange?.();setBusy(false);}
  }
  if(!selection.length) return null;
  return <div className="border rounded p-3 space-y-3"><h3 className="font-semibold">Prévia de recebimentos selecionados</h3>
    <p>Selecione até uma parcela por contrato. Cada contrato será tratado separadamente.</p>
    {selection.map(row=><div key={row.contractId} className="flex flex-wrap gap-2"><span>{row.clientName} · parcela {row.number}</span>
      <label>Valor para {row.clientName} <input inputMode="decimal" value={drafts[row.contractId]?.amount || ''} disabled={busy} onChange={e=>{setResults(null);setDrafts(current=>({...current,[row.contractId]:{amount:e.target.value,paidOn:current[row.contractId]?.paidOn || ''}}));}} className="border rounded px-2" /></label>
      <label>Data para {row.clientName} <input type="date" value={drafts[row.contractId]?.paidOn || ''} disabled={busy} onChange={e=>{setResults(null);setDrafts(current=>({...current,[row.contractId]:{amount:current[row.contractId]?.amount || '',paidOn:e.target.value}}));}} /></label></div>)}
    <button disabled={busy} onClick={()=>void preview()} className="border rounded px-2">Calcular prévias</button>
    {submissionError && <p role="status">{submissionError}</p>}
    {results && <div role="status" className="space-y-2">{results.map(({row,preview:result,installments,error})=><div key={row.contractId} className="border rounded p-2">
      <p><strong>{row.clientName}</strong> · parcela {row.number}</p>{error && <p>{error}</p>}
      {result && <><p>Limite registrado R$ {result.maximum} · saldo restante R$ {result.remaining}</p>
        {result.allocations.map(item=><p key={item.installmentId}>Parcela {installments?.find(part=>part.id===item.installmentId)?.number ?? 'não identificada'}: multa R$ {item.penalty} · juros R$ {item.interest} · mora R$ {item.lateInterest} · outros encargos R$ {item.otherFees} · principal R$ {item.principal}</p>)}
        {!result.chargesComplete && <p>Prévia incompleta: os encargos automáticos ainda precisam ser calculados e validados.</p>}</>}
    </div>)}{results.every(result=>result.preview?.chargesComplete) && actorId
      ? <button disabled={busy} onClick={()=>void submit()} className="border rounded px-2">Confirmar recebimentos</button>
      : <p>A confirmação em lote ainda não está disponível.</p>}</div>}
  </div>;
}
