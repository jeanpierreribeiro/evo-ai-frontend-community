import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Calendar, FolderKanban, ArrowUpRight } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { projectsService } from '@/services/projects/projectsService';
import type { Task, Priority } from '@/types/projects';
import { cn } from '@/utils/cn';

const priorityColors: Record<Priority, { label: string; bg: string; text: string }> = {
  NONE: { label: 'Sem prioridade', bg: 'bg-muted', text: 'text-muted-foreground' },
  LOW: { label: 'Baixa', bg: 'bg-blue-500/10', text: 'text-blue-500' },
  MEDIUM: { label: 'Média', bg: 'bg-amber-500/10', text: 'text-amber-500' },
  HIGH: { label: 'Alta', bg: 'bg-orange-500/10', text: 'text-orange-500' },
  URGENT: { label: 'Urgente', bg: 'bg-red-500/10', text: 'text-red-500' },
};

export const ProjectsMyTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    projectsService
      .getMyTasks(activeWorkspace.id)
      .then((data) => setTasks(data))
      .catch((err) => console.error('Erro ao carregar minhas tarefas:', err))
      .finally(() => setLoading(false));
  }, [activeWorkspace?.id]);

  return (
    <div className="flex-1 p-6 space-y-6 max-w-6xl mx-auto overflow-y-auto">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
          <CheckSquare className="w-4 h-4" />
          <span>Atribuições</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mt-1">Minhas Tarefas</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Todas as tarefas atribuídas a você no workspace{' '}
          <span className="font-semibold text-foreground">{activeWorkspace?.name}</span>.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Carregando suas tarefas...
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <CheckSquare className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">Nenhuma tarefa atribuída</p>
          <p className="text-xs text-muted-foreground mt-1">
            Você não possui tarefas pendentes atribuídas a você nesta empresa.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => {
            const prio = priorityColors[task.priority] || priorityColors.NONE;

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/projects/${task.projectId}/kanban`)}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-sm"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xs font-bold text-muted-foreground mt-0.5">
                    #{task.taskNumber}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {task.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      {task.project && (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <FolderKanban className="w-3.5 h-3.5 text-primary" />
                          {task.project.name}
                        </span>
                      )}
                      <span>•</span>
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', prio.bg, prio.text)}>
                    {prio.label}
                  </span>

                  {task.column && (
                    <span
                      className="px-2.5 py-1 text-xs font-medium rounded-md text-white shadow-sm"
                      style={{ backgroundColor: task.column.color || '#3b82f6' }}
                    >
                      {task.column.name}
                    </span>
                  )}

                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectsMyTasksPage;
