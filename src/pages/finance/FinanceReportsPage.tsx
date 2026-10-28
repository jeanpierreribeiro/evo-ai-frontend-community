import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Printer,
  ChevronDown,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import { financeService } from '@/services/finance/financeService';
import type { WithholdingsReport, TaxCreditsReport } from '@/services/finance/financeTypes';

export const FinanceReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dre' | 'aging' | 'projection' | 'withholdings'>('dre');

  // DRE State
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [dreStartDate, setDreStartDate] = useState(firstDay);
  const [dreEndDate, setDreEndDate] = useState(lastDay);
  const [dreMode, setDreMode] = useState<'competence' | 'cash'>('competence');
  const [dreData, setDreData] = useState<any | null>(null);
  const [loadingDre, setLoadingDre] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    revenue: true,
    expenses: true,
  });

  // Aging State
  const [agingType, setAgingType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const [agingData, setAgingData] = useState<any | null>(null);
  const [loadingAging, setLoadingAging] = useState(false);

  // Projection State
  const [projectionDays, setProjectionDays] = useState(30);
  const [projectionData, setProjectionData] = useState<any | null>(null);
  const [loadingProjection, setLoadingProjection] = useState(false);

  // Withholdings State (v3.1)
  const [withholdingsStartDate, setWithholdingsStartDate] = useState(firstDay);
  const [withholdingsEndDate, setWithholdingsEndDate] = useState(lastDay);
  const [withholdingSubTab, setWithholdingSubTab] = useState<'payables' | 'receivables'>('payables');
  const [withholdingsData, setWithholdingsData] = useState<WithholdingsReport | null>(null);
  const [taxCreditsData, setTaxCreditsData] = useState<TaxCreditsReport | null>(null);
  const [loadingWithholdings, setLoadingWithholdings] = useState(false);

  // Load DRE
  const loadDre = async () => {
    setLoadingDre(true);
    try {
      const data = await financeService.getDre(dreStartDate, dreEndDate, dreMode);
      setDreData(data);
    } catch (err) {
      console.error('Erro ao carregar DRE:', err);
    } finally {
      setLoadingDre(false);
    }
  };

  // Load Aging
  const loadAging = async () => {
    setLoadingAging(true);
    try {
      const data = await financeService.getAging(agingType);
      setAgingData(data);
    } catch (err) {
      console.error('Erro ao carregar Aging:', err);
    } finally {
      setLoadingAging(false);
    }
  };

  // Load Projection
  const loadProjection = async () => {
    setLoadingProjection(true);
    try {
      const data = await financeService.getCashProjection(projectionDays);
      setProjectionData(data);
    } catch (err) {
      console.error('Erro ao carregar Projeção:', err);
    } finally {
      setLoadingProjection(false);
    }
  };

  // Load Withholdings (v3.1)
  const loadWithholdings = async () => {
    setLoadingWithholdings(true);
    try {
      const [wRes, cRes] = await Promise.all([
        financeService.getWithholdingsReport({
          startDate: withholdingsStartDate,
          endDate: withholdingsEndDate,
        }),
        financeService.getTaxCreditsReport({
          startDate: withholdingsStartDate,
          endDate: withholdingsEndDate,
        }),
      ]);
      setWithholdingsData(wRes);
      setTaxCreditsData(cRes);
    } catch (err) {
      console.error('Erro ao carregar relatório de retenções:', err);
    } finally {
      setLoadingWithholdings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dre') loadDre();
    if (activeTab === 'aging') loadAging();
    if (activeTab === 'projection') loadProjection();
    if (activeTab === 'withholdings') loadWithholdings();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'dre') loadDre();
  }, [dreStartDate, dreEndDate, dreMode]);

  useEffect(() => {
    if (activeTab === 'aging') loadAging();
  }, [agingType]);

  useEffect(() => {
    if (activeTab === 'projection') loadProjection();
  }, [projectionDays]);

  useEffect(() => {
    if (activeTab === 'withholdings') loadWithholdings();
  }, [withholdingsStartDate, withholdingsEndDate]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const netResultNum = dreData ? parseFloat(dreData.summary.netResult) : 0;
  const grossRevNum = dreData ? parseFloat(dreData.summary.grossRevenue) : 0;
  const netMarginPercent = grossRevNum > 0 ? ((netResultNum / grossRevNum) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" />
            <span>Controladoria & Demonstrações Financeiras</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            DRE & Relatórios Gerenciais
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Demonstração do Resultado do Exercício por regime de competência e caixa, matriz de vencimentos (Aging) e projeção de fluxo de caixa.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg transition-colors self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Exportar PDF</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6">
        <button
          onClick={() => setActiveTab('dre')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'dre'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>DRE Gerencial</span>
        </button>

        <button
          onClick={() => setActiveTab('aging')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'aging'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Aging List (Inadimplência)</span>
        </button>

        <button
          onClick={() => setActiveTab('projection')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'projection'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Projeção de Fluxo de Caixa</span>
        </button>

        <button
          onClick={() => setActiveTab('withholdings')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'withholdings'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Retenções Fiscais & Créditos</span>
        </button>
      </div>

      {/* TAB 1: DRE GERENCIAL */}
      {activeTab === 'dre' && (
        <div className="space-y-6">
          {/* Controles de Filtro DRE */}
          <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">De:</span>
                <input
                  type="date"
                  value={dreStartDate}
                  onChange={(e) => setDreStartDate(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Até:</span>
                <input
                  type="date"
                  value={dreEndDate}
                  onChange={(e) => setDreEndDate(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setDreMode('competence')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  dreMode === 'competence'
                    ? 'bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Competência (Vencimento/NF)
              </button>
              <button
                onClick={() => setDreMode('cash')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  dreMode === 'cash'
                    ? 'bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Regime de Caixa (Realizado)
              </button>
            </div>
          </div>

          {/* Cards Principais de Resultado */}
          {dreData && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                <p className="text-xs text-gray-400 uppercase font-semibold">Receita Líquida</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  R$ {parseFloat(dreData.summary.netRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                <p className="text-xs text-gray-400 uppercase font-semibold">Lucro Bruto</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  R$ {parseFloat(dreData.summary.grossProfit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                <p className="text-xs text-gray-400 uppercase font-semibold">Despesas Operacionais</p>
                <p className="text-xl font-bold text-rose-600 mt-1">
                  R$ {parseFloat(dreData.summary.operatingExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className={`p-4 rounded-xl shadow-sm border ${
                netResultNum >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                    Resultado Líquido
                  </p>
                  <span className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded ${
                    netResultNum >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    Margem {netMarginPercent}%
                  </span>
                </div>
                <p className={`text-2xl font-black mt-1 ${netResultNum >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  R$ {netResultNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}

          {/* ESTRUTURA DRE DETALHADA */}
          {loadingDre ? (
            <div className="p-12 text-center text-xs text-gray-400">Carregando DRE...</div>
          ) : dreData ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50/75 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 font-bold text-xs text-gray-800 dark:text-gray-200 flex justify-between">
                <span>ESTRUTURA CONTÁBIL E GERENCIAL DO RESULTADO</span>
                <span className="uppercase text-[11px] text-gray-400">Regime: {dreData.mode}</span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
                {/* 1. RECEITA BRUTA */}
                <div className="p-3 bg-gray-50/30">
                  <div
                    onClick={() => toggleGroup('revenue')}
                    className="flex justify-between items-center cursor-pointer font-bold text-gray-900 dark:text-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      {expandedGroups.revenue ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <span>1. RECEITA OPERACIONAL BRUTA</span>
                    </div>
                    <span className="text-emerald-600">R$ {parseFloat(dreData.summary.grossRevenue).toFixed(2)}</span>
                  </div>

                  {expandedGroups.revenue && dreData.groups.revenue?.accounts && (
                    <div className="pl-6 pt-2 space-y-1 text-gray-500">
                      {dreData.groups.revenue.accounts.map((acc: any) => (
                        <div key={acc.code} className="flex justify-between pr-2 text-[11px]">
                          <span>{acc.code} - {acc.name}</span>
                          <span>R$ {parseFloat(acc.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. DEDUÇÕES */}
                <div className="p-3">
                  <div className="flex justify-between items-center font-medium text-gray-700 dark:text-gray-300 pl-6">
                    <span>2. (-) DEDUÇÕES E TRIBUTOS SOBRE VENDAS</span>
                    <span className="text-rose-500">(-) R$ {parseFloat(dreData.summary.deductions).toFixed(2)}</span>
                  </div>
                </div>

                {/* 3. RECEITA LÍQUIDA */}
                <div className="p-3 bg-gray-100/50 dark:bg-gray-800/50 font-bold flex justify-between text-gray-900 dark:text-gray-100">
                  <span>3. (=) RECEITA OPERACIONAL LÍQUIDA</span>
                  <span>R$ {parseFloat(dreData.summary.netRevenue).toFixed(2)}</span>
                </div>

                {/* 4. CUSTOS */}
                <div className="p-3">
                  <div className="flex justify-between items-center font-medium text-gray-700 dark:text-gray-300 pl-6">
                    <span>4. (-) CUSTOS DOS SERVIÇOS / PRODUTOS VENDIDOS</span>
                    <span className="text-rose-500">(-) R$ {parseFloat(dreData.summary.costs).toFixed(2)}</span>
                  </div>
                </div>

                {/* 5. LUCRO BRUTO */}
                <div className="p-3 bg-gray-100/50 dark:bg-gray-800/50 font-bold flex justify-between text-gray-900 dark:text-gray-100">
                  <span>5. (=) LUCRO BRUTO</span>
                  <span className={parseFloat(dreData.summary.grossProfit) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    R$ {parseFloat(dreData.summary.grossProfit).toFixed(2)}
                  </span>
                </div>

                {/* 6. DESPESAS OPERACIONAIS */}
                <div className="p-3 bg-gray-50/30">
                  <div
                    onClick={() => toggleGroup('expenses')}
                    className="flex justify-between items-center cursor-pointer font-bold text-gray-900 dark:text-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      {expandedGroups.expenses ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <span>6. (-) DESPESAS OPERACIONAIS (ADM, COMERCIAIS E GERAIS)</span>
                    </div>
                    <span className="text-rose-600">(-) R$ {parseFloat(dreData.summary.operatingExpenses).toFixed(2)}</span>
                  </div>

                  {expandedGroups.expenses && dreData.groups.expenses?.accounts && (
                    <div className="pl-6 pt-2 space-y-1 text-gray-500">
                      {dreData.groups.expenses.accounts.map((acc: any) => (
                        <div key={acc.code} className="flex justify-between pr-2 text-[11px]">
                          <span>{acc.code} - {acc.name}</span>
                          <span>R$ {parseFloat(acc.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 7. RESULTADO OPERACIONAL */}
                <div className="p-3 bg-gray-100/50 dark:bg-gray-800/50 font-bold flex justify-between text-gray-900 dark:text-gray-100">
                  <span>7. (=) RESULTADO OPERACIONAL (EBITDA / EBIT)</span>
                  <span>R$ {parseFloat(dreData.summary.operatingResult).toFixed(2)}</span>
                </div>

                {/* 8. RESULTADO FINANCEIRO */}
                <div className="p-3 pl-6 flex justify-between text-gray-700 dark:text-gray-300">
                  <span>8. (+/-) RESULTADO FINANCEIRO LÍQUIDO</span>
                  <span>R$ {parseFloat(dreData.summary.netFinancial).toFixed(2)}</span>
                </div>

                {/* 9. TRIBUTOS SOBRE O LUCRO */}
                <div className="p-3 pl-6 flex justify-between text-gray-700 dark:text-gray-300">
                  <span>9. (-) TRIBUTOS E PROVISÕES</span>
                  <span className="text-rose-500">(-) R$ {parseFloat(dreData.summary.taxes).toFixed(2)}</span>
                </div>

                {/* 10. RESULTADO LÍQUIDO FINAL */}
                <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 font-black text-sm flex justify-between items-center text-purple-900 dark:text-purple-200">
                  <span className="uppercase tracking-wider">10. (=) RESULTADO LÍQUIDO DO EXERCÍCIO</span>
                  <span className={netResultNum >= 0 ? 'text-emerald-600 text-lg' : 'text-rose-600 text-lg'}>
                    R$ {netResultNum.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 2: AGING LIST */}
      {activeTab === 'aging' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Tipo de Título:</span>
              <select
                value={agingType}
                onChange={(e) => setAgingType(e.target.value as any)}
                className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300"
              >
                <option value="RECEIVABLE">Contas a Receber (Clientes)</option>
                <option value="PAYABLE">Contas a Pagar (Fornecedores)</option>
              </select>
            </div>
          </div>

          {loadingAging ? (
            <div className="p-12 text-center text-xs text-gray-400">Carregando Aging...</div>
          ) : agingData ? (
            <div className="space-y-6">
              {/* Cards das Faixas de Atraso */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800/40 rounded-xl shadow-sm">
                  <p className="text-[11px] font-bold text-emerald-600 uppercase">A Vencer (Em Dia)</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                    R$ {parseFloat(agingData.buckets.current?.total || '0').toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{agingData.buckets.current?.count || 0} títulos</p>
                </div>

                <div className="p-3 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800/40 rounded-xl shadow-sm">
                  <p className="text-[11px] font-bold text-amber-600 uppercase">1 a 30 dias</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                    R$ {parseFloat(agingData.buckets.days1To30?.total || '0').toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{agingData.buckets.days1To30?.count || 0} títulos</p>
                </div>

                <div className="p-3 bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800/40 rounded-xl shadow-sm">
                  <p className="text-[11px] font-bold text-orange-600 uppercase">31 a 60 dias</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                    R$ {parseFloat(agingData.buckets.days31To60?.total || '0').toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{agingData.buckets.days31To60?.count || 0} títulos</p>
                </div>

                <div className="p-3 bg-white dark:bg-gray-900 border border-rose-200 dark:border-rose-800/40 rounded-xl shadow-sm">
                  <p className="text-[11px] font-bold text-rose-600 uppercase">61 a 90 dias</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                    R$ {parseFloat(agingData.buckets.days61To90?.total || '0').toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{agingData.buckets.days61To90?.count || 0} títulos</p>
                </div>

                <div className="p-3 bg-white dark:bg-gray-900 border border-red-300 dark:border-red-900/60 rounded-xl shadow-sm">
                  <p className="text-[11px] font-bold text-red-700 uppercase">&gt; 90 dias (Crítico)</p>
                  <p className="text-lg font-bold text-red-600 mt-1">
                    R$ {parseFloat(agingData.buckets.over90Days?.total || '0').toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{agingData.buckets.over90Days?.count || 0} títulos</p>
                </div>
              </div>

              {/* Tabela de Títulos Atrasados */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-3.5 bg-gray-50/75 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 font-bold text-xs text-gray-700 dark:text-gray-300">
                  LISTAGEM ANALÍTICA DE INADIMPLÊNCIA / TÍTULOS VENCIDOS
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-200 dark:border-gray-800 text-[11px] font-semibold text-gray-500 uppercase">
                        <th className="py-2.5 px-4">Faixa</th>
                        <th className="py-2.5 px-4">Vencimento</th>
                        <th className="py-2.5 px-4">Pessoa / Razão Social</th>
                        <th className="py-2.5 px-4">Dias de Atraso</th>
                        <th className="py-2.5 px-4 text-right">Saldo em Aberto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                      {['days1To30', 'days31To60', 'days61To90', 'over90Days'].flatMap((bKey) =>
                        (agingData.buckets[bKey]?.items || []).map((item: any) => (
                          <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                            <td className="py-2.5 px-4 font-bold text-[11px] text-rose-600">
                              {agingData.buckets[bKey].label}
                            </td>
                            <td className="py-2.5 px-4">{item.dueDate}</td>
                            <td className="py-2.5 px-4 font-medium">{item.person?.name || 'Não informado'}</td>
                            <td className="py-2.5 px-4 font-mono text-gray-500">{item.daysLate} dias</td>
                            <td className="py-2.5 px-4 text-right font-bold text-gray-900 dark:text-gray-100">
                              R$ {parseFloat(item.remainingAmount || item.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 3: PROJEÇÃO DE FLUXO DE CAIXA */}
      {activeTab === 'projection' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Horizonte de Projeção:</span>
              <select
                value={projectionDays}
                onChange={(e) => setProjectionDays(Number(e.target.value))}
                className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300"
              >
                <option value={15}>15 dias</option>
                <option value={30}>30 dias</option>
                <option value={60}>60 dias</option>
                <option value={90}>90 dias</option>
              </select>
            </div>
          </div>

          {loadingProjection ? (
            <div className="p-12 text-center text-xs text-gray-400">Calculando projeção de fluxo...</div>
          ) : projectionData ? (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                  <p className="text-xs text-gray-400 font-semibold uppercase">Saldo Real Atual Consolidado</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">
                    R$ {parseFloat(projectionData.initialRealBalance || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                  <p className="text-xs text-gray-400 font-semibold uppercase">Saldo Final Projetado ({projectionDays} dias)</p>
                  <p className={`text-2xl font-black mt-1 ${
                    parseFloat(projectionData.finalProjectedBalance) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    R$ {parseFloat(projectionData.finalProjectedBalance || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Tabela de Evolução Diária */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-3.5 bg-gray-50/75 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 font-bold text-xs text-gray-700 dark:text-gray-300">
                  EVOLUÇÃO CRONOLÓGICA DIÁRIA DO CAIXA
                </div>
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white dark:bg-gray-900">
                      <tr className="bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-200 dark:border-gray-800 text-[11px] font-semibold text-gray-500 uppercase">
                        <th className="py-2.5 px-4">Data</th>
                        <th className="py-2.5 px-4 text-right">Entradas Previstas (+)</th>
                        <th className="py-2.5 px-4 text-right">Saídas Previstas (-)</th>
                        <th className="py-2.5 px-4 text-right">Líquido do Dia</th>
                        <th className="py-2.5 px-4 text-right">Saldo Acumulado Projetado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                      {projectionData.days.map((day: any) => {
                        const netNum = parseFloat(day.netDay);
                        const balNum = parseFloat(day.projectedBalance);

                        return (
                          <tr key={day.date} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                            <td className="py-2.5 px-4 font-medium">{day.date}</td>
                            <td className="py-2.5 px-4 text-right text-emerald-600 font-medium">
                              R$ {parseFloat(day.expectedInflow).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-right text-rose-600 font-medium">
                              R$ {parseFloat(day.expectedOutflow).toFixed(2)}
                            </td>
                            <td className={`py-2.5 px-4 text-right font-semibold ${netNum >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              R$ {netNum.toFixed(2)}
                            </td>
                            <td className={`py-2.5 px-4 text-right font-black ${balNum >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-rose-600'}`}>
                              R$ {balNum.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 4: RETENÇÕES FISCAIS & CRÉDITOS TRIBUTÁRIOS (v3.1) */}
      {activeTab === 'withholdings' && (
        <div className="space-y-6">
          {/* Controles de Filtro */}
          <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">De:</span>
                <input
                  type="date"
                  value={withholdingsStartDate}
                  onChange={(e) => setWithholdingsStartDate(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Até:</span>
                <input
                  type="date"
                  value={withholdingsEndDate}
                  onChange={(e) => setWithholdingsEndDate(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setWithholdingSubTab('payables')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  withholdingSubTab === 'payables'
                    ? 'bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Retenções Efetuadas (Passivo a Recolher)
              </button>
              <button
                onClick={() => setWithholdingSubTab('receivables')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  withholdingSubTab === 'receivables'
                    ? 'bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Créditos Tributários Sofridos (Ativo a Compensar)
              </button>
            </div>
          </div>

          {loadingWithholdings ? (
            <div className="p-8 text-center text-xs text-gray-400">
              Carregando relatório fiscal de retenções e créditos tributários...
            </div>
          ) : withholdingSubTab === 'payables' ? (
            <div className="space-y-6">
              {/* KPIs de Retenções Efetuadas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Total Retido a Recolher
                  </span>
                  <p className="text-xl font-black text-rose-600 mt-1 font-mono">
                    R$ {parseFloat(withholdingsData?.totals.totalWithheld || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {['IRRF', 'CRF_CONSOLIDADO', 'INSS_RETIDO', 'ISS_RETIDO'].map((t) => (
                  <div key={t} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      {t}
                    </span>
                    <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-1 font-mono">
                      R$ {parseFloat(withholdingsData?.totals.byTaxType?.[t] || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>

              {/* Tabela de Retenções no Contas a Pagar */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-3.5 bg-gray-50/75 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between font-bold text-xs text-gray-700 dark:text-gray-300">
                  <span>RETENÇÕES NA FONTE EM PAGAMENTOS A FORNECEDORES</span>
                  <span className="text-[11px] font-normal text-gray-400">
                    {withholdingsData?.items.length || 0} lançamentos
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-200 dark:border-gray-800 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="py-2.5 px-4">Data Baixa</th>
                        <th className="py-2.5 px-4">Fornecedor / Favorecido</th>
                        <th className="py-2.5 px-4">Nº Doc/NF</th>
                        <th className="py-2.5 px-4">Tributo</th>
                        <th className="py-2.5 px-4 text-right">Alíquota</th>
                        <th className="py-2.5 px-4 text-right">Base de Cálculo</th>
                        <th className="py-2.5 px-4 text-right">Valor Retido</th>
                        <th className="py-2.5 px-4">Guia DARF / DAM Gerada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                      {!withholdingsData?.items || withholdingsData.items.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-400 text-xs">
                            Nenhuma retenção fiscal registrada para o período selecionado.
                          </td>
                        </tr>
                      ) : (
                        withholdingsData.items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                            <td className="py-2.5 px-4 whitespace-nowrap font-mono">{item.settlementDate}</td>
                            <td className="py-2.5 px-4 font-medium text-gray-900 dark:text-gray-100">
                              {item.counterpartyName}
                              {item.divergenceReason && (
                                <div className="text-[10px] text-amber-600 mt-0.5">
                                  Justificativa: {item.divergenceReason}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-gray-500 font-mono">{item.documentNumber || '—'}</td>
                            <td className="py-2.5 px-4 font-semibold text-purple-600 dark:text-purple-400">
                              {item.taxType}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">{parseFloat(item.ratePercent).toFixed(2)}%</td>
                            <td className="py-2.5 px-4 text-right font-mono">
                              R$ {parseFloat(item.baseAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-rose-600 font-mono">
                              R$ {parseFloat(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4">
                              {item.taxGuide ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                                    Venc. {item.taxGuide.dueDate}
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                    item.taxGuide.status === 'PAID'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {item.taxGuide.status === 'PAID' ? 'Paga' : 'A Vencer'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-400">Sem guia</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* KPIs de Créditos Tributários Sofridos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Total de Créditos Tributários
                  </span>
                  <p className="text-xl font-black text-emerald-600 mt-1 font-mono">
                    R$ {parseFloat(taxCreditsData?.totals.totalCredits || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {['IRRF', 'CRF_CONSOLIDADO', 'INSS_RETIDO', 'ISS_RETIDO'].map((t) => (
                  <div key={t} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      {t}
                    </span>
                    <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-1 font-mono">
                      R$ {parseFloat(taxCreditsData?.totals.byTaxType?.[t] || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>

              {/* Tabela de Créditos Tributários do Ativo */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-3.5 bg-gray-50/75 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between font-bold text-xs text-gray-700 dark:text-gray-300">
                  <span>CRÉDITOS TRIBUTÁRIOS A COMPENSAR (ATIVO CIRCULANTE)</span>
                  <span className="text-[11px] font-normal text-gray-400">
                    {taxCreditsData?.items.length || 0} lançamentos
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-200 dark:border-gray-800 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="py-2.5 px-4">Data Recebimento</th>
                        <th className="py-2.5 px-4">Cliente / Tomador</th>
                        <th className="py-2.5 px-4">Nº Doc/NF</th>
                        <th className="py-2.5 px-4">Tributo Retido</th>
                        <th className="py-2.5 px-4 text-right">Alíquota</th>
                        <th className="py-2.5 px-4 text-right">Base de Cálculo</th>
                        <th className="py-2.5 px-4 text-right">Crédito Gerado (Ativo)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                      {!taxCreditsData?.items || taxCreditsData.items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                            Nenhum crédito tributário registrado para o período selecionado.
                          </td>
                        </tr>
                      ) : (
                        taxCreditsData.items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                            <td className="py-2.5 px-4 whitespace-nowrap font-mono">{item.settlementDate}</td>
                            <td className="py-2.5 px-4 font-medium text-gray-900 dark:text-gray-100">
                              {item.customerName}
                              {item.divergenceReason && (
                                <div className="text-[10px] text-amber-600 mt-0.5">
                                  Justificativa: {item.divergenceReason}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-gray-500 font-mono">{item.documentNumber || '—'}</td>
                            <td className="py-2.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                              {item.taxType}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">{parseFloat(item.ratePercent).toFixed(2)}%</td>
                            <td className="py-2.5 px-4 text-right font-mono">
                              R$ {parseFloat(item.baseAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-emerald-600 font-mono">
                              R$ {parseFloat(item.creditAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinanceReportsPage;
