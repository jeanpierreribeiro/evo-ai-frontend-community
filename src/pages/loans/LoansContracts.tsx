import { useEffect, useRef, useState } from 'react';
import loansApi from '@/services/loans/loansApi';
import LoansCancellationPreview from './LoansCancellationPreview';
import LoansLoss from './LoansLoss';
import LoansRecovery from './LoansRecovery';
import LoansAdjustments from './LoansAdjustments';
import LoansExtension from './LoansExtension';
import LoansNegotiation from './LoansNegotiation';

type Client={name:string;cpfPending:boolean};
type Summary={id:string;client:Client;principal:string;ratePercent:string;origin?:string};
type Payment={id:string;amount:string;paidOn:string;historical:boolean;estimated:boolean;effectivePaidOn:string;effectiveEstimated:boolean;dateCorrections:Array<{previousPaidOn:string;correctedPaidOn:string;reason:string}>};
type Contract=Summary & {version:number;interval?:string;conditions:{penaltyRate:string|null;lateRate:string|null;firstPenaltyDays:number|null;penaltyEveryDays:number|null;lateMethod:string};installments:Array<{number:number;dueDate:string;principal:string;interest:string;total:string;active?:boolean;charges?:Array<{component:string;amount:string}>;discounts?:Array<{component:string;amount:string}>;adjustments?:Array<{component:string;delta:string}>}>;payments?:Payment[]};
const componentLabels:Record<string,string>={principal:'principal',interest:'juros contratuais',penalty:'multa',lateInterest:'mora',otherFees:'encargos avulsos'};
type Page={data:Summary[];page:number;hasMore:boolean};

