import { useEffect, useRef, useState } from 'react';
import loansApi from '@/services/loans/loansApi';
import axios from 'axios';
import LoansAttachments from './LoansAttachments';
import LoansClientFile from './LoansClientFile';

type Client = { id:string;name:string;version:number;cpfPending:boolean;cpfMasked:string|null;birthDate?:string|null;phone?:string|null;email?:string|null;address?:string|null;origin?:string|null;referrer?:string|null;classification?:string|null;notes?:string|null };
type Page = { data: Client[]; page: number; hasMore: boolean };
type Identity = { cpf: string | null; rg: string | null };
type ClientDetails = {birthDate:string;phone:string;email:string;address:string;origin:string;referrer:string;classification:string;notes:string};
const emptyDetails=():ClientDetails => ({birthDate:'',phone:'',email:'',address:'',origin:'',referrer:'',classification:'',notes:''});

function operationKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2,'0')).join('');
}

export default function LoansClientsPanel({ walletId,onChanged }: { walletId: string;onChanged?:() => void }) {
  const [page,setPage]=useState<Page | null>(null);
  const [name,setName]=useState(''), [cpf,setCpf]=useState(''), [rg,setRg]=useState('');
  const [details,setDetails]=useState<ClientDetails>(emptyDetails);
  const [message,setMessage]=useState(''), [busy,setBusy]=useState(false);
  const [shown,setShown]=useState<{id:string; identity:Identity} | null>(null);
  const [attachmentClient,setAttachmentClient]=useState<string | null>(null);
  const [detailsClient,setDetailsClient]=useState<string | null>(null);
  const [fileClient,setFileClient]=useState<string | null>(null);
  const [correction,setCorrection]=useState<{client:Client;cpf:string} | null>(null);
  const [editing,setEditing]=useState<{client:Client;name:string;details:ClientDetails;changeRg:boolean;rg:string} | null>(null);
  const key=useRef<string | null>(null);
  const correctionKey=useRef<string | null>(null);
  const editKey=useRef<string | null>(null);
  const url=`/wallets/${walletId}/clients`;

  async function load(number = 1) {
    const response=await loansApi.get<Page>(url,{params:{page:number}});
    setPage(response.data);
  }
  useEffect(() => {
    let active=true;
    loansApi.get<Page>(url,{params:{page:1}}).then(response => { if (active) setPage(response.data); })
      .catch(() => { if (active) setMessage('Não foi possível carregar os clientes.'); });
    return () => { active=false; };
  },[url]);

  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      key.current ??= operationKey();
      await loansApi.post(url,{name:name.trim(),cpf:cpf.trim(),rg:rg.trim(),...details},{headers:{'Idempotency-Key':key.current}});
      key.current=null; setName(''); setCpf(''); setRg(''); setDetails(emptyDetails());
      onChanged?.();
      try { await load(); setMessage('Cliente cadastrado.'); }
      catch { setMessage('Cliente cadastrado, mas não foi possível atualizar a lista.'); }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status===409 && error.response.data?.code==='DUPLICATE')
        setMessage('Já existe um cliente com este CPF nesta carteira.');
      else setMessage('Não foi possível cadastrar o cliente. Confira os dados e tente novamente.');
    }
    finally { setBusy(false); }
  }

  async function reveal(client: Client) {
    setBusy(true); setMessage(''); setShown(null);
    try {
      const response=await loansApi.get<{data:Identity}>(`${url}/${client.id}/identity`);
      setShown({id:client.id,identity:response.data.data});
    } catch { setMessage('Não foi possível visualizar os documentos.'); }
    finally { setBusy(false); }
  }

  async function correctCpf(event:React.FormEvent) {
    event.preventDefault();if(!correction) return;
    setBusy(true);setMessage('');
    try {
      correctionKey.current ??= operationKey();
      await loansApi.post(`${url}/${correction.client.id}/cpf`,{expectedVersion:correction.client.version,cpf:correction.cpf.trim() || null},
        {headers:{'Idempotency-Key':correctionKey.current}});
      correctionKey.current=null;setCorrection(null);setShown(null);
      onChanged?.();
      try {await load();setMessage('CPF atualizado.');} catch {setMessage('CPF atualizado, mas não foi possível atualizar a lista.');}
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.code==='DUPLICATE') setMessage('Já existe um cliente com este CPF nesta carteira.');
      else setMessage('Não foi possível atualizar o CPF. Recarregue os clientes e tente novamente.');
    } finally {setBusy(false);}
  }

  function editClient(client:Client) {
    editKey.current=null;
    setEditing({client,name:client.name,changeRg:false,rg:'',details:{birthDate:client.birthDate ?? '',phone:client.phone ?? '',email:client.email ?? '',address:client.address ?? '',origin:client.origin ?? '',referrer:client.referrer ?? '',classification:client.classification ?? '',notes:client.notes ?? ''}});
  }
  async function saveProfile(event:React.FormEvent) {
    event.preventDefault();if(!editing) return;
    setBusy(true);setMessage('');
    try {
      editKey.current ??= operationKey();
      await loansApi.put(`${url}/${editing.client.id}`,{expectedVersion:editing.client.version,profile:{name:editing.name.trim(),...editing.details,...(editing.changeRg?{rg:editing.rg.trim()}: {})}},
        {headers:{'Idempotency-Key':editKey.current}});
      editKey.current=null;setEditing(null);setShown(null);onChanged?.();
      try {await load();setMessage('Cadastro atualizado.');} catch {setMessage('Cadastro atualizado, mas não foi possível atualizar a lista.');}
    } catch {setMessage('Não foi possível atualizar o cadastro. Recarregue os clientes e tente novamente.');}
    finally {setBusy(false);}
  }

  return <section className="space-y-3 border-t pt-5">
    <h2 className="text-lg font-semibold">Clientes</h2>
    {message && <p role="status">{message}</p>}
    <form onSubmit={create} className="flex flex-wrap gap-2">
      <label>Nome <input value={name} disabled={busy} maxLength={200} onChange={e => { key.current=null; setName(e.target.value); }} className="border rounded px-2 py-1" /></label>
      <label>CPF <input value={cpf} disabled={busy} maxLength={100} onChange={e => { key.current=null; setCpf(e.target.value); }} className="border rounded px-2 py-1" /></label>
      <label>RG <input value={rg} disabled={busy} maxLength={100} onChange={e => { key.current=null; setRg(e.target.value); }} className="border rounded px-2 py-1" /></label>
      {([['birthDate','Nascimento',10],['phone','Telefone',30],['email','E-mail',254],['address','Endereço',500],['origin','Origem',100],['referrer','Indicador',100],['classification','Classificação',100],['notes','Observações',5000]] as Array<[keyof ClientDetails,string,number]>).map(([field,label,limit]) =>
        <label key={field}>{label} <input type={field==='birthDate'?'date':'text'} value={details[field]} disabled={busy} maxLength={limit} onChange={e => {key.current=null;setDetails(current=>({...current,[field]:e.target.value}));}} className="border rounded px-2 py-1" /></label>)}
      <button disabled={busy || !name.trim()} className="border rounded px-3 py-1">Cadastrar cliente</button>
    </form>
    <p className="text-sm">CPF ausente ou inválido ficará pendente para conferência.</p>
    {page && <><ul className="space-y-2">{page.data.map(client => <li key={client.id} className="border rounded p-3">
      <div className="flex justify-between gap-2"><span>{client.name} — {client.cpfPending ? 'CPF pendente' : client.cpfMasked}</span>
        <div className="flex gap-2"><button disabled={busy} onClick={() => void reveal(client)} className="border rounded px-2">Ver documentos</button>
          <button onClick={() => setDetailsClient(current=>current===client.id?null:client.id)} className="border rounded px-2">Ver cadastro</button>
          <button onClick={() => setFileClient(current=>current===client.id?null:client.id)} className="border rounded px-2">Ficha do cliente</button>
          <button disabled={busy} onClick={() => editClient(client)} className="border rounded px-2">Editar cadastro</button>
          <button disabled={busy} onClick={() => {correctionKey.current=null;setCorrection({client,cpf:''});}} className="border rounded px-2">Corrigir CPF</button>
          <button onClick={() => setAttachmentClient(current => current===client.id?null:client.id)} className="border rounded px-2">Anexos</button></div></div>
      {shown?.id === client.id && <div><p>CPF: {shown.identity.cpf || 'Não informado'}</p><p>RG: {shown.identity.rg || 'Não informado'}</p>
        <button onClick={() => setShown(null)}>Ocultar documentos</button></div>}
      {detailsClient===client.id && <div className="text-sm"><p>Nascimento: {client.birthDate?.split('-').reverse().join('/') || 'Não informado'}</p>
        <p>Telefone: {client.phone || 'Não informado'} — E-mail: {client.email || 'Não informado'}</p><p>Endereço: {client.address || 'Não informado'}</p>
        <p>Origem: {client.origin || 'Não informada'} — Indicador: {client.referrer || 'Não informado'} — Classificação: {client.classification || 'Não informada'}</p>
        <p>Observações: {client.notes || 'Nenhuma'}</p></div>}
      {attachmentClient===client.id && <LoansAttachments key={client.id} walletId={walletId} clientId={client.id} />}
      {fileClient===client.id && <LoansClientFile key={client.id} walletId={walletId} clientId={client.id} notes={client.notes} />}
      {correction?.client.id===client.id && <form onSubmit={correctCpf} className="flex flex-wrap gap-2 mt-2">
        <label>Novo CPF <input value={correction.cpf} disabled={busy} maxLength={100} onChange={e => {correctionKey.current=null;setCorrection({...correction,cpf:e.target.value});}} className="border rounded px-2" /></label>
        <button disabled={busy} className="border rounded px-2">Salvar CPF</button>
        <button type="button" disabled={busy} onClick={() => {correctionKey.current=null;setCorrection(null);}}>Cancelar</button>
      </form>}
      {editing?.client.id===client.id && <form onSubmit={saveProfile} className="space-y-2 mt-2">
        <div className="flex flex-wrap gap-2"><label>Nome do cliente <input value={editing.name} disabled={busy} maxLength={200} onChange={e=>{editKey.current=null;setEditing({...editing,name:e.target.value});}} className="border rounded px-2" /></label>
          {([['birthDate','Nascimento',10],['phone','Telefone',30],['email','E-mail',254],['address','Endereço',500],['origin','Origem',100],['referrer','Indicador',100],['classification','Classificação',100],['notes','Observações',5000]] as Array<[keyof ClientDetails,string,number]>).map(([field,label,limit]) =>
            <label key={field}>{label} <input type={field==='birthDate'?'date':'text'} value={editing.details[field]} disabled={busy} maxLength={limit} onChange={e=>{editKey.current=null;setEditing({...editing,details:{...editing.details,[field]:e.target.value}});}} className="border rounded px-2" /></label>)}</div>
        <label><input type="checkbox" checked={editing.changeRg} disabled={busy} onChange={e=>{editKey.current=null;setEditing({...editing,changeRg:e.target.checked,rg:''});}} /> Alterar RG</label>
        {editing.changeRg && <label>Novo RG <input value={editing.rg} disabled={busy} maxLength={100} onChange={e=>{editKey.current=null;setEditing({...editing,rg:e.target.value});}} className="border rounded px-2" /></label>}
        <div className="flex gap-2"><button disabled={busy || !editing.name.trim()} className="border rounded px-2">Salvar cadastro</button>
          <button type="button" disabled={busy} onClick={()=>{editKey.current=null;setEditing(null);}}>Cancelar edição</button></div>
      </form>}
    </li>)}</ul>{page.data.length === 0 && <p>Nenhum cliente nesta carteira.</p>}
      <div className="flex gap-2"><button disabled={busy || page.page === 1} onClick={() => void load(page.page-1).catch(() => setMessage('Não foi possível carregar os clientes.'))}>Anterior</button>
        <span>Página {page.page}</span><button disabled={busy || !page.hasMore} onClick={() => void load(page.page+1).catch(() => setMessage('Não foi possível carregar os clientes.'))}>Próxima</button></div></>}
  </section>;
}
