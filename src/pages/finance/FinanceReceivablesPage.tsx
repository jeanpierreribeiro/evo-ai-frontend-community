import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Plus,
  XCircle,
  ShieldAlert,
  Coins,
  FileText,
  Printer,
  Search,
  Sparkles,
} from 'lucide-react';
import { financeService } from '@/services/finance/financeService';
import type {
  Schedule,
  BankAccount,
  PaymentMethod,
  Person,
  ChartOfAccount,
  CostCenter,
  WithholdingInput,
} from '@/services/finance/financeTypes';

export const FinanceReceivablesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Novo Título
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newScheduleForm, setNewScheduleForm] = useState({
    personId: '',
    chartOfAccountId: '',
    costCenterId: '',
    originalAmount: '',
    dueDate: new Date().toISOString().split('T')[0],
    issueDate: new Date().toISOString().split('T')[0],
    documentNumber: '',
    notes: '',
  });

  // Modal Baixa / Recebimento
  const [selectedScheduleForSettle, setSelectedScheduleForSettle] = useState<Schedule | null>(null);
  const [settleForm, setSettleForm] = useState({
    accountId: '',
    paymentMethodId: '',
    paidAt: new Date().toISOString().split('T')[0],
    principalSettled: '',
    discountAmount: '0.00',
    interestAmount: '0.00',
    fineAmount: '0.00',
    hasWithholding: false,
    withholdings: [] as WithholdingInput[],
  });

  // Modal Recibo
  const [receiptData, setReceiptData] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schRes, accRes, paymRes, persRes, coaRes, ccRes] = await Promise.all([
        financeService.listSchedules({
          type: 'RECEIVABLE',
          status: statusFilter || undefined,
          search: searchTerm || undefined,
          pageSize: 50,
        }),
        financeService.listBankAccounts(),
        financeService.listPaymentMethods(),
        financeService.listPersons(),
        financeService.listChartOfAccounts(),
        financeService.listCostCenters(),
      ]);
      setSchedules(schRes.data);
      setBankAccounts(accRes);
      setPaymentMethods(paymRes);
      setPersons(persRes);
      setChartOfAccounts(coaRes);
      setCostCenters(ccRes);
    } catch (err) {
      console.error('Erro ao listar títulos a receber:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeService.createSchedule({
        type: 'RECEIVABLE',
        originalAmount: newScheduleForm.originalAmount,
        dueDate: newScheduleForm.dueDate,
        issueDate: newScheduleForm.issueDate,
        documentNumber: newScheduleForm.documentNumber || undefined,
        notes: newScheduleForm.notes || undefined,
        personId: newScheduleForm.personId || undefined,
        chartOfAccountId: newScheduleForm.chartOfAccountId,
        costCenterId: newScheduleForm.costCenterId || undefined,
      });
      setIsNewModalOpen(false);
      setNewScheduleForm({
        personId: '',
        chartOfAccountId: '',
        costCenterId: '',
        originalAmount: '',
        dueDate: new Date().toISOString().split('T')[0],
        issueDate: new Date().toISOString().split('T')[0],
        documentNumber: '',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      alert(`Erro ao criar título: ${err?.response?.data?.message || err.message}`);
    }
  };

  const openSettleModal = (schedule: Schedule) => {
    setSelectedScheduleForSettle(schedule);
    const remaining = (parseFloat(schedule.originalAmount) - parseFloat(schedule.settledPrincipal)).toFixed(2);
    setSettleForm({
      accountId: bankAccounts[0]?.id || '',
      paymentMethodId: paymentMethods[0]?.id || '',
      paidAt: new Date().toISOString().split('T')[0],
      principalSettled: remaining,
      discountAmount: '0.00',
      interestAmount: '0.00',
      fineAmount: '0.00',
      hasWithholding: false,
      withholdings: [],
    });
  };

  const addWithholdingRow = () => {
    setSettleForm((prev) => ({
      ...prev,
      hasWithholding: true,
      withholdings: [
        ...prev.withholdings,
        {
          taxType: 'IRRF',
          ratePercent: '1.50',
          baseAmount: prev.principalSettled,
          amount: (parseFloat(prev.principalSettled) * 0.015).toFixed(2),
        },
      ],
    }));
  };

  const handleSuggestWithholdings = async () => {
    if (!selectedScheduleForSettle) return;
    try {
      const res = await financeService.suggestTaxRules({
        baseAmount: parseFloat(settleForm.principalSettled) || 0,
        operationType: 'RECEIVABLE',
        personId: selectedScheduleForSettle.person?.id,
        chartOfAccountId: selectedScheduleForSettle.chartOfAccount?.id,
      });

      if (!res.suggestions || res.suggestions.length === 0) {
        alert('Nenhuma retenção tributária aplicável identificada para este cliente/serviço.');
        return;
      }

      const mapped: WithholdingInput[] = res.suggestions.map((s) => ({
        taxType: s.taxType,
        ratePercent: s.ratePercent,
        baseAmount: s.baseAmount,
        amount: s.suggestedAmount,
        suggestedAmount: s.suggestedAmount,
        taxRuleId: s.taxRuleId,
        notes: `Retenção sugerida (${s.revenueCode})`,
      }));

      setSettleForm((prev) => ({
        ...prev,
        hasWithholding: true,
        withholdings: mapped,
      }));
    } catch (err: any) {
      alert(`Erro ao buscar sugestão fiscal: ${err?.response?.data?.message || err.message}`);
    }
  };

  const removeWithholdingRow = (index: number) => {
    setSettleForm((prev) => {
      const updated = prev.withholdings.filter((_, i) => i !== index);
      return {
        ...prev,
        hasWithholding: updated.length > 0,
        withholdings: updated,
      };
    });
  };

  const updateWithholdingRow = (index: number, field: string, val: any) => {
    setSettleForm((prev) => {
      const updated = [...prev.withholdings];
      const row = { ...updated[index], [field]: val };
      if (field === 'baseAmount' || field === 'ratePercent') {
        const base = parseFloat(field === 'baseAmount' ? val : row.baseAmount) || 0;
        const rate = parseFloat(field === 'ratePercent' ? val : row.ratePercent) || 0;
        row.amount = ((base * rate) / 100).toFixed(2);
      }
      updated[index] = row;
      return { ...prev, withholdings: updated };
    });
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleForSettle) return;

    // Validação preventiva FIN-W06
    if (settleForm.hasWithholding) {
      for (const w of settleForm.withholdings) {
        if (
          w.suggestedAmount &&
          parseFloat(w.suggestedAmount).toFixed(2) !== parseFloat(w.amount).toFixed(2) &&
          (!w.divergenceReason || !w.divergenceReason.trim())
        ) {
          alert(`O imposto ${w.taxType} possui valor divergente do sugerido (R$ ${w.suggestedAmount}). É obrigatório informar a justificativa.`);
          return;
        }
      }
    }

    try {
      const payload = {
        accountId: settleForm.accountId,
        paymentMethodId: settleForm.paymentMethodId,
        paidAt: settleForm.paidAt,
        payments: [
          {
            scheduleId: selectedScheduleForSettle.id,
            principalSettled: settleForm.principalSettled,
            discountAmount: settleForm.discountAmount,
            interestAmount: settleForm.interestAmount,
            fineAmount: settleForm.fineAmount,
            withholdings: settleForm.hasWithholding ? settleForm.withholdings : [],
          },
        ],
      };

      const res = await financeService.createSettlement(payload);

      // Gerar recibo para visualização
      const totalAllocated =
        parseFloat(settleForm.principalSettled) +
        parseFloat(settleForm.interestAmount || '0') +
        parseFloat(settleForm.fineAmount || '0') -
        parseFloat(settleForm.discountAmount || '0') -
        totalWithholdingAmount;

      setReceiptData({
        settlementId: res.id,
        receiptNumber: `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: selectedScheduleForSettle.person?.name || 'Cliente Geral',
        documentNumber: selectedScheduleForSettle.documentNumber || 'S/N',
        description: selectedScheduleForSettle.notes || 'Recebimento de Prestação de Serviços / Vendas',
        paidAt: settleForm.paidAt,
        principalSettled: settleForm.principalSettled,
        discountAmount: settleForm.discountAmount,
        interestAmount: settleForm.interestAmount,
        fineAmount: settleForm.fineAmount,
        withholdingAmount: totalWithholdingAmount.toFixed(2),
        totalReceived: totalAllocated.toFixed(2),
        bankAccount: bankAccounts.find((a) => a.id === settleForm.accountId)?.name,
      });

      setSelectedScheduleForSettle(null);
      await loadData();
    } catch (err: any) {
      alert(`Erro na baixa: ${err?.response?.data?.message || err.message}`);
    }
  };

  const handleCancelSchedule = async (schedule: Schedule) => {
    const reason = prompt('Informe o motivo do cancelamento deste título:');
    if (!reason) return;
    try {
      await financeService.cancelSchedule(schedule.id, reason);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao cancelar: ${err?.response?.data?.message || err.message}`);
    }
  };

  const isOverdue = (dueDateStr: string, status: string) => {
    if (status === 'PAID' || status === 'CANCELLED') return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDateStr < today;
  };

  const totalWithholdingAmount = settleForm.withholdings.reduce(
    (sum, w) => sum + (parseFloat(w.amount) || 0),
    0
  );

  const netCashReceived =
    parseFloat(settleForm.principalSettled || '0') +
    parseFloat(settleForm.interestAmount || '0') +
    parseFloat(settleForm.fineAmount || '0') -
    parseFloat(settleForm.discountAmount || '0') -
    totalWithholdingAmount;

  // Totais de resumo
  const totalReceivable = schedules.reduce((sum, s) => sum + parseFloat(s.originalAmount || '0'), 0);
  const totalPending = schedules
    .filter((s) => s.status === 'PENDING' || s.status === 'PARTIALLY_PAID')
    .reduce((sum, s) => sum + (parseFloat(s.originalAmount) - parseFloat(s.settledPrincipal)), 0);
  const totalReceived = schedules.reduce((sum, s) => sum + parseFloat(s.settledPrincipal || '0'), 0);

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            <Coins className="w-4 h-4" />
            <span>Direitos e Receitas</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            Contas a Receber
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Controle de créditos, faturamentos, baixas atômicas com deduções de retenções na fonte (v3.1) e emissão de recibos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Título</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total a Receber (Em Aberto)</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Liquidado (Recebido)</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Volume Total Emitido</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            R$ {totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, documento ou notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-700 dark:text-gray-300"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 rounded-lg"
          >
            Filtrar
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 w-full sm:w-auto"
        >
          <option value="">Todos os Status</option>
          <option value="PENDING">Pendentes / Em Aberto</option>
          <option value="PARTIALLY_PAID">Parcialmente Recebidos</option>
          <option value="PAID">Liquidados (Recebidos)</option>
          <option value="CANCELLED">Cancelados</option>
        </select>
      </div>

      {/* Tabela de Títulos a Receber */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4">Cliente / Descrição</th>
                <th className="py-3 px-4">Plano de Contas</th>
                <th className="py-3 px-4 text-right">Valor Original</th>
                <th className="py-3 px-4 text-right">Saldo a Receber</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                    Carregando contas a receber...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                    Nenhum título a receber encontrado para este filtro.
                  </td>
                </tr>
              ) : (
                schedules.map((item) => {
                  const overdue = isOverdue(item.dueDate, item.status);
                  const remaining = (parseFloat(item.originalAmount) - parseFloat(item.settledPrincipal)).toFixed(2);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{item.dueDate}</div>
                        {overdue && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded mt-0.5">
                            <AlertCircle className="w-3 h-3" /> Em atraso
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{item.person?.name || 'Cliente Avulso'}</p>
                        <p className="text-[11px] text-gray-400 truncate max-w-xs">{item.notes || 'Sem observações'}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {item.chartOfAccount?.code} - {item.chartOfAccount?.name}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        R$ {parseFloat(item.originalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        R$ {parseFloat(remaining).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            item.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.status === 'PARTIALLY_PAID'
                              ? 'bg-blue-50 text-blue-700'
                              : item.status === 'CANCELLED'
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.status !== 'PAID' && item.status !== 'CANCELLED' && (
                            <button
                              onClick={() => openSettleModal(item)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold rounded text-[11px] transition-colors"
                            >
                              Baixar
                            </button>
                          )}
                          {item.status !== 'PAID' && item.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleCancelSchedule(item)}
                              className="px-2 py-1 text-gray-400 hover:text-rose-600 text-[11px] transition-colors"
                              title="Cancelar Título"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVO TÍTULO A RECEBER */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Novo Título a Receber
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Cliente / Sacado
                </label>
                <select
                  value={newScheduleForm.personId}
                  onChange={(e) => setNewScheduleForm({ ...newScheduleForm, personId: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                >
                  <option value="">Selecione um cliente (ou deixe avulso)...</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.documentNumber ? `(${p.documentNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Valor Original (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newScheduleForm.originalAmount}
                    onChange={(e) => setNewScheduleForm({ ...newScheduleForm, originalAmount: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Nº do Documento / NF
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: NF-1042"
                    value={newScheduleForm.documentNumber}
                    onChange={(e) => setNewScheduleForm({ ...newScheduleForm, documentNumber: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Data de Emissão *
                  </label>
                  <input
                    type="date"
                    required
                    value={newScheduleForm.issueDate}
                    onChange={(e) => setNewScheduleForm({ ...newScheduleForm, issueDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={newScheduleForm.dueDate}
                    onChange={(e) => setNewScheduleForm({ ...newScheduleForm, dueDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Plano de Contas *
                  </label>
                  <select
                    required
                    value={newScheduleForm.chartOfAccountId}
                    onChange={(e) => setNewScheduleForm({ ...newScheduleForm, chartOfAccountId: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                  >
                    <option value="">Selecione...</option>
                    {chartOfAccounts
                      .filter((c) => c.type === 'REVENUE')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Centro de Custo
                  </label>
                  <select
                    value={newScheduleForm.costCenterId}
                    onChange={(e) => setNewScheduleForm({ ...newScheduleForm, costCenterId: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                  >
                    <option value="">Nenhum</option>
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.code} - {cc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Descrição / Histórico
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Faturamento Contrato Mensal Ref. 10/2026..."
                  value={newScheduleForm.notes}
                  onChange={(e) => setNewScheduleForm({ ...newScheduleForm, notes: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-semibold rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Salvar Título
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BAIXA / RECEBIMENTO COM RETENÇÃO NA FONTE */}
      {selectedScheduleForSettle && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Baixar / Registrar Recebimento
                </h3>
                <p className="text-xs text-gray-400">
                  Cliente: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedScheduleForSettle.person?.name || 'Avulso'}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedScheduleForSettle(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Conta de Destino (Depósito) *
                  </label>
                  <select
                    required
                    value={settleForm.accountId}
                    onChange={(e) => setSettleForm({ ...settleForm, accountId: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.bankCode || 'Caixa'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Forma de Pagamento *
                  </label>
                  <select
                    required
                    value={settleForm.paymentMethodId}
                    onChange={(e) => setSettleForm({ ...settleForm, paymentMethodId: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                  >
                    {paymentMethods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Data do Crédito *
                  </label>
                  <input
                    type="date"
                    required
                    value={settleForm.paidAt}
                    onChange={(e) => setSettleForm({ ...settleForm, paidAt: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Principal a Amortizar (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={settleForm.principalSettled}
                    onChange={(e) => setSettleForm({ ...settleForm, principalSettled: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 font-bold"
                  />
                </div>
              </div>

              {/* Juros, Multa, Desconto */}
              <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Juros (+) (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settleForm.interestAmount}
                    onChange={(e) => setSettleForm({ ...settleForm, interestAmount: e.target.value })}
                    className="w-full text-xs px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Multa (+) (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settleForm.fineAmount}
                    onChange={(e) => setSettleForm({ ...settleForm, fineAmount: e.target.value })}
                    className="w-full text-xs px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Desconto (-) (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settleForm.discountAmount}
                    onChange={(e) => setSettleForm({ ...settleForm, discountAmount: e.target.value })}
                    className="w-full text-xs px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>

              {/* RETENÇÃO NA FONTE PELO CLIENTE (WITHHOLDING v3.1) */}
              <div className="border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                      Retenção Tributária na Fonte Sofrida (v3.1)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSuggestWithholdings}
                      className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Sugerir Regras
                    </button>
                    <button
                      type="button"
                      onClick={addWithholdingRow}
                      className="text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Manual
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Tributos retidos pelo tomador de serviço. O cliente quita o valor líquido em banco, amortiza 100% da duplicata e o jprOS gera créditos tributários no Ativo (IRRF/CRF/INSS) ou dedução na DRE (ISS).
                </p>

                {settleForm.withholdings.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">Nenhuma retenção aplicada.</p>
                ) : (
                  <div className="space-y-2">
                    {settleForm.withholdings.map((w, idx) => {
                      const hasDivergence =
                        w.suggestedAmount &&
                        parseFloat(w.suggestedAmount).toFixed(2) !== parseFloat(w.amount).toFixed(2);

                      return (
                        <div
                          key={idx}
                          className="p-2.5 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900/60 rounded-lg space-y-1.5"
                        >
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-5">
                              <select
                                value={w.taxType}
                                onChange={(e) => updateWithholdingRow(idx, 'taxType', e.target.value)}
                                className="text-xs w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded"
                              >
                                <option value="IRRF">IRRF (1,5%)</option>
                                <option value="CRF_CONSOLIDADO">CRF Consolidado (4,65%)</option>
                                <option value="ISS_RETIDO">ISS Retido (2% a 5%)</option>
                                <option value="INSS_RETIDO">INSS Retido (11%)</option>
                              </select>
                            </div>
                            <div className="col-span-3">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="%"
                                  value={w.ratePercent}
                                  onChange={(e) => updateWithholdingRow(idx, 'ratePercent', e.target.value)}
                                  className="text-xs w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-mono"
                                />
                                <span className="text-xs text-gray-400">%</span>
                              </div>
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="R$ Valor"
                                value={w.amount}
                                onChange={(e) => updateWithholdingRow(idx, 'amount', e.target.value)}
                                className="text-xs w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-bold text-emerald-600 font-mono"
                              />
                            </div>
                            <div className="col-span-1 text-center">
                              <button
                                type="button"
                                onClick={() => removeWithholdingRow(idx)}
                                className="text-gray-400 hover:text-rose-500 text-xs font-bold"
                              >
                                ×
                              </button>
                            </div>
                          </div>

                          {/* Campo de Justificativa de Divergência FIN-W06 */}
                          {hasDivergence && (
                            <div className="pt-1 border-t border-emerald-100 dark:border-emerald-900/40">
                              <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium mb-1">
                                <AlertCircle className="w-3 h-3" />
                                <span>Valor diverge da alíquota legal sugerida (R$ {w.suggestedAmount}). Justificativa requerida:</span>
                              </div>
                              <input
                                type="text"
                                required
                                placeholder="Ex: Decisão judicial, comprovante de retenção emitido pelo cliente..."
                                value={w.divergenceReason || ''}
                                onChange={(e) => updateWithholdingRow(idx, 'divergenceReason', e.target.value)}
                                className="w-full text-[11px] border border-amber-300 dark:border-amber-800 rounded px-2 py-1 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CARD RESUMO DO CRÉDITO EM CONTA */}
              <div className="p-3 bg-gray-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-gray-400 uppercase font-semibold">Valor Líquido Creditado na Conta</p>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">
                    R$ {netCashReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right text-[11px] text-gray-400">
                  <p>Amortização: R$ {parseFloat(settleForm.principalSettled || '0').toFixed(2)}</p>
                  {totalWithholdingAmount > 0 && (
                    <p className="text-rose-400">(-) Retenção: R$ {totalWithholdingAmount.toFixed(2)}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setSelectedScheduleForSettle(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-semibold rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Confirmar Recebimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RECIBO DE QUITAÇÃO (WINDOW.PRINT) */}
      {receiptData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Comprovante de Quitação / Recibo
                </h3>
              </div>
              <button
                onClick={() => setReceiptData(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div id="printable-receipt" className="p-4 my-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
              <div className="flex justify-between items-start border-b border-gray-200 dark:border-gray-700 pb-2">
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">EMPRESA JPROS LTDA</h4>
                  <p className="text-[10px] text-gray-500">CNPJ: 12.345.678/0001-90</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {receiptData.receiptNumber}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                <p><strong>Recebemos de:</strong> {receiptData.customerName}</p>
                <p><strong>Referência / Doc:</strong> {receiptData.documentNumber}</p>
                <p><strong>Descrição:</strong> {receiptData.description}</p>
                <p><strong>Data de Liquidação:</strong> {receiptData.paidAt}</p>
                <p><strong>Conta Creditada:</strong> {receiptData.bankAccount}</p>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 text-xs">
                <div className="flex justify-between py-0.5">
                  <span>Valor do Principal:</span>
                  <span>R$ {parseFloat(receiptData.principalSettled).toFixed(2)}</span>
                </div>
                {parseFloat(receiptData.withholdingAmount) > 0 && (
                  <div className="flex justify-between py-0.5 text-rose-600">
                    <span>(-) Retenção Tributária na Fonte:</span>
                    <span>R$ {parseFloat(receiptData.withholdingAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 font-bold text-sm border-t border-gray-200 dark:border-gray-700 mt-1">
                  <span>Total Efetivo Recebido:</span>
                  <span className="text-emerald-600">R$ {parseFloat(receiptData.totalReceived).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-semibold rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Recibo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceReceivablesPage;
