import React from 'react';
import { Calendar, CheckSquare, MessageSquare, ShieldCheck, AlertCircle } from 'lucide-react';
import type { Column, Task, Priority } from '@/types/projects';
import { cn } from '@/utils/cn';

interface Props {
  columns: Column[];
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onOpenCreateTask: () => void;
}

const priorityConfig: Record<Priority, { label: string; badge: string }> = {
  NONE: { label: 'Sem prioridade', badge: 'bg-muted text-muted-foreground' },
  LOW: { label: 'Baixa', badge: 'bg-blue-500/10 text-blue-500' },
  MEDIUM: { label: 'Média', badge: 'bg-amber-500/10 text-amber-500' },
  HIGH: { label: 'Alta', badge: 'bg-orange-500/10 text-orange-500' },
  URGENT: { label: 'Urgente', badge: 'bg-red-500/10 text-red-500' },
};

export const ListView: React.FC<Props> = ({ tasks, onTaskClick }) => {
  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="py-3 px-4 w-16">ID</th>
              <th className="py-3 px-4">Título</th>
              <th className="py-3 px-4 w-36">Status</th>
              <th className="py-3 px-4 w-28">Prioridade</th>
              <th className="py-3 px-4 w-32">Responsável</th>
              <th className="py-3 px-4 w-28">Entrega</th>
              <th className="py-3 px-4 w-28">Checklist</th>
              <th className="py-3 px-4 w-28 text-right">Validação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted-foreground">
                  Nenhuma tarefa encontrada neste projeto.
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const prio = priorityConfig[task.priority] || priorityConfig.NONE;
                const totalSubtasks = task.subtasks?.length || 0;
                const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;

                return (
                  <tr
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-muted-foreground">
                      #{task.taskNumber}
                    </td>

                    <td className="py-3 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-md">{task.title}</span>
                        {(task._count?.comments || 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <MessageSquare className="w-3 h-3" />
                            {task._count?.comments}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {task.column && (
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-medium text-white shadow-xs"
                          style={{ backgroundColor: task.column.color || '#3b82f6' }}
                        >
                          {task.column.name}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium', prio.badge)}>
                        {prio.label}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground">
                      {task.assigneeName ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-primary/20 text-primary font-bold text-[9px] flex items-center justify-center">
                            {task.assigneeName.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-24 text-foreground">{task.assigneeName}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3 px-4 text-muted-foreground">
                      {task.dueDate ? (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3 px-4 text-muted-foreground">
                      {totalSubtasks > 0 ? (
                        <span className="flex items-center gap-1">
                          <CheckSquare className="w-3 h-3 text-primary" />
                          {completedSubtasks}/{totalSubtasks}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {task.approvalStatus === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                          <ShieldCheck className="w-3 h-3" />
                          Aprovado
                        </span>
                      )}
                      {task.approvalStatus === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                          Em Validação
                        </span>
                      )}
                      {task.approvalStatus === 'CHANGES_REQUESTED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          Ajustes
                        </span>
                      )}
                      {(!task.approvalStatus || task.approvalStatus === 'NONE') && (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
