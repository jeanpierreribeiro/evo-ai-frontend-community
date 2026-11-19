import {useRef,useState} from 'react';
import axios from 'axios';
import loansApi from '@/services/loans/loansApi';

type Installment={id:string;number:number;dueDate:string;total:string};
type Balance={contractVersion:number;maximum:string;frozen:boolean;suggestedInstallmentId:string|null;installments:Installment[]};
type Allocation={installmentId:string;principal:string;interest:string;penalty:string;lateInterest:string;otherFees:string};
type Preview={chargesComplete:boolean;remaining:string;allocations:Allocation[]};
export default function LoansRecovery({walletId,contractId,onRecovered,mode='recovery'}:{walletId:string;contractId:string;onRecovered:()=>void;mode?:'recovery'|'normal'}) {
  const [balance,setBalance]=useState<Balance|null>(null),[selected,setSelected]=useState(''),[amount,setAmount]=useState(''),[date,setDate]=useState('');
  const [preview,setPreview]=useState<Preview|null>(null),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const key=useRef<string|null>(null),base=`/wallets/${walletId}/contracts/${contractId}`;
  function resetPreview(){setPreview(null);setConfirmed(false);key.current=null;}
  async function load() {
    setBusy(true);setMessage('');setBalance(null);resetPreview();
    try {const response=await loansApi.get<{data:Balance}>(`${base}/payment-preview`);const value=response.data.data;
      if(value.frozen!==(mode==='recovery')) {setMessage('A situação do contrato mudou. Atualize a ficha.');return;}
      setBalance(value);setSelected(value.suggestedInstallmentId || '');}
    catch {setMessage('Não foi possível consultar o saldo do contrato.');} finally {setBusy(false);}
  }
  async function calculate() {
    if(!balance)return;setBusy(true);setMessage('');resetPreview();
    try {const response=await loansApi.post<{data:Preview}>(`${base}/payments/preview`,{selectedInstallmentId:selected,amount,paidOn:date,expectedVersion:balance.contractVersion});setPreview(response.data.data);}
    catch(error) {setMessage(axios.isAxiosError(error) && error.response?.data?.code==='PAYMENT_EXCEEDS_BALANCE'?'O valor excede o saldo registrado.':'Não foi possível calcular o recebimento. Confira os dados e atualize a ficha.');}
    finally {setBusy(false);}
  }
  async function receive(event:React.FormEvent) {
    event.preventDefault();if(!balance || !preview?.chargesComplete || !confirmed)return;
    setBusy(true);setMessage('');
    try {key.current ??= Array.from(crypto.getRandomValues(new Uint8Array(16)),value=>value.toString(16).padStart(2,'0')).join('');
      await loansApi.post(`${base}/payments`,{selectedInstallmentId:selected,amount,paidOn:date,expectedVersion:balance.contractVersion},{headers:{'Idempotency-Key':key.current}});
      key.current=null;onRecovered();}
    catch(error) {
      if(axios.isAxiosError(error) && error.response?.status===409) {resetPreview();setBalance(null);setMessage('O contrato mudou. Consulte o saldo novamente.');}
      else setMessage('Não foi possível confirmar o recebimento. Repita sem alterar os dados para verificar o resultado.');
    } finally {setBusy(false);}
  }
  return <section className="space-y-2 border rounded p-2"><button type="button" disabled={busy} onClick={()=>void load()} className="border rounded px-2">{mode==='recovery'?'Consultar recuperação':'Consultar recebimento'}</button>
    {message && <p role="status">{message}</p>}{balance && <form onSubmit={receive} className="space-y-2">
      <p>{mode==='recovery'?'Saldo registrado em perda':'Saldo registrado no contrato'}: R$ {balance.maximum.replace('.',',')}</p>
      <label>Parcela para {mode==='recovery'?'recuperação':'recebimento'} <select value={selected} disabled={busy} onChange={e=>{setSelected(e.target.value);resetPreview();}}>{balance.installments.map(item=><option key={item.id} value={item.id}>Parcela {item.number} · {item.dueDate} · R$ {item.total.replace('.',',')}</option>)}</select></label>{' '}
      <label>Valor recebido <input inputMode="decimal" value={amount} disabled={busy} onChange={e=>{setAmount(e.target.value);resetPreview();}} className="border rounded px-2" /></label>{' '}
      <label>Data do recebimento <input type="date" value={date} disabled={busy} onChange={e=>{setDate(e.target.value);resetPreview();}} /></label>{' '}
      <button type="button" disabled={busy || !selected || !amount || !date} onClick={()=>void calculate()} className="border rounded px-2">{mode==='recovery'?'Calcular recuperação':'Calcular recebimento'}</button>
      {preview && <div><p>Saldo após {mode==='recovery'?'recuperação':'recebimento'}: R$ {preview.remaining.replace('.',',')}</p>{preview.allocations.map(row=><p key={row.installmentId}>Parcela {balance.installments.find(item=>item.id===row.installmentId)?.number ?? 'não identificada'}: multa R$ {row.penalty.replace('.',',')} · juros R$ {row.interest.replace('.',',')} · mora R$ {row.lateInterest.replace('.',',')} · outros R$ {row.otherFees.replace('.',',')} · principal R$ {row.principal.replace('.',',')}</p>)}
        {!preview.chargesComplete && <p>A confirmação ficará disponível após validar a apuração de encargos.</p>}
        <label className="block"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)} /> Confirmo o recebimento informado</label>
        <button disabled={busy || !preview.chargesComplete || !confirmed} className="border rounded px-2">{mode==='recovery'?'Registrar recuperação':'Registrar recebimento'}</button></div>}
    </form>}
  </section>;
}
