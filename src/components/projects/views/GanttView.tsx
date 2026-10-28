import React, { useMemo, useState } from 'react';
import {
  format,
  differenceInCalendarDays,
  addDays,
  subDays,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Flag,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import type { Task } from '@/types/projects';
import { buildGanttTimeline, parseTaskDate } from '../gantt/timeline';
import { cn } from '@/utils/cn';

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const DAY_WIDTH_PX = 40;

interface ScheduledItem {
  task: Task;
  scheduleStart: Date;
  scheduleEnd: Date;
  hasConflict: boolean;
  conflictReason?: string;
}

interface DueOnlyItem {
  task: Task;
  dueDate: Date;
  scheduleStart: Date;
  scheduleEnd: Date;
  hasConflict: boolean;
  conflictReason?: string;
}

export const GanttView: React.FC<Props> = ({ tasks, onTaskClick }) => {
  const [requestedStart, setRequestedStart] = useState<Date | null>(null);
  const [showUnscheduled, setShowUnscheduled] = useState(true);

  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  // DP11 / U0: Invariante inviolável de fidelidade temporal.
  // Categorização estrita: NUNCA sintetizar datas falsas (new Date() ou dueDate - 2).
  const {
    scheduledItems,
    dueOnlyItems,
    unscheduledTasks,
    invalidDateTasks,
    timelineTasks,
  } = useMemo(() => {
    const scheduled: ScheduledItem[] = [];
    const dueOnly: DueOnlyItem[] = [];
    const unscheduled: Task[] = [];
    const invalid: Array<{ task: Task; reason: string }> = [];

    // Helper to evaluate dependency conflicts (BLOCKS / BLOCKED_BY)
    const evaluateConflict = (
      task: Task,
      taskStartDate: Date | null
    ): { hasConflict: boolean; reason?: string } => {
      if (!taskStartDate) return { hasConflict: false };

      if (task.relations) {
        for (const rel of task.relations) {
          if (rel.type === 'BLOCKED_BY') {
            const pred = taskMap.get(rel.relatedTask?.id);
            const predEnd = pred ? parseTaskDate(pred.dueDate || pred.startDate) : null;
            if (predEnd && taskStartDate < predEnd) {
              return {
                hasConflict: true,
                reason: `Conflito de cronograma: Predecessora #${rel.relatedTask?.taskNumber || pred?.taskNumber} vence em ${format(predEnd, 'dd/MM/yyyy')}, após o início desta tarefa.`,
              };
            }
          }
        }
      }

      for (const other of tasks) {
        if (other.id === task.id) continue;
        if (other.relations) {
          for (const rel of other.relations) {
            if (rel.type === 'BLOCKS' && rel.relatedTask?.id === task.id) {
              const predEnd = parseTaskDate(other.dueDate || other.startDate);
              if (predEnd && taskStartDate < predEnd) {
                return {
                  hasConflict: true,
                  reason: `Conflito de cronograma: Predecessora #${other.taskNumber} vence em ${format(predEnd, 'dd/MM/yyyy')}, após o início desta tarefa.`,
                };
              }
            }
          }
        }
      }

      return { hasConflict: false };
    };

    for (const t of tasks) {
      const start = parseTaskDate(t.startDate);
      const end = parseTaskDate(t.dueDate);

      if (start && end) {
        if (start > end) {
          invalid.push({
            task: t,
            reason: `Data de início (${format(start, 'dd/MM/yyyy')}) posterior à entrega (${format(end, 'dd/MM/yyyy')})`,
          });
        } else {
          const conflict = evaluateConflict(t, start);
          scheduled.push({
            task: t,
            scheduleStart: start,
            scheduleEnd: end,
            hasConflict: conflict.hasConflict,
            conflictReason: conflict.reason,
          });
        }
      } else if (end && !start) {
        const conflict = evaluateConflict(t, end);
        dueOnly.push({
          task: t,
          dueDate: end,
          scheduleStart: end,
          scheduleEnd: end,
          hasConflict: conflict.hasConflict,
          conflictReason: conflict.reason,
        });
      } else {
        unscheduled.push(t);
      }
    }

    scheduled.sort((a, b) => a.scheduleStart.getTime() - b.scheduleStart.getTime());
    dueOnly.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const forTimeline = [
      ...scheduled.map((s) => ({ scheduleStart: s.scheduleStart, scheduleEnd: s.scheduleEnd })),
      ...dueOnly.map((d) => ({ scheduleStart: d.scheduleStart, scheduleEnd: d.scheduleEnd })),
    ];

    return {
      scheduledItems: scheduled,
      dueOnlyItems: dueOnly,
      unscheduledTasks: unscheduled,
      invalidDateTasks: invalid,
      timelineTasks: forTimeline,
    };
  }, [tasks, taskMap]);

  const timeline = useMemo(() => {
    return buildGanttTimeline(timelineTasks, 1, DAY_WIDTH_PX, requestedStart);
  }, [timelineTasks, requestedStart]);

  const handlePrev = () => {
    setRequestedStart((prev) => subDays(prev || timeline.rangeStart, 14));
  };

  const handleNext = () => {
    setRequestedStart((prev) => addDays(prev || timeline.rangeStart, 14));
  };

  const handleToday = () => {
    setRequestedStart(null);
  };

  const totalVisibleOnTimeline = scheduledItems.length + dueOnlyItems.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden select-none">
      {/* Gantt Toolbar */}
      <div className="p-3 border-b border-border bg-card/60 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs h-7">
            Hoje
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handlePrev} className="h-7 w-7 p-0" title="Voltar 14 dias">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNext} className="h-7 w-7 p-0" title="Avançar 14 dias">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-xs font-semibold text-foreground ml-2 capitalize">
            {format(timeline.rangeStart, "MMMM 'de' yyyy", { locale: ptBR })} —{' '}
            {format(timeline.rangeEnd, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded bg-primary inline-block" />
            <span>Período Planejado ({scheduledItems.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5 text-amber-500 inline-block" />
            <span>Apenas Prazo ({dueOnlyItems.length})</span>
          </div>
          {invalidDateTasks.length > 0 && (
            <div className="flex items-center gap-1 text-red-500 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{invalidDateTasks.length} com datas invertidas</span>
            </div>
          )}
          {unscheduledTasks.length > 0 && (
            <button
              onClick={() => setShowUnscheduled(!showUnscheduled)}
              className="flex items-center gap-1 text-xs text-primary hover:underline ml-2"
            >
              <span>Sem datas ({unscheduledTasks.length})</span>
              {showUnscheduled ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Gantt Canvas with Synchronous Left Sticky Column */}
      <div className="flex-1 overflow-auto bg-card relative">
        <div style={{ minWidth: `${256 + timeline.days.length * DAY_WIDTH_PX}px` }}>
          {/* Timeline Header Row (Sticky Top) */}
          <div className="sticky top-0 z-20 flex border-b border-border bg-muted/60 backdrop-blur-xs">
            {/* Top Left Corner (Sticky Left + Top) */}
            <div className="sticky left-0 z-30 w-64 bg-muted/90 px-4 h-12 flex items-center justify-between border-r border-border font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              <span>Tarefa</span>
              <span className="text-[10px] font-normal lowercase">({totalVisibleOnTimeline})</span>
            </div>

            {/* Days Header */}
            <div className="flex">
              {timeline.days.map((day) => {
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    style={{ width: `${DAY_WIDTH_PX}px` }}
                    className={cn(
                      'border-r border-border/50 h-12 flex flex-col items-center justify-center text-[10px] flex-shrink-0',
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
          </div>

          {/* Timeline Body Rows */}
          {totalVisibleOnTimeline === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Nenhuma tarefa com datas definidas para este intervalo no cronograma.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {/* Scheduled Tasks (Start -> End) */}
              {scheduledItems.map(({ task, scheduleStart, scheduleEnd, hasConflict, conflictReason }) => {
                const startOffset = differenceInCalendarDays(scheduleStart, timeline.rangeStart);
                const duration = Math.max(1, differenceInCalendarDays(scheduleEnd, scheduleStart) + 1);

                const leftPx = startOffset * DAY_WIDTH_PX;
                const widthPx = duration * DAY_WIDTH_PX;
                const isVisible = leftPx + widthPx > 0 && leftPx < timeline.days.length * DAY_WIDTH_PX;

                return (
                  <div key={task.id} className="flex h-10 hover:bg-muted/30 transition-colors group">
                    {/* Fixed Left Task Name (Sticky Left) */}
                    <div
                      onClick={() => onTaskClick(task)}
                      className="sticky left-0 z-10 w-64 bg-card group-hover:bg-muted/40 px-4 flex items-center justify-between text-xs font-medium border-r border-border cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {task.displayCode || `#${task.taskNumber}`}
                        </span>
                        <span className="truncate text-foreground">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        {hasConflict && (
                          <span title={conflictReason}>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          </span>
                        )}
                        {task.approvalStatus === 'APPROVED' && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                    </div>

                    {/* Timeline Canvas Row */}
                    <div className="relative flex items-center flex-1">
                      {/* Background Day Grid Lines */}
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

                      {/* Real Duration Task Bar */}
                      {isVisible && (
                        <div
                          onClick={() => onTaskClick(task)}
                          style={{
                            left: `${Math.max(0, leftPx)}px`,
                            width: `${Math.max(24, widthPx - 4)}px`,
                            backgroundColor: task.column?.color || '#3b82f6',
                          }}
                          className={cn(
                            'absolute h-6 rounded-md px-2 flex items-center justify-between text-white text-xs font-semibold shadow-xs hover:brightness-110 cursor-pointer transition-all z-0 overflow-hidden',
                            hasConflict && 'ring-2 ring-amber-400 ring-offset-1'
                          )}
                          title={`${task.title} (${format(scheduleStart, 'dd/MM/yyyy')} a ${format(scheduleEnd, 'dd/MM/yyyy')})${hasConflict ? ` — ${conflictReason}` : ''}`}
                        >
                          <span className="truncate pr-1 text-[11px]">
                            {task.displayCode || `#${task.taskNumber}`} {task.title}
                          </span>
                          {task.subtaskProgress !== undefined && task.subtaskProgress > 0 && (
                            <span className="text-[9px] opacity-80 flex-shrink-0">
                              {task.subtaskProgress}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Due-Only Tasks (Prazo / Milestone sem síntese de barra artificial) */}
              {dueOnlyItems.map(({ task, dueDate, hasConflict, conflictReason }) => {
                const startOffset = differenceInCalendarDays(dueDate, timeline.rangeStart);
                const leftPx = startOffset * DAY_WIDTH_PX;
                const isVisible = leftPx >= -DAY_WIDTH_PX && leftPx <= timeline.days.length * DAY_WIDTH_PX;

                return (
                  <div key={task.id} className="flex h-10 hover:bg-muted/30 transition-colors group">
                    {/* Fixed Left Task Name (Sticky Left) */}
                    <div
                      onClick={() => onTaskClick(task)}
                      className="sticky left-0 z-10 w-64 bg-card group-hover:bg-muted/40 px-4 flex items-center justify-between text-xs font-medium border-r border-border cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Flag className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {task.displayCode || `#${task.taskNumber}`}
                        </span>
                        <span className="truncate text-foreground">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        {hasConflict && (
                          <span title={conflictReason}>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          </span>
                        )}
                        {task.approvalStatus === 'APPROVED' && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                    </div>

                    {/* Timeline Canvas Row: Milestone Flag Marker */}
                    <div className="relative flex items-center flex-1">
                      {/* Background Day Grid Lines */}
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

                      {/* Milestone Marker on Due Date */}
                      {isVisible && (
                        <div
                          onClick={() => onTaskClick(task)}
                          style={{
                            left: `${Math.max(0, leftPx + DAY_WIDTH_PX / 2 - 12)}px`,
                          }}
                          className="absolute h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs hover:scale-110 cursor-pointer transition-transform z-10"
                          title={`Prazo de entrega: ${task.title} (${format(dueDate, 'dd/MM/yyyy')})`}
                        >
                          <Flag className="w-3.5 h-3.5 fill-white" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Invalid Dates Section (se houver) */}
      {invalidDateTasks.length > 0 && (
        <div className="border-t border-red-500/30 bg-red-500/5 p-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>Tarefas com inconsistência de cronograma ({invalidDateTasks.length}):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {invalidDateTasks.map(({ task, reason }) => (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="px-2.5 py-1 rounded bg-card border border-red-500/40 text-[11px] text-foreground hover:bg-red-500/10 flex items-center gap-1.5 transition-colors"
                title={reason}
              >
                <span className="font-mono text-muted-foreground">{task.displayCode || `#${task.taskNumber}`}</span>
                <span className="font-medium truncate max-w-xs">{task.title}</span>
                <span className="text-[10px] text-red-500 font-medium">({reason})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Unscheduled Tasks Section */}
      {unscheduledTasks.length > 0 && showUnscheduled && (
        <div className="border-t border-border bg-muted/30 p-3 max-h-48 overflow-y-auto flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Tarefas sem cronograma definido ({unscheduledTasks.length})</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                (clique para abrir o card e definir datas de início e entrega)
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {unscheduledTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => onTaskClick(t)}
                className="p-2 rounded bg-card border border-border hover:border-primary/50 cursor-pointer text-xs flex items-center justify-between gap-2 transition-colors"
              >
                <div className="truncate flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-mono">
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
