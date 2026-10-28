import React, { useEffect, useState } from 'react';
import {
  Calendar,
  AlertCircle,
  Plus,
  ShieldAlert,
  Sparkles,
  Layers,
} from 'lucide-react';
import { financeService } from '@/services/finance/financeService';
import type { Schedule, BankAccount, PaymentMethod, WithholdingInput, SettlementPreview } from '@/services/finance/financeTypes';

export const FinancePayablesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro
  const [statusFilter, setStatusFilter] = useState('PENDING');

  // Modal Baixa
  const [selectedScheduleForSettle, setSelectedScheduleForSettle] = useState<Schedule | null>(null);
  const [previewData, setPreviewData] = useState<SettlementPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [schRes, accRes, paymRes] = await Promise.all([
        financeService.listSchedules({
          type: 'PAYABLE',
          status: statusFilter || undefined,
          pageSize: 50,
        }),
        financeService.listBankAccounts(),
        financeService.listPaymentMethods(),
      ]);
      setSchedules(schRes.data);
      setBankAccounts(accRes);
      setPaymentMethods(paymRes);
    } catch (err) {
      console.error('Erro ao listar títulos a pagar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const openSettleModal = (schedule: Schedule) => {
    setSelectedScheduleForSettle(schedule);
    setPreviewData(null);
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

  const handleSuggestWithholdings = async () => {
    if (!selectedScheduleForSettle) return;
    try {
      const res = await financeService.suggestTaxRules({
        baseAmount: parseFloat(settleForm.principalSettled) || 0,
        operationType: 'PAYABLE',
        personId: selectedScheduleForSettle.person?.id,
        chartOfAccountId: selectedScheduleForSettle.chartOfAccount?.id,
      });

      if (!res.suggestions || res.suggestions.length === 0) {
        alert('Nenhuma retenção tributária obrigatória identificada para este fornecedor ou regime.');
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

  const updateWithholdingField = (index: number, field: string, val: any) => {
    setSettleForm((prev) => {
      const updated = [...prev.withholdings];
      const row = { ...updated[index], [field]: val };
      if (field === 'ratePercent') {
        const base = parseFloat(row.baseAmount) || 0;
        const rate = parseFloat(val) || 0;
        row.amount = ((base * rate) / 100).toFixed(2);
      }
      updated[index] = row;
      return { ...prev, withholdings: updated };
    });
  };

  useEffect(() => {
    if (!selectedScheduleForSettle || !settleForm.accountId || !settleForm.paymentMethodId) return;

    const timer = setTimeout(async () => {
      try {
        setLoadingPreview(true);
        const preview = await financeService.previewSettlement({
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
        });
        setPreviewData(preview);
      } catch (err) {
        setPreviewData(null);
      } finally {
        setLoadingPreview(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    selectedScheduleForSettle,
    settleForm.accountId,
    settleForm.paymentMethodId,
    settleForm.paidAt,
    settleForm.principalSettled,
    settleForm.discountAmount,
    settleForm.interestAmount,
    settleForm.fineAmount,
    settleForm.hasWithholding,
    settleForm.withholdings,
  ]);

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

  const removeWithholdingRow = (index: number) => {
    setSettleForm((prev) => {
      const updated = prev.withholdings.filter((_, i) => i !== index);
      return {
        ...prev,
        withholdings: updated,
        hasWithholding: updated.length > 0,
      };
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
      await financeService.createSettlement({
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
      });

      setSelectedScheduleForSettle(null);
      loadData();
      alert('Baixa executada com sucesso! Título amortizado e DARF passivo gerado/agrupado automaticamente.');
    } catch (err: any) {
      alert(`Erro na baixa: ${err?.response?.data?.message || err?.message || 'Falha na validação'}`);
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'PAID' || status === 'CANCELLED') return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  };

  const totalWithholdingAmount = settleForm.withholdings.reduce(
    (acc, w) => acc + (parseFloat(w.amount) || 0),
    0
  );

  const estimatedCashOut =
    parseFloat(settleForm.principalSettled || '0') +
    parseFloat(settleForm.interestAmount || '0') +
    parseFloat(settleForm.fineAmount || '0') -
    parseFloat(settleForm.discountAmount || '0') -
    totalWithholdingAmount;

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            <Calendar className="w-4 h-4" />
            <span>Obrigações e Desembolsos</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            Contas a Pagar
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Gestão de fornecedores, impostos e prestadores com suporte a retenções tributárias na fonte (v3.1).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300"
          >
            <option value="">Todos os Status</option>
            <option value="PENDING">Pendentes / Em Aberto</option>
            <option value="PARTIALLY_PAID">Parcialmente Pagos</option>
            <option value="PAID">Liquidados (Pagos)</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        </div>
      </div>

      {/* Tabela de Títulos a Pagar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4">Fornecedor / Descrição</th>
                <th className="py-3 px-4">Classificação Contábil</th>
                <th className="py-3 px-4 text-right">Valor Original</th>
                <th className="py-3 px-4 text-right">Saldo Devedor</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                    Carregando títulos a pagar...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                    Nenhum título a pagar encontrado para este filtro.
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
                        <p className="font-medium text-gray-900 dark:text-gray-100">{item.person?.name || 'Fornecedor avulso'}</p>
                        <p className="text-[11px] text-gray-400 truncate max-w-xs">{item.notes || 'Sem observações'}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {item.chartOfAccount?.code} - {item.chartOfAccount?.name}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        R$ {parseFloat(item.originalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
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
                        {item.status !== 'PAID' && item.status !== 'CANCELLED' && (
                          <button
                            onClick={() => openSettleModal(item)}
                            className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded shadow-xs transition-colors"
                          >
                            Baixar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Baixa com Retenções (v3.1) */}
      {selectedScheduleForSettle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
              Baixa de Conta a Pagar
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Amortização do título com suporte a tributos retidos na fonte (IRRF / CRF / ISS).
            </p>

            <form onSubmit={handleSettleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Conta de Pagamento</label>
                  <select
                    value={settleForm.accountId}
                    onChange={(e) => setSettleForm({ ...settleForm, accountId: e.target.value })}
                    className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800"
                    required
                  >
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Forma de Pagamento</label>
                  <select
                    value={settleForm.paymentMethodId}
                    onChange={(e) => setSettleForm({ ...settleForm, paymentMethodId: e.target.value })}
                    className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800"
                    required
                  >
                    {paymentMethods.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Data do Pagamento</label>
                  <input
                    type="date"
                    value={settleForm.paidAt}
                    onChange={(e) => setSettleForm({ ...settleForm, paidAt: e.target.value })}
                    className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Principal a Amortizar (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settleForm.principalSettled}
                    onChange={(e) => setSettleForm({ ...settleForm, principalSettled: e.target.value })}
                    className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800 font-bold"
                    required
                  />
                </div>
              </div>

              {/* Seção de Retenções Tributárias na Fonte (FIN-W02 / FIN-W06) */}
              <div className="border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Retenções Tributárias na Fonte (DARF / DAM)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSuggestWithholdings}
                      className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Sugerir Regras Fiscais
                    </button>
                    <button
                      type="button"
                      onClick={addWithholdingRow}
                      className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar Manual
                    </button>
                  </div>
                </div>

                {settleForm.withholdings.length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic">Nenhum imposto retido nesta nota.</p>
                ) : (
                  <div className="space-y-3">
                    {settleForm.withholdings.map((w, index) => {
                      const hasDivergence =
                        w.suggestedAmount &&
                        parseFloat(w.suggestedAmount).toFixed(2) !== parseFloat(w.amount).toFixed(2);

                      return (
                        <div
                          key={index}
                          className="bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900 space-y-2"
                        >
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-5">
                              <select
                                value={w.taxType}
                                onChange={(e) => updateWithholdingField(index, 'taxType', e.target.value)}
                                className="w-full text-[11px] border rounded p-1 bg-gray-50 dark:bg-gray-800"
                              >
                                <option value="IRRF">IRRF (1,5%)</option>
                                <option value="CRF_CONSOLIDADO">CRF Consolidado (4,65%)</option>
                                <option value="ISS_RETIDO">ISS Retido (2% a 5%)</option>
                                <option value="INSS_RETIDO">INSS Retido (11%)</option>
                              </select>
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Alíquota %"
                                value={w.ratePercent}
                                onChange={(e) => updateWithholdingField(index, 'ratePercent', e.target.value)}
                                className="w-full text-[11px] border rounded p-1 font-mono"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Valor R$"
                                value={w.amount}
                                onChange={(e) => updateWithholdingField(index, 'amount', e.target.value)}
                                className="w-full text-[11px] border rounded p-1 font-bold text-amber-700 font-mono"
                              />
                            </div>
                            <div className="col-span-1 text-center">
                              <button
                                type="button"
                                onClick={() => removeWithholdingRow(index)}
                                className="text-rose-500 hover:text-rose-700 font-bold"
                              >
                                ×
                              </button>
                            </div>
                          </div>

                          {/* Campo de Justificativa de Divergência FIN-W06 */}
                          {hasDivergence && (
                            <div className="pt-1 border-t border-amber-100 dark:border-amber-900/40">
                              <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium mb-1">
                                <AlertCircle className="w-3 h-3" />
                                <span>Valor diverge da alíquota legal sugerida (R$ {w.suggestedAmount}). Justificativa requerida:</span>
                              </div>
                              <input
                                type="text"
                                required
                                placeholder="Ex: Liminar judicial, desconto de material, decisão tributária..."
                                value={w.divergenceReason || ''}
                                onChange={(e) => updateWithholdingField(index, 'divergenceReason', e.target.value)}
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

              {/* Prévia de Agrupamento de Guias Tributárias N:1 (FIN-W03) */}
              {previewData?.taxGuidesToGenerate && previewData.taxGuidesToGenerate.length > 0 && (
                <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-indigo-700 dark:text-indigo-400 text-[11px] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Guias Tributárias Agrupadas N:1 (DARF / DAM)</span>
                    </div>
                    {loadingPreview && <span className="text-[10px] lowercase font-normal text-indigo-500">calculando...</span>}
                  </div>
                  <div className="space-y-1.5">
                    {previewData.taxGuidesToGenerate.map((guide: any, gIdx: number) => (
                      <div
                        key={gIdx}
                        className="bg-white dark:bg-gray-900 p-2 rounded border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                guide.action === 'CREATE'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                              }`}
                            >
                              {guide.action === 'CREATE' ? 'CRIAR GUIA' : 'ACUMULAR EM GUIA'}
                            </span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">
                              {guide.revenueCode} ({guide.taxType})
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            Vencimento: <span className="font-semibold text-gray-700 dark:text-gray-300">{guide.dueDate}</span>{' '}
                            {guide.dueAdjustReason && <span className="text-[10px] text-amber-600">({guide.dueAdjustReason})</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                            + R$ {parseFloat(guide.incrementalAmount || guide.amount).toFixed(2)}
                          </span>
                          {guide.action === 'INCREASE' && (
                            <div className="text-[10px] text-gray-400 font-mono">
                              Novo total: R$ {parseFloat(guide.finalAggregatedAmount).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumo do Desembolso Bancário */}
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border flex justify-between items-center text-xs">
                <div>
                  <span className="text-gray-500">Desembolso Efetivo no Banco:</span>
                  <div className="text-[11px] text-gray-400">
                    Principal ({settleForm.principalSettled}) - Retenções ({totalWithholdingAmount.toFixed(2)})
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-rose-600">
                    R$ {estimatedCashOut.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedScheduleForSettle(null)}
                  className="px-4 py-2 text-xs font-medium border rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm"
                >
                  Efetivar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePayablesPage;
