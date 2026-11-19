import {useState} from 'react';
import axios from 'axios';
import loansApi from '@/services/loans/loansApi';

type Row={number:number;interestPaid:string;oldInterest:string;newInterest:string;oldPaidMin:string;oldPaidMax:string;newPaidMin:string;newPaidMax:string;precise:boolean};
type Result={precise:boolean;installments:Row[]};
const format=(value:string)=>value.replace('.',',');
const range=(min:string,max:string)=>min===max?`R$ ${format(min)}`:`entre R$ ${format(min)} e R$ ${format(max)}`;
export default function LoansInterestAttribution({walletId,contractId}:{walletId:string;contractId:string}) {
  const [result,setResult]=useState<Result|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function load(){setBusy(true);setMessage('');setResult(null);
    try {const response=await loansApi.get<{data:Result}>(`/wallets/${walletId}/contracts/${contractId}/interest-attribution`);setResult(response.data.data);}
    catch(error){setMessage(axios.isAxiosError(error) && error.response?.data?.code==='INTEREST_ATTRIBUTION_PENDING'?'Não é possível separar esses juros com segurança neste histórico.':'Não foi possível consultar os juros do acordo.');}
    finally {setBusy(false);}}
  return <section className="space-y-2 border rounded p-2"><button type="button" disabled={busy} onClick={()=>void load()} className="border rounded px-2">Consultar juros do acordo</button>
    {message && <p role="status">{message}</p>}{result && <div role="status">
      <p>{result.precise?'Os registros permitem identificar os valores abaixo.':'Os registros não definem quanto do pagamento corresponde aos juros antigos e novos. Veja os limites possíveis:'}</p>
      {result.installments.map(row=><p key={row.number}>Parcela {row.number}: juros recebidos R$ {format(row.interestPaid)} · dos juros antigos, {range(row.oldPaidMin,row.oldPaidMax)} · dos juros novos, {range(row.newPaidMin,row.newPaidMax)}</p>)}
    </div>}
  </section>;
}
