import {useRef,useState} from 'react';
import axios from 'axios';
import loansApi from '@/services/loans/loansApi';

type Kind=''|'charge'|'discount'|'adjustment';
type Component='penalty'|'interest'|'lateInterest'|'otherFees'|'principal';
type Balance={contractVersion:number;frozen:boolean;suggestedInstallmentId:string|null;installments:Array<{id:string;number:number;dueDate:string;total:string}>};
type Preview={before:string;change:string;after:string;chargesComplete:boolean};
const components:Array<[Component,string]>=[['penalty','Multa'],['interest','Juros contratuais'],['lateInterest','Mora'],['otherFees','Encargos avulsos'],['principal','Principal']];
export default function LoansAdjustments({walletId,contractId,onChanged}:{walletId:string;contractId:string;onChanged:()=>void}) {
  const [balance,setBalance]=useState<Balance|null>(null),[kind,setKind]=useState<Kind>(''),[component,setComponent]=useState<Component>('otherFees'),[selected,setSelected]=useState('');
  const [amount,setAmount]=useState(''),[effectiveOn,setEffectiveOn]=useState(''),[reason,setReason]=useState(''),[preview,setPreview]=useState<Preview|null>(null);
  const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const key=useRef<string|null>(null),base=`/wallets/${walletId}/contracts/${contractId}`;
  function reset(){setPreview(null);setConfirmed(false);key.current=null;}
  async function load(){setBusy(true);setBalance(null);setMessage('');reset();
    try {const response=await loansApi.get<{data:Balance}>(`${base}/payment-preview`);if(response.data.data.frozen){setMessage('Este contrato está em perda.');return;}
      setBalance(response.data.data);setSelected(response.data.data.suggestedInstallmentId || '');}
    catch {setMessage('Não foi possível consultar as parcelas.');}finally {setBusy(false);}}
  async function calculate(){if(!balance || !kind)return;setBusy(true);setMessage('');reset();
    try {const response=await loansApi.post<{data:Preview}>(`${base}/adjustments/preview`,{kind,installmentId:selected,component,amount,effectiveOn,expectedVersion:balance.contractVersion});setPreview(response.data.data);}
    catch(error){setMessage(axios.isAxiosError(error) && error.response?.data?.code==='ADJUSTMENT_EXCEEDS_BALANCE'?'O valor reduz o componente abaixo do saldo disponível.':'Não foi possível calcular. Confira os dados e atualize o contrato.');}
    finally {setBusy(false);}}
  async function save(event:React.FormEvent){event.preventDefault();if(!balance || !preview?.chargesComplete || !kind || !confirmed)return;
    setBusy(true);setMessage('');
    const common={installmentId:selected,expectedVersion:balance.contractVersion};
    const payload=kind==='charge'?{...common,amount,description:reason.trim(),occurredOn:effectiveOn}:kind==='discount'?{...common,amount,component,reason:reason.trim(),effectiveOn}:{...common,delta:amount,component,reason:reason.trim(),effectiveOn};
    try {key.current ??= Array.from(crypto.getRandomValues(new Uint8Array(16)),value=>value.toString(16).padStart(2,'0')).join('');
      await loansApi.post(`${base}/${kind==='charge'?'charges':kind==='discount'?'discounts':'adjustments'}`,payload,{headers:{'Idempotency-Key':key.current}});key.current=null;onChanged();}
    catch(error){if(axios.isAxiosError(error) && error.response?.status===409){reset();setBalance(null);setMessage('O contrato mudou. Consulte as parcelas novamente.');}
      else setMessage('Não foi possível confirmar. Repita sem alterar os dados para verificar o resultado.');}
    finally {setBusy(false);}}
  return <section className="space-y-2 border-t mt-3 pt-3"><button type="button" disabled={busy} onClick={()=>void load()} className="border rounded px-2">Consultar encargos e ajustes</button>
    {message && <p role="status">{message}</p>}{balance && <form onSubmit={save} className="space-y-2">
      <label>Operação <select value={kind} disabled={busy} onChange={e=>{const value=e.target.value as Kind;setKind(value);if(value==='charge')setComponent('otherFees');reset();}}><option value="">Escolha</option><option value="charge">Encargo avulso</option><option value="discount">Desconto</option><option value="adjustment">Ajuste</option></select></label>{' '}
      <label>Parcela <select value={selected} disabled={busy} onChange={e=>{setSelected(e.target.value);reset();}}>{balance.installments.map(row=><option key={row.id} value={row.id}>Parcela {row.number} · {row.dueDate}</option>)}</select></label>{' '}
      <label>Componente <select value={component} disabled={busy || kind==='charge'} onChange={e=>{setComponent(e.target.value as Component);reset();}}>{components.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{' '}
      <label>Valor <input value={amount} inputMode="decimal" disabled={busy} onChange={e=>{setAmount(e.target.value);reset();}} className="border rounded px-2" /></label>{' '}
      <label>Data efetiva <input type="date" value={effectiveOn} disabled={busy} onChange={e=>{setEffectiveOn(e.target.value);reset();}} /></label>{' '}
      <label>Motivo <input value={reason} maxLength={500} disabled={busy} onChange={e=>{setReason(e.target.value);reset();}} className="border rounded px-2" /></label>
      {kind==='adjustment' && <p>Use sinal negativo para reduzir o componente.</p>}
      <button type="button" disabled={busy || !kind || !selected || !amount || !effectiveOn || !reason.trim()} onClick={()=>void calculate()} className="border rounded px-2">Calcular efeito</button>
      {preview && <div><p>Antes R$ {preview.before.replace('.',',')} · alteração R$ {preview.change.replace('.',',')} · depois R$ {preview.after.replace('.',',')}</p>
        <p>Desconto e ajuste da dívida não são dinheiro recebido.</p>{!preview.chargesComplete && <p>A confirmação ficará disponível após validar a apuração de encargos.</p>}
        <label className="block"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)} /> Confirmo a operação informada</label>
        <button disabled={busy || !preview.chargesComplete || !confirmed} className="border rounded px-2">Registrar operação</button></div>}
    </form>}
  </section>;
}
