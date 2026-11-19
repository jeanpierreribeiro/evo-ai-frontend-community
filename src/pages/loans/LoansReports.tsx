import { useEffect, useState } from 'react';
import loansApi from '@/services/loans/loansApi';

type FlowMonth = {
  month: string;
  newConcessionsAmount: string;
  agreementsAmount: string;
  principalReceived: string;
  interestReceived: string;
  chargesReceived: string;
  totalReceived: string;
  netCashFlow: string;
};

type StatusItem = {
  status: string;
  count: number;
  totalPrincipal: string;
  totalBalance: string;
};

type Debtor = {
  clientId: string;
  name: string;
  maskedCpf: string;
  openContracts: number;
  principalBalance: string;
  overdueBalance: string;
  maxOverdueDays: number;
};

const statusLabels: Record<string, string> = {
  active: 'Em dia',
  overdue: 'Com atraso',
  loss: 'Em perda',
  settled: 'Quitado',
  renegotiated: 'Renegociado',
  cancelled: 'Cancelado'
};

export default function LoansReports({ walletId }: { walletId: string }) {
  const [flow, setFlow] = useState<FlowMonth[]>([]);
  const [distribution, setDistribution] = useState<StatusItem[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      loansApi.get<{ data: { flow: FlowMonth[] } }>(`/wallets/${walletId}/reports/operational-flow`),
      loansApi.get<{ data: { distribution: StatusItem[] } }>(`/wallets/${walletId}/reports/status-distribution`),
      loansApi.get<{ data: { debtors: Debtor[] } }>(`/wallets/${walletId}/reports/top-debtors`)
    ]).then(([resFlow, resDist, resDebtors]) => {
      if (active) {
        if (Array.isArray(resFlow?.data?.data?.flow)) setFlow(resFlow.data.data.flow);
        if (Array.isArray(resDist?.data?.data?.distribution)) setDistribution(resDist.data.data.distribution);
        if (Array.isArray(resDebtors?.data?.data?.debtors)) setDebtors(resDebtors.data.data.debtors);
      }
    }).catch(() => {
      if (active) setMessage('Não foi possível carregar os relatórios.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [walletId]);

  async function handleExport(type: 'kpis' | 'cashflow' | 'debtors') {
    try {
      const res = await loansApi.get(`/wallets/${walletId}/reports/export`, {
        params: { type, format: 'csv' },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio-${type}-${walletId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setMessage('Falha ao exportar relatório.');
    }
  }

  if (loading) return <div className="p-4 border rounded">Carregando relatórios...</div>;

  return (
    <section className="space-y-6 border rounded p-4" aria-label="Relatórios Operacionais">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Relatórios Operacionais</h2>
          <p className="text-sm text-gray-500">Fluxo de caixa de 6 meses, distribuições e maiores devedores.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void handleExport('kpis')}
            className="border rounded px-3 py-1.5 text-sm hover:bg-gray-50"
            data-testid="export-kpis"
          >
            Exportar KPIs (CSV)
          </button>
          <button
            onClick={() => void handleExport('cashflow')}
            className="border rounded px-3 py-1.5 text-sm hover:bg-gray-50"
            data-testid="export-cashflow"
          >
            Exportar Fluxo (CSV)
          </button>
          <button
            onClick={() => void handleExport('debtors')}
            className="border rounded px-3 py-1.5 text-sm hover:bg-gray-50"
            data-testid="export-debtors"
          >
            Exportar Devedores (CSV)
          </button>
        </div>
      </div>

      {message && <p role="alert" className="text-red-600 text-sm">{message}</p>}

      {/* 6-Month Flow */}
      <div className="space-y-2">
        <h3 className="font-semibold text-base">Fluxo de Caixa Operacional (Últimos 6 meses)</h3>
        <p className="text-xs text-gray-500">
          Nota: Renegociações e acordos não criam desembolsos nem recebimentos fictícios de caixa.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border" aria-label="Tabela de Fluxo de Caixa">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-2 text-left">Mês</th>
                <th className="border p-2 text-right">Novas Concessões</th>
                <th className="border p-2 text-right">Acordos (Novação)</th>
                <th className="border p-2 text-right">Principal Recebido</th>
                <th className="border p-2 text-right">Juros Recebidos</th>
                <th className="border p-2 text-right">Encargos Recebidos</th>
                <th className="border p-2 text-right">Total Recebido</th>
                <th className="border p-2 text-right">Caixa Líquido</th>
              </tr>
            </thead>
            <tbody>
              {flow.map(f => (
                <tr key={f.month} className="hover:bg-gray-50">
                  <td className="border p-2 font-medium">{f.month}</td>
                  <td className="border p-2 text-right text-red-600">-R$ {f.newConcessionsAmount}</td>
                  <td className="border p-2 text-right text-gray-500">R$ {f.agreementsAmount}</td>
                  <td className="border p-2 text-right">R$ {f.principalReceived}</td>
                  <td className="border p-2 text-right">R$ {f.interestReceived}</td>
                  <td className="border p-2 text-right">R$ {f.chargesReceived}</td>
                  <td className="border p-2 text-right font-semibold text-green-700">R$ {f.totalReceived}</td>
                  <td className="border p-2 text-right font-bold">R$ {f.netCashFlow}</td>
                </tr>
              ))}
              {flow.length === 0 && (
                <tr>
                  <td colSpan={8} className="border p-4 text-center text-gray-500">Nenhum dado no período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Distribution & Top Debtors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="space-y-2">
          <h3 className="font-semibold text-base">Distribuição por Situação</h3>
          <table className="w-full text-sm border-collapse border" aria-label="Tabela de Distribuição">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-2 text-left">Situação</th>
                <th className="border p-2 text-center">Contratos</th>
                <th className="border p-2 text-right">Principal Concedido</th>
                <th className="border p-2 text-right">Saldo em Aberto</th>
              </tr>
            </thead>
            <tbody>
              {distribution.map(d => (
                <tr key={d.status} className="hover:bg-gray-50">
                  <td className="border p-2">{statusLabels[d.status] || d.status}</td>
                  <td className="border p-2 text-center">{d.count}</td>
                  <td className="border p-2 text-right">R$ {d.totalPrincipal}</td>
                  <td className="border p-2 text-right font-medium">R$ {d.totalBalance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Debtors */}
        <div className="space-y-2">
          <h3 className="font-semibold text-base">Maiores Devedores (Concentração)</h3>
          <table className="w-full text-sm border-collapse border" aria-label="Tabela de Maiores Devedores">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-2 text-left">Cliente</th>
                <th className="border p-2 text-left">CPF</th>
                <th className="border p-2 text-right">Saldo Devedor</th>
                <th className="border p-2 text-right">Atraso</th>
              </tr>
            </thead>
            <tbody>
              {debtors.map(d => (
                <tr key={d.clientId} className="hover:bg-gray-50">
                  <td className="border p-2 font-medium">{d.name}</td>
                  <td className="border p-2 text-gray-500">{d.maskedCpf}</td>
                  <td className="border p-2 text-right font-semibold">R$ {d.principalBalance}</td>
                  <td className="border p-2 text-right text-amber-700">
                    {d.maxOverdueDays > 0 ? `${d.maxOverdueDays} dias` : 'Em dia'}
                  </td>
                </tr>
              ))}
              {debtors.length === 0 && (
                <tr>
                  <td colSpan={4} className="border p-4 text-center text-gray-500">Nenhum devedor registrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
