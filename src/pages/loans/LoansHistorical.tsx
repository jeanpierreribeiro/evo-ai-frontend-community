import { useEffect, useRef, useState } from 'react';
import loansApi from '@/services/loans/loansApi';
import axios from 'axios';

const components=['principal','interest','penalty','lateInterest','otherFees'] as const;
type Component=typeof components[number];
type Amounts=Record<Component,string>;
type Payment={amount:string;paidOn:string;estimated:boolean;allocation:Amounts|null};
type Installment={number:number;dueDate:string;original:Amounts;discount:Amounts;payments:Payment[]};
type Conditions={defaultRate:string|null;defaultMethod:'single'|'price'|null;penaltyRate:string|null;lateRate:string|null;firstPenaltyDays:number|null;penaltyEveryDays:number|null;lateMethod:'proportional'|'thirty_days'};
type Settings=Conditions & {version:number};
type Input={clientId:string;principal:string;ratePercent:string;interval:'monthly'|'weekly';settingsVersion:number;conditions:Conditions;installments:Installment[]};
type Review={canConfirm:boolean;incompletePayments:number;installments:Array<{number:number;originalTotal:string;discountTotal:string;received:string;remaining:string|null}>};
type Draft={id:string;version:number;input:Input;review:Review;possibleDuplicates:number};
type Summary={id:string;clientId:string;client:{name:string;cpfPending:boolean}};
type Client={id:string;name:string;cpfPending:boolean};
const labels:Record<Component,string>={principal:'Principal',interest:'Juros contratuais',penalty:'Multa',lateInterest:'Mora',otherFees:'Encargos avulsos'};
const zero=():Amounts=>({principal:'0',interest:'0',penalty:'0',lateInterest:'0',otherFees:'0'});
const row=(number:number):Installment=>({number,dueDate:'',original:zero(),discount:zero(),payments:[]});
const key=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
const decimal=(value:string)=>value.trim().replace(',','.');

