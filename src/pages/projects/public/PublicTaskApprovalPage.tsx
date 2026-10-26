import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ExternalLink,
  MessageSquare,
  CheckSquare,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { projectsService } from '@/services/projects/projectsService';
import type { ApprovalStatus } from '@/types/projects';

export const PublicTaskApprovalPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [preview, setPreview] = useState<any | null>(null);
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [details, setDetails] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [submittingPin, setSubmittingPin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Actions
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    projectsService
      .getPublicTaskPreview(token)
      .then((data) => {
        setPreview(data);
        // Check if pin is passed in URL query e.g. ?pin=1234
        const searchParams = new URLSearchParams(window.location.search);
        const urlPin = searchParams.get('pin');
        if (urlPin) {
          setPin(urlPin);
          handleValidatePin(urlPin);
        }
      })
      .catch((err) => setError(err?.response?.data?.error || 'Link de validação inválido ou expirado.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleValidatePin = async (pinToValidate?: string) => {
    const code = (pinToValidate || pin).trim();
    if (!token || code.length < 4) {
      setError('Por favor, informe o PIN de 4 dígitos.');
      return;
    }

    setSubmittingPin(true);
    setError(null);
    try {
      const data = await projectsService.validateTaskPin(token, code);
      setDetails(data);
      setIsUnlocked(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Código PIN incorreto.');
    } finally {
      setSubmittingPin(false);
    }
  };

  const handleApprove = async () => {
    if (!token || !pin) return;
    setActionLoading(true);
    setError(null);
    try {
      await projectsService.approveDelivery(token, pin);
      setDetails((prev: any) => ({
        ...prev,
        approvalStatus: 'APPROVED' as ApprovalStatus,
        approvedAt: new Date().toISOString(),
      }));
      setActionSuccess('Parabéns! Sua entrega foi aprovada com sucesso.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao registrar aprovação.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !pin || !feedback.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await projectsService.requestChanges(token, pin, feedback.trim());
      setDetails((prev: any) => ({
        ...prev,
        approvalStatus: 'CHANGES_REQUESTED' as ApprovalStatus,
        approvalFeedback: feedback.trim(),
      }));
      setIsRequestingChanges(false);
      setActionSuccess('Sua solicitação de ajustes foi enviada à equipe.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao solicitar ajustes.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-sm text-slate-500 animate-pulse">Carregando portal de validação...</div>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Acesso Não Disponível</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
              {preview?.workspace?.name?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {preview?.workspace?.name || 'Portal de Entrega'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {preview?.project?.name} • Tarefa #{preview?.taskNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
            <ShieldCheck className="w-4 h-4" />
            <span>Validação Segura</span>
          </div>
        </div>

        {/* PIN Screen */}
        {!isUnlocked ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Digite o Código PIN
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Para visualizar os detalhes desta entrega, insira o código de 4 dígitos informado pelo seu atendente.
              </p>
            </div>

            {error && (
              <div className="p-3 text-xs text-red-500 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg">
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleValidatePin();
              }}
              className="space-y-4 max-w-xs mx-auto"
            >
              <input
                type="text"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="w-full text-center text-3xl font-mono font-bold tracking-widest py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />

              <Button
                type="submit"
                disabled={submittingPin || pin.length < 4}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold"
              >
                <span>{submittingPin ? 'Verificando...' : 'Acessar Entrega'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </div>
        ) : (
          /* Unlocked Delivery Details Screen */
          <div className="p-6 space-y-6">
            {/* Status Notifications */}
            {details?.approvalStatus === 'APPROVED' && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-sm">Entrega Aprovada!</p>
                  <p className="opacity-90">
                    Obrigado! A equipe já foi notificada da sua validação.
                  </p>
                </div>
              </div>
            )}

            {details?.approvalStatus === 'CHANGES_REQUESTED' && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">Ajustes Solicitados à Equipe</p>
                  <p className="mt-0.5 opacity-90">
                    Seu feedback: "{details.approvalFeedback}"
                  </p>
                </div>
              </div>
            )}

            {actionSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-600 font-medium">
                {actionSuccess}
              </div>
            )}

            {/* Delivery Title & Description */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Resumo da Demanda
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                {details?.title}
              </h2>
              {details?.description ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {details.description}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Sem descrição adicional informada.</p>
              )}
            </div>

            {/* Checklist Completed Items */}
            {details?.subtasks && details.subtasks.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <span>Itens Realizados ({details.subtasks.filter((s: any) => s.completed).length}/{details.subtasks.length})</span>
                </h4>
                <div className="space-y-1.5">
                  {details.subtasks.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40"
                    >
                      <CheckCircle2
                        className={`w-4 h-4 ${sub.completed ? 'text-emerald-500' : 'text-slate-300'}`}
                      />
                      <span className={sub.completed ? 'line-through opacity-80' : ''}>
                        {sub.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources & Deliverables */}
            {details?.resources && details.resources.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Anexos e Entregáveis</span>
                </h4>
                <div className="space-y-1.5">
                  {details.resources.map((res: any) => (
                    <a
                      key={res.id}
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors text-xs text-primary font-medium group"
                    >
                      <span className="truncate">{res.title}</span>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Client Action Buttons */}
            {details?.approvalStatus !== 'APPROVED' && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                {!isRequestingChanges ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="w-full sm:flex-1 py-3 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{actionLoading ? 'Processando...' : 'Aprovar Entrega'}</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setIsRequestingChanges(true)}
                      disabled={actionLoading}
                      className="w-full sm:flex-1 py-3 text-sm font-medium border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Solicitar Ajustes</span>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleRequestChanges} className="space-y-3 p-4 border border-amber-500/30 bg-amber-500/5 rounded-xl">
                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      O que precisa ser corrigido ou ajustado?
                    </h4>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={3}
                      placeholder="Descreva com detalhes o que gostaria que fosse alterado..."
                      className="w-full p-3 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsRequestingChanges(false)}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={actionLoading || !feedback.trim()}
                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {actionLoading ? 'Enviando...' : 'Enviar Solicitação de Ajustes'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-slate-400 dark:text-slate-600 mt-6">
        jprOS • Plataforma Segura de Gestão e Validação de Entregas
      </div>
    </div>
  );
};

export default PublicTaskApprovalPage;
