import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Maximize2,
  Minimize2,
  Copy,
  Share2,
  CheckSquare,
  Link2,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  ExternalLink,
  Send,
  ArrowRightLeft,
  Paperclip,
  Tag,
  FileText,
  ChevronDown,
  ArrowLeft,
  UploadCloud,
  FileIcon,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import type { Task, Column, Priority, Activity, WorkspaceMember, TaskCustomFieldValue, Attachment } from '@/types/projects';
import { projectsService } from '@/services/projects/projectsService';
import { cn } from '@/utils/cn';
import TaskShareModal from '@/pages/projects/TaskShareModal';

export interface TaskCardViewProps {
  taskId: string;
  initialTask?: Task;
  columns?: Column[];
  mode?: 'drawer' | 'page';
  onClose?: () => void;
  onTaskUpdate?: () => void;
}

export const TaskCardView: React.FC<TaskCardViewProps> = ({
  taskId,
  initialTask,
  columns: initialColumns = [],
  mode = 'drawer',
  onClose,
  onTaskUpdate,
}) => {
  const navigate = useNavigate();

  // Estados principais da tarefa
  const [task, setTask] = useState<Task | null>(initialTask || null);
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [loading, setLoading] = useState(!initialTask);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'comments' | 'activity' | 'attachments' | 'customFields' | 'time'>('comments');

  // Inline edits
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  // Subtasks
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Resources
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [isAddingResource, setIsAddingResource] = useState(false);

  // Time tracking (E3.8-c)
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [timeDesc, setTimeDesc] = useState('');
  const [timeDate, setTimeDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isAddingTime, setIsAddingTime] = useState(false);
  const [timeTotalMinutes, setTimeTotalMinutes] = useState(0);
  const [timeTotalHours, setTimeTotalHours] = useState(0);

  // Comments
  const [commentText, setCommentText] = useState('');

  // Share modal (E2.5 / E3.7 / E3.8)
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Transfer modal (E3.6-e)
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTargetProjectId, setTransferTargetProjectId] = useState('');
  const [transferPreview, setTransferPreview] = useState<any>(null);
  const [loadingTransferPreview, setLoadingTransferPreview] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [workspaceProjects, setWorkspaceProjects] = useState<any[]>([]);

  // Version conflict state (E3.1-e)
  const [versionConflict, setVersionConflict] = useState<string | null>(null);

  // Estimates state (E3.2-d)
  const [isEditingEstimate, setIsEditingEstimate] = useState(false);
  const [estimateHoursInput, setEstimateHoursInput] = useState('');
  const [estimateMinutesInput, setEstimateMinutesInput] = useState('');

  // Relations state (E3.4-d)
  const [isAddingRelation, setIsAddingRelation] = useState(false);
  const [relationType, setRelationType] = useState<'BLOCKS' | 'BLOCKED_BY' | 'RELATES_TO'>('BLOCKS');
  const [selectedRelatedTaskId, setSelectedRelatedTaskId] = useState('');
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [relationError, setRelationError] = useState<string | null>(null);
  const [isSubmittingRelation, setIsSubmittingRelation] = useState(false);

  // Workspace members
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  // Attachments (E3.7)
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  // Custom Fields (E3.8)
  const [customFields, setCustomFields] = useState<TaskCustomFieldValue[]>([]);
  const [editingCustomFieldId, setEditingCustomFieldId] = useState<string | null>(null);
  const [editingCustomFieldValue, setEditingCustomFieldValue] = useState<any>('');

  // Copy feedback
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);

  // Carrega dados completos da tarefa
  const reloadTask = async () => {
    try {
      setLoadError(null);
      const fullTask = await projectsService.getTask(taskId);
      setTask(fullTask);
      setTitle(fullTask.title);
      setDescription(fullTask.description || '');
      setVersionConflict(null);

      // Carrega colunas se não fornecidas
      if (columns.length === 0 && fullTask.projectId) {
        const cols = await projectsService.listColumns(fullTask.projectId);
        setColumns(cols);
      }

      // Carrega membros do workspace para atribuição
      if (fullTask.workspaceId) {
        projectsService.listMembers(fullTask.workspaceId).then(setMembers).catch(() => {});
        projectsService.listProjects(fullTask.workspaceId).then(setWorkspaceProjects).catch(() => {});
      }

      // Carrega anexos (E3.7)
      projectsService.listTaskAttachments(fullTask.id).then(setAttachments).catch(() => {});

      // Carrega campos personalizados (E3.8)
      projectsService.getTaskCustomFieldValues(fullTask.id).then(setCustomFields).catch(() => {});

      // Carrega apontamentos de horas (E3.8-c)
      projectsService.listTimeEntries(fullTask.id).then((res) => {
        setTimeTotalMinutes(res.totalMinutes || 0);
        setTimeTotalHours(res.totalHours || 0);
      }).catch(() => {});

      if (onTaskUpdate) onTaskUpdate();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao carregar a tarefa.';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadTask();
  }, [taskId]);

  const handleUpdateWithErrorCatch = async (updatePayload: Partial<Task>) => {
    if (!task) return;
    try {
      const updated = await projectsService.updateTask(task.id, {
        ...updatePayload,
        expectedVersion: task.version,
      });
      setTask(updated);
      setVersionConflict(null);
      if (onTaskUpdate) onTaskUpdate();
      return updated;
    } catch (err: any) {
      if (err?.response?.status === 409 || err?.response?.data?.code === 'VERSION_CONFLICT') {
        setVersionConflict('Esta tarefa foi modificada em outra aba ou por outro operador. Seu rascunho foi preservado.');
      } else {
        console.error('Erro ao atualizar tarefa:', err);
      }
      throw err;
    }
  };

  // Salvar título
  const handleTitleBlur = async () => {
    if (task && title.trim() && title !== task.title) {
      try {
        await handleUpdateWithErrorCatch({ title: title.trim() });
      } catch (err) {
        // Rascunho preservado
      }
    }
  };

  // Salvar descrição
  const handleSaveDescription = async () => {
    try {
      await handleUpdateWithErrorCatch({ description });
      setIsEditingDesc(false);
    } catch (err) {
      // Rascunho preservado
    }
  };

  // Alterar status / coluna
  const handleStatusChange = async (colId: string) => {
    if (!task) return;
    try {
      await projectsService.moveTask(task.id, colId, 0);
      reloadTask();
    } catch (err) {
      console.error('Erro ao alterar coluna:', err);
    }
  };

  // Alterar prioridade
  const handlePriorityChange = async (prio: Priority) => {
    try {
      await handleUpdateWithErrorCatch({ priority: prio });
    } catch (err) {
      console.error('Erro ao alterar prioridade:', err);
    }
  };

  // Atribuir responsável (membro ativo ou null)
  const handleAssigneeChange = async (userId: string) => {
    try {
      await handleUpdateWithErrorCatch({ assigneeId: userId ? userId : null });
    } catch (err) {
      console.error('Erro ao alterar responsável:', err);
    }
  };

  // Formatação de minutos amigável
  const formatMinutesFriendly = (minutes?: number | null) => {
    if (minutes === null || minutes === undefined) return 'Não informada';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  // Alterar datas civis com validação de intervalo
  const handleDateChange = async (field: 'startDate' | 'dueDate', value: string) => {
    if (!task) return;
    const nextVal = value ? value.trim() : null;
    const nextStart = field === 'startDate' ? nextVal : (task.startDate ? task.startDate.split('T')[0] : null);
    const nextDue = field === 'dueDate' ? nextVal : (task.dueDate ? task.dueDate.split('T')[0] : null);

    if (nextStart && nextDue && nextStart > nextDue) {
      alert('A data de início não pode ser posterior à data de vencimento.');
      return;
    }

    try {
      await handleUpdateWithErrorCatch({ [field]: nextVal });
    } catch (err) {
      console.error('Erro ao salvar data:', err);
    }
  };

  // Alterar estimativa
  const handleEstimateChange = async (minutes: number | null) => {
    try {
      await handleUpdateWithErrorCatch({ estimatedMinutes: minutes });
    } catch (err) {
      console.error('Erro ao salvar estimativa:', err);
    }
  };

  // Checklist / Subtarefas
  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      await projectsService.updateSubtask(subtaskId, { completed });
      reloadTask();
    } catch (err) {
      console.error('Erro ao alternar subtarefa:', err);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newSubtaskTitle.trim()) return;
    try {
      await projectsService.addSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      reloadTask();
    } catch (err) {
      console.error('Erro ao adicionar subtarefa:', err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await projectsService.deleteSubtask(subtaskId);
      reloadTask();
    } catch (err) {
      console.error('Erro ao remover subtarefa:', err);
    }
  };

  // Recursos
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newResourceTitle.trim() || !newResourceUrl.trim()) return;
    try {
      await projectsService.addResource(task.id, {
        title: newResourceTitle.trim(),
        url: newResourceUrl.trim(),
      });
      setNewResourceTitle('');
      setNewResourceUrl('');
      setIsAddingResource(false);
      reloadTask();
    } catch (err) {
      console.error('Erro ao adicionar recurso:', err);
    }
  };

  // Apontamento de Horas (E3.8-c)
  const handleAddTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || timeMinutes <= 0) return;
    try {
      await projectsService.addTimeEntry(task.id, {
        durationMinutes: timeMinutes,
        description: timeDesc.trim() || undefined,
        date: timeDate,
      });
      setTimeDesc('');
      setIsAddingTime(false);
      reloadTask();
    } catch (err) {
      console.error('Erro ao apontar tempo:', err);
    }
  };

  const handleDeleteTimeEntry = async (id: string) => {
    try {
      await projectsService.removeTimeEntry(id);
      reloadTask();
    } catch (err) {
      console.error('Erro ao remover apontamento:', err);
    }
  };

  // Upload de Anexos (E3.7)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingAttachment(true);
    setAttachmentError(null);
    try {
      await projectsService.uploadTaskAttachment(task.id, file);
      reloadTask();
    } catch (err: any) {
      setAttachmentError(err?.response?.data?.message || 'Falha ao enviar anexo.');
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await projectsService.deleteTaskAttachment(attachmentId);
      reloadTask();
    } catch (err) {
      console.error('Erro ao excluir anexo:', err);
    }
  };

  // Salvar Campo Personalizado (E3.8)
  const handleSaveCustomFieldValue = async (fieldId: string, value: any) => {
    if (!task) return;
    try {
      await projectsService.setTaskCustomFieldValues(task.id, [{ fieldId, value }]);
      setEditingCustomFieldId(null);
      reloadTask();
    } catch (err) {
      console.error('Erro ao salvar campo personalizado:', err);
    }
  };

  // Comentários
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !commentText.trim()) return;
    try {
      await projectsService.addComment(task.id, commentText.trim());
      setCommentText('');
      reloadTask();
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err);
    }
  };

  // Relações
  const openAddRelation = async () => {
    if (!task) return;
    setIsAddingRelation(true);
    setRelationError(null);
    setSelectedRelatedTaskId('');
    try {
      const tasks = await projectsService.listTasks(task.projectId);
      setProjectTasks(tasks.filter((t) => t.id !== task.id));
    } catch (err) {
      console.error('Erro ao listar tarefas do projeto:', err);
    }
  };

  const handleAddRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !selectedRelatedTaskId) return;
    setIsSubmittingRelation(true);
    setRelationError(null);
    try {
      await projectsService.addRelation(task.id, selectedRelatedTaskId, relationType as any);
      setIsAddingRelation(false);
      setSelectedRelatedTaskId('');
      reloadTask();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Erro ao adicionar relação';
      setRelationError(msg);
    } finally {
      setIsSubmittingRelation(false);
    }
  };

  const handleDeleteRelation = async (relationId: string) => {
    try {
      await projectsService.removeRelation(relationId);
      reloadTask();
    } catch (err) {
      console.error('Erro ao remover relação:', err);
    }
  };

  // Transferência de Tarefa (E3.6-e)
  const handleOpenTransferModal = () => {
    setTransferModalOpen(true);
    setTransferTargetProjectId('');
    setTransferPreview(null);
    setTransferError(null);
  };

  const handleSelectTransferTarget = async (targetId: string) => {
    if (!task) return;
    setTransferTargetProjectId(targetId);
    if (!targetId) {
      setTransferPreview(null);
      return;
    }
    setLoadingTransferPreview(true);
    setTransferError(null);
    try {
      const preview = await projectsService.previewTaskTransfer(task.id, targetId);
      setTransferPreview(preview);
    } catch (err: any) {
      setTransferError(err?.response?.data?.message || 'Falha ao gerar prévia da transferência.');
      setTransferPreview(null);
    } finally {
      setLoadingTransferPreview(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!task || !transferTargetProjectId) return;
    try {
      await projectsService.executeTaskTransfer(task.id, transferTargetProjectId);
      setTransferModalOpen(false);
      reloadTask();
      if (mode === 'page') {
        navigate(`/projects/${transferTargetProjectId}`);
      } else if (onClose) {
        onClose();
      }
    } catch (err: any) {
      setTransferError(err?.response?.data?.message || 'Falha ao executar transferência.');
    }
  };

  // Ações de Cópia
  const triggerCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(`${label} copiado!`);
    setIsCopyMenuOpen(false);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  if (loading) {
    return (
      <div className={cn(
        'bg-background border-border flex items-center justify-center p-12 text-muted-foreground',
        mode === 'drawer' ? 'fixed inset-y-0 right-0 z-50 w-full sm:w-[680px] lg:w-[740px] border-l shadow-2xl' : 'min-h-[500px]'
      )}>
        <div className="flex flex-col items-center gap-3 text-xs">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Carregando detalhes da tarefa...</span>
        </div>
      </div>
    );
  }

  if (loadError || !task) {
    return (
      <div className={cn(
        'bg-background border-border flex flex-col items-center justify-center p-12 text-center',
        mode === 'drawer' ? 'fixed inset-y-0 right-0 z-50 w-full sm:w-[680px] lg:w-[740px] border-l shadow-2xl' : 'min-h-[500px]'
      )}>
        <ShieldAlert className="w-10 h-10 text-rose-500 mb-3" />
        <h3 className="text-base font-bold text-foreground">Tarefa Indisponível</h3>
        <p className="text-xs text-muted-foreground max-w-sm mt-1">
          {loadError || 'Esta tarefa não foi encontrada ou você não possui permissão para acessá-la.'}
        </p>
        <div className="flex items-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
            Ir para Projetos
          </Button>
          {mode === 'drawer' && onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
      </div>
    );
  }

  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
  const taskCanonicalUrl = `${window.location.origin}/projects/tasks/${task.id}`;
  const displayCode = task.displayCode || `${task.projectKey || task.project?.name?.substring(0, 4).toUpperCase() || 'TASK'}-${task.taskNumber}`;

  return (
    <div
      className={cn(
        'bg-background border-border flex flex-col',
        mode === 'drawer'
          ? 'fixed inset-y-0 right-0 z-50 w-full sm:w-[680px] lg:w-[760px] border-l shadow-2xl transition-all duration-200'
          : 'w-full max-w-6xl mx-auto rounded-2xl border shadow-sm my-6 overflow-hidden'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/60 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
          {mode === 'page' && (
            <button
              onClick={() => navigate(`/projects/${task.projectId}`)}
              className="p-1 rounded hover:bg-muted text-foreground transition-colors mr-1"
              title="Voltar ao Projeto"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <span className="font-semibold text-foreground truncate max-w-[150px]">
            {task.project?.name || 'Projeto'}
          </span>
          <span>/</span>
          <span className="font-bold text-primary font-mono">{displayCode}</span>

          {copyFeedback && (
            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-fade-in">
              {copyFeedback}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Transferir de Projeto (E3.6-e) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenTransferModal}
            className="text-xs h-7 flex items-center gap-1 text-muted-foreground hover:text-foreground"
            title="Transferir para outro projeto"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Transferir</span>
          </Button>

          {/* Compartilhar com cliente (E2.5-b / E3.7 / E3.8) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareModalOpen(true)}
            className="text-xs h-7 flex items-center gap-1.5 text-primary border-primary/40 hover:bg-primary/10"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartilhar</span>
          </Button>

          {/* Menu de Cópia (E3.9-c) */}
          <div className="relative">
            <button
              onClick={() => setIsCopyMenuOpen(!isCopyMenuOpen)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors flex items-center gap-0.5"
              title="Copiar dados da tarefa"
            >
              <Copy className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>

            {isCopyMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-xl shadow-xl py-1 text-xs z-50 animate-fade-in">
                <button
                  onClick={() => triggerCopy(taskCanonicalUrl, 'Link')}
                  className="w-full px-3 py-1.5 text-left hover:bg-accent text-foreground flex items-center justify-between"
                >
                  <span>Copiar Link da Tarefa</span>
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => triggerCopy(task.id, 'ID')}
                  className="w-full px-3 py-1.5 text-left hover:bg-accent text-foreground flex items-center justify-between"
                >
                  <span>Copiar ID da Tarefa</span>
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => triggerCopy(displayCode, 'Código')}
                  className="w-full px-3 py-1.5 text-left hover:bg-accent text-foreground flex items-center justify-between"
                >
                  <span>Copiar Código ({displayCode})</span>
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => triggerCopy(task.title, 'Título')}
                  className="w-full px-3 py-1.5 text-left hover:bg-accent text-foreground flex items-center justify-between"
                >
                  <span>Copiar Título</span>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => triggerCopy(`[${displayCode} - ${task.title}](${taskCanonicalUrl})`, 'Markdown')}
                  className="w-full px-3 py-1.5 text-left hover:bg-accent text-foreground flex items-center justify-between border-t border-border mt-1 pt-1.5"
                >
                  <span>Copiar Link em Markdown</span>
                  <CheckSquare className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          {/* Alternar Drawer / Página Inteira */}
          {mode === 'drawer' ? (
            <button
              onClick={() => navigate(`/projects/tasks/${task.id}`)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
              title="Abrir como página inteira"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => navigate(`/projects/${task.projectId}`)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
              title="Voltar ao Projeto"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}

          {/* Fechar */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Version Conflict Alert (E3.1-e) */}
      {versionConflict && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 p-3 px-4 flex items-start gap-3 text-xs flex-shrink-0 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-400">Conflito de Concorrência</p>
            <p className="text-muted-foreground mt-0.5">{versionConflict}</p>
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setVersionConflict(null);
                  await reloadTask();
                }}
                className="text-xs h-7 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40"
              >
                Recarregar e descartar rascunho
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    const latest = await projectsService.getTask(task.id);
                    setTask((prev) => (prev ? { ...prev, version: latest.version } : latest));
                    setVersionConflict(null);
                  } catch (err) {
                    console.error('Erro ao sincronizar versão:', err);
                  }
                }}
                className="text-xs h-7 text-muted-foreground hover:text-foreground"
              >
                Sincronizar versão e manter meu rascunho
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Body: 2 columns (Content + Sidebar) */}
      <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
        {/* Left Column: Title, Description, Subtasks, Resources, Tabs */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Title inline editable */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Título da tarefa..."
              className="w-full text-xl font-bold bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-foreground py-1 transition-colors"
            />
          </div>

          {/* Description Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Descrição</span>
              </h4>
              {!isEditingDesc && (
                <button
                  onClick={() => setIsEditingDesc(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Editar
                </button>
              )}
            </div>

            {isEditingDesc ? (
              <div className="space-y-2">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Descreva os requisitos ou detalhes da tarefa em Markdown..."
                  className="w-full p-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-foreground"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDescription(task.description || '');
                      setIsEditingDesc(false);
                    }}
                    className="text-xs h-7"
                  >
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveDescription} className="text-xs h-7">
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingDesc(true)}
                className="p-3.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors text-xs text-foreground whitespace-pre-wrap leading-relaxed min-h-20"
              >
                {task.description || (
                  <span className="text-muted-foreground/60 italic">
                    Clique para adicionar uma descrição detalhada...
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Subtasks / Checklist Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Checklist ({completedSubtasks}/{totalSubtasks})
                </h4>
              </div>
              {totalSubtasks > 0 && (
                <span className="text-xs font-bold text-primary">{subtaskProgress}%</span>
              )}
            </div>

            {totalSubtasks > 0 && (
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${subtaskProgress}%` }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              {task.subtasks?.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 group text-xs"
                >
                  <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sub.completed}
                      onChange={(e) => handleToggleSubtask(sub.id, e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                    />
                    <span
                      className={cn(
                        'text-foreground transition-all',
                        sub.completed && 'line-through text-muted-foreground'
                      )}
                    >
                      {sub.title}
                    </span>
                  </label>
                  <button
                    onClick={() => handleDeleteSubtask(sub.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-500 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="+ Adicionar item ao checklist"
                className="flex-1 px-3 py-1.5 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newSubtaskTitle.trim()}
                className="text-xs h-7"
              >
                Adicionar
              </Button>
            </form>
          </div>

          {/* Resources & Links */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Recursos & Links Externos
                </h4>
              </div>
              {!isAddingResource && (
                <button
                  onClick={() => setIsAddingResource(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              )}
            </div>

            {task.resources && task.resources.length > 0 && (
              <div className="space-y-1.5">
                {task.resources.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between p-2 rounded-md border border-border bg-card hover:bg-muted/40 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline truncate"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-medium truncate">{res.title}</span>
                      </a>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-muted text-muted-foreground">
                        Interno
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        await projectsService.removeResource(res.id);
                        reloadTask();
                      }}
                      className="p-1 text-muted-foreground hover:text-rose-500 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isAddingResource && (
              <form onSubmit={handleAddResource} className="p-3 border border-border rounded-lg space-y-2 bg-muted/20">
                <input
                  type="text"
                  value={newResourceTitle}
                  onChange={(e) => setNewResourceTitle(e.target.value)}
                  placeholder="Título (ex: Protótipo Figma, Documento Drive)"
                  className="w-full px-2.5 py-1.5 text-xs bg-background border border-input rounded-md"
                />
                <input
                  type="url"
                  value={newResourceUrl}
                  onChange={(e) => setNewResourceUrl(e.target.value)}
                  placeholder="URL (https://...)"
                  className="w-full px-2.5 py-1.5 text-xs bg-background border border-input rounded-md"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingResource(false)}
                    className="text-xs h-7"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" className="text-xs h-7">
                    Salvar Link
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Relations & Dependencies */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Relações & Dependências
                </h4>
              </div>
              {!isAddingRelation && (
                <button
                  onClick={openAddRelation}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              )}
            </div>

            {relationError && (
              <div className="p-2.5 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Erro na relação:</p>
                  <p>{relationError}</p>
                </div>
              </div>
            )}

            {task.relations && task.relations.length > 0 ? (
              <div className="space-y-1.5">
                {task.relations.map((rel) => (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between p-2 rounded-md border border-border bg-card hover:bg-muted/40 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {rel.type === 'BLOCKS' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          Bloqueia
                        </span>
                      )}
                      {rel.type === 'BLOCKED_BY' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Bloqueada por
                        </span>
                      )}
                      {rel.type === 'RELATES_TO' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          Relacionada
                        </span>
                      )}

                      <span className="font-mono text-muted-foreground text-[11px]">
                        {rel.relatedTask.displayCode || `#${rel.relatedTask.taskNumber}`}
                      </span>

                      <span className="font-medium text-foreground truncate">
                        {rel.relatedTask.title}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteRelation(rel.id)}
                      className="p-1 text-muted-foreground hover:text-rose-500 rounded transition-colors"
                      title="Remover relação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              !isAddingRelation && (
                <p className="text-xs text-muted-foreground italic">Nenhuma relação configurada.</p>
              )
            )}

            {isAddingRelation && (
              <form onSubmit={handleAddRelation} className="p-3 bg-muted/40 rounded-lg border border-border space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Tipo de Relação
                  </label>
                  <select
                    value={relationType}
                    onChange={(e) => setRelationType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs bg-background border border-input rounded-md text-foreground"
                  >
                    <option value="BLOCKS">Esta tarefa bloqueia</option>
                    <option value="BLOCKED_BY">Esta tarefa é bloqueada por</option>
                    <option value="RELATES_TO">Relacionada com</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Tarefa Alvo (mesmo projeto)
                  </label>
                  <select
                    value={selectedRelatedTaskId}
                    onChange={(e) => setSelectedRelatedTaskId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-background border border-input rounded-md text-foreground"
                    required
                  >
                    <option value="">Selecione uma tarefa...</option>
                    {projectTasks.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.displayCode || `#${pt.taskNumber}`} - {pt.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingRelation(false);
                      setRelationError(null);
                    }}
                    className="text-xs h-7"
                    disabled={isSubmittingRelation}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="text-xs h-7"
                    disabled={isSubmittingRelation || !selectedRelatedTaskId}
                  >
                    {isSubmittingRelation ? 'Salvando...' : 'Salvar Relação'}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Tabs Section: Comments, Attachments, Custom Fields, Time, Activity */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('comments')}
                className={cn(
                  'text-xs font-semibold pb-1.5 border-b-2 transition-colors whitespace-nowrap px-1',
                  activeTab === 'comments'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Comentários ({task.comments?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('attachments')}
                className={cn(
                  'text-xs font-semibold pb-1.5 border-b-2 transition-colors whitespace-nowrap px-1 flex items-center gap-1',
                  activeTab === 'attachments'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Paperclip className="w-3 h-3" />
                <span>Anexos ({attachments.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('customFields')}
                className={cn(
                  'text-xs font-semibold pb-1.5 border-b-2 transition-colors whitespace-nowrap px-1 flex items-center gap-1',
                  activeTab === 'customFields'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Tag className="w-3 h-3" />
                <span>Campos Personalizados ({customFields.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('time')}
                className={cn(
                  'text-xs font-semibold pb-1.5 border-b-2 transition-colors whitespace-nowrap px-1 flex items-center gap-1',
                  activeTab === 'time'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Clock className="w-3 h-3" />
                <span>Apontamentos</span>
              </button>

              <button
                onClick={() => setActiveTab('activity')}
                className={cn(
                  'text-xs font-semibold pb-1.5 border-b-2 transition-colors whitespace-nowrap px-1',
                  activeTab === 'activity'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Histórico
              </button>
            </div>

            {/* TAB: Comments */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                <div className="space-y-2.5">
                  {task.comments && task.comments.length > 0 ? (
                    task.comments.map((comment) => (
                      <div key={comment.id} className="p-3 rounded-lg border border-border bg-card/60 text-xs space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="font-semibold text-foreground">{comment.userName}</span>
                          <span className="text-[10px]">
                            {new Date(comment.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-2">Nenhum comentário registrado.</p>
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Escreva um comentário ou mencione um membro..."
                    className="flex-1 px-3 py-2 text-xs bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!commentText.trim()}
                    className="flex items-center gap-1.5 text-xs h-8"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </Button>
                </form>
              </div>
            )}

            {/* TAB: Attachments (E3.7) */}
            {activeTab === 'attachments' && (
              <div className="space-y-3">
                {attachmentError && (
                  <div className="p-2.5 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{attachmentError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Formatos aceitos: Imagens, PDF, ZIP, TXT, CSV (máx. 20 MiB).
                  </span>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploadingAttachment}
                    />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{isUploadingAttachment ? 'Enviando...' : 'Adicionar Anexo'}</span>
                    </span>
                  </label>
                </div>

                <div className="space-y-2">
                  {attachments.length > 0 ? (
                    attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileIcon className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <a
                              href={projectsService.getAttachmentDownloadUrl(att.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-foreground hover:underline truncate block"
                            >
                              {att.filename}
                            </a>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                              <span>{(att.sizeBytes / 1024).toFixed(1)} KB</span>
                              <span>•</span>
                              <span>{new Date(att.createdAt).toLocaleDateString('pt-BR')}</span>
                              <span>•</span>
                              <span className="px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                Apenas interno
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={projectsService.getAttachmentDownloadUrl(att.id)}
                            download={att.filename}
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                            title="Baixar arquivo"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="p-1.5 text-muted-foreground hover:text-rose-500 rounded hover:bg-muted transition-colors"
                            title="Excluir anexo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
                      <Paperclip className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p>Nenhum anexo associado a esta tarefa.</p>
                      <p className="text-[11px] opacity-75 mt-0.5">Anexos nascem com visibilidade estritamente interna.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Custom Fields (E3.8) */}
            {activeTab === 'customFields' && (
              <div className="space-y-3">
                {customFields.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customFields.map((cf) => (
                      <div
                        key={cf.fieldId}
                        className="p-3 rounded-lg border border-border bg-card/60 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{cf.fieldName}</span>
                          {cf.isPublicEligible && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                              Elegível p/ cliente
                            </span>
                          )}
                        </div>

                        {editingCustomFieldId === cf.fieldId ? (
                          <div className="flex items-center gap-1.5 pt-1">
                            {cf.type === 'select' ? (
                              <select
                                value={editingCustomFieldValue}
                                onChange={(e) => setEditingCustomFieldValue(e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-background border border-input rounded"
                              >
                                <option value="">(Vazio)</option>
                                {cf.options?.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : cf.type === 'date' ? (
                              <input
                                type="date"
                                value={editingCustomFieldValue || ''}
                                onChange={(e) => setEditingCustomFieldValue(e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-background border border-input rounded"
                              />
                            ) : cf.type === 'number' ? (
                              <input
                                type="number"
                                value={editingCustomFieldValue ?? ''}
                                onChange={(e) => setEditingCustomFieldValue(e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-background border border-input rounded"
                              />
                            ) : (
                              <input
                                type="text"
                                value={editingCustomFieldValue || ''}
                                onChange={(e) => setEditingCustomFieldValue(e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-background border border-input rounded"
                              />
                            )}
                            <Button
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={() => handleSaveCustomFieldValue(cf.fieldId, editingCustomFieldValue)}
                            >
                              Salvar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={() => setEditingCustomFieldId(null)}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingCustomFieldId(cf.fieldId);
                              setEditingCustomFieldValue(cf.value ?? '');
                            }}
                            className="p-1.5 rounded bg-muted/40 hover:bg-muted cursor-pointer transition-colors text-muted-foreground flex items-center justify-between min-h-7"
                          >
                            <span className="text-foreground">
                              {cf.displayValue !== null && cf.displayValue !== undefined && cf.displayValue !== ''
                                ? String(cf.displayValue)
                                : <span className="italic opacity-60">Não informado</span>}
                            </span>
                            <span className="text-[10px] text-primary">Alterar</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-2">
                    Nenhum campo personalizado configurado neste projeto. Administradores podem cadastrar campos nas Configurações do Projeto.
                  </p>
                )}
              </div>
            )}

            {/* TAB: Time Tracking (E3.8-c) */}
            {activeTab === 'time' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60">
                  <div>
                    <span className="text-xs text-muted-foreground">Total Apontado:</span>
                    <p className="text-base font-bold text-foreground">
                      {timeTotalHours}h ({timeTotalMinutes} min)
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingTime(!isAddingTime)}
                    className="text-xs h-7 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Apontamento</span>
                  </Button>
                </div>

                {isAddingTime && (
                  <form onSubmit={handleAddTime} className="p-3 border border-border rounded-lg space-y-2.5 bg-muted/20">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Duração (Minutos)</label>
                        <input
                          type="number"
                          min="1"
                          value={timeMinutes}
                          onChange={(e) => setTimeMinutes(Number(e.target.value))}
                          placeholder="Minutos"
                          className="w-full px-2.5 py-1 text-xs bg-background border border-input rounded-md"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Data Civil</label>
                        <input
                          type="date"
                          value={timeDate}
                          onChange={(e) => setTimeDate(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-background border border-input rounded-md"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Descrição da Atividade</label>
                      <input
                        type="text"
                        value={timeDesc}
                        onChange={(e) => setTimeDesc(e.target.value)}
                        placeholder="O que você desenvolveu?"
                        className="w-full px-2.5 py-1 text-xs bg-background border border-input rounded-md"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingTime(false)}
                        className="text-xs h-7"
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm" className="text-xs h-7">
                        Gravar Apontamento
                      </Button>
                    </div>
                  </form>
                )}

                <div className="space-y-1.5">
                  {task.timeEntries && task.timeEntries.length > 0 ? (
                    task.timeEntries.map((te) => (
                      <div
                        key={te.id}
                        className="flex items-center justify-between p-2.5 rounded-md border border-border bg-card/60 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{te.userName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{te.date}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-primary/10 text-primary">
                              {te.durationMinutes} min ({ (te.durationMinutes / 60).toFixed(1) }h)
                            </span>
                          </div>
                          {te.description && (
                            <p className="text-muted-foreground mt-0.5 text-[11px]">{te.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteTimeEntry(te.id)}
                          className="p-1 text-muted-foreground hover:text-rose-500 rounded"
                          title="Remover apontamento (apenas autor ou ADMIN)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-1">Nenhum apontamento registrado.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Activity */}
            {activeTab === 'activity' && (
              <div className="space-y-2">
                {task.activities && task.activities.length > 0 ? (
                  task.activities.map((act: Activity) => (
                    <div key={act.id} className="text-xs text-muted-foreground flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-foreground">{act.userName}</span>{' '}
                        {act.action} em {new Date(act.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic py-1">Histórico vazio.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Properties Sidebar */}
        <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-border bg-card/40 p-5 space-y-5 flex-shrink-0 text-xs">
          {/* Status */}
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Status / Coluna
            </label>
            <select
              value={task.columnId}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-background border border-input rounded-md text-foreground"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Prioridade
            </label>
            <select
              value={task.priority}
              onChange={(e) => handlePriorityChange(e.target.value as Priority)}
              className="w-full px-2.5 py-1.5 text-xs bg-background border border-input rounded-md text-foreground"
            >
              <option value="NONE">Sem prioridade</option>
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </div>

          {/* Assignee (E3.9-c / Membro Ativo ou Null) */}
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Responsável
            </label>
            <select
              value={task.assigneeId || ''}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-background border border-input rounded-md text-foreground"
            >
              <option value="">Sem responsável</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Data de Início
                </label>
                {task.startDate && (
                  <button
                    onClick={() => handleDateChange('startDate', '')}
                    className="text-[10px] text-muted-foreground hover:text-rose-400"
                    title="Limpar data de início"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <input
                type="date"
                value={task.startDate ? task.startDate.split('T')[0] : ''}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-background border border-input rounded-md text-foreground"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Data de Vencimento
                </label>
                {task.dueDate && (
                  <button
                    onClick={() => handleDateChange('dueDate', '')}
                    className="text-[10px] text-muted-foreground hover:text-rose-400"
                    title="Limpar data de vencimento"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <input
                type="date"
                value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                onChange={(e) => handleDateChange('dueDate', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-background border border-input rounded-md text-foreground"
              />
            </div>
          </div>

          {/* Estimate */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Estimativa</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {formatMinutesFriendly(task.estimatedMinutes ?? (task.estimatedHours != null ? Math.round(task.estimatedHours * 60) : null))}
                </span>
                {!isEditingEstimate && (
                  <button
                    onClick={() => {
                      const totalMin = task.estimatedMinutes ?? (task.estimatedHours != null ? Math.round(task.estimatedHours * 60) : 0);
                      setEstimateHoursInput(totalMin ? String(Math.floor(totalMin / 60)) : '');
                      setEstimateMinutesInput(totalMin ? String(totalMin % 60) : '');
                      setIsEditingEstimate(true);
                    }}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Editar
                  </button>
                )}
              </div>
            </div>

            {isEditingEstimate && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const h = parseInt(estimateHoursInput || '0', 10) || 0;
                  const m = parseInt(estimateMinutesInput || '0', 10) || 0;
                  const total = h * 60 + m;
                  handleEstimateChange(total > 0 ? total : null);
                  setIsEditingEstimate(false);
                }}
                className="space-y-2 pt-1"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground">Horas</label>
                    <input
                      type="number"
                      min="0"
                      value={estimateHoursInput}
                      onChange={(e) => setEstimateHoursInput(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs bg-background border border-input rounded-md text-foreground"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground">Minutos</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={estimateMinutesInput}
                      onChange={(e) => setEstimateMinutesInput(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs bg-background border border-input rounded-md text-foreground"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  {(task.estimatedMinutes != null || task.estimatedHours != null) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleEstimateChange(null);
                        setIsEditingEstimate(false);
                      }}
                      className="px-2 py-1 text-[11px] text-rose-400 hover:underline"
                    >
                      Limpar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditingEstimate(false)}
                    className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                  <Button type="submit" size="sm" className="h-6 text-xs px-2.5">
                    Salvar
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Compartilhamento Seguro com PIN (E2.5-b / E3.7 / E3.8) */}
      {shareModalOpen && (
        <TaskShareModal
          task={task}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {/* Modal de Transferência entre Projetos (E3.6-e) */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-popover border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Transferir Tarefa entre Projetos</h3>
              </div>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {transferError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Projeto de Destino</label>
                <select
                  value={transferTargetProjectId}
                  onChange={(e) => handleSelectTransferTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground"
                >
                  <option value="">Selecione o projeto de destino...</option>
                  {workspaceProjects
                    .filter((p) => p.id !== task.projectId && !p.isArchived)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.key || 'SEM CHAVE'})
                      </option>
                    ))}
                </select>
              </div>

              {loadingTransferPreview && (
                <div className="py-4 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Calculando impactos da transferência...</span>
                </div>
              )}

              {transferPreview && (
                <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
                  <p className="font-semibold text-foreground">Prévia do Impacto:</p>
                  <div className="space-y-1 text-muted-foreground">
                    <p>
                      • Código semântico: <strong className="text-foreground">{transferPreview.fromDisplayCode}</strong> ➔ <strong className="text-primary">{transferPreview.toDisplayCode}</strong>
                    </p>
                    {transferPreview.activeSharesToRevokeCount > 0 && (
                      <p className="text-amber-500">
                        • {transferPreview.activeSharesToRevokeCount} link(s) de compartilhamento público serão revogados.
                      </p>
                    )}
                    {transferPreview.relationsToSever?.length > 0 && (
                      <p className="text-amber-500">
                        • {transferPreview.relationsToSever.length} relação(ões) de dependência com tarefas do projeto anterior serão desfeitas.
                      </p>
                    )}
                    <p className="text-emerald-400 text-[11px]">
                      ✓ Subtarefas, apontamentos de horas e histórico de comentários serão preservados integralmente.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTransferModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={!transferTargetProjectId || !transferPreview}
                onClick={handleConfirmTransfer}
              >
                Confirmar Transferência
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
