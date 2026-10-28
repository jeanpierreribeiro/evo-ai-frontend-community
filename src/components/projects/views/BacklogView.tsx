import React from 'react';
import { Layers, Plus, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import type { Project, Column, Task, Priority } from '@/types/projects';
import { projectsService } from '@/services/projects/projectsService';
import { cn } from '@/utils/cn';

interface Props {
  project?: Project | null;
  columns: Column[];
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTasksChange: () => void;
  onOpenCreateTask: (columnId?: string) => void;
}

const priorityColors: Record<Priority, { label: string; dot: string }> = {
  NONE: { label: 'Sem prioridade', dot: 'bg-muted-foreground/40' },
  LOW: { label: 'Baixa', dot: 'bg-blue-500' },
  MEDIUM: { label: 'Média', dot: 'bg-amber-500' },
  HIGH: { label: 'Alta', dot: 'bg-orange-500' },
  URGENT: { label: 'Urgente', dot: 'bg-red-500' },
};

export const BacklogView: React.FC<Props> = ({
  project,
  columns,
  tasks,
  onTaskClick,
  onTasksChange,
  onOpenCreateTask,
}) => {
  // Precedência E3.10-c:
  // 1. project.backlogColumnId explicitamente configurado nas opções do projeto
  // 2. Coluna cujo nome contenha 'backlog'
  // 3. Primeira coluna do projeto
  const backlogColumn =
    (project?.backlogColumnId
      ? columns.find((c) => c.id === project.backlogColumnId)
      : null) ||
    columns.find((c) => c.name.toLowerCase().includes('backlog')) ||
    columns[0];

  const targetColumns = columns.filter((c) => c.id !== backlogColumn?.id);
  const backlogTasks = tasks.filter((t) => t.columnId === backlogColumn?.id);

  const handleMoveToColumn = async (e: React.MouseEvent, taskId: string, targetColId: string) => {
    e.stopPropagation();
    try {
      await projectsService.moveTask(taskId, targetColId, 0);
      onTasksChange();
    } catch (err) {
      console.error('Erro ao mover tarefa do backlog:', err);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto overflow-y-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span>Triagem de Backlog</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Coluna ativa:{' '}
            <span className="font-semibold text-foreground">
              {backlogColumn?.name || 'Não definida'}
            </span>
            {project?.backlogColumnId && ' (configurada nas opções do projeto)'}
            {' — '}Demandas que aguardam priorização para entrar no fluxo de sprint.
          </p>
        </div>

        <Button
          onClick={() => onOpenCreateTask(backlogColumn?.id)}
          size="sm"
          className="flex items-center gap-1.5 text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Ideia / Demanda</span>
        </Button>
      </div>

      {backlogTasks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Layers className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">Backlog Vazio!</p>
          <p className="text-xs text-muted-foreground mt-1">
            Todas as demandas da coluna "{backlogColumn?.name}" já foram priorizadas para as colunas ativas.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {backlogTasks.map((task) => {
            const prio = priorityColors[task.priority] || priorityColors.NONE;

            return (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="p-3.5 bg-card border border-border rounded-xl hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', prio.dot)} />
                  <span className="text-xs font-bold font-mono text-muted-foreground flex-shrink-0">
                    {task.displayCode || `#${task.taskNumber}`}
                  </span>
                  <span className="text-xs font-semibold text-foreground truncate">
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {task.dueDate && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                    </span>
                  )}

                  {/* Quick move buttons into other workflow columns */}
                  <div className="flex items-center gap-1.5">
                    {targetColumns.slice(0, 3).map((col) => (
                      <button
                        key={col.id}
                        onClick={(e) => handleMoveToColumn(e, task.id, col.id)}
                        className="px-2 py-1 text-[10px] font-medium rounded border border-border/80 bg-background hover:bg-primary/10 hover:border-primary/40 text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                        title={`Mover para "${col.name}"`}
                      >
                        <span>{col.name}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
