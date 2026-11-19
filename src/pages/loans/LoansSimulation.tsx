import { useEffect, useRef, useState } from 'react';
import loansApi from '@/services/loans/loansApi';

type Settings = {version:number;defaultRate:string|null;defaultMethod:'single'|'price'|null;penaltyRate:string|null;lateRate:string|null;firstPenaltyDays:number|null;penaltyEveryDays:number|null;lateMethod:'proportional'|'thirty_days'};
type Conditions=Omit<Settings,'version'>;
type Client = {id:string;name:string;cpfPending:boolean};
type Part = {number:number;principal:string;interest:string;total:string;dueDate:string};

export default function LoansSimulation({walletId,settingsRevision,clientsRevision=0,onDraftSaved}:{walletId:string;settingsRevision:number;clientsRevision?:number;onDraftSaved?:() => void}) {
  const [principal,setPrincipal]=useState(''), [rate,setRate]=useState(''), [periods,setPeriods]=useState('1');
  const [interval,setInterval]=useState<'monthly'|'weekly'>('monthly'), [firstDueDate,setFirstDueDate]=useState('');
  const [parts,setParts]=useState<Part[] | null>(null), [message,setMessage]=useState(''), [busy,setBusy]=useState(false);
  const [settings,setSettings]=useState<Settings | null>(null), [clients,setClients]=useState<Client[]>([]), [clientId,setClientId]=useState(''), [clientPage,setClientPage]=useState(1), [hasMore,setHasMore]=useState(false);
  const [conditions,setConditions]=useState<Conditions | null>(null);
  const [draftSaved,setDraftSaved]=useState(false);
  const rateEdited=useRef(false);
  const conditionsEdited=useRef(false);
  const draftKey=useRef<string | null>(null);
  const newKey=() => Array.from(crypto.getRandomValues(new Uint8Array(16)),value => value.toString(16).padStart(2,'0')).join('');
  useEffect(() => {
    let active=true;
    loansApi.get<{data:Settings}>(`/wallets/${walletId}/settings`).then(response => {
      if(active && !rateEdited.current) { setRate(response.data.data.defaultRate?.replace('.',',') ?? ''); setParts(null); }
      if(active) {
        const {defaultRate,defaultMethod,penaltyRate,lateRate,firstPenaltyDays,penaltyEveryDays,lateMethod}=response.data.data;
        setSettings(response.data.data);
        if(!conditionsEdited.current) setConditions({defaultRate,defaultMethod,penaltyRate,lateRate,firstPenaltyDays,penaltyEveryDays,lateMethod});
        setDraftSaved(false);draftKey.current=null;
      }
    }).catch(() => {if(active) setMessage('Não foi possível carregar a taxa padrão.');});
    return () => {active=false;};
  },[walletId,settingsRevision]);
  useEffect(() => {
    let active=true;
    loansApi.get<{data:Client[];hasMore:boolean}>(`/wallets/${walletId}/clients`,{params:{page:clientPage}})
      .then(response => {if(active) {setClients(response.data.data);setHasMore(response.data.hasMore);setClientId('');}})
      .catch(() => {if(active) setMessage('Não foi possível carregar os clientes para a simulação.');});
    return () => {active=false;};
  },[walletId,clientPage,clientsRevision]);
  async function simulate(event:React.FormEvent) {
    event.preventDefault();setMessage('');setParts(null);setDraftSaved(false);draftKey.current=null;setBusy(true);
    try {
      const response=await loansApi.post<{data:Part[]}>(`/wallets/${walletId}/simulations`,{
        principal:principal.replace(',','.'),ratePercent:rate.replace(',','.'),periods:Number(periods),interval,firstDueDate,
      });
      setParts(response.data.data);
    } catch {setMessage('Não foi possível calcular. Confira os valores, a data e a quantidade de parcelas.');}
    finally {setBusy(false);}
  }
  async function saveDraft() {
    if(!settings || !conditions || !clientId || !parts) return;
    setBusy(true);setMessage('');
    try {
      draftKey.current ??= newKey();
      const {version}=settings;
      const decimal=(value:string|null) => value?.replace(',','.') ?? null;
      const selectedConditions={...conditions,penaltyRate:decimal(conditions.penaltyRate),lateRate:decimal(conditions.lateRate)};
      await loansApi.post(`/wallets/${walletId}/contracts/drafts`,{
        clientId,principal:principal.replace(',','.'),ratePercent:rate.replace(',','.'),periods:Number(periods),interval,firstDueDate,
        settingsVersion:version,conditions:selectedConditions,
      },{headers:{'Idempotency-Key':draftKey.current}});
      setDraftSaved(true);setMessage('Rascunho salvo. Ele ainda não gera cobrança.');onDraftSaved?.();
    } catch {setMessage('Não foi possível salvar o rascunho. Confira os dados e os parâmetros da carteira.');}
    finally {setBusy(false);}
  }
  function changeCondition<K extends keyof Conditions>(field:K,value:Conditions[K]) {
    conditionsEdited.current=true;setConditions(current=>current?{...current,[field]:value}:current);setDraftSaved(false);draftKey.current=null;
  }
  return <section className="space-y-3 border-t pt-5"><h2 className="text-lg font-semibold">Simulação</h2>
    <p className="text-sm">Esta é uma prévia e não cria um contrato.</p>{message && <p role="status">{message}</p>}
    <form onSubmit={simulate} className="flex flex-wrap gap-3">
      <label>Valor emprestado <input type="text" inputMode="decimal" value={principal} disabled={busy} onChange={e => {setPrincipal(e.target.value);setParts(null);}} className="border rounded px-2 py-1" /></label>
      <label>Taxa por período (%) <input type="text" inputMode="decimal" value={rate} disabled={busy} onChange={e => {rateEdited.current=true;setRate(e.target.value);setParts(null);}} className="border rounded px-2 py-1" /></label>
      <label>Parcelas <input type="number" min={1} max={10000} step={1} value={periods} disabled={busy} onChange={e => {setPeriods(e.target.value);setParts(null);}} className="border rounded px-2 py-1" /></label>
      <label>Periodicidade <select value={interval} disabled={busy} onChange={e => {setInterval(e.target.value as 'monthly'|'weekly');setParts(null);}} className="border rounded px-2 py-1"><option value="monthly">Mensal</option><option value="weekly">Semanal</option></select></label>
      <label>Primeiro vencimento <input type="date" value={firstDueDate} disabled={busy} onChange={e => {setFirstDueDate(e.target.value);setParts(null);}} className="border rounded px-2 py-1" /></label>
      <button disabled={busy || !principal || !rate || !firstDueDate || !periods} className="border rounded px-3 py-1">Calcular prévia</button>
    </form>
    {parts && <><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Parcela</th><th>Vencimento</th><th>Principal</th><th>Juros</th><th>Total</th></tr></thead>
      <tbody>{parts.map(part => <tr key={part.number}><td>{part.number}</td><td>{part.dueDate.split('-').reverse().join('/')}</td>
        <td>R$ {part.principal.replace('.',',')}</td><td>R$ {part.interest.replace('.',',')}</td><td>R$ {part.total.replace('.',',')}</td></tr>)}</tbody></table></div>
      {conditions && <div className="space-y-2"><p>Condições deste contrato (você pode alterar os padrões):</p>
        <div className="flex flex-wrap gap-2"><label>Multa (%) <input value={conditions.penaltyRate ?? ''} disabled={busy} inputMode="decimal" onChange={e=>changeCondition('penaltyRate',e.target.value || null)} className="border rounded px-2" /></label>
          <label>Mora mensal (%) <input value={conditions.lateRate ?? ''} disabled={busy} inputMode="decimal" onChange={e=>changeCondition('lateRate',e.target.value || null)} className="border rounded px-2" /></label>
          <label>Espera da multa (dias) <input type="number" min={0} value={conditions.firstPenaltyDays ?? ''} disabled={busy} onChange={e=>changeCondition('firstPenaltyDays',e.target.value===''?null:Number(e.target.value))} className="border rounded px-2" /></label>
          <label>Frequência da multa (dias) <input type="number" min={1} value={conditions.penaltyEveryDays ?? ''} disabled={busy} onChange={e=>changeCondition('penaltyEveryDays',e.target.value===''?null:Number(e.target.value))} className="border rounded px-2" /></label>
          <label>Método de mora <select value={conditions.lateMethod} disabled={busy} onChange={e=>changeCondition('lateMethod',e.target.value as Conditions['lateMethod'])} className="border rounded px-2"><option value="proportional">Proporcional aos dias</option><option value="thirty_days">A cada 30 dias completos</option></select></label></div></div>}
      <div className="flex flex-wrap gap-2 items-center"><label>Cliente <select value={clientId} disabled={busy || draftSaved} onChange={e => {setClientId(e.target.value);draftKey.current=null;}} className="border rounded px-2">
        <option value="">Selecione</option>{clients.map(client => <option value={client.id} key={client.id}>{client.name}{client.cpfPending?' — CPF pendente':''}</option>)}</select></label>
        <button disabled={busy || clientPage===1} onClick={() => {setClientId('');setClientPage(value=>value-1);}}>Clientes anteriores</button><span>Página {clientPage}</span>
        <button disabled={busy || !hasMore} onClick={() => {setClientId('');setClientPage(value=>value+1);}}>Próximos clientes</button>
        <button disabled={busy || draftSaved || !settings || !clientId} onClick={() => void saveDraft()} className="border rounded px-3 py-1">Salvar rascunho</button></div></>}
  </section>;
}
