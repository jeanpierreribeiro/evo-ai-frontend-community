import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import loansApi from '@/services/loans/loansApi';
import LoansClientsPanel from './LoansClientsPanel';
import LoansSettingsPanel from './LoansSettingsPanel';
import LoansSimulation from './LoansSimulation';
import LoansDrafts from './LoansDrafts';
import LoansContracts from './LoansContracts';
import LoansHistorical from './LoansHistorical';
import LoansInstallments from './LoansInstallments';
import LoansDashboard from './LoansDashboard';
import LoansReports from './LoansReports';

type Wallet = { id: string; name: string };
type Person = { id: string; name: string; confirmed: boolean };
type SearchResult = { data: Person[]; page: number; has_more: boolean };

function newOperationKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) return 'Você não tem permissão para realizar esta ação nesta carteira.';
    if (error.response?.status === 503) return 'O serviço está indisponível. Tente novamente mais tarde.';
    if (error.response?.status === 422) return 'Confira os dados informados e tente novamente.';
  }
  return 'Não foi possível concluir a ação. Tente novamente.';
}

export default function LoansWalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [settingsRevision,setSettingsRevision] = useState(0);
  const [draftRevision,setDraftRevision] = useState(0);
  const [clientsRevision,setClientsRevision] = useState(0);
  const [contractRevision,setContractRevision] = useState(0);
  const createKey = useRef<string | null>(null);
  const grantKeys = useRef(new Map<string, string>());

  useEffect(() => {
    let active = true;
    loansApi.get<{data: Wallet[]}>('/wallets').then(response => {
      const list = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? (response.data as unknown as Wallet[])
          : [];
      if (active) setWallets(list);
    }).catch(error => { if (active) setMessage(errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function createWallet(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      createKey.current ??= newOperationKey();
      const response = await loansApi.post<{data: Wallet}>('/wallets', { name: name.trim() }, { headers: { 'Idempotency-Key': createKey.current } });
      const created = response.data?.data ?? (response.data as unknown as Wallet);
      setWallets(current => [...(current || []), created].sort((a, b) => a.name.localeCompare(b.name)));
      createKey.current = null; setName(''); setSelectedId(created.id); setResult(null);
      setMessage('Carteira criada.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function search(page = 1) {
    if (!selectedId) return;
    setBusy(true); setMessage(''); setResult(null);
    try {
      const response = await loansApi.post<SearchResult>(`/wallets/${selectedId}/directory/search`, { query, page });
      setResult(response.data);
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function grant(person: Person) {
    if (!selectedId) return;
    setBusy(true); setMessage('');
    try {
      const identity = `${selectedId}:${person.id}`;
      const key = grantKeys.current.get(identity) ?? newOperationKey();
      grantKeys.current.set(identity, key);
      await loansApi.post(`/wallets/${selectedId}/members`, { userId: person.id, active: true }, { headers: { 'Idempotency-Key': key } });
      grantKeys.current.delete(identity);
      setMessage(`Acesso concedido a ${person.name}.`);
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return <main className="max-w-4xl mx-auto p-6 space-y-6">
    <div><h1 className="text-2xl font-bold">Empréstimos</h1><p>Selecione uma carteira para gerenciar o acesso.</p></div>
    {message && <p role="status" className="rounded border p-3">{message}</p>}
    <form onSubmit={createWallet} className="space-y-2">
      <label htmlFor="new-loans-wallet" className="block font-medium">Nome da nova carteira</label>
      <div className="flex gap-2"><input id="new-loans-wallet" value={name} disabled={busy} onChange={e => { setName(e.target.value); createKey.current = null; }} maxLength={200} className="border rounded px-3 py-2" />
        <button disabled={busy || !name.trim()} className="border rounded px-3 py-2" type="submit">Criar carteira</button></div>
    </form>
    {loading ? <p>Carregando carteiras...</p> : <div className="space-y-2">
      <label htmlFor="loans-wallet" className="block font-medium">Carteira</label>
      <select id="loans-wallet" value={selectedId} disabled={busy} onChange={e => { setSelectedId(e.target.value); setResult(null); setQuery(''); setMessage(''); }} className="border rounded px-3 py-2">
        <option value="">Selecione</option>{(wallets || []).map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
      </select>
      {(wallets || []).length === 0 && <p>Nenhuma carteira disponível para seu usuário.</p>}
    </div>}
    {selectedId && <section className="space-y-3">
      <h2 className="text-lg font-semibold">Conceder acesso</h2>
      <form onSubmit={e => { e.preventDefault(); void search(); }} className="flex gap-2">
        <label htmlFor="loans-directory-query" className="sr-only">Pesquisar pessoa</label>
        <input id="loans-directory-query" placeholder="Nome ou e-mail" value={query} maxLength={100} onChange={e => setQuery(e.target.value)} className="border rounded px-3 py-2" />
        <button disabled={busy} type="submit" className="border rounded px-3 py-2">Pesquisar</button>
      </form>
      {result && <><ul className="space-y-2">{result.data.map(person => <li key={person.id} className="flex items-center justify-between border rounded p-3">
        <span>{person.name}{!person.confirmed && ' (conta não confirmada)'}</span>
        <button disabled={busy} onClick={() => void grant(person)} className="border rounded px-3 py-2">Conceder acesso</button>
      </li>)}</ul>{result.data.length === 0 && <p>Nenhuma pessoa encontrada.</p>}
        <div className="flex gap-2"><button disabled={busy || result.page === 1} onClick={() => void search(result.page - 1)}>Anterior</button>
          <span>Página {result.page}</span><button disabled={busy || !result.has_more} onClick={() => void search(result.page + 1)}>Próxima</button></div></>}
    </section>}
    {selectedId && <LoansClientsPanel key={`clients-${selectedId}`} walletId={selectedId} onChanged={() => setClientsRevision(value=>value+1)} />}
    {selectedId && <LoansSettingsPanel key={`settings-${selectedId}`} walletId={selectedId} onSaved={() => setSettingsRevision(value => value+1)} />}
    {selectedId && <LoansSimulation key={`simulation-${selectedId}`} walletId={selectedId} settingsRevision={settingsRevision} clientsRevision={clientsRevision} onDraftSaved={() => setDraftRevision(value=>value+1)} />}
    {selectedId && <LoansDrafts key={`drafts-${selectedId}`} walletId={selectedId} revision={draftRevision+clientsRevision} onConfirmed={() => setContractRevision(value=>value+1)} />}
    {selectedId && <LoansContracts key={`contracts-${selectedId}`} walletId={selectedId} revision={contractRevision+clientsRevision} />}
    {selectedId && <LoansInstallments key={`installments-${selectedId}`} walletId={selectedId} revision={contractRevision+clientsRevision} />}
    {selectedId && <LoansDashboard key={`dashboard-${selectedId}`} walletId={selectedId} />}
    {selectedId && <LoansReports key={`reports-${selectedId}`} walletId={selectedId} />}
    {selectedId && <LoansHistorical key={`historical-${selectedId}`} walletId={selectedId} />}
  </main>;
}
