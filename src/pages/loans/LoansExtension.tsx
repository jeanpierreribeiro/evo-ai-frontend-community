import {useRef,useState} from 'react';
import axios from 'axios';
import loansApi from '@/services/loans/loansApi';

type Suggestions={installmentId:string;contractVersion:number;ratePercent:string;newDueDate:string;chargesComplete:boolean};
type Preview={canExtend:boolean;requiredInterest:string;principal:string;newInterest:string;newContractualTotal:string;carriedPenalty:string;carriedLateInterest:string;carriedOtherFees:string;totalWithCarriedFees:string;newDueDate:string;chargesComplete:boolean};
const format=(value:string)=>value.replace('.',',');
export default function LoansExtension({walletId,contractId,onExtended}:{walletId:string;contractId:string;onExtended:()=>void}) {
  const [suggestions,setSuggestions]=useState<Suggestions|null>(null),[rate,setRate]=useState(''),[date,setDate]=useState('');
  const [preview,setPreview]=useState<Preview|null>(null),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const key=useRef<string|null>(null),base=`/wallets/${walletId}/contracts/${contractId}/extensions`;
  function reset(){setPreview(null);setConfirmed(false);key.current=null;}
  async function load(){setBusy(true);setMessage('');setSuggestions(null);reset();
    try {const response=await loansApi.get<{data:Suggestions}>(`${base}/suggestions`);setSuggestions(response.data.data);setRate(response.data.data.ratePercent);setDate(response.data.data.newDueDate);}
    catch(error){setMessage(axios.isAxiosError(error) && error.response?.data?.code==='EXTENSION_NOT_AVAILABLE'?'Esta prorrogação exige condições ainda não disponíveis.':'Não foi possível consultar a prorrogação.');}
    finally {setBusy(false);}}
  async function calculate(){if(!suggestions)return;setBusy(true);setMessage('');reset();
    try {const response=await loansApi.post<{data:Preview}>(`${base}/preview`,{installmentId:suggestions.installmentId,ratePercent:rate,newDueDate:date,expectedVersion:suggestions.contractVersion});setPreview(response.data.data);}
    catch(error) {setMessage(axios.isAxiosError(error) && error.response?.data?.code==='EXTENSION_DATE_NOT_LATER'?'O novo vencimento deve ser posterior ao vencimento atual da parcela.':'Não foi possível calcular a prorrogação. Confira os dados e atualize o contrato.');}
    finally {setBusy(false);}}
  async function submit(event:React.FormEvent){event.preventDefault();if(!suggestions || !preview?.canExtend || !preview.chargesComplete || !confirmed)return;
    setBusy(true);setMessage('');
    try {key.current ??= Array.from(crypto.getRandomValues(new Uint8Array(16)),value=>value.toString(16).padStart(2,'0')).join('');
      await loansApi.post(base,{installmentId:suggestions.installmentId,ratePercent:rate,newDueDate:date,expectedVersion:suggestions.contractVersion},{headers:{'Idempotency-Key':key.current}});key.current=null;onExtended();}
    catch(error){if(axios.isAxiosError(error) && error.response?.status===409){reset();setSuggestions(null);setMessage('O contrato mudou. Consulte a prorrogação novamente.');}
      else setMessage('Não foi possível confirmar a prorrogação. Repita sem alterar os dados para verificar o resultado.');}
    finally {setBusy(false);}}
  return <section className="space-y-2 border-t mt-3 pt-3"><button type="button" disabled={busy} onClick={()=>void load()} className="border rounded px-2">Consultar prorrogação</button>
    {message && <p role="status">{message}</p>}{suggestions && <form onSubmit={submit} className="space-y-2">
      <label>Taxa da prorrogação (%) <input inputMode="decimal" value={rate} disabled={busy} onChange={e=>{setRate(e.target.value);reset();}} className="border rounded px-2" /></label>{' '}
      <label>Novo vencimento <input type="date" value={date} disabled={busy} onChange={e=>{setDate(e.target.value);reset();}} /></label>{' '}
      <button type="button" disabled={busy || !rate || !date} onClick={()=>void calculate()} className="border rounded px-2">Calcular prorrogação</button>
      {preview && <div><p>Principal: R$ {format(preview.principal)} · novos juros: R$ {format(preview.newInterest)} · novo valor contratual: R$ {format(preview.newContractualTotal)}</p>
        <p>Encargos anteriores separados: multa R$ {format(preview.carriedPenalty)} · mora R$ {format(preview.carriedLateInterest)} · outros R$ {format(preview.carriedOtherFees)}</p>
        <p>Total com encargos transferidos: R$ {format(preview.totalWithCarriedFees)} · vencimento {preview.newDueDate.split('-').reverse().join('/')}</p>
        {!preview.canExtend && <p>Antes de prorrogar, ainda faltam R$ {format(preview.requiredInterest)} de juros contratuais antigos.</p>}
        {!preview.chargesComplete && <p>A confirmação ficará disponível após validar a apuração de encargos.</p>}
        <label className="block"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)} /> Confirmo a prorrogação apresentada</label>
        <button disabled={busy || !preview.canExtend || !preview.chargesComplete || !confirmed} className="border rounded px-2">Confirmar prorrogação</button></div>}
    </form>}
  </section>;
}
