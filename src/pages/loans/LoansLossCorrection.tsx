import {useRef,useState} from 'react';
import axios from 'axios';
import loansApi from '@/services/loans/loansApi';

export default function LoansLossCorrection({walletId,contractId,lossId,version,onCorrected}:{walletId:string;contractId:string;lossId:string;version:number;onCorrected:()=>void}) {
  const [open,setOpen]=useState(false),[choice,setChoice]=useState(''),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const key=useRef<string|null>(null);
  async function submit(event:React.FormEvent) {
    event.preventDefault();if(!choice || !reason.trim() || !confirmed)return;
    setBusy(true);setMessage('');
    try {
      key.current ??= Array.from(crypto.getRandomValues(new Uint8Array(16)),value=>value.toString(16).padStart(2,'0')).join('');
      await loansApi.post(`/wallets/${walletId}/contracts/${contractId}/losses/${lossId}/corrections`,{reason:reason.trim(),calculateFrozenCharges:choice==='calculate',expectedVersion:version},{headers:{'Idempotency-Key':key.current}});
      key.current=null;onCorrected();
    } catch(error) {
      if(axios.isAxiosError(error) && error.response?.data?.code==='CHARGE_RULE_PENDING') setMessage('O cálculo de encargos do período de perda ainda não está disponível.');
      else if(axios.isAxiosError(error) && error.response?.status===409) setMessage('O contrato mudou. Atualize o histórico antes de continuar.');
      else setMessage('Não foi possível confirmar a correção. Repita sem alterar os dados para verificar o resultado.');
    } finally {setBusy(false);}
  }
  return <div className="space-y-2"><button type="button" disabled={busy} onClick={()=>setOpen(value=>!value)} className="border rounded px-2">Corrigir marcação de perda</button>
    {open && <form onSubmit={submit} className="space-y-2"><p>O saldo restante retornará à cobrança. Escolha como tratar os encargos do período em perda.</p>
      <label>Encargos do período <select value={choice} disabled={busy} onChange={e=>{key.current=null;setChoice(e.target.value);setConfirmed(false);}}>
        <option value="">Escolha</option><option value="none">Não calcular encargos do período</option><option value="calculate">Calcular encargos do período</option></select></label>{' '}
      <label>Motivo da correção <input value={reason} disabled={busy} maxLength={500} onChange={e=>{key.current=null;setReason(e.target.value);setConfirmed(false);}} className="border rounded px-2" /></label>
      <label className="block"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)} /> Confirmo o retorno do saldo à cobrança</label>
      <button disabled={busy || !choice || !reason.trim() || !confirmed} className="border rounded px-2">Confirmar correção de perda</button>
    </form>}{message && <p role="status">{message}</p>}
  </div>;
}
