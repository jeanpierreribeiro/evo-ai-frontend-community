import {useEffect,useState} from 'react';
import loansApi from '@/services/loans/loansApi';
import LoansAttachments from './LoansAttachments';
import LoansLossCorrection from './LoansLossCorrection';
import LoansRecovery from './LoansRecovery';
import LoansInterestAttribution from './LoansInterestAttribution';
import LoansPaymentDependencies from './LoansPaymentDependencies';

type Summary={id:string;state:'confirmed'|'loss'|'renegotiated';origin:string;principal:string;firstDueDate:string};
type Page={data:Summary[];page:number;hasMore:boolean};
type Details={state:string;origin:string;version:number;currentBalance:string;negotiationsFrom?:Array<{targetContractId:string;agreedOn:string;reason:string}>;negotiationTo?:{sourceContractId:string;agreedOn:string;reason:string}|null;installments:Array<{id:string;number:number;dueDate:string;principal:string;interest:string;total:string;active:boolean;charges:Array<{component:string;amount:string;occurredOn:string|null;description:string}>;discounts:Array<{component:string;amount:string;effectiveOn:string|null;reason:string}>;adjustments:Array<{component:string;delta:string;effectiveOn:string;reason:string}>}>;
  payments:Array<{id:string;amount:string;paidOn:string;effectivePaidOn:string;effectiveEstimated:boolean;historical:boolean;recovery:boolean;allocations:Array<{installmentId:string;principal:string;interest:string;penalty:string;lateInterest:string;otherFees:string}>;dateCorrections:Array<{revision:number;previousPaidOn:string;correctedPaidOn:string;reason:string;createdAt?:string}>}>;
  losses:Array<{id:string;amount:string;lostOn:string;reason:string;corrections:Array<{reason:string;calculateFrozenCharges:boolean}>}>};