export default function LoansContracts({walletId,revision}:{walletId:string;revision:number}) {
  const url=`/wallets/${walletId}/contracts`;
  const [page,setPage]=useState(1), [data,setData]=useState<Page | null>(null), [selected,setSelected]=useState<Contract | null>(null);
  const [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  const [listRevision,setListRevision]=useState(0);
  const [correction,setCorrection]=useState<{payment:Payment;date:string;reason:string}|null>(null);
  const correctionKey=useRef<string|null>(null);
  useEffect(()=>{setPage(1);setSelected(null);},[walletId,revision]);
  useEffect(()=>{
    let active=true;
    loansApi.get<Page>(url,{params:{page}}).then(response=>{if(active)setData(response.data);})
      .catch(()=>{if(active)setMessage('Não foi possível carregar os contratos.');});
    return()=>{active=false;};
  },[url,page,revision,listRevision]);
  async function show(id:string) {
    setBusy(true);setMessage('');setSelected(null);setCorrection(null);correctionKey.current=null;
    try {const response=await loansApi.get<{data:Contract}>(`${url}/${id}`);setSelected(response.data.data);}
    catch {setMessage('Não foi possível abrir o contrato.');} finally {setBusy(false);}
  }
  async function correctDate(event:React.FormEvent) {
    event.preventDefault();if(!selected || !correction) return;
    setBusy(true);setMessage('');
    try {
      correctionKey.current ??= Array.from(crypto.getRandomValues(new Uint8Array(16)),value=>value.toString(16).padStart(2,'0')).join('');
      await loansApi.post(`${url}/${selected.id}/payments/${correction.payment.id}/date-corrections`,{correctedPaidOn:correction.date,reason:correction.reason.trim(),expectedVersion:selected.version},{headers:{'Idempotency-Key':correctionKey.current}});
      correctionKey.current=null;setCorrection(null);
      try {const response=await loansApi.get<{data:Contract}>(`${url}/${selected.id}`);setSelected(response.data.data);setMessage('Data histórica corrigida.');}
      catch {setMessage('Data corrigida, mas não foi possível atualizar o contrato.');}
    } catch {setMessage('Não foi possível corrigir a data. Confira o contrato e tente novamente.');}
    finally {setBusy(false);}
  }
  return <section className="space-y-3 border-t pt-5"><h2 className="text-lg font-semibold">Contratos confirmados</h2>
    {message && <p role="status">{message}</p>}
    {data && <>{data.data.length===0?<p>Nenhum contrato confirmado.</p>:<ul>{data.data.map(contract=><li key={contract.id} className="flex gap-2 items-center">
      <span>{contract.client.name}{contract.client.cpfPending?' (CPF pendente)':''}{contract.origin==='historical'?' — histórico':contract.origin==='agreement'?' — acordo sem novo desembolso':''} — R$ {contract.principal.replace('.',',')} — {contract.ratePercent.replace('.',',')}%</span>
      <button disabled={busy} onClick={()=>void show(contract.id)} className="border rounded px-2">Ver contrato</button></li>)}</ul>}
      <div className="flex gap-2"><button disabled={busy || page===1} onClick={()=>{setSelected(null);setPage(value=>value-1);}}>Anteriores</button><span>Página {page}</span>
        <button disabled={busy || !data.hasMore} onClick={()=>{setSelected(null);setPage(value=>value+1);}}>Próximos</button></div></>}
    {selected && <div className="border rounded p-3"><p>Cliente: {selected.client.name}{selected.client.cpfPending?' (CPF pendente)':''}{selected.origin==='historical'?' — contrato histórico':selected.origin==='agreement'?' — acordo sem novo desembolso':''}</p>
      <p>Multa: {selected.conditions.penaltyRate===null?'não definida':`${selected.conditions.penaltyRate.replace('.',',')}%`}; mora: {selected.conditions.lateRate===null?'não definida':`${selected.conditions.lateRate.replace('.',',')}% ao mês`}.</p>
      <p>Espera para multa: {selected.conditions.firstPenaltyDays ?? 'não definida'} dias; frequência: {selected.conditions.penaltyEveryDays ?? 'não definida'} dias; mora {selected.conditions.lateMethod==='proportional'?'proporcional aos dias':'a cada 30 dias completos'}.</p>
      <ul>{selected.installments.map(part=><li key={part.number}><p>Parcela {part.number}{part.active===false?' (prorrogada)':''}: {part.dueDate.split('-').reverse().join('/')} — principal R$ {part.principal.replace('.',',')}, juros R$ {part.interest.replace('.',',')}, total original R$ {part.total.replace('.',',')}</p>
        {part.charges?.map((charge,index)=><p key={`charge-${index}`}>Encargo ({componentLabels[charge.component] || charge.component}): R$ {charge.amount.replace('.',',')}</p>)}
        {part.discounts?.map((discount,index)=><p key={`discount-${index}`}>Desconto ({componentLabels[discount.component] || discount.component}): R$ {discount.amount.replace('.',',')}</p>)}
        {part.adjustments?.map((adjustment,index)=><p key={`adjustment-${index}`}>Ajuste ({componentLabels[adjustment.component] || adjustment.component}): R$ {adjustment.delta.replace('.',',')}</p>)}</li>)}</ul>
      {(selected.payments ?? []).length>0 && <div className="space-y-2 mt-3"><h3 className="font-medium">Pagamentos registrados</h3>
        {selected.payments?.map(payment=><div key={payment.id} className="border-t pt-2"><p>R$ {payment.amount.replace('.',',')} em {payment.effectivePaidOn.split('-').reverse().join('/')}{payment.effectiveEstimated?' (data estimada)':''}{payment.historical?' — histórico':''}</p>
          {payment.dateCorrections.map((entry,index)=><p key={index}>Data anterior: {entry.previousPaidOn.split('-').reverse().join('/')} — motivo: {entry.reason}</p>)}
          {payment.historical && payment.effectiveEstimated && <button disabled={busy} onClick={()=>{correctionKey.current=null;setCorrection({payment,date:'',reason:''});}}>Corrigir data estimada</button>}
          {correction?.payment.id===payment.id && <form onSubmit={correctDate} className="flex flex-wrap gap-2">
            <label>Data exata <input type="date" value={correction.date} disabled={busy} onChange={e=>{correctionKey.current=null;setCorrection({...correction,date:e.target.value});}} /></label>
            <label>Motivo da correção <input value={correction.reason} disabled={busy} maxLength={500} onChange={e=>{correctionKey.current=null;setCorrection({...correction,reason:e.target.value});}} /></label>
            <button disabled={busy || !correction.date || !correction.reason.trim()} className="border rounded px-2">Salvar data exata</button></form>}
        </div>)}
      </div>}
      <LoansCancellationPreview key={`cancellation:${walletId}:${selected.id}`} walletId={walletId} contractId={selected.id}/>
      <LoansLoss key={`loss:${walletId}:${selected.id}`} walletId={walletId} contractId={selected.id} onMarked={()=>{setSelected(null);setListRevision(value=>value+1);setMessage('Perda registrada.');}}/>
      <LoansRecovery key={`payment:${walletId}:${selected.id}`} walletId={walletId} contractId={selected.id} mode="normal" onRecovered={()=>{setSelected(null);setListRevision(value=>value+1);setMessage('Recebimento registrado.');}}/>
      <LoansAdjustments key={`adjustments:${walletId}:${selected.id}`} walletId={walletId} contractId={selected.id} onChanged={()=>{setSelected(null);setListRevision(value=>value+1);setMessage('Operação registrada.');}}/>
      <LoansExtension key={`extension:${walletId}:${selected.id}`} walletId={walletId} contractId={selected.id} onExtended={()=>{setSelected(null);setListRevision(value=>value+1);setMessage('Prorrogação registrada.');}}/>
      <LoansNegotiation key={`negotiation:${walletId}:${selected.id}`} walletId={walletId} contractId={selected.id} previousRate={selected.ratePercent} previousInterval={selected.interval}/>
    </div>}
  </section>;
}
