import React, { useState } from 'react';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import type { Task } from '@/types/projects';
import { cn } from '@/utils/cn';

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export const CalendarView: React.FC<Props> = ({ tasks, onTaskClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden p-6 select-none">
      {/* Month Toolbar */}
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-lg font-bold text-foreground capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs h-8 mr-1"
          >
            Hoje
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-t border-l border-border bg-muted/40">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold text-muted-foreground border-r border-b border-border uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 flex-1 border-l border-border bg-card">
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
                    'w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full',
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

              <div className="flex-1 space-y-1 overflow-y-auto max-h-24">
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onTaskClick(t)}
                    style={{ backgroundColor: t.column?.color || '#3b82f6' }}
                    className="px-2 py-0.5 rounded text-[11px] font-medium text-white truncate shadow-xs cursor-pointer hover:brightness-110"
                    title={t.title}
                  >
                    #{t.taskNumber} {t.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
