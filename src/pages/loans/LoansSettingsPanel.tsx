import { useEffect, useRef, useState } from 'react';
import loansApi from '@/services/loans/loansApi';

type Settings = {version:number;defaultRate:string|null;defaultMethod:'single'|'price'|null;penaltyRate:string|null;lateRate:string|null;firstPenaltyDays:number|null;penaltyEveryDays:number|null;lateMethod:'proportional'|'thirty_days'};
function newKey() {return Array.from(crypto.getRandomValues(new Uint8Array(16)),value => value.toString(16).padStart(2,'0')).join('');}

export default function LoansSettingsPanel({walletId,onSaved}:{walletId:string;onSaved?:() => void}) {
  const url=`/wallets/${walletId}/settings`;
  const [settings,setSettings]=useState<Settings | null>(null), [message,setMessage]=useState(''), [busy,setBusy]=useState(false);
  const key=useRef<string | null>(null);
  async function load() {const response=await loansApi.get<{data:Settings}>(url);setSettings(response.data.data);key.current=null;}
  useEffect(() => {
    let active=true;
    loansApi.get<{data:Settings}>(url).then(response => {if(active) setSettings(response.data.data);})
      .catch(() => {if(active) setMessage('Não foi possível carregar os parâmetros.');});
    return () => {active=false;};
  },[url]);
  function change<K extends keyof Settings>(field:K,value:Settings[K]) {
    key.current=null;setSettings(current => current ? {...current,[field]:value} : current);
  }
  async function save(event:React.FormEvent) {
    event.preventDefault();if(!settings) return;
    setBusy(true);setMessage('');
    try {
      key.current ??= newKey();
      const {version,defaultRate,defaultMethod,penaltyRate,lateRate,firstPenaltyDays,penaltyEveryDays,lateMethod}=settings;
      const decimalValue=(value:string|null) => value?.replace(',','.') ?? null;
      const values={defaultRate:decimalValue(defaultRate),defaultMethod,penaltyRate:decimalValue(penaltyRate),lateRate:decimalValue(lateRate),firstPenaltyDays,penaltyEveryDays,lateMethod};
      const response=await loansApi.put<{data:Settings}>(url,{expectedVersion:version,settings:values},{headers:{'Idempotency-Key':key.current}});
      setSettings(response.data.data);key.current=null;setMessage('Parâmetros salvos.');onSaved?.();
    } catch {setMessage('Não foi possível salvar. Se outra pessoa alterou os parâmetros, recarregue antes de tentar novamente.');}
    finally {setBusy(false);}
  }
  const decimal=(field:'defaultRate'|'penaltyRate'|'lateRate',label:string) => <label>{label} (%)
    <input type="text" inputMode="decimal" value={settings?.[field] ?? ''} disabled={busy} onChange={e => change(field,e.target.value || null)} className="border rounded px-2 py-1" />
  </label>;
  const days=(field:'firstPenaltyDays'|'penaltyEveryDays',label:string) => <label>{label}
    <input type="number" min={field==='firstPenaltyDays'?0:1} max={36500} step={1} value={settings?.[field] ?? ''} disabled={busy}
      onChange={e => change(field,e.target.value===''?null:Number(e.target.value))} className="border rounded px-2 py-1" />
  </label>;
  return <section className="space-y-3 border-t pt-5"><h2 className="text-lg font-semibold">Parâmetros da carteira</h2>
    {message && <p role="status">{message}</p>}
    {settings && <form onSubmit={save} className="space-y-3">
      <p className="text-sm">Deixe em branco os valores que ainda não foram definidos.</p>
      <div className="flex flex-wrap gap-3">{decimal('defaultRate','Taxa padrão')}{decimal('penaltyRate','Multa')}{decimal('lateRate','Mora mensal')}</div>
      <div className="flex flex-wrap gap-3">{days('firstPenaltyDays','Espera até a primeira multa (dias)')}{days('penaltyEveryDays','Frequência da multa (dias)')}</div>
      <div className="flex flex-wrap gap-3"><label>Método padrão
        <select value={settings.defaultMethod ?? ''} disabled={busy} onChange={e => change('defaultMethod',(e.target.value || null) as Settings['defaultMethod'])} className="border rounded px-2 py-1">
          <option value="">Não definido</option><option value="single">Parcela única</option><option value="price">Price</option>
        </select></label>
        <label>Cálculo da mora <select value={settings.lateMethod} disabled={busy} onChange={e => change('lateMethod',e.target.value as Settings['lateMethod'])} className="border rounded px-2 py-1">
          <option value="proportional">Proporcional aos dias</option><option value="thirty_days">A cada 30 dias completos</option>
        </select></label></div>
      <div className="flex gap-3"><button disabled={busy} className="border rounded px-3 py-1">Salvar parâmetros</button>
        <button type="button" disabled={busy} onClick={() => void load().catch(() => setMessage('Não foi possível carregar os parâmetros.'))}>Recarregar</button></div>
    </form>}
  </section>;
}
