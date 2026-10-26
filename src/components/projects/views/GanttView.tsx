import React, { useMemo, useState } from 'react';
import { format, differenceInCalendarDays, addDays, subDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import type { Task } from '@/types/projects';
import { buildGanttTimeline, parseTaskDate } from '../gantt/timeline';
import { cn } from '@/utils/cn';

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const DAY_WIDTH_PX = 40;

export const GanttView: React.FC<Props> = ({ tasks, onTaskClick }) => {
  const [requestedStart, setRequestedStart] = useState<Date | null>(null);

  // Filter tasks with valid dates or synthesize default window for display
  const scheduledTasks = useMemo(() => {
    return tasks
      .map((t) => {
        const start = parseTaskDate(t.startDate) || (t.dueDate ? subDays(new Date(t.dueDate), 2) : new Date());
        const end = parseTaskDate(t.dueDate) || addDays(start, 3);
        return {
          ...t,
          scheduleStart: start < end ? start : end,
          scheduleEnd: end >= start ? end : start,
        };
      })
      .sort((a, b) => a.scheduleStart.getTime() - b.scheduleStart.getTime());
  }, [tasks]);

  const timeline = useMemo(() => {
    return buildGanttTimeline(scheduledTasks, 1, DAY_WIDTH_PX, requestedStart);
  }, [scheduledTasks, requestedStart]);

  if (!timeline) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-sm text-muted-foreground">
        Nenhuma tarefa com datas definidas para o Gráfico de Gantt.
      </div>
    );
  }

  const handlePrev = () => {
    setRequestedStart((prev) => subDays(prev || timeline.rangeStart, 14));
  };

  const handleNext = () => {
    setRequestedStart((prev) => addDays(prev || timeline.rangeStart, 14));
  };

  const handleToday = () => {
    setRequestedStart(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden select-none">
      {/* Gantt Toolbar */}
      <div className="p-3 border-b border-border bg-card/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs h-7">
            Hoje
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handlePrev} className="h-7 w-7 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNext} className="h-7 w-7 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-xs font-semibold text-foreground ml-2">
            {format(timeline.rangeStart, "MMMM 'de' yyyy", { locale: ptBR })} —{' '}
            {format(timeline.rangeEnd, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>

        <div className="text-xs text-muted-foreground">
          {scheduledTasks.length} tarefas mapeadas no cronograma
        </div>
      </div>

      {/* Main Gantt Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Fixed Column: Task Names */}
        <div className="w-64 border-r border-border bg-card flex flex-col flex-shrink-0 z-10 shadow-sm">
          <div className="h-14 border-b border-border px-4 flex items-center font-semibold text-xs text-muted-foreground uppercase tracking-wider bg-muted/40">
            Tarefa
          </div>
          <div className="flex-1 overflow-y-hidden divide-y divide-border/60">
            {scheduledTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => onTaskClick(t)}
                className="h-10 px-4 flex items-center justify-between text-xs font-medium hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] text-muted-foreground">#{t.taskNumber}</span>
                  <span className="truncate text-foreground">{t.title}</span>
                </div>
                {t.approvalStatus === 'APPROVED' && (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Scrollable Canvas: Days Timeline + Task Bars */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div
            style={{ width: `${timeline.days.length * DAY_WIDTH_PX}px` }}
            className="relative"
          >
            {/* Days Header */}
            <div className="h-14 border-b border-border bg-muted/30 flex sticky top-0 z-10">
              {timeline.days.map((day) => {
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    style={{ width: `${DAY_WIDTH_PX}px` }}
                    className={cn(
                      'border-r border-border/60 flex flex-col items-center justify-center text-[10px] flex-shrink-0',
                      today && 'bg-primary/10 font-bold text-primary'
                    )}
                  >
                    <span className="uppercase text-[9px] text-muted-foreground">
                      {format(day, 'EEE', { locale: ptBR }).slice(0, 3)}
                    </span>
                    <span className="font-semibold text-foreground">{format(day, 'd')}</span>
                  </div>
                );
              })}
            </div>

            {/* Task Rows & Bars */}
            <div className="divide-y divide-border/40 relative">
              {scheduledTasks.map((task) => {
                const startOffset = differenceInCalendarDays(task.scheduleStart, timeline.rangeStart);
                const duration = Math.max(1, differenceInCalendarDays(task.scheduleEnd, task.scheduleStart) + 1);

                const leftPx = startOffset * DAY_WIDTH_PX;
                const widthPx = duration * DAY_WIDTH_PX;

                const isVisible = leftPx + widthPx > 0 && leftPx < timeline.days.length * DAY_WIDTH_PX;

                return (
                  <div key={task.id} className="h-10 relative flex items-center">
                    {/* Background Day Grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {timeline.days.map((day) => (
                        <div
                          key={day.toISOString()}
                          style={{ width: `${DAY_WIDTH_PX}px` }}
                          className={cn(
                            'border-r border-border/20 h-full flex-shrink-0',
                            isToday(day) && 'bg-primary/5'
                          )}
                        />
                      ))}
                    </div>

                    {/* Task Bar */}
                    {isVisible && (
                      <div
                        onClick={() => onTaskClick(task)}
                        style={{
                          left: `${Math.max(0, leftPx)}px`,
                          width: `${Math.max(24, widthPx - 4)}px`,
                          backgroundColor: task.column?.color || '#3b82f6',
                        }}
                        className="absolute h-6 rounded-md px-2 flex items-center justify-between text-white text-xs font-semibold shadow-sm hover:brightness-110 cursor-pointer transition-all z-0 overflow-hidden"
                        title={`${task.title} (${format(task.scheduleStart, 'dd/MM')} - ${format(task.scheduleEnd, 'dd/MM')})`}
                      >
                        <span className="truncate pr-1">#{task.taskNumber} {task.title}</span>
                        {task.subtaskProgress !== undefined && task.subtaskProgress > 0 && (
                          <span className="text-[9px] opacity-80">{task.subtaskProgress}%</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
