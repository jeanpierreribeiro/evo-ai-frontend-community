import {useState} from 'react';
import loansApi from '@/services/loans/loansApi';

type Result={relatedEvents:{otherPayments:number;extensions:number;charges:number;discounts:number;adjustments:number;losses:number;agreements:Array<{id:string;targetContractId:string}>};
  payment:{dateCorrections:Array<{revision:number;previousPaidOn:string;correctedPaidOn:string}>};canConfirm:boolean;dependenciesComplete:boolean};

/** Consulta informativa; a existência ou ausência de eventos não autoriza correção. */
export default function LoansPaymentDependencies({walletId,contractId,paymentId}:{walletId:string;contractId:string;paymentId:string}) {
  const [result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function load(){
    setBusy(true);setResult(null);setMessage('');
    try {
      const response=await loansApi.get<{data:Result}>(`/wallets/${walletId}/contracts/${contractId}/payments/${paymentId}/dependencies`);
      setResult(response.data.data);
    } catch {setMessage('Não foi possível consultar os registros relacionados a este recebimento.');}
    finally {setBusy(false);}
  }
  return <section className="space-y-1 border rounded p-2 my-1">
    <button type="button" className="border rounded px-2" disabled={busy} onClick={()=>void load()}>Consultar registros relacionados</button>
    {message && <p role="status">{message}</p>}
    {result && <div role="status">
      <p>Consulta informativa: os registros podem ser anteriores ou posteriores ao recebimento e não indicam, por si só, uma dependência.</p>
      <p>Outros pagamentos: {result.relatedEvents.otherPayments} · prorrogações: {result.relatedEvents.extensions} · encargos: {result.relatedEvents.charges} · descontos: {result.relatedEvents.discounts}</p>
      <p>Ajustes: {result.relatedEvents.adjustments} · perdas: {result.relatedEvents.losses} · acordos originados neste contrato: {result.relatedEvents.agreements.length} · correções de data deste recebimento: {result.payment.dateCorrections.length}</p>
      <p>A consulta não percorre toda a cadeia de contratos. Estornos e correções de recebimento ainda não estão disponíveis.</p>
    </div>}
  </section>;
}
