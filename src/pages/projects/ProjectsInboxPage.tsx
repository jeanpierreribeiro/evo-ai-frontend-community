import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  CheckCheck,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { projectsService } from '@/services/projects/projectsService';
import type { Notification } from '@/types/projects';
import { cn } from '@/utils/cn';

export const ProjectsInboxPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all');

  const loadInbox = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const params =
        filter === 'archived'
          ? { archived: true }
          : filter === 'unread'
          ? { unreadOnly: true }
          : {};
      const data = await projectsService.getInbox(activeWorkspace.id, params);
      setNotifications(data || []);
    } catch (err) {
      console.error('Erro ao carregar inbox:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, filter]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await projectsService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  };

  const handleArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await projectsService.archiveNotification(id);
      // Remove da lista se visualizando ativas
      if (filter !== 'archived') {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        loadInbox();
      }
    } catch (err) {
      console.error('Erro ao arquivar notificação:', err);
    }
  };

  const handleUnarchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await projectsService.unarchiveNotification(id);
      if (filter === 'archived') {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        loadInbox();
      }
    } catch (err) {
      console.error('Erro ao desarquivar notificação:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!activeWorkspace?.id) return;
    try {
      await projectsService.markAllNotificationsRead(activeWorkspace.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  const handleItemClick = (item: Notification) => {
    const targetTaskId = item.taskId || item.task?.id;
    if (targetTaskId) {
      navigate(`/projects/tasks/${targetTaskId}`);
    } else if (item.task?.projectId) {
      navigate(`/projects/${item.task.projectId}/kanban`);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
            <Inbox className="w-4 h-4" />
            <span>Notificações da Empresa</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">Caixa de Entrada</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Avisos de aprovações de clientes, alterações de status e atribuições de tarefas.
          </p>
        </div>

        {filter !== 'archived' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={notifications.every((n) => n.isRead)}
              className="flex items-center gap-2 text-xs"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Marcar todas como lidas</span>
            </Button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
            filter === 'all'
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
            filter === 'unread'
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          Não lidas
        </button>
        <button
          onClick={() => setFilter('archived')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5',
            filter === 'archived'
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Arquivadas</span>
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Carregando notificações...
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Inbox className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">
            {filter === 'archived' ? 'Nenhuma notificação arquivada.' : 'Caixa de entrada limpa!'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter === 'archived'
              ? 'Notificações arquivadas para consulta futura aparecerão aqui.'
              : 'Você não possui notificações pendentes no momento.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                'p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 group shadow-xs',
                item.isRead
                  ? 'bg-card border-border/60 hover:bg-muted/30 text-muted-foreground'
                  : 'bg-primary/5 border-primary/30 hover:bg-primary/10 text-foreground'
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={cn(
                    'p-2 rounded-lg mt-0.5 flex-shrink-0',
                    item.type === 'approved' && 'bg-emerald-500/10 text-emerald-500',
                    item.type === 'changes_requested' && 'bg-amber-500/10 text-amber-500',
                    item.type === 'comment' && 'bg-blue-500/10 text-blue-500',
                    item.type === 'assignment' && 'bg-purple-500/10 text-purple-500'
                  )}
                >
                  {item.type === 'approved' && <CheckCircle2 className="w-4 h-4" />}
                  {item.type === 'changes_requested' && <AlertCircle className="w-4 h-4" />}
                  {item.type === 'comment' && <MessageSquare className="w-4 h-4" />}
                  {item.type === 'assignment' && <Inbox className="w-4 h-4" />}
                  {!['approved', 'changes_requested', 'comment', 'assignment'].includes(item.type) && (
                    <Inbox className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold">{item.title}</h4>
                  <p className="text-xs mt-0.5">{item.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString('pt-BR')}
                    </span>
                    {(item.taskId || item.task) && (
                      <span className="text-[10px] text-primary font-medium hover:underline">
                        • Abrir Tarefa
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {!item.isRead && filter !== 'archived' && (
                  <button
                    onClick={(e) => handleMarkAsRead(item.id, e)}
                    className="text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                    title="Marcar como lida"
                  >
                    Marcar como lida
                  </button>
                )}

                {filter === 'archived' ? (
                  <button
                    onClick={(e) => handleUnarchive(item.id, e)}
                    className="p-1.5 text-muted-foreground hover:text-primary rounded hover:bg-muted/50 transition-colors"
                    title="Desarquivar notificação"
                  >
                    <ArchiveRestore className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => handleArchive(item.id, e)}
                    className="p-1.5 text-muted-foreground hover:text-primary rounded hover:bg-muted/50 transition-colors"
                    title="Arquivar notificação"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsInboxPage;
