import React, { useEffect, useState } from 'react';
import {
  Settings,
  Landmark,
  ListTree,
  FolderTree,
  Shield,
  Plus,
  Lock,
  Building2,
  Percent,
  Scale,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react';
import { financeService } from '@/services/finance/financeService';
import type { BankAccount, ChartOfAccount, CostCenter, TaxRule, Holiday } from '@/services/finance/financeTypes';

export const FinanceSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'chart' | 'costCenters' | 'general' | 'fiscal'>('accounts');

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Modal Nova Conta Bancária
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    name: '',
    bankCode: '001',
    agency: '',
    accountNumber: '',
    initialBalance: '0.00',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, coaRes, ccRes, rulesRes, holRes, setRes] = await Promise.all([
        financeService.listBankAccounts(),
        financeService.listChartOfAccounts(),
        financeService.listCostCenters(),
        financeService.listTaxRules(),
        financeService.listHolidays(2026),
        financeService.getCompanySettings().catch(() => null),
      ]);
      setBankAccounts(accRes);
      setChartOfAccounts(coaRes);
      setCostCenters(ccRes);
      setTaxRules(rulesRes);
      setHolidays(holRes);
      setCompanySettings(setRes);
    } catch (err) {
      console.error('Erro ao carregar configurações financeiras:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaxRegime = async (regime: string) => {
    setSavingSettings(true);
    try {
      const updated = await financeService.updateCompanySettings({ taxRegime: regime });
      setCompanySettings(updated);
      alert('Regime tributário atualizado com sucesso.');
    } catch (err: any) {
      alert(`Erro ao atualizar regime: ${err?.response?.data?.message || err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleWithholdingFlag = async (flag: 'withholdingPayableEnabled' | 'withholdingReceivableEnabled', value: boolean) => {
    setSavingSettings(true);
    try {
      const updated = await financeService.updateCompanySettings({ [flag]: value });
      setCompanySettings(updated);
    } catch (err: any) {
      alert(`Erro ao atualizar configuração: ${err?.response?.data?.message || err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeService.createBankAccount({
        name: newAccountForm.name,
        bankCode: newAccountForm.bankCode,
        agency: newAccountForm.agency || undefined,
        accountNumber: newAccountForm.accountNumber || undefined,
        initialBalance: newAccountForm.initialBalance,
      });
      setIsAccountModalOpen(false);
      setNewAccountForm({
        name: '',
        bankCode: '001',
        agency: '',
        accountNumber: '',
        initialBalance: '0.00',
      });
      await loadData();
    } catch (err: any) {
      alert(`Erro ao criar conta: ${err?.response?.data?.message || err.message}`);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <Settings className="w-4 h-4" />
            <span>Parâmetros & Cadastros Mestres</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            Configurações Financeiras
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Gerenciamento de contas correntes, plano de contas gerencial/DRE, centros de custo e diretrizes fiscais.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'accounts'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Contas Bancárias ({bankAccounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('chart')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'chart'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ListTree className="w-4 h-4" />
          <span>Plano de Contas ({chartOfAccounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('costCenters')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'costCenters'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>Centros de Custo ({costCenters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('general')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'general'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Diretrizes Gerais & Fechamento</span>
        </button>

        <button
          onClick={() => setActiveTab('fiscal')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'fiscal'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Regras Fiscais & Feriados ({taxRules.length})</span>
        </button>
      </div>

      {loading && (
        <div className="p-8 text-center text-xs text-gray-400">Carregando configurações financeiras...</div>
      )}

      {/* TAB 1: CONTAS BANCÁRIAS */}
      {!loading && activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Contas bancárias, carteiras digitais e cofres de caixa operados pela empresa.
            </p>
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Conta Bancária</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {bankAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{acc.name}</h4>
                      <p className="text-[10px] text-gray-400">Banco: {acc.bankCode || 'Caixa Local'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700">
                    Ativa
                  </span>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Agência / Conta:</span>
                    <span className="font-mono text-gray-700 dark:text-gray-300">
                      {acc.agency || '—'} / {acc.accountNumber || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saldo Inicial:</span>
                    <span>R$ {parseFloat(acc.initialBalance || '0').toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-400">Saldo Atual</span>
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                    R$ {parseFloat(acc.currentBalance || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PLANO DE CONTAS */}
      {activeTab === 'chart' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Estrutura hierárquica do plano de contas para classificação gerencial e consolidação automática na DRE.
          </p>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/75 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-[11px] font-semibold text-gray-500 uppercase">
                    <th className="py-2.5 px-4">Código Contábil</th>
                    <th className="py-2.5 px-4">Descrição da Conta</th>
                    <th className="py-2.5 px-4">Natureza / Tipo</th>
                    <th className="py-2.5 px-4">Grupo DRE</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                  {chartOfAccounts.map((coa) => (
                    <tr key={coa.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                      <td className="py-2.5 px-4 font-mono font-bold text-gray-900 dark:text-gray-100">{coa.code}</td>
                      <td className="py-2.5 px-4 font-medium">{coa.name}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          coa.type === 'REVENUE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : coa.type === 'EXPENSE'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {coa.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-gray-600 dark:text-gray-400">
                        {coa.dreGroup || 'NOT_IN_DRE'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="text-[10px] text-emerald-600 font-bold">Ativa</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CENTROS DE CUSTO */}
      {activeTab === 'costCenters' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Unidades departamentais ou projetos para apropriação gerencial de custos e despesas.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {costCenters.map((cc) => (
              <div
                key={cc.id}
                className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex items-center justify-between"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {cc.code}
                  </span>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-2">{cc.name}</h4>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">Ativo</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DIRETRIZES GERAIS & FECHAMENTO */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Política de Fechamento de Período (FIN-05 Closure Guard)
              </h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              O módulo financeiro do jprOS opera com proteção contábil estrita. Lançamentos de caixa, baixas e conciliações
              em períodos com status <strong>CLOSED</strong> são bloqueados no banco de dados e na camada de API para garantir
              a integridade dos balancetes e auditorias fiscais.
            </p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
              <Lock className="w-4 h-4" />
              <span>Apenas administradores podem reabrir períodos contábeis mediante justificativa auditada.</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Regras de Juros e Multa Moratória (FIN-07)
              </h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Configuração dos índices de cálculo automático de encargos moratórios em pagamentos e recebimentos vencidos:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                <span className="font-bold text-gray-700 dark:text-gray-300">Multa Padrão por Atraso:</span>
                <p className="text-gray-500 mt-1">2,00% incidente uma única vez sobre o saldo do principal em mora.</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                <span className="font-bold text-gray-700 dark:text-gray-300">Juros de Mora Diários:</span>
                <p className="text-gray-500 mt-1">1,00% ao mês pro-rata die (0,033% por dia de atraso).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REGRAS FISCAIS & FERIADOS (FIN-W) */}
      {!loading && activeTab === 'fiscal' && (
        <div className="space-y-6">
          {/* Card Regime & Feature Flags */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    Regime Tributário & Parâmetros Fiscais (v3.1)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Determina as regras de tributação na fonte, obrigações acessórias e geração de guias DARF / DAM.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Regime da Empresa:</span>
                <select
                  disabled={savingSettings}
                  value={companySettings?.taxRegime || 'LUCRO_PRESUMIDO'}
                  onChange={(e) => handleUpdateTaxRegime(e.target.value)}
                  className="text-xs font-bold bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="SIMPLES_NACIONAL">Simples Nacional (Dispensada de Retenção Federal)</option>
                  <option value="LUCRO_PRESUMIDO">Lucro Presumido (Retenções Federais Aplicáveis)</option>
                  <option value="LUCRO_REAL">Lucro Real (Retenções Federais Aplicáveis)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                      Retenções no Contas a Pagar (Obrigações de Retenção)
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Ao quitar serviços tomados, deduz impostos na fonte e gera automaticamente títulos agrupados N:1
                    (DARF/DAM) para recolhimento à Receita e Prefeituras.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={savingSettings}
                  checked={companySettings?.withholdingPayableEnabled ?? true}
                  onChange={(e) => handleToggleWithholdingFlag('withholdingPayableEnabled', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                      Retenções no Contas a Receber (Créditos Tributários)
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Ao receber de clientes com retenção sofrida, liquida 100% do principal original e direciona as
                    retenções federais para contas do Ativo Circulante (Impostos a Compensar).
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={savingSettings}
                  checked={companySettings?.withholdingReceivableEnabled ?? true}
                  onChange={(e) => handleToggleWithholdingFlag('withholdingReceivableEnabled', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Tabela de Regras Fiscais */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Tabela de Regras e Alíquotas de Retenção (TaxRule)
                </h4>
                <p className="text-xs text-gray-500">
                  Regras oficiais utilizadas pelo motor fiscal jprOS para sugerir e validar retenções.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 font-semibold rounded-lg">
                {taxRules.length} Regras Ativas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/75 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Tributo</th>
                    <th className="py-3 px-4">Cód. Receita</th>
                    <th className="py-3 px-4">Alíquota Padrão</th>
                    <th className="py-3 px-4">Vencimento Legal</th>
                    <th className="py-3 px-4">Fato Gerador</th>
                    <th className="py-3 px-4">Órgão Arrecadador</th>
                    <th className="py-3 px-4 text-center">Dispensa Mínima</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
                  {taxRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100">
                        {rule.taxType}
                        <div className="text-[10px] font-normal text-gray-400">{rule.description}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {rule.revenueCode}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        {parseFloat(rule.defaultRate).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          Dia {rule.dueDay}
                        </span>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400">
                          {rule.dueAdjust === 'ANTECIPATE' ? 'Antecipa p/ dia útil anterior' : 'Dia útil exato'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[11px]">
                        {rule.factGenerator === 'PAYMENT_DATE' ? (
                          <span className="text-blue-600 font-medium">Data do Pagamento</span>
                        ) : (
                          <span className="text-purple-600 font-medium">Emissão da NF</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {rule.authority}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {parseFloat(rule.minWithholdingAmount || '0') > 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">
                            &le; R$ {parseFloat(rule.minWithholdingAmount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Sem limite</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calendário de Feriados Nacionais */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-rose-500" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Calendário de Feriados Fiscais e Bancários (Ano Base 2026)
                </h4>
              </div>
              <span className="text-xs px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-semibold rounded-lg">
                {holidays.length} Feriados Cadastrados
              </span>
            </div>

            <div className="p-4">
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Feriados nacionais e bancários que impactam o cômputo legal de prazos e antecipam automaticamente
                o vencimento de DARFs e DAMs para o dia útil imediatamente anterior (conforme Lei nº 11.196/2005 e Lei nº 14.759/2023).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{h.description}</div>
                      <div className="text-[10px] text-gray-400 capitalize">{h.type.toLowerCase()}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                        {h.date.split('-').reverse().join('/')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVA CONTA BANCÁRIA */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Nova Conta Bancária
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nome da Conta / Identificação *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Itaú Empresa, Inter PJ, Caixa Físico"
                  value={newAccountForm.name}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Código do Banco
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 341, 001, 077"
                    value={newAccountForm.bankCode}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, bankCode: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Agência
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 1234-5"
                    value={newAccountForm.agency}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, agency: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Número da Conta
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 56789-0"
                    value={newAccountForm.accountNumber}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, accountNumber: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Saldo Inicial (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newAccountForm.initialBalance}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, initialBalance: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-semibold rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Criar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceSettingsPage;
