import {useState} from 'react';
import axios from 'axios';
import loansApi from '@/services/loans/loansApi';

type Component='interest'|'penalty'|'lateInterest'|'otherFees';
type Choice={mode:''|'keep'|'all'|'partial';amount:string};
type Preview={contractVersion:number;principalDelivered:string;principalReceived:string;principalToReturn:string;receivedComponents:Record<Component,string>;refunds?:Record<Component,{received:string;refund:string;retained:string}>;canConfirm:boolean};
const components:Array<[Component,string]>=[['interest','Juros'],['penalty','Multa'],['lateInterest','Mora'],['otherFees','Outros encargos']];
const emptyChoice=():Choice=>({mode:'',amount:''});
const format=(value:string)=>value.replace('.',',');
export default function LoansCancellationPreview({walletId,contractId}:{walletId:string;contractId:string}) {
  const [result,setResult]=useState<Preview|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [choices,setChoices]=useState<Record<Component,Choice>>({interest:emptyChoice(),penalty:emptyChoice(),lateInterest:emptyChoice(),otherFees:emptyChoice()});
  async function load(){
    setBusy(true);setResult(null);setError('');setChoices({interest:emptyChoice(),penalty:emptyChoice(),lateInterest:emptyChoice(),otherFees:emptyChoice()});
    try {const response=await loansApi.get<{data:Preview}>(`/wallets/${walletId}/contracts/${contractId}/cancellation-preview`);setResult(response.data.data);}
    catch(err){setError(axios.isAxiosError(err) && err.response?.data?.code==='CANCELLATION_DEPENDENCIES_PENDING'
      ? 'Este contrato possui operações que precisam ser conferidas antes de calcular o cancelamento.'
      : 'A prévia de cancelamento não está disponível.');}
    finally {setBusy(false);}
  }
  async function previewChoices(){
    if(!result)return;setBusy(true);setError('');setResult({...result,refunds:undefined});
    try {
      const payload=Object.fromEntries(components.map(([key])=>[key,{mode:choices[key].mode,...(choices[key].mode==='partial'?{amount:choices[key].amount}:{})}]));
      const response=await loansApi.post<{data:Preview}>(`/wallets/${walletId}/contracts/${contractId}/cancellation-preview`,{expectedVersion:result.contractVersion,choices:payload});
      setResult(response.data.data);
    } catch {setError('Não foi possível calcular as escolhas. Confira os valores e atualize o contrato.');}
    finally {setBusy(false);}
  }
  return <section className="space-y-2 border-t mt-3 pt-3"><button disabled={busy} onClick={()=>void load()} className="border rounded px-2">Consultar cancelamento</button>
    {error && <p role="status">{error}</p>}
    {result && <div role="status"><p>Principal entregue: R$ {format(result.principalDelivered)}</p><p>Principal já recebido: R$ {format(result.principalReceived)}</p>
      <p>Principal restante a devolver: R$ {format(result.principalToReturn)}</p><p>Encargos recebidos: juros R$ {format(result.receivedComponents.interest)} · multa R$ {format(result.receivedComponents.penalty)} · mora R$ {format(result.receivedComponents.lateInterest)} · outros R$ {format(result.receivedComponents.otherFees)}</p>
      {components.map(([key,label])=><div key={key}><label>{label}: <select value={choices[key].mode} disabled={busy} onChange={e=>{setChoices(current=>({...current,[key]:{mode:e.target.value as Choice['mode'],amount:''}}));setResult(current=>current?{...current,refunds:undefined}:current);}}>
        <option value="">Escolha</option><option value="keep">Manter</option><option value="all">Devolver tudo</option><option value="partial">Devolver parte</option></select></label>
        {choices[key].mode==='partial' && <label>Valor de {label.toLowerCase()} <input inputMode="decimal" value={choices[key].amount} disabled={busy} onChange={e=>{setChoices(current=>({...current,[key]:{...current[key],amount:e.target.value}}));setResult(current=>current?{...current,refunds:undefined}:current);}} className="border rounded px-2" /></label>}
        {result.refunds && <p>Manter R$ {format(result.refunds[key].retained)} · devolver R$ {format(result.refunds[key].refund)}</p>}</div>)}
      <button disabled={busy || components.some(([key])=>!choices[key].mode || choices[key].mode==='partial' && !choices[key].amount)} onClick={()=>void previewChoices()} className="border rounded px-2">Calcular escolhas</button>
      <p>Esta consulta não registra devolução nem cancela o contrato. O registro das escolhas e a confirmação ainda não estão disponíveis.</p></div>}
  </section>;
}
