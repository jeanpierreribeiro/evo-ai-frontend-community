import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, CheckCircle2, MessageSquare, AlertCircle, CheckCheck } from 'lucide-react';
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
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadInbox = () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    projectsService
      .getInbox(activeWorkspace.id)
      .then((data) => setNotifications(data))
      .catch((err) => console.error('Erro ao carregar inbox:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInbox();
  }, [activeWorkspace?.id]);

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

  const handleMarkAllRead = async () => {
    if (!activeWorkspace?.id) return;
    try {
      await projectsService.markAllNotificationsRead(activeWorkspace.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.isRead : true));

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
            Acompanhe avisos de aprovações de clientes, menções e atribuições de tarefas.
          </p>
        </div>

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
          Todas ({notifications.length})
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
          Não lidas ({notifications.filter((n) => !n.isRead).length})
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Carregando notificações...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Inbox className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">Caixa de entrada limpa!</p>
          <p className="text-xs text-muted-foreground mt-1">
            Você não possui notificações pendentes no momento.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.task?.projectId) {
                  navigate(`/projects/${item.task.projectId}/kanban`);
                }
              }}
              className={cn(
                'p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 group',
                item.isRead
                  ? 'bg-card border-border/60 hover:bg-muted/30 text-muted-foreground'
                  : 'bg-primary/5 border-primary/30 hover:bg-primary/10 text-foreground shadow-sm'
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={cn(
                    'p-2 rounded-lg mt-0.5',
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
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {new Date(item.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {!item.isRead && (
                <button
                  onClick={(e) => handleMarkAsRead(item.id, e)}
                  className="text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded hover:bg-muted/50"
                  title="Marcar como lida"
                >
                  Marcar como lida
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsInboxPage;