export default function LoansClientFile({walletId,clientId,notes}:{walletId:string;clientId:string;notes:string|null|undefined}) {
  const [page,setPage]=useState(1),[result,setResult]=useState<Page|null>(null),[details,setDetails]=useState<Details|null>(null),[selected,setSelected]=useState(''),[error,setError]=useState('');
  const [revision,setRevision]=useState(0),[notice,setNotice]=useState('');
  const base=`/wallets/${walletId}/clients/${clientId}/contracts`;
  useEffect(()=>{setPage(1);setNotice('');},[base]);
  useEffect(()=>{let active=true;setResult(null);setSelected('');setDetails(null);setError('');
    loansApi.get<Page>(base,{params:{page}}).then(response=>{if(active)setResult(response.data);}).catch(()=>{if(active)setError('Não foi possível carregar os contratos do cliente.');});
    return ()=>{active=false;};},[base,page,revision]);
  useEffect(()=>{if(!selected)return;let active=true;setDetails(null);setError('');
    loansApi.get<{data:Details}>(`${base}/${selected}`).then(response=>{if(active)setDetails(response.data.data);}).catch(()=>{if(active)setError('Não foi possível carregar o histórico do contrato.');});
    return ()=>{active=false;};},[base,selected]);
  return <div className="space-y-2 border rounded p-3 mt-2"><h3 className="font-semibold">Ficha do cliente</h3>
    <p>Observações: {notes || 'Nenhuma'}</p>{error && <p role="status">{error}</p>}{notice && <p role="status">{notice}</p>}
    {result && <><ul>{result.data.map(item=><li key={item.id} className="py-1">R$ {item.principal} · primeiro vencimento {item.firstDueDate} · {item.state==='loss'?'Em perda':item.state==='renegotiated'?'Renegociado':'Em cobrança'} · {item.origin==='historical'?'Histórico':item.origin==='agreement'?'Acordo':'Novo'} <button className="border rounded px-2" onClick={()=>setSelected(item.id)}>Ver histórico</button></li>)}</ul>
      {!result.data.length && <p>Nenhum contrato confirmado.</p>}
      <div className="flex gap-2"><button disabled={page===1} onClick={()=>setPage(value=>value-1)}>Anterior</button><span>Página {result.page}</span><button disabled={!result.hasMore} onClick={()=>setPage(value=>value+1)}>Próxima</button></div></>}
    {details && <div className="space-y-2"><p>Saldo registrado: R$ {details.currentBalance}. Encargos ainda não calculados não estão incluídos.</p><h4 className="font-medium">Parcelas e histórico</h4>
      {details.negotiationTo && <p>Acordo de {details.negotiationTo.agreedOn} vinculado ao contrato {details.negotiationTo.sourceContractId.slice(0,8)} · {details.negotiationTo.reason} <button className="border rounded px-2" onClick={()=>setSelected(details.negotiationTo!.sourceContractId)}>Ver contrato de origem</button></p>}
      {details.negotiationsFrom?.map(agreement=><p key={agreement.targetContractId}>Renegociado em {agreement.agreedOn}; contrato de destino {agreement.targetContractId.slice(0,8)} · {agreement.reason} <button className="border rounded px-2" onClick={()=>setSelected(agreement.targetContractId)}>Ver contrato do acordo</button></p>)}
      {details.state==='loss' && <LoansRecovery key={`recovery:${selected}`} walletId={walletId} contractId={selected} onRecovered={()=>{setNotice('Recuperação registrada.');setRevision(value=>value+1);}}/>}
      {details.origin==='agreement' && details.state==='confirmed' && <LoansInterestAttribution key={`interest:${selected}`} walletId={walletId} contractId={selected}/>}
      <ul>{details.installments.map(row=><li key={`${row.number}-${row.dueDate}`}>Parcela {row.number} · {row.dueDate} · original R$ {row.total}{!row.active?' · substituída':''}
        {row.charges.map((item,index)=><p key={`charge-${index}`}>Encargo {item.component}: R$ {item.amount} · {item.occurredOn || 'data não informada'} · {item.description}</p>)}
        {row.discounts.map((item,index)=><p key={`discount-${index}`}>Desconto {item.component}: R$ {item.amount} · {item.effectiveOn || 'data não informada'} · {item.reason}</p>)}
        {row.adjustments.map((item,index)=><p key={`adjustment-${index}`}>Ajuste {item.component}: R$ {item.delta} · {item.effectiveOn} · {item.reason}</p>)}
      </li>)}</ul>
      <h4 className="font-medium">Recebimentos</h4><ul>{details.payments.map(payment=><li key={payment.id}>R$ {payment.amount} · data {payment.effectivePaidOn}{payment.effectiveEstimated?' (estimada)':''}{payment.recovery?' · recuperação de perda':''}
        {(payment.allocations ?? []).map(allocation=><p key={allocation.installmentId}>Parcela {details.installments.find(row=>row.id===allocation.installmentId)?.number ?? 'não identificada'} · principal R$ {allocation.principal} · juros R$ {allocation.interest} · multa R$ {allocation.penalty} · mora R$ {allocation.lateInterest} · outros encargos R$ {allocation.otherFees}</p>)}
        {payment.dateCorrections.map(correction=><p key={correction.revision}>Data anterior: {correction.previousPaidOn} · corrigida para {correction.correctedPaidOn} · {correction.reason}{correction.createdAt && !Number.isNaN(Date.parse(correction.createdAt)) ? ` · registrada em ${new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(correction.createdAt))}` : ''}</p>)}
        <LoansPaymentDependencies key={`${selected}:${payment.id}`} walletId={walletId} contractId={selected} paymentId={payment.id}/></li>)}</ul>
      {details.losses.map(loss=><div key={loss.id}><p>Perda registrada em {loss.lostOn}: R$ {loss.amount} · {loss.reason}</p>{loss.corrections.map((correction,index)=><p key={index}>Correção: {correction.reason} · encargos do período {correction.calculateFrozenCharges?'calculados':'não calculados'}</p>)}
        {details.state==='loss' && loss.corrections.length===0 && <LoansLossCorrection walletId={walletId} contractId={selected} lossId={loss.id} version={details.version} onCorrected={()=>{setNotice('Correção de perda registrada.');setRevision(value=>value+1);}}/>}</div>)}
    </div>}
    <LoansAttachments walletId={walletId} clientId={clientId}/>
  </div>;
}
