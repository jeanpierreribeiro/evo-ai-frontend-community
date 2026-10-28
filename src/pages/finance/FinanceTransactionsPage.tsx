import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Filter,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { financeService } from '@/services/finance/financeService';
import type { Transaction, BankAccount, ChartOfAccount } from '@/services/finance/financeTypes';

export const FinanceTransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [chartAccounts, setChartAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedOperation, setSelectedOperation] = useState<string>('');

  // Modais
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Form states
  const [txForm, setTxForm] = useState({
    operation: 'CREDIT',
    accountId: '',
    amount: '',
    chartOfAccountId: '',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  const [transferForm, setTransferForm] = useState({
    sourceAccountId: '',
    destinationAccountId: '',
    amount: '',
    transferDate: new Date().toISOString().split('T')[0],
    description: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [txRes, accRes, chartRes] = await Promise.all([
        financeService.listTransactions({
          accountId: selectedAccount || undefined,
          operation: selectedOperation || undefined,
          pageSize: 50,
        }),
        financeService.listBankAccounts(),
        financeService.listChartOfAccounts(),
      ]);
      setTransactions(txRes.data);
      setBankAccounts(accRes);
      setChartAccounts(chartRes.filter((c) => c.isAnalytic));
      if (accRes.length > 0 && !txForm.accountId) {
        setTxForm((prev) => ({ ...prev, accountId: accRes[0].id }));
      }
    } catch (err) {
      console.error('Erro ao listar lançamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedAccount, selectedOperation]);

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeService.createTransaction({
        accountId: txForm.accountId,
        operation: txForm.operation,
        grossAmount: txForm.amount,
        feeAmount: '0.00',
        transactionDate: txForm.transactionDate,
        competenceDate: txForm.transactionDate,
        description: txForm.description || 'Lançamento manual avulso',
        lines: [
          {
            chartOfAccountId: txForm.chartOfAccountId || chartAccounts[0]?.id,
            amount: txForm.amount,
            competenceDate: txForm.transactionDate,
          },
        ],
      });
      setIsNewTxModalOpen(false);
      setTxForm((prev) => ({ ...prev, amount: '', description: '' }));
      loadData();
    } catch (err: any) {
      alert(`Erro ao criar transação: ${err?.message || 'Verifique os dados informados'}`);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeService.createTransfer({
        sourceAccountId: transferForm.sourceAccountId,
        destinationAccountId: transferForm.destinationAccountId,
        amount: transferForm.amount,
        transferDate: transferForm.transferDate,
        description: transferForm.description || 'Transferência entre contas',
      });
      setIsTransferModalOpen(false);
      setTransferForm((prev) => ({ ...prev, amount: '', description: '' }));
      loadData();
    } catch (err: any) {
      alert(`Erro ao transferir: ${err?.message || 'Verifique as contas informadas'}`);
    }
  };

  const handleReverseTx = async (txId: string) => {
    const reason = prompt('Informe o motivo do estorno:');
    if (!reason) return;
    try {
      await financeService.reverseTransaction(txId, reason);
      loadData();
    } catch (err: any) {
      alert(`Erro ao estornar: ${err?.message || 'Ação rejeitada'}`);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            <CreditCard className="w-4 h-4" />
            <span>Extrato de Caixa</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            Movimentações Bancárias
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Registro cronológico das entradas, saídas e transferências que impactam o saldo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Transferência</span>
          </button>
          <button
            onClick={() => setIsNewTxModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-900 p-3.5 border border-gray-200 dark:border-gray-800 rounded-xl">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Filter className="w-4 h-4" />
          <span>Filtros:</span>
        </div>

        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none"
        >
          <option value="">Todas as Contas</option>
          {bankAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          value={selectedOperation}
          onChange={(e) => setSelectedOperation(e.target.value)}
          className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none"
        >
          <option value="">Todas as Operações</option>
          <option value="CREDIT">Entradas (Crédito)</option>
          <option value="DEBIT">Saídas (Débito)</option>
        </select>
      </div>

      {/* Tabela de Transações */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Operação</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Conta</th>
                <th className="py-3 px-4 text-right">Bruto</th>
                <th className="py-3 px-4 text-right">Taxa</th>
                <th className="py-3 px-4 text-right">Líquido</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 text-xs">
                    Carregando movimentações...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 text-xs">
                    Nenhuma movimentação encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-gray-600 dark:text-gray-300">
                      {tx.transactionDate}
                    </td>
                    <td className="py-3 px-4">
                      {tx.operation === 'CREDIT' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                          <ArrowUpRight className="w-3 h-3" /> Entrada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                          <ArrowDownRight className="w-3 h-3" /> Saída
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">
                      {tx.description}
                    </td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {tx.bankAccount?.name || 'Conta Padrão'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      R$ {parseFloat(tx.grossAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      R$ {parseFloat(tx.feeAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={tx.operation === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}>
                        {tx.operation === 'CREDIT' ? '+' : '-'} R$ {parseFloat(tx.netAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tx.status === 'CONFIRMED' ? (
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 px-2 py-0.5 rounded font-medium">
                          Confirmado
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 dark:bg-amber-950 text-amber-600 px-2 py-0.5 rounded font-medium">
                          Estornado
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tx.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleReverseTx(tx.id)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 rounded transition-colors"
                          title="Estorno integral"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Lançamento */}
      {isNewTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
              Novo Lançamento de Caixa
            </h3>
            <form onSubmit={handleCreateTx} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, operation: 'CREDIT' })}
                    className={`py-2 text-xs font-semibold rounded-lg border ${
                      txForm.operation === 'CREDIT'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Entrada (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, operation: 'DEBIT' })}
                    className={`py-2 text-xs font-semibold rounded-lg border ${
                      txForm.operation === 'DEBIT'
                        ? 'border-rose-600 bg-rose-50 text-rose-700'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Saída (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Conta Bancária</label>
                <select
                  value={txForm.accountId}
                  onChange={(e) => setTxForm({ ...txForm, accountId: e.target.value })}
                  className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800"
                  required
                >
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800 font-bold"
                  placeholder="0,00"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Descrição</label>
                <input
                  type="text"
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800"
                  placeholder="Ex: Recebimento de consultoria"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewTxModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Transferência */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
              Transferência Entre Contas
            </h3>
            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Conta Origem (Saída)</label>
                <select
                  value={transferForm.sourceAccountId}
                  onChange={(e) => setTransferForm({ ...transferForm, sourceAccountId: e.target.value })}
                  className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800"
                  required
                >
                  <option value="">Selecione...</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Conta Destino (Entrada)</label>
                <select
                  value={transferForm.destinationAccountId}
                  onChange={(e) => setTransferForm({ ...transferForm, destinationAccountId: e.target.value })}
                  className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800"
                  required
                >
                  <option value="">Selecione...</option>
                  {bankAccounts
                    .filter((a) => a.id !== transferForm.sourceAccountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Valor Transferido (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800 font-bold"
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  Transferir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceTransactionsPage;
