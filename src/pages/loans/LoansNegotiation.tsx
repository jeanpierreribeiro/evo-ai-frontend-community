import {useState} from 'react';
import loansApi from '@/services/loans/loansApi';

type FeeAction=''|'carry'|'waive'|'partial_waive';
type Fee={action:FeeAction;amount:string;reason:string};
type Balance={contractVersion:number;frozen:boolean;installments:Array<{id:string;number:number;principal:string;interest:string;penalty:string;lateInterest:string;otherFees:string}>};
type Carried='interest'|'penalty'|'lateInterest'|'otherFees';
type Distribution=Record<Carried,string>;
type Preview={source:{principal:string;interest:string;penalty:string;lateInterest:string;otherFees:string};newInterest:string;newContractualTotal:string;carried:Distribution;waived:{lateInterest:string;otherFees:string};totalAfterAgreement:string;distributionComplete:boolean;canConfirm:boolean;chargesComplete:boolean;schedule:Array<{number:number;dueDate:string;total:string;totalWithCarried?:string|null}>};
const carriedLabels:Array<[Carried,string]>=[['interest','Juros antigos'],['penalty','Multa'],['lateInterest','Mora'],['otherFees','Encargos avulsos']];
const initial=():Fee=>({action:'',amount:'',reason:''});
const format=(value:string)=>value.replace('.',',');
export default function LoansNegotiation({walletId,contractId,previousRate,previousInterval}:{walletId:string;contractId:string;previousRate:string;previousInterval?:string}) {
  const [balance,setBalance]=useState<Balance|null>(null),[rate,setRate]=useState(previousRate),[periods,setPeriods]=useState('1'),[interval,setInterval]=useState(previousInterval==='weekly'?'weekly':previousInterval==='monthly'?'monthly':''),[date,setDate]=useState('');
  const [late,setLate]=useState<Fee>(initial),[other,setOther]=useState<Fee>(initial),[preview,setPreview]=useState<Preview|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [distribution,setDistribution]=useState<Record<number,Distribution>>({});
  const base=`/wallets/${walletId}/contracts/${contractId}`;
  async function load(){setBusy(true);setMessage('');setBalance(null);setPreview(null);
    try {const response=await loansApi.get<{data:Balance}>(`${base}/payment-preview`);if(response.data.data.frozen){setMessage('Este contrato está em perda.');return;}setBalance(response.data.data);}
    catch {setMessage('Não foi possível consultar a dívida.');}finally {setBusy(false);}}
  const valid=(fee:Fee)=>!!fee.action && (fee.action==='carry' || !!fee.reason.trim()) && (fee.action!=='partial_waive' || !!fee.amount);
  const serialize=(fee:Fee)=>({action:fee.action,...(fee.action==='partial_waive'?{amount:fee.amount}:{}),...(fee.action!=='carry'?{reason:fee.reason.trim()}:{})});
  const payload=()=>({ratePercent:rate,periods:Number(periods),interval,firstDueDate:date,expectedVersion:balance!.contractVersion,lateInterest:serialize(late),otherFees:serialize(other)});
  async function calculate(){if(!balance || !valid(late) || !valid(other))return;setBusy(true);setMessage('');setPreview(null);
    try {const response=await loansApi.post<{data:Preview}>(`${base}/negotiations/preview`,payload());const value=response.data.data;setPreview(value);
      setDistribution(Object.fromEntries(value.schedule.map(row=>[row.number,Object.fromEntries(carriedLabels.map(([key])=>[key,/^0+(?:\.0+)?$/.test(value.carried[key])?'0.00':'']))])) as Record<number,Distribution>);}
    catch {setMessage('Não foi possível calcular o acordo. Confira os dados e atualize o contrato.');}finally {setBusy(false);}}
  async function checkDistribution(){if(!balance || !preview)return;setBusy(true);setMessage('');
    try {const rows=preview.schedule.map(row=>({number:row.number,...distribution[row.number]}));
      const response=await loansApi.post<{data:Preview}>(`${base}/negotiations/preview`,{...payload(),distribution:rows});setPreview(response.data.data);}
    catch {setMessage('A distribuição não confere com os componentes ou o contrato mudou. Revise os valores e atualize a consulta.');setPreview(current=>current?{...current,distributionComplete:false}:current);}
    finally {setBusy(false);}}
  function feeFields(label:string,fee:Fee,setFee:(value:Fee)=>void){return <div><label>{label} <select value={fee.action} disabled={busy} onChange={e=>{setFee({action:e.target.value as FeeAction,amount:'',reason:''});setPreview(null);}}>
    <option value="">Escolha</option><option value="carry">Manter no acordo</option><option value="waive">Dispensar integralmente</option><option value="partial_waive">Dispensar parte</option></select></label>{' '}
    {fee.action==='partial_waive' && <label>Valor a dispensar de {label.toLowerCase()} <input value={fee.amount} disabled={busy} inputMode="decimal" onChange={e=>{setFee({...fee,amount:e.target.value});setPreview(null);}} className="border rounded px-2" /></label>}
    {(fee.action==='waive' || fee.action==='partial_waive') && <label>Motivo para {label.toLowerCase()} <input value={fee.reason} disabled={busy} maxLength={500} onChange={e=>{setFee({...fee,reason:e.target.value});setPreview(null);}} className="border rounded px-2" /></label>}</div>;}
  return <section className="space-y-2 border-t mt-3 pt-3"><button type="button" disabled={busy} onClick={()=>void load()} className="border rounded px-2">Consultar renegociação</button>{message && <p role="status">{message}</p>}
    {balance && <div className="space-y-2"><p>Saldo por parcela, antes de encargos ainda não calculados:</p>{balance.installments.map(row=><p key={row.id}>Parcela {row.number}: principal R$ {format(row.principal)} · juros R$ {format(row.interest)} · multa R$ {format(row.penalty)} · mora R$ {format(row.lateInterest)} · outros R$ {format(row.otherFees)}</p>)}
      <label>Taxa do acordo (%) <input value={rate} disabled={busy} inputMode="decimal" onChange={e=>{setRate(e.target.value);setPreview(null);}} className="border rounded px-2" /></label>{' '}
      <label>Parcelas do acordo <input type="number" min="1" max="10000" value={periods} disabled={busy} onChange={e=>{setPeriods(e.target.value);setPreview(null);}} className="border rounded px-2" /></label>{' '}
      <label>Periodicidade do acordo <select value={interval} disabled={busy} onChange={e=>{setInterval(e.target.value);setPreview(null);}}><option value="">Escolha</option><option value="monthly">Mensal</option><option value="weekly">Semanal</option></select></label>{' '}
      <label>Primeiro vencimento do acordo <input type="date" value={date} disabled={busy} onChange={e=>{setDate(e.target.value);setPreview(null);}} /></label>
      {feeFields('Mora',late,setLate)}{feeFields('Encargos avulsos',other,setOther)}
      <button type="button" disabled={busy || !rate || !periods || !interval || !date || !valid(late) || !valid(other)} onClick={()=>void calculate()} className="border rounded px-2">Calcular acordo</button>
      {preview && <div role="status"><p>Principal base: R$ {format(preview.source.principal)} · novos juros: R$ {format(preview.newInterest)} · novo valor contratual: R$ {format(preview.newContractualTotal)}</p>
        <p>Transferidos separadamente: juros antigos R$ {format(preview.carried.interest)} · multa R$ {format(preview.carried.penalty)} · mora R$ {format(preview.carried.lateInterest)} · encargos avulsos R$ {format(preview.carried.otherFees)}</p>
        <p>Dispensados: mora R$ {format(preview.waived.lateInterest)} · encargos avulsos R$ {format(preview.waived.otherFees)}</p><p>Total previsto: R$ {format(preview.totalAfterAgreement)}</p>
        <ul>{preview.schedule.map(row=><li key={row.number}>Parcela {row.number}: {row.dueDate.split('-').reverse().join('/')} · principal e novos juros R$ {format(row.total)}{row.totalWithCarried && ` · total com componentes anteriores R$ ${format(row.totalWithCarried)}`}
          <div>{carriedLabels.map(([key,label])=><label key={key}>{label} na parcela {row.number} <input inputMode="decimal" value={distribution[row.number]?.[key] ?? ''} disabled={busy} onChange={e=>{setDistribution(current=>({...current,[row.number]:{...current[row.number],[key]:e.target.value}}));setPreview(current=>current?{...current,distributionComplete:false,schedule:current.schedule.map(item=>({...item,totalWithCarried:null}))}:current);}} className="border rounded px-2" /></label>)}</div>
        </li>)}</ul>
        <button type="button" disabled={busy || preview.schedule.some(row=>carriedLabels.some(([key])=>!distribution[row.number]?.[key]))} onClick={()=>void checkDistribution()} className="border rounded px-2">Conferir distribuição</button>
        {preview.distributionComplete && <p>Distribuição conferida com os valores transferidos.</p>}
        <p>Esta prévia não registra recebimento nem entrega de dinheiro. A confirmação do acordo ainda não está disponível.</p></div>}
    </div>}
  </section>;
}
