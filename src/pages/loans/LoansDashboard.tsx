import { useEffect, useState } from 'react';
import loansApi from '@/services/loans/loansApi';

type OverdueBucket = { amount: string; installmentsCount: number; clientsCount: number };

type Indicators = {
  walletId: string;
  asOfDate: string;
  k1Active: string;
  k1Loss: string;
  k1Total: string;
  k2Receivable30Days: string;
  k3OverdueBuckets: {
    '1-7': OverdueBucket;
    '8-30': OverdueBucket;
    '31-90': OverdueBucket;
    '>90': OverdueBucket;
  };
  k4Par30Ratio: number | null;
  k4Par30Amount: string;
  k5EfficiencyRatio: number | null;
  k5DiscountsGiven: string;
  k6InterestReceivedMonth: string;
  k6PenaltiesReceivedMonth: string;
  k6LateInterestReceivedMonth: string;
  k7ReturnRatio: number | null;
  k8ConcentrationRatio: number | null;
  quality: {
    totalPayments: number;
    estimatedPayments: number;
    hasEstimatedDates: boolean;
    coveragePercent: number;
  };
};

export default function LoansDashboard({ walletId }: { walletId: string }) {
  const [data, setData] = useState<Indicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    loansApi.get<{ data: Indicators }>(`/wallets/${walletId}/indicators`)
      .then(res => {
        if (active && res?.data?.data?.quality && res?.data?.data?.k3OverdueBuckets) {
          setData(res.data.data);
        }
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar os indicadores.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [walletId]);

  if (loading) return <div className="p-4 border rounded">Carregando indicadores...</div>;
  if (error) return <div role="alert" className="p-4 border rounded text-red-600">{error}</div>;
  if (!data || !data.quality || !data.k3OverdueBuckets) return null;

  return (
    <section className="space-y-4 border rounded p-4" aria-label="Painel de Indicadores K1-K8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Indicadores da Carteira (K1 a K8)</h2>
        <span className="text-sm text-gray-500">Posição em: {data.asOfDate}</span>
      </div>

      {data.quality.hasEstimatedDates && (
        <div role="status" className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
          Aviso: Esta carteira possui pagamentos com datas estimadas ({data.quality.estimatedPayments} de {data.quality.totalPayments} registros). Cobertura de dados exatos: {data.quality.coveragePercent}%.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* K1 */}
        <div className="border rounded p-3 bg-white shadow-sm space-y-1">
          <span className="text-xs font-semibold text-gray-500">K1 - Principal em Aberto</span>
          <p className="text-2xl font-bold" data-testid="k1-value">R$ {data.k1Active}</p>
          <p className="text-xs text-gray-500">Saldo em perda segregado: R$ {data.k1Loss}</p>
        </div>

        {/* K2 */}
        <div className="border rounded p-3 bg-white shadow-sm space-y-1">
          <span className="text-xs font-semibold text-gray-500">K2 - A Receber em 30 Dias</span>
          <p className="text-2xl font-bold" data-testid="k2-value">R$ {data.k2Receivable30Days}</p>
          <p className="text-xs text-gray-500">Principal + Juros vincendos</p>
        </div>

        {/* K4 */}
        <div className="border rounded p-3 bg-white shadow-sm space-y-1">
          <span className="text-xs font-semibold text-gray-500">K4 - Carteira em Risco (PAR 30)</span>
          <p className="text-2xl font-bold" data-testid="k4-value">
            {data.k4Par30Ratio !== null ? `${(data.k4Par30Ratio * 100).toFixed(2)}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Saldo com atraso &gt; 30d: R$ {data.k4Par30Amount}</p>
        </div>

        {/* K5 */}
        <div className="border rounded p-3 bg-white shadow-sm space-y-1">
          <span className="text-xs font-semibold text-gray-500">K5 - Efetividade do Mês</span>
          <p className="text-2xl font-bold" data-testid="k5-value">
            {data.k5EfficiencyRatio !== null ? `${(data.k5EfficiencyRatio * 100).toFixed(2)}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Descontos concedidos: R$ {data.k5DiscountsGiven}</p>
        </div>

        {/* K6 */}
        <div className="border rounded p-3 bg-white shadow-sm space-y-1">
          <span className="text-xs font-semibold text-gray-500">K6 - Juros Recebidos no Mês</span>
          <p className="text-2xl font-bold" data-testid="k6-value">R$ {data.k6InterestReceivedMonth}</p>
          <p className="text-xs text-gray-500">Multas: R$ {data.k6PenaltiesReceivedMonth} | Mora: R$ {data.k6LateInterestReceivedMonth}</p>
        </div>

        {/* K7 */}
        <div className="border rounded p-3 bg-white shadow-sm space-y-1">
          <span className="text-xs font-semibold text-gray-500">K7 - Retorno / Principal Médio</span>
          <p className="text-2xl font-bold" data-testid="k7-value">
            {data.k7ReturnRatio !== null ? `${(data.k7ReturnRatio * 100).toFixed(2)}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Retorno bruto observado</p>
        </div>

        {/* K8 */}
        <div className="border rounded p-3 bg-white shadow-sm space-y-1">
          <span className="text-xs font-semibold text-gray-500">K8 - Concentração (Top 10)</span>
          <p className="text-2xl font-bold" data-testid="k8-value">
            {data.k8ConcentrationRatio !== null ? `${(data.k8ConcentrationRatio * 100).toFixed(2)}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Participação dos 10 maiores</p>
        </div>

        {/* Cobertura */}
        <div className="border rounded p-3 bg-white shadow-sm space-y-1">
          <span className="text-xs font-semibold text-gray-500">Qualidade da Base</span>
          <p className="text-2xl font-bold">{data.quality.coveragePercent}%</p>
          <p className="text-xs text-gray-500">Dados auditados e sem estimativa</p>
        </div>
      </div>

      {/* K3 - Faixas de Atraso */}
      <div className="mt-4 border rounded p-3 bg-gray-50 space-y-2">
        <h3 className="font-semibold text-sm">K3 - Vencido por Faixa de Atraso</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="border rounded p-2 bg-white">
            <span className="font-medium text-gray-600">1 a 7 dias:</span>
            <p className="font-bold">R$ {data.k3OverdueBuckets['1-7'].amount}</p>
            <span className="text-xs text-gray-500">{data.k3OverdueBuckets['1-7'].installmentsCount} parc. ({data.k3OverdueBuckets['1-7'].clientsCount} clientes)</span>
          </div>
          <div className="border rounded p-2 bg-white">
            <span className="font-medium text-gray-600">8 a 30 dias:</span>
            <p className="font-bold">R$ {data.k3OverdueBuckets['8-30'].amount}</p>
            <span className="text-xs text-gray-500">{data.k3OverdueBuckets['8-30'].installmentsCount} parc. ({data.k3OverdueBuckets['8-30'].clientsCount} clientes)</span>
          </div>
          <div className="border rounded p-2 bg-white">
            <span className="font-medium text-gray-600">31 a 90 dias:</span>
            <p className="font-bold">R$ {data.k3OverdueBuckets['31-90'].amount}</p>
            <span className="text-xs text-gray-500">{data.k3OverdueBuckets['31-90'].installmentsCount} parc. ({data.k3OverdueBuckets['31-90'].clientsCount} clientes)</span>
          </div>
          <div className="border rounded p-2 bg-white">
            <span className="font-medium text-gray-600">&gt; 90 dias:</span>
            <p className="font-bold">R$ {data.k3OverdueBuckets['>90'].amount}</p>
            <span className="text-xs text-gray-500">{data.k3OverdueBuckets['>90'].installmentsCount} parc. ({data.k3OverdueBuckets['>90'].clientsCount} clientes)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
