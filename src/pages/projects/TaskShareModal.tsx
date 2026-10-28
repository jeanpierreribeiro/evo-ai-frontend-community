import React, { useState, useEffect } from 'react';
import {
  Share2,
  Lock,
  Copy,
  Check,
  AlertCircle,
  Eye,
  ShieldAlert,
  Loader2,
  X,
  Paperclip,
  Tag,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { projectsService } from '@/services/projects/projectsService';
import type { Task, ShareManagementDTO, ShareIssuedDTO, TaskPublicDTO, Attachment, TaskCustomFieldValue } from '@/types/projects';

interface TaskShareModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export const TaskShareModal: React.FC<TaskShareModalProps> = ({
  task,
  isOpen,
  onClose,
  currentUserRole = 'MEMBER',
}) => {
  const isViewer = currentUserRole === 'VIEWER';

  // Configurações do novo link
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [showDescription, setShowDescription] = useState(true);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showResources, setShowResources] = useState(true);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>(
    task.resources?.map((r) => r.id) || []
  );

  // Anexos (E3.7)
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttachments, setShowAttachments] = useState(true);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);

  // Campos Personalizados (E3.8)
  const [customFields, setCustomFields] = useState<TaskCustomFieldValue[]>([]);
  const [showCustomFields, setShowCustomFields] = useState(true);
  const [selectedCustomFieldIds, setSelectedCustomFieldIds] = useState<string[]>([]);

  // Estados de emissão
  const [isGenerating, setIsGenerating] = useState(false);
  const [issuedShare, setIssuedShare] = useState<ShareIssuedDTO | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Lista de links existentes
  const [sharesList, setSharesList] = useState<ShareManagementDTO[]>([]);
  const [, setLoadingList] = useState(false);

  // Prévia
  const [preview, setPreview] = useState<TaskPublicDTO | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSharesList();
      loadAttachmentsAndFields();
      setIssuedShare(null);
      setError(null);
    }
  }, [isOpen, task.id]);

  const loadAttachmentsAndFields = async () => {
    try {
      // Busca anexos
      const atts: Attachment[] = await projectsService.listTaskAttachments(task.id);
      // Filtra apenas anexos que não sejam de comentários (invariante: comentários são sempre internos)
      const validAtts = (atts || []).filter((a) => !a.commentId);
      setAttachments(validAtts);
      setSelectedAttachmentIds(validAtts.map((a) => a.id));

      // Busca campos personalizados
      const fields: TaskCustomFieldValue[] = await projectsService.getTaskCustomFieldValues(task.id);
      // Filtra apenas campos elegíveis para exibição pública
      const eligibleFields = (fields || []).filter((f) => f.isPublicEligible);
      setCustomFields(eligibleFields);
      setSelectedCustomFieldIds(eligibleFields.map((f) => f.fieldId));
    } catch (err) {
      console.error('Erro ao carregar anexos/campos para compartilhamento:', err);
    }
  };

  const loadSharesList = async () => {
    setLoadingList(true);
    try {
      const data = await projectsService.listTaskShares(task.id);
      setSharesList(data || []);
    } catch (err) {
      // Sem compartilhamentos
    } finally {
      setLoadingList(false);
    }
  };

  const handleCreateShare = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await projectsService.createTaskShare(task.id, {
        expiresInDays,
        showDescription,
        showSubtasks,
        showResources,
        showAttachments,
        showCustomFields,
        selectedResourceIds: showResources ? selectedResourceIds : [],
        selectedAttachmentIds: showAttachments ? selectedAttachmentIds : [],
        selectedCustomFieldIds: showCustomFields ? selectedCustomFieldIds : [],
      });
      setIssuedShare(result);
      loadSharesList();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao emitir link de compartilhamento.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await projectsService.revokeTaskShare(shareId);
      loadSharesList();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao revogar compartilhamento.');
    }
  };

  const handleReissueShare = async (shareId: string) => {
    try {
      const result = await projectsService.reissueTaskShare(shareId);
      setIssuedShare(result);
      loadSharesList();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao reemitir compartilhamento.');
    }
  };

  const handleOpenPreview = async () => {
    setLoadingPreview(true);
    setShowPreviewModal(true);
    try {
      const card = await projectsService.previewTaskShare(task.id, {
        expiresInDays,
        showDescription,
        showSubtasks,
        showResources,
        showAttachments,
        showCustomFields,
        selectedResourceIds: showResources ? selectedResourceIds : [],
        selectedAttachmentIds: showAttachments ? selectedAttachmentIds : [],
        selectedCustomFieldIds: showCustomFields ? selectedCustomFieldIds : [],
      });
      setPreview(card);
    } catch (err) {
      // Falha na prévia
    } finally {
      setLoadingPreview(false);
    }
  };

  const copyToClipboard = (text: string, type: 'link' | 'pin' | 'message') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === 'pin') {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    } else {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Compartilhar com cliente</h2>
              <p className="text-xs text-slate-400">Emissão de link de visualização seguro com PIN</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isViewer ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>Visualizadores não possuem permissão para emitir links de compartilhamento.</span>
          </div>
        ) : (
          <>
            {/* Banner de emissão com sucesso */}
            {issuedShare && (
              <div className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-2xl space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Novo Link Emitido com Sucesso!</span>
                </div>

                <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-blue-500/20">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">LINK DE ACESSO</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={issuedShare.url}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 flex-1 font-mono select-all"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(issuedShare.url, 'link')}
                        className="shrink-0"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="ml-1 text-xs">{copiedLink ? 'Copiado' : 'Copiar'}</span>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">PIN DE ACESSO (6 DÍGITOS)</label>
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-base font-bold text-amber-400 font-mono tracking-widest">
                        {issuedShare.pin}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(issuedShare.pin, 'pin')}
                        className="shrink-0"
                      >
                        {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="ml-1 text-xs">{copiedPin ? 'Copiado' : 'Copiar PIN'}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Mensagem pronta para envio */}
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          `Olá! Segue o link para visualização do andamento da sua demanda:\n${issuedShare.url}\n\nUtilize o PIN de acesso: ${issuedShare.pin} para desbloquear a visualização.`,
                          'message'
                        )
                      }
                      className="w-full text-xs py-2"
                    >
                      {copiedMessage ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {copiedMessage ? 'Mensagem Copiada!' : 'Copiar Mensagem Completa para Envio'}
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-amber-400/90 bg-amber-500/5 p-3 rounded-lg border border-amber-500/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Importante:</strong> Copie o PIN agora. Por razões estritas de segurança, ele é armazenado apenas como hash criptográfico e não poderá ser recuperado após fechar esta tela.
                  </span>
                </div>
              </div>
            )}

            {/* Configuração de novo link */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Configurar Novo Link
              </h3>

              {/* Seletor de Validade */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Prazo de Validade do Link
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExpiresInDays(days)}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                        expiresInDays === days
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {days} dias
                    </button>
                  ))}
                </div>
              </div>

              {/* Escolha de seções visíveis */}
              <div className="space-y-2.5">
                <label className="text-xs font-medium text-slate-300 block">
                  Seções Visíveis para o Cliente
                </label>

                <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showDescription}
                      onChange={(e) => setShowDescription(e.target.checked)}
                      className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                    />
                    <span>Descrição da Tarefa</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSubtasks}
                      onChange={(e) => setShowSubtasks(e.target.checked)}
                      className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                    />
                    <span>Checklist de Atividades</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showResources}
                      onChange={(e) => setShowResources(e.target.checked)}
                      className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                    />
                    <span>Recursos & Links Externos</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAttachments}
                      onChange={(e) => setShowAttachments(e.target.checked)}
                      className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                    />
                    <span>Anexos de Documentos (E3.7)</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showCustomFields}
                      onChange={(e) => setShowCustomFields(e.target.checked)}
                      className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                    />
                    <span>Campos Personalizados Elegíveis (E3.8)</span>
                  </label>
                </div>
              </div>

              {/* Seleção de recursos específicos */}
              {showResources && task.resources && task.resources.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 block">
                    Selecione quais recursos exibir:
                  </label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    {task.resources.map((res) => {
                      const isChecked = selectedResourceIds.includes(res.id);
                      return (
                        <label key={res.id} className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedResourceIds([...selectedResourceIds, res.id]);
                              } else {
                                setSelectedResourceIds(selectedResourceIds.filter((id) => id !== res.id));
                              }
                            }}
                            className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                          />
                          <span className="truncate">{res.title}</span>
                          <span className="text-[10px] text-slate-500">({res.type})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seleção de Anexos específicos (E3.7) */}
              {showAttachments && attachments.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 block flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                    <span>Selecione quais anexos exibir para o cliente:</span>
                  </label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    {attachments.map((att) => {
                      const isChecked = selectedAttachmentIds.includes(att.id);
                      return (
                        <label key={att.id} className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAttachmentIds([...selectedAttachmentIds, att.id]);
                              } else {
                                setSelectedAttachmentIds(selectedAttachmentIds.filter((id) => id !== att.id));
                              }
                            }}
                            className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                          />
                          <span className="truncate">{att.filename}</span>
                          <span className="text-[10px] text-slate-500">({(att.sizeBytes / 1024).toFixed(0)} KB)</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seleção de Campos Personalizados elegíveis (E3.8) */}
              {showCustomFields && customFields.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 block flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    <span>Selecione quais campos personalizados exibir:</span>
                  </label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    {customFields.map((cf) => {
                      const isChecked = selectedCustomFieldIds.includes(cf.fieldId);
                      return (
                        <label key={cf.fieldId} className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCustomFieldIds([...selectedCustomFieldIds, cf.fieldId]);
                              } else {
                                setSelectedCustomFieldIds(selectedCustomFieldIds.filter((id) => id !== cf.fieldId));
                              }
                            }}
                            className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                          />
                          <span className="truncate">{cf.fieldName}</span>
                          <span className="text-[10px] text-slate-500">({cf.type})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Aviso obrigatório */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Aviso de visibilidade:</strong> Alterações futuras nos campos selecionados (como atualização de descrição, status ou checklist) ficarão visíveis para quem tiver o link e PIN. Comentários internos e horas apontadas nunca são compartilhados.
                </span>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleOpenPreview}
                  className="text-xs py-2.5"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Visualizar Prévia
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateShare}
                  disabled={isGenerating}
                  className="flex-1 text-xs py-2.5"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Gerando...
                    </>
                  ) : (
                    'Emitir Link de Visualização'
                  )}
                </Button>
              </div>
            </div>

            {/* Links existentes */}
            {sharesList.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Links Emitidos Anteriormente ({sharesList.length})
                </h3>

                <div className="space-y-2">
                  {sharesList.map((s) => {
                    const isRevoked = Boolean(s.revokedAt);
                    const isExpired = new Date(s.expiresAt) <= new Date();

                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                isRevoked
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : isExpired
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {isRevoked ? 'Revogado' : isExpired ? 'Expirado' : 'Ativo'}
                            </span>
                            <span className="text-slate-400">
                              Emitido em: {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <span className="text-slate-500 text-[11px] block mt-0.5">
                            Expira em: {new Date(s.expiresAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isRevoked && !isExpired && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRevokeShare(s.id)}
                              className="text-[11px] py-1 px-2.5"
                            >
                              Revogar
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleReissueShare(s.id)}
                            className="text-[11px] py-1 px-2.5"
                          >
                            Reemitir Link
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Prévia Real */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                Prévia do Conteúdo Público (Exatamente como o cliente verá)
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingPreview ? (
              <div className="py-12 flex justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : preview ? (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="text-base font-bold text-slate-100">{preview.title}</h4>
                  <span className="text-slate-500">Status: {preview.status} | Prioridade: {preview.priority}</span>
                </div>

                {preview.description && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 whitespace-pre-wrap">
                    {preview.description}
                  </div>
                )}

                {preview.checklist && preview.checklist.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-400">Checklist:</span>
                    {preview.checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-slate-300">
                        <span>{item.completed ? '☑' : '☐'}</span>
                        <span className={item.completed ? 'line-through text-slate-500' : ''}>{item.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {preview.resources && preview.resources.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-400">Links:</span>
                    {preview.resources.map((r) => (
                      <div key={r.id} className="text-blue-400 truncate">
                        • {r.title} ({r.url})
                      </div>
                    ))}
                  </div>
                )}

                {/* Prévia de Anexos (E3.7) */}
                {(preview as any).attachments && (preview as any).attachments.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-400">Anexos Compartilhados:</span>
                    {(preview as any).attachments.map((a: any) => (
                      <div key={a.id} className="text-slate-300 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                        <span>{a.filename} ({(a.sizeBytes / 1024).toFixed(0)} KB)</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Prévia de Campos Personalizados (E3.8) */}
                {preview.customFields && preview.customFields.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-400">Campos Personalizados:</span>
                    {preview.customFields.map((cf, idx) => (
                      <div key={idx} className="text-slate-300 flex items-center gap-2">
                        <span className="font-medium text-slate-400">{cf.name}:</span>
                        <span>{cf.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskShareModal;