export default function LoansHistorical({walletId}:{walletId:string}) {
  const url=`/wallets/${walletId}/historical-drafts`;
  const [settings,setSettings]=useState<Settings|null>(null),[clients,setClients]=useState<Client[]>([]),[drafts,setDrafts]=useState<Summary[]>([]);
  const [clientPage,setClientPage]=useState(1),[moreClients,setMoreClients]=useState(false),[draftPage,setDraftPage]=useState(1),[moreDrafts,setMoreDrafts]=useState(false);
  const [clientId,setClientId]=useState(''),[principal,setPrincipal]=useState(''),[rate,setRate]=useState(''),[interval,setInterval]=useState<'monthly'|'weekly'>('monthly');
  const [conditions,setConditions]=useState<Conditions|null>(null),[rows,setRows]=useState<Installment[]>([row(1)]),[current,setCurrent]=useState<Draft|null>(null);
  const [review,setReview]=useState<Review|null>(null),[duplicates,setDuplicates]=useState(0),[ack,setAck]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [currentClientName,setCurrentClientName]=useState('');
  const saveKey=useRef<string|null>(null),confirmKey=useRef<string|null>(null);
  const invalidate=()=>{saveKey.current=null;confirmKey.current=null;setReview(null);setAck(false);};
  const updateRows=(next:Installment[])=>{invalidate();setRows(next);};
  async function loadDrafts(page=draftPage) {const r=await loansApi.get<{data:Summary[];hasMore:boolean}>(url,{params:{page}});setDrafts(r.data.data);setMoreDrafts(r.data.hasMore);}
  useEffect(()=>{let live=true;loansApi.get<{data:Settings}>(`/wallets/${walletId}/settings`).then(r=>{if(live){
    const {version,defaultRate,defaultMethod,penaltyRate,lateRate,firstPenaltyDays,penaltyEveryDays,lateMethod}=r.data.data;
    setSettings({version,defaultRate,defaultMethod,penaltyRate,lateRate,firstPenaltyDays,penaltyEveryDays,lateMethod});
    setConditions({defaultRate,defaultMethod,penaltyRate,lateRate,firstPenaltyDays,penaltyEveryDays,lateMethod});setRate(defaultRate?.replace('.',',') ?? '');
  }}).catch(()=>{if(live)setMessage('Não foi possível carregar os parâmetros.');});return()=>{live=false;};},[walletId]);
  useEffect(()=>{let live=true;loansApi.get<{data:Client[];hasMore:boolean}>(`/wallets/${walletId}/clients`,{params:{page:clientPage}})
    .then(r=>{if(live){setClients(r.data.data);setMoreClients(r.data.hasMore);}}).catch(()=>{if(live)setMessage('Não foi possível carregar os clientes.');});return()=>{live=false;};},[walletId,clientPage]);
  useEffect(()=>{let live=true;loansApi.get<{data:Summary[];hasMore:boolean}>(url,{params:{page:draftPage}})
    .then(r=>{if(live){setDrafts(r.data.data);setMoreDrafts(r.data.hasMore);}}).catch(()=>{if(live)setMessage('Não foi possível carregar os históricos.');});return()=>{live=false;};},[url,draftPage]);
  function input():Input {
    if(!settings || !conditions) throw new Error('Parâmetros ausentes');
    const convert=(values:Amounts)=>Object.fromEntries(components.map(c=>[c,decimal(values[c])])) as Amounts;
    return {clientId,principal:decimal(principal),ratePercent:decimal(rate),interval,settingsVersion:current?.input.settingsVersion ?? settings.version,conditions,
      installments:rows.map((item,index)=>({...item,number:index+1,original:convert(item.original),discount:convert(item.discount),payments:item.payments.map(p=>({...p,amount:decimal(p.amount),allocation:p.allocation?convert(p.allocation):null}))}))};
  }
  async function save(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setMessage('');
    try {
      saveKey.current ??=key();const payload=input();
      const r=current ? await loansApi.put<{data:{id:string;version:number;review:Review;possibleDuplicates:number}}>(`${url}/${current.id}`,{expectedVersion:current.version,input:payload},{headers:{'Idempotency-Key':saveKey.current}})
        : await loansApi.post<{data:{id:string;version:number;review:Review;possibleDuplicates:number}}>(url,payload,{headers:{'Idempotency-Key':saveKey.current}});
      setCurrent({id:r.data.data.id,version:r.data.data.version,input:payload,review:r.data.data.review,possibleDuplicates:r.data.data.possibleDuplicates});
      setCurrentClientName(clients.find(c=>c.id===payload.clientId)?.name || currentClientName);
      setReview(r.data.data.review);setDuplicates(r.data.data.possibleDuplicates);setAck(false);saveKey.current=null;confirmKey.current=null;
      try {await loadDrafts();setMessage('Rascunho histórico salvo.');} catch {setMessage('Rascunho salvo, mas não foi possível atualizar a lista.');}
    } catch {setMessage('Não foi possível salvar. Confira parcelas, valores, componentes e datas.');} finally {setBusy(false);}
  }
  async function openDraft(id:string) {
    setBusy(true);setMessage('');
    try {const r=await loansApi.get<{data:Draft}>(`${url}/${id}`);const d=r.data.data;setCurrent(d);setCurrentClientName(drafts.find(entry=>entry.id===id)?.client.name || 'Cliente selecionado');setClientId(d.input.clientId);setPrincipal(d.input.principal.replace('.',','));setRate(d.input.ratePercent.replace('.',','));setInterval(d.input.interval);setConditions(d.input.conditions);setRows(d.input.installments);setReview(d.review);setDuplicates(d.possibleDuplicates);setAck(false);saveKey.current=null;confirmKey.current=null;}
    catch {setMessage('Não foi possível abrir o rascunho histórico.');} finally {setBusy(false);}
  }
  async function confirm() {
    if(!current || !review?.canConfirm || (duplicates>0 && !ack)) return;
    setBusy(true);setMessage('');
    try {confirmKey.current ??=key();await loansApi.post(`${url}/${current.id}/confirm`,{expectedVersion:current.version,acknowledgeDuplicate:ack},{headers:{'Idempotency-Key':confirmKey.current}});
      setCurrent(null);setReview(null);confirmKey.current=null;setRows([row(1)]);setClientId('');setPrincipal('');
      try {await loadDrafts();setMessage('Contrato histórico registrado.');} catch {setMessage('Contrato histórico registrado, mas não foi possível atualizar a lista.');}
    } catch (error) {
      if(axios.isAxiosError(error) && error.response?.data?.code==='POSSIBLE_DUPLICATE') {
        setDuplicates(1);setAck(false);confirmKey.current=null;setMessage('Foi encontrada uma possível duplicidade. Confira o histórico antes de prosseguir.');
      } else setMessage('A confirmação histórica não está disponível ou precisa de nova conferência.');
    } finally {setBusy(false);}
  }
  function amountInputs(values:Amounts,onChange:(v:Amounts)=>void,prefix:string) {
    return <div className="flex flex-wrap gap-2">{components.map(c=><label key={c}>{prefix} {labels[c]} <input inputMode="decimal" value={values[c]} disabled={busy} onChange={e=>onChange({...values,[c]:e.target.value})} className="border rounded px-2 w-28" /></label>)}</div>;
  }
  return <section className="space-y-3 border-t pt-5"><h2 className="text-lg font-semibold">Contratos históricos</h2>
    <p>Informe os valores realmente combinados. Pagamentos sem composição conhecida permanecem em rascunho.</p>{message && <p role="status">{message}</p>}
    {drafts.length>0 && <ul>{drafts.map(d=><li key={d.id}>{d.client.name}{d.client.cpfPending?' (CPF pendente)':''} <button disabled={busy} onClick={()=>void openDraft(d.id)}>Abrir histórico</button></li>)}</ul>}
    <div className="flex gap-2"><button disabled={busy || draftPage===1} onClick={()=>setDraftPage(p=>p-1)}>Históricos anteriores</button><span>Página {draftPage}</span><button disabled={busy || !moreDrafts} onClick={()=>setDraftPage(p=>p+1)}>Próximos históricos</button></div>
    <form onSubmit={save} className="space-y-3">
      <div className="flex flex-wrap gap-2"><label>Cliente do histórico <select value={clientId} disabled={busy || !!current} onChange={e=>{invalidate();setClientId(e.target.value);}} className="border rounded px-2"><option value="">Selecione</option>
        {current && !clients.some(c=>c.id===current.input.clientId) && <option value={current.input.clientId}>{currentClientName}</option>}
        {clients.map(c=><option key={c.id} value={c.id}>{c.name}{c.cpfPending?' — CPF pendente':''}</option>)}</select></label>
        <button type="button" disabled={busy || clientPage===1 || !!current} onClick={()=>{setClientId('');invalidate();setClientPage(p=>p-1);}}>Clientes anteriores</button><button type="button" disabled={busy || !moreClients || !!current} onClick={()=>{setClientId('');invalidate();setClientPage(p=>p+1);}}>Próximos clientes</button>
        <label>Principal histórico <input value={principal} disabled={busy} inputMode="decimal" onChange={e=>{invalidate();setPrincipal(e.target.value);}} className="border rounded px-2" /></label>
        <label>Taxa histórica (%) <input value={rate} disabled={busy} inputMode="decimal" onChange={e=>{invalidate();setRate(e.target.value);}} className="border rounded px-2" /></label>
        <label>Periodicidade histórica <select value={interval} disabled={busy} onChange={e=>{invalidate();setInterval(e.target.value as 'monthly'|'weekly');}} className="border rounded px-2"><option value="monthly">Mensal</option><option value="weekly">Semanal</option></select></label></div>
      {conditions && <div className="flex flex-wrap gap-2"><label>Multa histórica (%) <input value={conditions.penaltyRate ?? ''} disabled={busy} inputMode="decimal" onChange={e=>{invalidate();setConditions({...conditions,penaltyRate:e.target.value ? decimal(e.target.value) : null});}} className="border rounded px-2" /></label>
        <label>Mora histórica mensal (%) <input value={conditions.lateRate ?? ''} disabled={busy} inputMode="decimal" onChange={e=>{invalidate();setConditions({...conditions,lateRate:e.target.value ? decimal(e.target.value) : null});}} className="border rounded px-2" /></label>
        <label>Espera da multa histórica (dias) <input type="number" min={0} value={conditions.firstPenaltyDays ?? ''} disabled={busy} onChange={e=>{invalidate();setConditions({...conditions,firstPenaltyDays:e.target.value===''?null:Number(e.target.value)});}} className="border rounded px-2" /></label>
        <label>Frequência da multa histórica (dias) <input type="number" min={1} value={conditions.penaltyEveryDays ?? ''} disabled={busy} onChange={e=>{invalidate();setConditions({...conditions,penaltyEveryDays:e.target.value===''?null:Number(e.target.value)});}} className="border rounded px-2" /></label>
        <label>Método de mora histórico <select value={conditions.lateMethod} disabled={busy} onChange={e=>{invalidate();setConditions({...conditions,lateMethod:e.target.value as Conditions['lateMethod']});}} className="border rounded px-2"><option value="proportional">Proporcional aos dias</option><option value="thirty_days">A cada 30 dias completos</option></select></label></div>}
      {rows.map((item,index)=><fieldset key={index} className="border rounded p-3 space-y-2"><legend>Parcela {index+1}</legend>
        <label>Vencimento da parcela {index+1} <input type="date" value={item.dueDate} disabled={busy} onChange={e=>updateRows(rows.map((r,i)=>i===index?{...r,dueDate:e.target.value}:r))} className="border rounded px-2" /></label>
        {amountInputs(item.original,v=>updateRows(rows.map((r,i)=>i===index?{...r,original:v}:r)),'Original')}
        {amountInputs(item.discount,v=>updateRows(rows.map((r,i)=>i===index?{...r,discount:v}:r)),'Desconto')}
        {item.payments.map((payment,pIndex)=><div key={pIndex} className="border-t pt-2 space-y-2"><p>Pagamento {pIndex+1}</p>
          <label>Valor recebido <input value={payment.amount} disabled={busy} inputMode="decimal" onChange={e=>updateRows(rows.map((r,i)=>i===index?{...r,payments:r.payments.map((p,j)=>j===pIndex?{...p,amount:e.target.value}:p)}:r))} className="border rounded px-2" /></label>
          <label>Data do pagamento <input type="date" value={payment.paidOn} disabled={busy} onChange={e=>updateRows(rows.map((r,i)=>i===index?{...r,payments:r.payments.map((p,j)=>j===pIndex?{...p,paidOn:e.target.value}:p)}:r))} className="border rounded px-2" /></label>
          <label><input type="checkbox" checked={payment.estimated} disabled={busy} onChange={e=>updateRows(rows.map((r,i)=>i===index?{...r,payments:r.payments.map((p,j)=>j===pIndex?{...p,estimated:e.target.checked}:p)}:r))} /> Data estimada</label>
          <label><input type="checkbox" checked={payment.allocation!==null} disabled={busy} onChange={e=>updateRows(rows.map((r,i)=>i===index?{...r,payments:r.payments.map((p,j)=>j===pIndex?{...p,allocation:e.target.checked?zero():null}:p)}:r))} /> Composição conhecida</label>
          {payment.allocation && amountInputs(payment.allocation,v=>updateRows(rows.map((r,i)=>i===index?{...r,payments:r.payments.map((p,j)=>j===pIndex?{...p,allocation:v}:p)}:r)),'Recebido')}
          <button type="button" disabled={busy} onClick={()=>updateRows(rows.map((r,i)=>i===index?{...r,payments:r.payments.filter((_,j)=>j!==pIndex)}:r))}>Remover pagamento</button></div>)}
        <div className="flex gap-3"><button type="button" disabled={busy} onClick={()=>updateRows(rows.map((r,i)=>i===index?{...r,payments:[...r.payments,{amount:'',paidOn:'',estimated:false,allocation:null}]}:r))}>Adicionar pagamento</button>
          <button type="button" disabled={busy || rows.length===1} onClick={()=>updateRows(rows.filter((_,i)=>i!==index).map((r,i)=>({...r,number:i+1})))}>Remover parcela</button></div>
      </fieldset>)}
      <div className="flex gap-3"><button type="button" disabled={busy} onClick={()=>updateRows([...rows,row(rows.length+1)])}>Adicionar parcela histórica</button>
        <button disabled={busy || !clientId || !principal || !rate || !conditions} className="border rounded px-3">Salvar histórico em rascunho</button>
        {current && <button type="button" disabled={busy} onClick={()=>{setCurrent(null);setCurrentClientName('');setClientId('');setPrincipal('');setRows([row(1)]);setInterval('monthly');setRate(settings?.defaultRate?.replace('.',',') ?? '');if(settings){setConditions({defaultRate:settings.defaultRate,defaultMethod:settings.defaultMethod,penaltyRate:settings.penaltyRate,lateRate:settings.lateRate,firstPenaltyDays:settings.firstPenaltyDays,penaltyEveryDays:settings.penaltyEveryDays,lateMethod:settings.lateMethod});}invalidate();}}>Novo histórico</button>}</div>
    </form>
    {review && <div className="space-y-2 border rounded p-3"><p>Cliente: {currentClientName || 'Cliente selecionado'}.</p><p>{review.canConfirm?'Composição dos pagamentos informada.':`${review.incompletePayments} pagamento(s) sem composição: mantenha em rascunho.`}</p>
      <ul>{review.installments.map(i=><li key={i.number}>Parcela {i.number}: original R$ {i.originalTotal}, desconto R$ {i.discountTotal}, recebido R$ {i.received}, saldo {i.remaining===null?'pendente de composição':`R$ ${i.remaining}`}.</li>)}</ul>
      {duplicates>0 && <label><input type="checkbox" checked={ack} disabled={busy} onChange={e=>{setAck(e.target.checked);confirmKey.current=null;}} /> Há possível duplicidade. Conferi e desejo prosseguir.</label>}
      <div><button disabled={busy || !review.canConfirm || (duplicates>0 && !ack)} onClick={()=>void confirm()} className="border rounded px-3">Confirmar histórico</button></div>
    </div>}
  </section>;
}
