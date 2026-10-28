import React, { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import type { Task } from '@/types/projects';
import { cn } from '@/utils/cn';

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export const CalendarView: React.FC<Props> = ({ tasks, onTaskClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showNoDueDate, setShowNoDueDate] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const tasksWithoutDueDate = useMemo(() => {
    return tasks.filter((t) => !t.dueDate);
  }, [tasks]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden p-4 select-none">
      {/* Month Toolbar */}
      <div className="flex flex-wrap items-center justify-between pb-3 gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-foreground capitalize flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <span>{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
              className="text-xs h-7 mr-1"
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="h-7 w-7 p-0"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="h-7 w-7 p-0"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Without Due Date Trigger */}
        <div className="flex items-center gap-2">
          {tasksWithoutDueDate.length > 0 && (
            <Button
              variant={showNoDueDate ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowNoDueDate(!showNoDueDate)}
              className="text-xs h-7 flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Sem data de entrega ({tasksWithoutDueDate.length})</span>
              {showNoDueDate ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-t border-l border-border bg-muted/40 flex-shrink-0">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div
            key={day}
            className="py-1.5 text-center text-[11px] font-semibold text-muted-foreground border-r border-b border-border uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 flex-1 border-l border-border bg-card overflow-y-auto">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const dayTasks = tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day));

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-24 p-2 border-r border-b border-border/80 flex flex-col transition-colors',
                !isCurrentMonth && 'bg-muted/10 opacity-40',
                isToday(day) && 'bg-primary/5'
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={cn(
                    'w-5 h-5 flex items-center justify-center text-xs font-semibold rounded-full',
                    isToday(day) ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {dayTasks.length} {dayTasks.length === 1 ? 'tarefa' : 'tarefas'}
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto max-h-28 pr-0.5">
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onTaskClick(t)}
                    style={{ backgroundColor: t.column?.color || '#3b82f6' }}
                    className="px-2 py-0.5 rounded text-[11px] font-medium text-white truncate shadow-xs cursor-pointer hover:brightness-110"
                    title={`${t.displayCode || `#${t.taskNumber}`} ${t.title}`}
                  >
                    {t.displayCode || `#${t.taskNumber}`} {t.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Collapsible Drawer for Tasks Without Due Date */}
      {showNoDueDate && tasksWithoutDueDate.length > 0 && (
        <div className="mt-3 border border-border bg-muted/30 rounded-xl p-3 max-h-48 overflow-y-auto flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Tarefas sem data de entrega ({tasksWithoutDueDate.length})</span>
            </h4>
            <span className="text-[10px] text-muted-foreground">
              Clique em uma tarefa para abrir os detalhes e planejar o vencimento.
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {tasksWithoutDueDate.map((t) => (
              <div
                key={t.id}
                onClick={() => onTaskClick(t)}
                className="p-2 rounded-lg bg-card border border-border hover:border-primary/50 cursor-pointer text-xs flex items-center justify-between gap-2 transition-colors shadow-xs"
              >
                <div className="truncate flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {t.displayCode || `#${t.taskNumber}`}
                  </span>
                  <span className="truncate text-foreground font-medium">{t.title}</span>
                </div>
                {t.column && (
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] text-white flex-shrink-0"
                    style={{ backgroundColor: t.column.color || '#94a3b8' }}
                  >
                    {t.column.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
