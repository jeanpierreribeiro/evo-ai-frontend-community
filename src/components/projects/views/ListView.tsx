import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Filter,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import type { Column, Task, Priority } from '@/types/projects';
import { cn } from '@/utils/cn';

interface Props {
  columns: Column[];
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onOpenCreateTask: () => void;
}

const priorityConfig: Record<Priority, { label: string; badge: string; weight: number }> = {
  NONE: { label: 'Sem prioridade', badge: 'bg-muted text-muted-foreground', weight: 0 },
  LOW: { label: 'Baixa', badge: 'bg-blue-500/10 text-blue-500', weight: 1 },
  MEDIUM: { label: 'Média', badge: 'bg-amber-500/10 text-amber-500', weight: 2 },
  HIGH: { label: 'Alta', badge: 'bg-orange-500/10 text-orange-500', weight: 3 },
  URGENT: { label: 'Urgente', badge: 'bg-red-500/10 text-red-500', weight: 4 },
};

type SortField = 'id' | 'title' | 'status' | 'priority' | 'assignee' | 'dueDate';
type SortDirection = 'asc' | 'desc';

export const ListView: React.FC<Props> = ({
  columns,
  tasks,
  onTaskClick,
  onOpenCreateTask,
}) => {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Unique assignees for filter
  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) {
      if (t.assigneeId && t.assigneeName) {
        map.set(t.assigneeId, t.assigneeName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'priority' ? 'desc' : 'asc');
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedColumnId !== 'all' ||
    selectedPriority !== 'all' ||
    selectedAssignee !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedColumnId('all');
    setSelectedPriority('all');
    setSelectedAssignee('all');
  };

  // Filtered & Sorted Tasks
  const processedTasks = useMemo(() => {
    let result = [...tasks];

    // Filter by text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.taskNumber.toString().includes(q) ||
          (t.displayCode && t.displayCode.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Filter by column/status
    if (selectedColumnId !== 'all') {
      result = result.filter((t) => t.columnId === selectedColumnId);
    }

    // Filter by priority
    if (selectedPriority !== 'all') {
      result = result.filter((t) => t.priority === selectedPriority);
    }

    // Filter by assignee
    if (selectedAssignee === 'unassigned') {
      result = result.filter((t) => !t.assigneeId);
    } else if (selectedAssignee !== 'all') {
      result = result.filter((t) => t.assigneeId === selectedAssignee);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'id':
          comparison = a.taskNumber - b.taskNumber;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title, 'pt-BR');
          break;
        case 'status':
          const colA = a.column?.position ?? 0;
          const colB = b.column?.position ?? 0;
          comparison = colA - colB;
          break;
        case 'priority':
          const pA = priorityConfig[a.priority]?.weight ?? 0;
          const pB = priorityConfig[b.priority]?.weight ?? 0;
          comparison = pA - pB;
          break;
        case 'assignee':
          const nameA = a.assigneeName || '';
          const nameB = b.assigneeName || '';
          comparison = nameA.localeCompare(nameB, 'pt-BR');
          break;
        case 'dueDate':
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = dateA - dateB;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [tasks, searchQuery, selectedColumnId, selectedPriority, selectedAssignee, sortField, sortDirection]);

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 inline ml-1 text-primary" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-1 text-primary" />
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden p-4 space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-xs space-y-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-56">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, código ou ID..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status/Column Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedColumnId}
              onChange={(e) => setSelectedColumnId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              <option value="all">Todas as Colunas ({columns.length})</option>
              {columns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              <option value="all">Todas as Prioridades</option>
              <option value="URGENT">Urgente</option>
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Média</option>
              <option value="LOW">Baixa</option>
              <option value="NONE">Sem prioridade</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              <option value="all">Todos os Responsáveis</option>
              <option value="unassigned">Sem responsável</option>
              {assignees.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </Button>
          )}

          {/* Add Task Quick Action */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {processedTasks.length} {processedTasks.length === 1 ? 'tarefa' : 'tarefas'}
              {tasks.length !== processedTasks.length && ` (de ${tasks.length})`}
            </span>
            <Button onClick={onOpenCreateTask} size="sm" className="text-xs h-8">
              Nova Tarefa
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs">
              <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-4 w-20 cursor-pointer hover:text-foreground transition-colors"
                >
                  ID {renderSortIndicator('id')}
                </th>
                <th
                  onClick={() => handleSort('title')}
                  className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                >
                  Título {renderSortIndicator('title')}
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 w-36 cursor-pointer hover:text-foreground transition-colors"
                >
                  Status {renderSortIndicator('status')}
                </th>
                <th
                  onClick={() => handleSort('priority')}
                  className="py-3 px-4 w-28 cursor-pointer hover:text-foreground transition-colors"
                >
                  Prioridade {renderSortIndicator('priority')}
                </th>
                <th
                  onClick={() => handleSort('assignee')}
                  className="py-3 px-4 w-36 cursor-pointer hover:text-foreground transition-colors"
                >
                  Responsável {renderSortIndicator('assignee')}
                </th>
                <th
                  onClick={() => handleSort('dueDate')}
                  className="py-3 px-4 w-32 cursor-pointer hover:text-foreground transition-colors"
                >
                  Entrega {renderSortIndicator('dueDate')}
                </th>
                <th className="py-3 px-4 w-24">Checklist</th>
                <th className="py-3 px-4 w-28 text-right">Validação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {processedTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    <Filter className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm font-medium">Nenhuma tarefa encontrada.</p>
                    {hasActiveFilters && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Tente ajustar os filtros ou a busca textual.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                processedTasks.map((task) => {
                  const prio = priorityConfig[task.priority] || priorityConfig.NONE;
                  const totalSubtasks = task.subtasks?.length || 0;
                  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-bold font-mono text-muted-foreground">
                        {task.displayCode || `#${task.taskNumber}`}
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
                            className="px-2 py-0.5 rounded text-[11px] font-medium text-white shadow-xs inline-block"
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
                            <span className="truncate max-w-28 text-foreground">{task.assigneeName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-muted-foreground">
                        {task.dueDate ? (
                          <span className="flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-muted-foreground">
                        {totalSubtasks > 0 ? (
                          <span className="flex items-center gap-1 text-[11px]">
                            <CheckSquare className="w-3 h-3 text-primary" />
                            {completedSubtasks}/{totalSubtasks}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
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
    </div>
  );
};
