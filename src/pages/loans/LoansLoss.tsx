import {useRef,useState} from 'react';
import axios from 'axios';
import loansApi from '@/services/loans/loansApi';

type Balance={contractVersion:number;maximum:string;frozen:boolean;chargesComplete:boolean;installments:Array<{id:string;number:number;principal:string;interest:string;penalty:string;lateInterest:string;otherFees:string}>};
export default function LoansLoss({walletId,contractId,onMarked}:{walletId:string;contractId:string;onMarked:()=>void}) {
  const [balance,setBalance]=useState<Balance|null>(null),[lostOn,setLostOn]=useState(''),[reason,setReason]=useState('');
  const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const key=useRef<string|null>(null),url=`/wallets/${walletId}/contracts/${contractId}`;
  async function preview() {
    setBusy(true);setMessage('');setBalance(null);setConfirmed(false);key.current=null;
    try {const response=await loansApi.get<{data:Balance}>(`${url}/payment-preview`);setBalance(response.data.data);}
    catch {setMessage('Não foi possível consultar o saldo para perda.');}
    finally {setBusy(false);}
  }
  async function mark(event:React.FormEvent) {
    event.preventDefault();if(!balance || !balance.chargesComplete || !confirmed)return;
    setBusy(true);setMessage('');
    try {
      key.current ??= Array.from(crypto.getRandomValues(new Uint8Array(16)),value=>value.toString(16).padStart(2,'0')).join('');
      await loansApi.post(`${url}/losses`,{lostOn,reason:reason.trim(),expectedVersion:balance.contractVersion},{headers:{'Idempotency-Key':key.current}});
      key.current=null;onMarked();
    } catch(error) {
      if(axios.isAxiosError(error) && error.response?.status===409) {setMessage('O contrato mudou ou a operação conflitou. Atualize a consulta antes de continuar.');setBalance(null);key.current=null;}
      else setMessage('Não foi possível confirmar a perda. Repita sem alterar os dados para verificar o resultado.');
    } finally {setBusy(false);}
  }
  return <section className="space-y-2 border-t mt-3 pt-3"><button disabled={busy} onClick={()=>void preview()} className="border rounded px-2">Consultar perda</button>
    {message && <p role="status">{message}</p>}
    {balance && <form onSubmit={mark} className="space-y-2"><p>Saldo integral registrado: R$ {balance.maximum.replace('.',',')}.{!balance.chargesComplete && ' Encargos ainda não calculados não estão incluídos.'}</p>
      {!balance.chargesComplete && <p>A marcação de perda ficará disponível quando os encargos forem calculados e validados.</p>}
      <p>Marcar como perda suspende a cobrança e congela os encargos. O recebimento posterior será registrado como recuperação.</p>
      {balance.installments.map(item=><p key={item.id}>Parcela {item.number}: principal R$ {item.principal.replace('.',',')} · juros R$ {item.interest.replace('.',',')} · multa R$ {item.penalty.replace('.',',')} · mora R$ {item.lateInterest.replace('.',',')} · outros R$ {item.otherFees.replace('.',',')}</p>)}
      <label>Data da perda <input type="date" value={lostOn} disabled={busy} onChange={e=>{key.current=null;setLostOn(e.target.value);setConfirmed(false);}} /></label>{' '}
      <label>Motivo da perda <input value={reason} maxLength={500} disabled={busy} onChange={e=>{key.current=null;setReason(e.target.value);setConfirmed(false);}} className="border rounded px-2" /></label>
      <label className="block"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)} /> Confirmo a marcação do saldo integral como perda</label>
      <button disabled={busy || !balance.chargesComplete || balance.frozen || balance.maximum==='0.00' || !confirmed || !lostOn || !reason.trim()} className="border rounded px-2">Marcar perda integral</button>
    </form>}
  </section>;
}
