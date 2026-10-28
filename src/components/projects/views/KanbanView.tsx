import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Column, Task, Priority } from '@/types/projects';
import { projectsService } from '@/services/projects/projectsService';
import { cn } from '@/utils/cn';

interface Props {
  projectId: string;
  columns: Column[];
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTasksChange: () => void;
  onOpenCreateTask: (columnId?: string) => void;
}

const priorityConfig: Record<Priority, { label: string; dot: string }> = {
  NONE: { label: '', dot: '' },
  LOW: { label: 'Baixa', dot: 'bg-blue-500' },
  MEDIUM: { label: 'Média', dot: 'bg-amber-500' },
  HIGH: { label: 'Alta', dot: 'bg-orange-500' },
  URGENT: { label: 'Urgente', dot: 'bg-red-500' },
};

export const KanbanView: React.FC<Props> = ({
  projectId,
  columns,
  tasks,
  onTaskClick,
  onTasksChange,
  onOpenCreateTask,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const handleMoveColumn = async (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const newCols = [...columns];
    const temp = newCols[index];
    newCols[index] = newCols[targetIndex];
    newCols[targetIndex] = temp;

    const payload = newCols.map((c, pos) => ({ id: c.id, position: (pos + 1) * 10 }));

    setIsReordering(true);
    setMoveError(null);
    try {
      await projectsService.reorderColumns(projectId, payload);
      onTasksChange();
    } catch (err: any) {
      console.error('Erro ao reordenar colunas:', err);
      setMoveError(
        err.response?.data?.message ||
          'Falha ao reordenar colunas. Apenas administradores podem alterar a ordem do fluxo.'
      );
      setTimeout(() => setMoveError(null), 5000);
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = (columnId: string) => {
    if (dragOverColumnId === columnId) {
      setDragOverColumnId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumnId(null);
    setMoveError(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.columnId === targetColumnId) return;

    try {
      // Move task to target column com reordenação transacional
      await projectsService.moveTask(taskId, targetColumnId, 9999);
      onTasksChange();
    } catch (err: any) {
      console.error('Erro ao mover tarefa:', err);
      // Rollback visual (E3.5-b / T11): restaura estado anterior renderizando dados reais do servidor
      setMoveError('Não foi possível mover a tarefa. A posição anterior foi restaurada.');
      onTasksChange();
      setTimeout(() => setMoveError(null), 5000);
    } finally {
      setDraggedTaskId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-[calc(100vh-180px)]">
      {moveError && (
        <div className="mx-4 mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-between">
          <span>{moveError}</span>
          <button
            onClick={() => setMoveError(null)}
            className="text-muted-foreground hover:text-foreground font-bold px-1"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex-1 overflow-x-auto p-4 flex items-start gap-4 select-none">
      {columns.map((column, index) => {
        const columnTasks = tasks
          .filter((t) => t.columnId === column.id)
          .sort((a, b) => a.position - b.position);

        const isOver = dragOverColumnId === column.id;

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={() => handleDragLeave(column.id)}
            onDrop={(e) => handleDrop(e, column.id)}
            className={cn(
              'w-80 flex-shrink-0 flex flex-col bg-muted/40 border border-border/80 rounded-xl p-3 transition-colors',
              isOver && 'bg-primary/5 border-primary/40 ring-2 ring-primary/20'
            )}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: column.color || '#94a3b8' }}
                />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider truncate">
                  {column.name}
                </h3>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground rounded-full flex-shrink-0">
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex items-center gap-0.5 flex-shrink-0">
                {/* Column Reordering buttons */}
                <button
                  type="button"
                  onClick={() => handleMoveColumn(index, 'left')}
                  disabled={index === 0 || isReordering}
                  className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed rounded hover:bg-muted transition-colors"
                  title="Mover coluna para a esquerda"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveColumn(index, 'right')}
                  disabled={index === columns.length - 1 || isReordering}
                  className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed rounded hover:bg-muted transition-colors"
                  title="Mover coluna para a direita"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenCreateTask(column.id)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors ml-0.5"
                  title="Adicionar tarefa nesta coluna"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cards List */}
            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
              {columnTasks.map((task) => {
                const prio = priorityConfig[task.priority];
                const hasSubtasks = (task.subtasks?.length || 0) > 0;
                const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
                const totalSubtasks = task.subtasks?.length || 0;

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onTaskClick(task)}
                    className={cn(
                      'p-3.5 rounded-lg border border-border bg-card shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2.5',
                      draggedTaskId === task.id && 'opacity-40 scale-95'
                    )}
                  >
                    {/* Top Row: Ticket ID + Priority */}
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="font-bold text-muted-foreground font-mono">
                        {task.displayCode || `#${task.taskNumber}`}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {prio.dot && (
                          <span
                            className={cn('w-2 h-2 rounded-full', prio.dot)}
                            title={`Prioridade: ${prio.label}`}
                          />
                        )}
                      </div>
                    </div>

                    {/* Task Title */}
                    <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                      {task.title}
                    </h4>

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Subtasks Progress Bar */}
                    {hasSubtasks && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckSquare className="w-3 h-3" />
                            {completedSubtasks}/{totalSubtasks}
                          </span>
                          <span>{Math.round((completedSubtasks / totalSubtasks) * 100)}%</span>
                        </div>
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Card Footer: Due Date & Assignee */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-[10px]">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {(task._count?.comments || 0) > 0 && (
                          <span className="flex items-center gap-1 text-[10px]">
                            <MessageSquare className="w-3 h-3" />
                            {task._count?.comments}
                          </span>
                        )}
                        {(task.resources?.length || 0) > 0 && (
                          <span className="flex items-center gap-1 text-[10px]">
                            <Paperclip className="w-3 h-3" />
                            {task.resources?.length}
                          </span>
                        )}
                      </div>

                      {task.assigneeName ? (
                        <div
                          className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center"
                          title={task.assigneeName}
                        >
                          {task.assigneeName.charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60">—</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {columnTasks.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground/60 border border-dashed border-border/60 rounded-lg">
                  Sem tarefas nesta coluna
                </div>
              )}
            </div>

            {/* Quick Add Button at bottom of column */}
            <button
              onClick={() => onOpenCreateTask(column.id)}
              className="mt-2.5 py-1.5 px-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        );
      })}
      </div>
    </div>
  );
};
