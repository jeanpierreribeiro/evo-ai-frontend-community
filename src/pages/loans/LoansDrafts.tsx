import { useEffect, useRef, useState } from 'react';
import loansApi from '@/services/loans/loansApi';

type Part={number:number;dueDate:string;principal:string;interest:string;total:string};
type Client={name:string;cpfPending:boolean};
type Draft={id:string;clientId:string;client:Client;version:number;principal:string;ratePercent:string;interval:'monthly'|'weekly';conditions:{penaltyRate:string|null;lateRate:string|null;firstPenaltyDays:number|null;penaltyEveryDays:number|null;lateMethod:string};preview:Part[]};
type DraftSummary={id:string;clientId:string;client:Client;principal:string;ratePercent:string};
type Page={data:DraftSummary[];page:number;hasMore:boolean};
const operationKey=() => Array.from(crypto.getRandomValues(new Uint8Array(16)),value=>value.toString(16).padStart(2,'0')).join('');

export default function LoansDrafts({walletId,revision,onConfirmed}:{walletId:string;revision:number;onConfirmed?:() => void}) {
  const url=`/wallets/${walletId}/contracts/drafts`;
  const [drafts,setDrafts]=useState<DraftSummary[]>([]), [selected,setSelected]=useState<Draft | null>(null);
  const [page,setPage]=useState(1), [hasMore,setHasMore]=useState(false);
  const [delivered,setDelivered]=useState(false), [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  const key=useRef<string | null>(null);
  useEffect(() => {setPage(1);setSelected(null);setDelivered(false);key.current=null;},[walletId,revision]);
  async function load() {const response=await loansApi.get<Page>(url,{params:{page}});setDrafts(response.data.data);setHasMore(response.data.hasMore);}
  useEffect(() => {let active=true;loansApi.get<Page>(url,{params:{page}})
    .then(response=>{if(active){setDrafts(response.data.data);setHasMore(response.data.hasMore);}}).catch(()=>{if(active)setMessage('Não foi possível carregar os rascunhos.');});
    return()=>{active=false;};},[url,revision,page]);
  async function show(id:string) {
    setBusy(true);setMessage('');setSelected(null);setDelivered(false);key.current=null;
    try {const response=await loansApi.get<{data:Draft}>(`${url}/${id}`);setSelected(response.data.data);}
    catch {setMessage('Não foi possível abrir o rascunho.');} finally {setBusy(false);}
  }
  async function confirm() {
    if(!selected || !delivered) return;
    setBusy(true);setMessage('');
    try {
      key.current ??= operationKey();
      await loansApi.post(`/wallets/${walletId}/contracts/${selected.id}/confirm`,{expectedVersion:selected.version},{headers:{'Idempotency-Key':key.current}});
      key.current=null;setSelected(null);setDelivered(false);
      onConfirmed?.();
      try {await load();setMessage('Contrato confirmado.');} catch {setMessage('Contrato confirmado, mas não foi possível atualizar os rascunhos.');}
    } catch {setMessage('A confirmação não está disponível ou não pôde ser concluída. Confira o rascunho antes de tentar novamente.');}
    finally {setBusy(false);}
  }
  return <section className="space-y-3 border-t pt-5"><h2 className="text-lg font-semibold">Rascunhos</h2>
    {message && <p role="status">{message}</p>}
    {drafts.length===0 ? <p>Nenhum rascunho.</p> : <ul>{drafts.map(draft=><li key={draft.id} className="flex gap-3 items-center">
      <span>{draft.client.name}{draft.client.cpfPending?' (CPF pendente)':''} — R$ {draft.principal.replace('.',',')} — taxa {draft.ratePercent.replace('.',',')}%</span>
      <button disabled={busy} onClick={() => void show(draft.id)} className="border rounded px-2">Abrir rascunho</button></li>)}</ul>}
    <div className="flex gap-2"><button disabled={busy || page===1} onClick={()=>{setSelected(null);setPage(value=>value-1);}}>Anteriores</button><span>Página {page}</span>
      <button disabled={busy || !hasMore} onClick={()=>{setSelected(null);setPage(value=>value+1);}}>Próximos</button></div>
    {selected && <div className="space-y-2 border rounded p-3"><p>Cliente: {selected.client.name}{selected.client.cpfPending?' (CPF pendente)':''}. Confira as parcelas antes de confirmar.</p>
      <p>Principal: R$ {selected.principal.replace('.',',')} — taxa {selected.ratePercent.replace('.',',')}% {selected.interval==='monthly'?'ao mês':'por semana'}.</p>
      <p>Multa: {selected.conditions.penaltyRate===null?'não definida':`${selected.conditions.penaltyRate.replace('.',',')}%`}; mora: {selected.conditions.lateRate===null?'não definida':`${selected.conditions.lateRate.replace('.',',')}% ao mês`}.</p>
      <p>Espera para multa: {selected.conditions.firstPenaltyDays ?? 'não definida'} dias; frequência: {selected.conditions.penaltyEveryDays ?? 'não definida'} dias; mora {selected.conditions.lateMethod==='proportional'?'proporcional aos dias':'a cada 30 dias completos'}.</p>
      <ul>{selected.preview.map(part=><li key={part.number}>Parcela {part.number}: {part.dueDate.split('-').reverse().join('/')} — principal R$ {part.principal.replace('.',',')}, juros R$ {part.interest.replace('.',',')}, total R$ {part.total.replace('.',',')}</li>)}</ul>
      <label><input type="checkbox" checked={delivered} disabled={busy} onChange={e=>setDelivered(e.target.checked)} /> Confirmo que o dinheiro foi entregue ao cliente.</label>
      <div><button disabled={busy || !delivered} onClick={()=>void confirm()} className="border rounded px-3 py-1">Confirmar contrato</button></div>
    </div>}
  </section>;
}
