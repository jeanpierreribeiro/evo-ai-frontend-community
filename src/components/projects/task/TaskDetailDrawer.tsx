import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Send,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import type { Task, Column, Priority, Activity } from '@/types/projects';
import { projectsService } from '@/services/projects/projectsService';
import { cn } from '@/utils/cn';

interface Props {
  task: Task;
  columns: Column[];
  onClose: () => void;
  onTaskUpdate: () => void;
}

export const TaskDetailDrawer: React.FC<Props> = ({
  task: initialTask,
  columns,
  onClose,
  onTaskUpdate,
}) => {
  const [task, setTask] = useState<Task>(initialTask);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');

  // Inline edits
  const [title, setTitle] = useState(initialTask.title);
  const [description, setDescription] = useState(initialTask.description || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  // Subtasks
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Resources
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [isAddingResource, setIsAddingResource] = useState(false);

  // Time tracking
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [timeDesc, setTimeDesc] = useState('');
  const [isAddingTime, setIsAddingTime] = useState(false);

  // Comments
  const [commentText, setCommentText] = useState('');

  // Approval modal
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalData, setApprovalData] = useState<{ token: string; pin: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Reload task details with relations and comments
  const reloadTask = async () => {
    try {
      const fullTask = await projectsService.getTask(task.id);
      setTask(fullTask);
      setTitle(fullTask.title);
      setDescription(fullTask.description || '');
      onTaskUpdate();
    } catch (err) {
      console.error('Erro ao recarregar tarefa:', err);
    }
  };

  useEffect(() => {
    reloadTask();
  }, [task.id]);

  // Title save
  const handleTitleBlur = async () => {
    if (title.trim() && title !== task.title) {
      try {
        await projectsService.updateTask(task.id, { title: title.trim() });
        reloadTask();
      } catch (err) {
        console.error('Erro ao salvar título:', err);
      }
    }
  };

  // Description save
  const handleSaveDescription = async () => {
    try {
      await projectsService.updateTask(task.id, { description });
      setIsEditingDesc(false);
      reloadTask();
    } catch (err) {
      console.error('Erro ao salvar descrição:', err);
    }
  };

  // Status / Column change
  const handleStatusChange = async (colId: string) => {
    try {
      await projectsService.moveTask(task.id, colId, 0);
      reloadTask();
    } catch (err) {
      console.error('Erro ao alterar coluna:', err);
    }
  };

  // Priority change
  const handlePriorityChange = async (prio: Priority) => {
    try {
      await projectsService.updateTask(task.id, { priority: prio });
      reloadTask();
    } catch (err) {
      console.error('Erro ao alterar prioridade:', err);
    }
  };

  // Dates change
  const handleDateChange = async (field: 'startDate' | 'dueDate', value: string) => {
    try {
      await projectsService.updateTask(task.id, { [field]: value || null });
      reloadTask();
    } catch (err) {
      console.error('Erro ao salvar data:', err);
    }
  };

  // Subtask toggle
  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      await projectsService.updateSubtask(subtaskId, { completed });
      reloadTask();
    } catch (err) {
      console.error('Erro ao alternar subtarefa:', err);
    }
  };

  // Subtask add
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      await projectsService.addSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      reloadTask();
    } catch (err) {
      console.error('Erro ao adicionar subtarefa:', err);
    }
  };

  // Subtask delete
  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await projectsService.deleteSubtask(subtaskId);
      reloadTask();
    } catch (err) {
      console.error('Erro ao excluir subtarefa:', err);
    }
  };

  // Add Resource
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResourceTitle.trim() || !newResourceUrl.trim()) return;
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

  // Add Time Entry
  const handleAddTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timeMinutes <= 0) return;
    try {
      await projectsService.addTimeEntry(task.id, {
        durationMinutes: Number(timeMinutes),
        description: timeDesc.trim() || undefined,
      });
      setTimeDesc('');
      setIsAddingTime(false);
      reloadTask();
    } catch (err) {
      console.error('Erro ao apontar horas:', err);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await projectsService.addComment(task.id, commentText.trim());
      setCommentText('');
      reloadTask();
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err);
    }
  };

  // Generate Validation Link
  const handleGenerateApproval = async () => {
    try {
      const res = await projectsService.generateApprovalLink(task.id);
      setApprovalData({ token: res.approvalToken, pin: res.approvalPin });
      setApprovalModalOpen(true);
      reloadTask();
    } catch (err) {
      console.error('Erro ao gerar link de aprovação:', err);
    }
  };

  const copyTaskLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
  const totalTrackedMinutes = task.timeEntries?.reduce((acc, t) => acc + t.durationMinutes, 0) || 0;

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 z-50 bg-background border-l border-border shadow-2xl flex flex-col transition-all duration-200',
        isFullscreen ? 'w-full' : 'w-full sm:w-[680px] lg:w-[740px]'
      )}
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/60 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
          <span className="font-semibold text-foreground">
            {task.project?.name || 'Projeto'}
          </span>
          <span>/</span>
          <span className="font-bold text-primary">#{task.taskNumber}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Share for approval button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateApproval}
            className="text-xs h-7 flex items-center gap-1.5 text-primary border-primary/40 hover:bg-primary/10"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Validação do Cliente</span>
          </Button>

          <button
            onClick={copyTaskLink}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
            title="Copiar link"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
            title={isFullscreen ? 'Reduzir para Drawer' : 'Tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Drawer Body: 2 columns (Content + Properties Sidebar) */}
      <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
        {/* Left Column: Title, Description, Subtasks, Resources, Comments */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Approval Status Banner if active */}
          {task.approvalStatus === 'APPROVED' && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-xs text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Entrega Aprovada pelo Cliente</p>
                <p className="text-[11px] opacity-90">
                  Aprovada em {task.approvedAt ? new Date(task.approvedAt).toLocaleString('pt-BR') : ''}{' '}
                  {task.approvedIp ? `(IP: ${task.approvedIp})` : ''}
                </p>
              </div>
            </div>
          )}

          {task.approvalStatus === 'CHANGES_REQUESTED' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">O Cliente Solicitou Ajustes:</p>
                <p className="text-xs mt-1 bg-background/50 p-2 rounded border border-border/50">
                  "{task.approvalFeedback}"
                </p>
              </div>
            </div>
          )}

          {/* Title inline editable */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full text-xl font-bold bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-foreground py-1 transition-colors"
            />
          </div>

          {/* Description Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Descrição
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

            {/* Subtasks list */}
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
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add subtask form */}
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

          {/* Resources / External Links Section */}
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
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline truncate"
                    >
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-medium truncate">{res.title}</span>
                    </a>
                    <button
                      onClick={async () => {
                        await projectsService.removeResource(res.id);
                        reloadTask();
                      }}
                      className="p-1 text-muted-foreground hover:text-red-500 rounded"
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

          {/* Comments & Activity Tabs */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-3 border-b border-border pb-2">
              <button
                onClick={() => setActiveTab('comments')}
                className={cn(
                  'text-xs font-semibold pb-1 border-b-2 transition-colors',
                  activeTab === 'comments'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Comentários ({task.comments?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={cn(
                  'text-xs font-semibold pb-1 border-b-2 transition-colors',
                  activeTab === 'activity'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Histórico de Atividade
              </button>
            </div>

            {activeTab === 'comments' && (
              <div className="space-y-4">
                {/* Comments list */}
                <div className="space-y-2.5">
                  {task.comments?.map((comment) => (
                    <div key={comment.id} className="p-3 rounded-lg border border-border bg-card/60 text-xs space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-semibold text-foreground">{comment.userName}</span>
                        <span className="text-[10px]">
                          {new Date(comment.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))}
                </div>

                {/* Add comment */}
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

            {activeTab === 'activity' && (
              <div className="space-y-2">
                {task.activities?.map((act: Activity) => (
                  <div key={act.id} className="text-xs text-muted-foreground flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <div>
                      <span className="font-semibold text-foreground">{act.userName}</span>{' '}
                      {act.action} em {new Date(act.createdAt).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
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

          {/* Dates */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Data de Início
              </label>
              <input
                type="date"
                value={task.startDate ? task.startDate.split('T')[0] : ''}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-background border border-input rounded-md text-foreground"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Data de Vencimento
              </label>
              <input
                type="date"
                value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                onChange={(e) => handleDateChange('dueDate', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-background border border-input rounded-md text-foreground"
              />
            </div>
          </div>

          {/* Time Tracking */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Horas Apontadas</span>
              </span>
              <span className="font-bold text-foreground">
                {Math.floor(totalTrackedMinutes / 60)}h {totalTrackedMinutes % 60}m
              </span>
            </div>

            {!isAddingTime ? (
              <button
                onClick={() => setIsAddingTime(true)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Apontar Tempo</span>
              </button>
            ) : (
              <form onSubmit={handleAddTime} className="space-y-2 pt-1">
                <input
                  type="number"
                  value={timeMinutes}
                  onChange={(e) => setTimeMinutes(Number(e.target.value))}
                  placeholder="Minutos"
                  className="w-full px-2.5 py-1 text-xs bg-background border border-input rounded-md"
                />
                <input
                  type="text"
                  value={timeDesc}
                  onChange={(e) => setTimeDesc(e.target.value)}
                  placeholder="O que você fez?"
                  className="w-full px-2.5 py-1 text-xs bg-background border border-input rounded-md"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingTime(false)}
                    className="text-[10px] h-6 px-2"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" className="text-[10px] h-6 px-2">
                    Gravar
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Approval Link Modal */}
      {approvalModalOpen && approvalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Link de Validação do Cliente</h3>
              </div>
              <button
                onClick={() => setApprovalModalOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-muted-foreground">
                Envie o link abaixo para o seu cliente aprovar a entrega ou solicitar ajustes. Ele terá acesso
                apenas ao resumo desta tarefa mediante digitação do PIN.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  Link de Acesso
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/p/task/${approvalData.token}`}
                    className="w-full px-3 py-1.5 bg-muted rounded border border-border text-xs text-foreground font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/p/task/${approvalData.token}`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="text-xs h-8"
                  >
                    {copiedLink ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  Código de Validação (PIN)
                </label>
                <div className="flex items-center gap-2">
                  <div className="text-xl font-bold tracking-widest px-4 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg">
                    {approvalData.pin}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(approvalData.pin);
                      setCopiedPin(true);
                      setTimeout(() => setCopiedPin(false), 2000);
                    }}
                    className="text-xs h-8"
                  >
                    {copiedPin ? 'Copiado!' : 'Copiar PIN'}
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg text-muted-foreground text-[11px] leading-relaxed">
                💡 <strong>Dica para WhatsApp:</strong> Você pode enviar uma mensagem como: <br />
                <em>"Olá! Segue o link para validação da entrega: {window.location.origin}/p/task/{approvalData.token}. Seu PIN de acesso é {approvalData.pin}."</em>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setApprovalModalOpen(false)} size="sm">
                  Concluído
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
