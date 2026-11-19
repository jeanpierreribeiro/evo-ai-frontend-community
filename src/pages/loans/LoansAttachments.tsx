import { useEffect, useRef, useState } from 'react';
import loansApi from '@/services/loans/loansApi';

type Item = {id:string;contentType:string;size:number};
type Page = {data:Item[];page:number;hasMore:boolean};
const MAX_BYTES=5*1024*1024;
function newKey() { return Array.from(crypto.getRandomValues(new Uint8Array(16)),value => value.toString(16).padStart(2,'0')).join(''); }

export default function LoansAttachments({walletId,clientId}:{walletId:string;clientId:string}) {
  const url=`/wallets/${walletId}/clients/${clientId}/attachments`;
  const [page,setPage]=useState<Page | null>(null), [file,setFile]=useState<File | null>(null);
  const [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  const key=useRef<string | null>(null), input=useRef<HTMLInputElement>(null);
  async function load(number=1) { const response=await loansApi.get<Page>(url,{params:{page:number}}); setPage(response.data); }
  useEffect(() => {
    let active=true;
    loansApi.get<Page>(url,{params:{page:1}}).then(response => {if(active) setPage(response.data);})
      .catch(() => {if(active) setMessage('Não foi possível carregar os anexos.');});
    return () => {active=false;};
  },[url]);
  async function upload(event:React.FormEvent) {
    event.preventDefault();
    if (!file || file.size>MAX_BYTES || !['application/pdf','image/png','image/jpeg'].includes(file.type)) {
      setMessage('Selecione um PDF, PNG ou JPG de até 5 MiB.'); return;
    }
    setBusy(true); setMessage('');
    try {
      key.current ??= newKey();
      const form=new FormData(); form.append('file',file);
      await loansApi.post(url,form,{headers:{'Idempotency-Key':key.current}});
      key.current=null; setFile(null); if(input.current) input.current.value='';
      try {await load(); setMessage('Anexo enviado.');} catch {setMessage('Anexo enviado, mas não foi possível atualizar a lista.');}
    } catch {setMessage('Não foi possível enviar o anexo. Confira o arquivo e tente novamente.');}
    finally {setBusy(false);}
  }
  async function download(item:Item) {
    setBusy(true); setMessage('');
    try {
      const response=await loansApi.get<Blob>(`${url}/${item.id}`,{responseType:'blob'});
      const blobUrl=URL.createObjectURL(response.data);
      try {
        const anchor=document.createElement('a'); anchor.href=blobUrl;
        const ext=item.contentType==='application/pdf'?'pdf':item.contentType==='image/png'?'png':'jpg';
        anchor.download=`anexo-${item.id}.${ext}`; anchor.click();
      } finally {window.setTimeout(() => URL.revokeObjectURL(blobUrl),1000);}
    } catch {setMessage('Não foi possível baixar o anexo.');}
    finally {setBusy(false);}
  }
  return <div className="space-y-2 mt-3 border-t pt-3">
    <h3 className="font-medium">Anexos</h3>{message && <p role="status">{message}</p>}
    <form onSubmit={upload} className="flex gap-2 flex-wrap">
      <label>Arquivo <input ref={input} type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy} onChange={e => {key.current=null; setFile(e.target.files?.[0] ?? null);}} /></label>
      <button disabled={busy || !file} className="border rounded px-2">Enviar anexo</button>
    </form>
    {page && <><ul>{page.data.map(item => <li key={item.id} className="flex gap-2 items-center"><span>{item.contentType} — {item.size} bytes</span>
      <button disabled={busy} onClick={() => void download(item)}>Baixar</button></li>)}</ul>
      {page.data.length===0 && <p>Nenhum anexo.</p>}
      <div className="flex gap-2"><button disabled={busy || page.page===1} onClick={() => void load(page.page-1).catch(() => setMessage('Não foi possível carregar os anexos.'))}>Anterior</button>
        <span>Página {page.page}</span><button disabled={busy || !page.hasMore} onClick={() => void load(page.page+1).catch(() => setMessage('Não foi possível carregar os anexos.'))}>Próxima</button></div></>}
  </div>;
}
