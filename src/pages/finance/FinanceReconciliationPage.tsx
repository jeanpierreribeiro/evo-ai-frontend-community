import React, { useEffect, useState, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  RefreshCw,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';
import { financeService } from '@/services/finance/financeService';
import type { BankAccount, Schedule } from '@/services/finance/financeTypes';

export const FinanceReconciliationPage: React.FC = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [statementEntries, setStatementEntries] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any | null>(null);

  // Tabs: 'entries' | 'suggestions'
  const [activeTab, setActiveTab] = useState<'entries' | 'suggestions'>('entries');
  const [statusFilter, setStatusFilter] = useState('PENDING');

  // Modal Conciliar Título Manualmente (Direct Match)
  const [selectedEntryForManual, setSelectedEntryForManual] = useState<any | null>(null);
  const [manualScheduleId, setManualScheduleId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAccounts = async () => {
    try {
      const accounts = await financeService.listBankAccounts();
      setBankAccounts(accounts);
      if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar contas bancárias:', err);
    }
  };

  const loadData = async () => {
    if (!selectedAccountId) return;
    setLoading(true);
    try {
      const [entriesRes, suggRes, schRes] = await Promise.all([
        financeService.listStatementEntries({
          bankAccountId: selectedAccountId,
          status: statusFilter || undefined,
        }),
        financeService.getReconciliationSuggestions(selectedAccountId).catch(() => []),
        financeService.listSchedules({ status: 'PENDING', pageSize: 100 }),
      ]);
      setStatementEntries(entriesRes || []);
      setSuggestions(suggRes || []);
      setSchedules(schRes.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados de conciliação:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadData();
    }
  }, [selectedAccountId, statusFilter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAccountId) return;

    setImporting(true);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const contentText = reader.result as string;
        const result = await financeService.importOfx({
          bankAccountId: selectedAccountId,
          filename: file.name,
          contentText,
        });
        setImportSummary(result);
        await loadData();
      } catch (err: any) {
        alert(`Erro ao importar arquivo OFX: ${err?.response?.data?.message || err.message}`);
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleApplySuggestion = async (sugg: any) => {
    try {
      if (sugg.type === 'TRANSACTION') {
        await financeService.matchReconciliation({
          matches: [
            {
              statementEntryId: sugg.statementEntryId,
              transactionId: sugg.targetId,
              amount: sugg.amount,
            },
          ],
          notes: 'Conciliação automática via sugestão de sistema',
        });
      } else if (sugg.type === 'SCHEDULE') {
        await financeService.matchScheduleDirect({
          statementEntryId: sugg.statementEntryId,
          scheduleId: sugg.targetId,
          paymentMethodId: 'pm-auto-ofx',
          notes: 'Baixa direta via extrato bancário OFX',
        });
      }
      await loadData();
    } catch (err: any) {
      alert(`Erro ao aplicar sugestão: ${err?.response?.data?.message || err.message}`);
    }
  };

  const handleManualMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntryForManual || !manualScheduleId) return;

    try {
      await financeService.matchScheduleDirect({
        statementEntryId: selectedEntryForManual.id,
        scheduleId: manualScheduleId,
        paymentMethodId: 'pm-default',
        notes: 'Conciliação manual com baixa direta',
      });
      setSelectedEntryForManual(null);
      setManualScheduleId('');
      await loadData();
    } catch (err: any) {
      alert(`Erro na baixa direta: ${err?.response?.data?.message || err.message}`);
    }
  };

  const handleUnmatch = async (entryId: string) => {
    const reason = prompt('Informe o motivo do desfazimento da conciliação:');
    if (!reason) return;
    try {
      await financeService.unmatchReconciliation(entryId, reason);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao desconciliar: ${err?.response?.data?.message || err.message}`);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Operação Assistida & Auditoria</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            Conciliação Bancária & OFX
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Importação inteligente de extratos bancários com deduplicação por hash SHA-256 e conciliação N:N assistida.
          </p>
        </div>

        {/* Seleção de Conta e Botão Importar */}
        <div className="flex items-center gap-3">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200"
          >
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.bankCode || 'Conta Corrente'})
              </option>
            ))}
          </select>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".ofx,.OFX"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing || !selectedAccountId}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>{importing ? 'Importando OFX...' : 'Importar Extrato OFX'}</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK DE IMPORTAÇÃO */}
      {importSummary && (
        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            <div className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-bold">Extrato OFX importado com sucesso!</span>{' '}
              {importSummary.totalImported ?? importSummary.importedCount ?? 0} novos lançamentos inseridos,{' '}
              {importSummary.totalSkipped ?? importSummary.duplicatesCount ?? 0} duplicados ignorados.
            </div>
          </div>
          <button
            onClick={() => setImportSummary(null)}
            className="text-xs text-indigo-600 hover:underline font-semibold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* TABS NAVEGAÇÃO */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-4">
        <button
          onClick={() => setActiveTab('entries')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'entries'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Extrato Bancário Importado ({statementEntries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('suggestions')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'suggestions'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Sugestões Automáticas ({suggestions.length})</span>
        </button>
      </div>

      {/* CONTEÚDO TAB 1: LANÇAMENTOS DO EXTRATO */}
      {activeTab === 'entries' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300"
              >
                <option value="">Todos os Lançamentos</option>
                <option value="PENDING">Pendentes de Conciliação</option>
                <option value="MATCHED">Conciliados</option>
                <option value="IGNORED">Ignorados</option>
              </select>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar</span>
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/75 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Data no Extrato</th>
                    <th className="py-3 px-4">FITID (Bancário)</th>
                    <th className="py-3 px-4">Histórico / Descrição OFX</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                        Carregando extrato bancário...
                      </td>
                    </tr>
                  ) : statementEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                        Nenhum lançamento no extrato para esta conta ou filtro. Importe um arquivo OFX para começar.
                      </td>
                    </tr>
                  ) : (
                    statementEntries.map((entry) => {
                      const isNegative = parseFloat(entry.amount) < 0;

                      return (
                        <tr key={entry.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap font-medium">
                            {entry.postedAt?.split('T')[0] || entry.postedAt}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-gray-400">
                            {entry.fitId || 'S/N'}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{entry.memo || entry.payee || 'Lançamento Bancário'}</p>
                            {entry.checkNum && (
                              <p className="text-[10px] text-gray-400">Doc: {entry.checkNum}</p>
                            )}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                            R$ {parseFloat(entry.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                entry.status === 'MATCHED'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : entry.status === 'IGNORED'
                                  ? 'bg-gray-100 text-gray-500'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              }`}
                            >
                              {entry.status === 'MATCHED' ? 'CONCILIADO' : entry.status === 'IGNORED' ? 'IGNORADO' : 'PENDENTE'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {entry.status === 'PENDING' ? (
                              <button
                                onClick={() => setSelectedEntryForManual(entry)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-semibold rounded text-[11px] transition-colors"
                              >
                                Vincular Título
                              </button>
                            ) : entry.status === 'MATCHED' ? (
                              <button
                                onClick={() => handleUnmatch(entry.id)}
                                className="text-gray-400 hover:text-rose-600 text-[11px] transition-colors"
                                title="Desfazer Conciliação"
                              >
                                Desconciliar
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO TAB 2: SUGESTÕES INTELIGENTES */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            O motor de conciliação compara automaticamente os lançamentos do extrato com os lançamentos de caixa e contas pendentes por valor exato e tolerância de dias.
          </p>

          {suggestions.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
              <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nenhuma correspondência automática pendente
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Todos os lançamentos do extrato já estão conciliados ou não coincidem com títulos em aberto.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {suggestions.map((sugg, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        {sugg.type === 'SCHEDULE' ? 'Título em Aberto' : 'Movimentação'}
                      </span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {sugg.description || sugg.targetName}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Extrato OFX: <strong>{sugg.entryMemo}</strong> ({sugg.entryDate}) ➔{' '}
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        R$ {parseFloat(sugg.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleApplySuggestion(sugg)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar Match</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL VINCULAR TÍTULO MANUALMENTE */}
      {selectedEntryForManual && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Vincular Título ao Lançamento
              </h3>
              <button
                onClick={() => setSelectedEntryForManual(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="my-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg text-xs space-y-1">
              <p><strong>Lançamento OFX:</strong> {selectedEntryForManual.memo || selectedEntryForManual.payee}</p>
              <p><strong>Data:</strong> {selectedEntryForManual.postedAt?.split('T')[0]}</p>
              <p><strong>Valor no Extrato:</strong> R$ {parseFloat(selectedEntryForManual.amount).toFixed(2)}</p>
            </div>

            <form onSubmit={handleManualMatchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Selecione o Título em Aberto
                </label>
                <select
                  required
                  value={manualScheduleId}
                  onChange={(e) => setManualScheduleId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                >
                  <option value="">Selecione um título...</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.type === 'PAYABLE' ? 'PAGAR' : 'RECEBER'}] {s.person?.name || 'Avulso'} - R$ {parseFloat(s.originalAmount).toFixed(2)} (Venc: {s.dueDate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setSelectedEntryForManual(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-semibold rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Confirmar Baixa e Conciliação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceReconciliationPage;
