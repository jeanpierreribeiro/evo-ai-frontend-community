import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Calendar,
  Building2,
  Plus,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { financeService } from '@/services/finance/financeService';
import type { BankAccount, Schedule, DreReport } from '@/services/finance/financeTypes';

export const FinanceDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [pendingPayables, setPendingPayables] = useState<Schedule[]>([]);
  const [pendingReceivables, setPendingReceivables] = useState<Schedule[]>([]);
  const [dre, setDre] = useState<DreReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

      const [accountsRes, payablesRes, receivablesRes, dreRes] = await Promise.all([
        financeService.listBankAccounts(),
        financeService.listSchedules({ type: 'PAYABLE', status: 'PENDING', pageSize: 5 }),
        financeService.listSchedules({ type: 'RECEIVABLE', status: 'PENDING', pageSize: 5 }),
        financeService.getDre(firstDay, lastDay, 'cash'),
      ]);

      setBankAccounts(accountsRes);
      setPendingPayables(payablesRes.data);
      setPendingReceivables(receivablesRes.data);
      setDre(dreRes);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard financeiro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const totalBankBalance = bankAccounts.reduce(
    (acc, accnt) => acc + (parseFloat(accnt.currentBalance || accnt.openingBalance) || 0),
    0
  );

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            <Wallet className="w-4 h-4" />
            <span>Módulo Financeiro • jprOS Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            Cockpit Financeiro
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Visão consolidada de saldos bancários, obrigações a liquidar, DRE de caixa e previsões.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadDashboardData()}
            className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/finance/reconciliation')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar OFX</span>
          </button>
          <button
            onClick={() => navigate('/finance/transactions')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* 4 Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Consolidado */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Saldo em Contas</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              R$ {totalBankBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {bankAccounts.length} conta(s) bancária(s) ativas
            </p>
          </div>
        </div>

        {/* Entradas do Mês */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Receitas Realizadas (Mês)</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              R$ {parseFloat(dre?.summary?.grossRevenue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Entradas em caixa no período</p>
          </div>
        </div>

        {/* Saídas do Mês */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Despesas Pagas (Mês)</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-rose-600 dark:text-rose-400">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              R$ {parseFloat(dre?.summary?.costs || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Desembolsos efetuados</p>
          </div>
        </div>

        {/* Resultado Operacional */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Resultado de Caixa</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold ${parseFloat(dre?.summary?.netResult || '0') >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              R$ {parseFloat(dre?.summary?.netResult || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Superávit / Déficit operacional</p>
          </div>
        </div>
      </div>

      {/* Contas Bancárias */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Contas Bancárias & Caixas</h2>
          </div>
          <button
            onClick={() => navigate('/finance/settings')}
            className="text-xs text-emerald-600 hover:underline font-medium"
          >
            Gerenciar Contas
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {bankAccounts.map((account) => (
            <div
              key={account.id}
              className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50/50 dark:bg-gray-800/40 flex justify-between items-center"
            >
              <div>
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{account.name}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {account.bankName} {account.accountNumber ? `• C/C ${account.accountNumber}` : ''}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  R$ {parseFloat(account.currentBalance || account.openingBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid de Obrigações Pendentes (A Pagar vs A Receber) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contas a Pagar Próximas */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Contas a Pagar (Próximas)</h2>
            </div>
            <button
              onClick={() => navigate('/finance/payables')}
              className="text-xs text-rose-600 hover:underline font-medium"
            >
              Ver todas ({pendingPayables.length})
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {pendingPayables.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Nenhuma conta pendente para pagamento.</p>
            ) : (
              pendingPayables.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {item.person?.name || item.notes || 'Fornecedor sem identificação'}
                    </p>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      Vencimento: {item.dueDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-600">
                      R$ {parseFloat(item.originalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contas a Receber Próximas */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Contas a Receber (Próximas)</h2>
            </div>
            <button
              onClick={() => navigate('/finance/receivables')}
              className="text-xs text-emerald-600 hover:underline font-medium"
            >
              Ver todas ({pendingReceivables.length})
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {pendingReceivables.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Nenhum título pendente de recebimento.</p>
            ) : (
              pendingReceivables.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {item.person?.name || item.notes || 'Cliente sem identificação'}
                    </p>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      Vencimento: {item.dueDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-600">
                      R$ {parseFloat(item.originalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboardPage;
