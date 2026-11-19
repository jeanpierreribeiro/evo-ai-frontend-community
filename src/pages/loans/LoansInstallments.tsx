import { useEffect, useState } from 'react';
import axios from 'axios';
import loansApi from '@/services/loans/loansApi';
import LoansBatchPreview, {type BatchSelection} from './LoansBatchPreview';
import LoansBatchRecovery from './LoansBatchRecovery';
import {useAuthStore} from '@/store/authStore';

type Row={id:string;contractId:string;clientName:string;number:number;dueDate:string;balance:string;received:string;discounted:string;settlement:'open'|'partial'|'paid';deadline:'upcoming'|'today'|'overdue'|'no_balance'};
type Result={data:Row[];page:number;hasMore:boolean;asOf:string};
const settlement={open:'Aberta',partial:'Parcial',paid:'Liquidada'};
const deadline={upcoming:'A vencer',today:'Vence hoje',overdue:'Vencida',no_balance:'Sem saldo'};

export default function LoansInstallments({walletId,revision}:{walletId:string;revision:number}) {
  const [query,setQuery]=useState(''),[status,setStatus]=useState('all'),[from,setFrom]=useState(''),[to,setTo]=useState('');
  const [min,setMin]=useState(''),[max,setMax]=useState(''),[page,setPage]=useState(1);
  const [result,setResult]=useState<Result|null>(null),[message,setMessage]=useState('');
  const [selection,setSelection]=useState<BatchSelection[]>([]);
  const actorId=useAuthStore(state=>state.currentUser?.id),[journalRevision,setJournalRevision]=useState(0);
  useEffect(()=>{setSelection([]);},[walletId]);
  useEffect(()=>{
    let active=true;
    setResult(null);setMessage('');
    const params:Record<string,string|number>={query,status,page,size:50};
    if(from) params.from=from;if(to) params.to=to;if(min) params.min=min;if(max) params.max=max;
    loansApi.get<Result>(`/wallets/${walletId}/installments`,{params}).then(response=>{if(active)setResult(response.data);})
      .catch(error=>{if(active)setMessage(axios.isAxiosError(error) && error.response?.data?.code==='CAPABILITY_NOT_RELEASED'
        ? 'A central de parcelas ainda não foi liberada.' : 'Não foi possível carregar as parcelas. Confira os filtros ou tente novamente mais tarde.');});
    return ()=>{active=false;};
  },[walletId,revision,query,status,from,to,min,max,page]);
  return <section className="space-y-3" aria-labelledby="loans-installments-heading">
    <h2 id="loans-installments-heading" className="text-lg font-semibold">Central de parcelas</h2>
    <p>Os valores mostram os lançamentos registrados; encargos ainda não calculados não estão incluídos.</p>
    <div className="flex flex-wrap gap-3">
      <label>Cliente <input value={query} maxLength={100} onChange={e=>{setQuery(e.target.value);setPage(1);}} className="border rounded px-2 py-1" /></label>
      <label>Situação <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} className="border rounded px-2 py-1">
        <option value="all">Todas</option><option value="open">Abertas</option><option value="partial">Parciais</option><option value="paid">Liquidadas</option><option value="overdue">Vencidas</option><option value="today">Vencem hoje</option><option value="upcoming">A vencer</option>
      </select></label>
      <label>Vencimento de <input type="date" value={from} onChange={e=>{setFrom(e.target.value);setPage(1);}} /></label>
      <label>até <input type="date" value={to} onChange={e=>{setTo(e.target.value);setPage(1);}} /></label>
      <label>Saldo mínimo <input inputMode="decimal" value={min} onChange={e=>{setMin(e.target.value);setPage(1);}} className="border rounded px-2 py-1" /></label>
      <label>Saldo máximo <input inputMode="decimal" value={max} onChange={e=>{setMax(e.target.value);setPage(1);}} className="border rounded px-2 py-1" /></label>
    </div>
    {message && <p role="status">{message}</p>}
    {result && <><p>Data de referência: {result.asOf}</p><ul className="space-y-2">{result.data.map(row=><li key={row.id} className="border rounded p-3">
      <strong>{row.clientName}</strong> · Parcela {row.number} · Vencimento {row.dueDate} · Saldo R$ {row.balance} · {settlement[row.settlement]} · {deadline[row.deadline]} · Recebido R$ {row.received} · Desconto R$ {row.discounted}
      {row.settlement!=='paid' && <label className="block"><input type="checkbox" checked={selection.some(item=>item.installmentId===row.id)} disabled={selection.length>=100 && !selection.some(item=>item.installmentId===row.id)} onChange={e=>setSelection(current=>e.target.checked?[...current.filter(item=>item.contractId!==row.contractId),{contractId:row.contractId,installmentId:row.id,clientName:row.clientName,number:row.number}]:current.filter(item=>item.installmentId!==row.id))} /> Selecionar {row.clientName}, parcela {row.number}</label>}
    </li>)}</ul>{!result.data.length && <p>Nenhuma parcela encontrada.</p>}
      <div className="flex gap-3"><button disabled={page===1} onClick={()=>setPage(value=>value-1)}>Anterior</button><span>Página {result.page}</span><button disabled={!result.hasMore} onClick={()=>setPage(value=>value+1)}>Próxima</button></div></>}
    <LoansBatchPreview key={`${walletId}:${selection.map(item=>item.installmentId).join(':')}`} walletId={walletId} selection={selection} actorId={actorId} onJournalChange={()=>setJournalRevision(value=>value+1)}/>
    <LoansBatchRecovery walletId={walletId} actorId={actorId} revision={journalRevision}/>
  </section>;
}
