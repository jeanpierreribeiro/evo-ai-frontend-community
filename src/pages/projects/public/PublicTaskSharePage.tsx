import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Lock,
  Eye,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ExternalLink,
  LogOut,
  Loader2,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { projectsService } from '@/services/projects/projectsService';
import type { TaskPublicDTO } from '@/types/projects';

export const PublicTaskSharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [pin, setPin] = useState('');
  const [submittingPin, setSubmittingPin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [, setSessionToken] = useState<string | null>(null);
  const [taskData, setTaskData] = useState<TaskPublicDTO | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);

  // Submete o PIN para validação e desbloqueio
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const trimmedPin = pin.trim();
    if (trimmedPin.length !== 6 || !/^\d{6}$/.test(trimmedPin)) {
      setError('Por favor, informe exatamente os 6 dígitos numéricos do PIN.');
      return;
    }

    setSubmittingPin(true);
    setError(null);

    try {
      const response = await projectsService.unlockPublicShare(token, trimmedPin);
      setSessionToken(response.sessionToken);
      setIsUnlocked(true);
      setPin(''); // Limpa o PIN da memória imediatamente após desbloqueio (E2.5-c)

      // Carrega os dados do card
      setLoadingCard(true);
      const card = await projectsService.getPublicTaskCard(token, response.sessionToken);
      setTaskData(card);
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 429) {
        const retryAfter = err?.response?.headers?.['retry-after'] || 900;
        const minutes = Math.ceil(retryAfter / 60);
        setError(`Limite de tentativas excedido. O link foi temporariamente bloqueado por ${minutes} minutos por segurança.`);
      } else if (status === 401) {
        const remaining = data?.remainingAttempts;
        setError(
          remaining !== undefined
            ? `PIN incorreto. Você possui mais ${remaining} tentativa(s) antes do bloqueio temporário.`
            : 'PIN de acesso incorreto.'
        );
      } else if (status === 404) {
        setError('Este link de visualização é inválido, expirou ou foi revogado.');
      } else {
        setError('Ocorreu um erro ao validar o acesso. Tente novamente mais tarde.');
      }
    } finally {
      setSubmittingPin(false);
      setLoadingCard(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      await projectsService.logoutPublicShare(token).catch(() => {});
    }
    setIsUnlocked(false);
    setSessionToken(null);
    setTaskData(null);
    setError(null);
  };

  // 1. Tela Inicial Genérica de Autenticação com PIN (Não vaza nenhum dado antes do PIN)
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-100">Visualização de Tarefa</h1>
            <p className="text-sm text-slate-400 mt-2">
              Informe o PIN de acesso de 6 dígitos fornecido pela equipe para desbloquear a visualização.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 text-center">
                PIN DE ACESSO
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full text-center text-2xl tracking-[0.5em] py-3.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                autoFocus
                disabled={submittingPin}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 text-sm font-semibold mt-2"
              disabled={pin.length !== 6 || submittingPin}
            >
              {submittingPin ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verificando...
                </>
              ) : (
                'Desbloquear Conteúdo'
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Ambiente protegido e somente-leitura.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Carregando dados do card
  if (loadingCard || !taskData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">Carregando informações da tarefa...</p>
        </div>
      </div>
    );
  }

  // 2. Tela Desbloqueada: Leitura Estrita e Responsiva do Card
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Barra superior de status e logout */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-5 py-3.5 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {taskData.status || 'Ativa'}
            </span>
            {taskData.priority && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300">
                Prioridade: {taskData.priority}
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-800"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>

        {/* Card Principal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
              {taskData.title}
            </h1>
            <p className="text-xs text-slate-500 mt-2">
              Atualizado em: {new Date(taskData.publicContentUpdatedAt).toLocaleString('pt-BR')}
            </p>
          </div>

          {/* Datas */}
          {(taskData.startDate || taskData.dueDate) && (
            <div className="flex flex-wrap gap-4 pt-2 pb-2 text-xs text-slate-400">
              {taskData.startDate && (
                <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Início: {new Date(taskData.startDate).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              {taskData.dueDate && (
                <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Entrega: {new Date(taskData.dueDate).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
          )}

          {/* Descrição */}
          {taskData.description && (
            <div className="space-y-2 pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Descrição</h2>
              <div className="prose prose-invert prose-sm max-w-none bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 whitespace-pre-wrap leading-relaxed text-slate-300">
                {taskData.description}
              </div>
            </div>
          )}

          {/* Checklist / Subtarefas (Somente-leitura) */}
          {taskData.checklist && taskData.checklist.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Checklist de Entregas ({taskData.checklist.filter((i) => i.completed).length}/{taskData.checklist.length})
              </h2>
              <div className="divide-y divide-slate-800/60 border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
                {taskData.checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        item.completed ? 'text-emerald-400' : 'text-slate-600'
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        item.completed ? 'line-through text-slate-500' : 'text-slate-300'
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recursos Externos Autorizados */}
          {taskData.resources && taskData.resources.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Links e Recursos Compartilhados
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {taskData.resources.map((res) => (
                  <a
                    key={res.id}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all text-xs group"
                  >
                    <span className="font-medium text-slate-200 truncate group-hover:text-blue-400">
                      {res.title}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-2 group-hover:text-blue-400" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé informativo */}
        <p className="text-center text-xs text-slate-600 pt-4">
          Visualização somente-leitura disponibilizada pelo ecossistema jprOS.
        </p>
      </div>
    </div>
  );
};

export default PublicTaskSharePage;
