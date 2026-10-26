import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { schedulingService } from '@/services/scheduling/schedulingService';
import {
  Clock,
  Save,
  Plus,
  Trash2,
  Globe,
  Loader2,
  CalendarCheck,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { toast } from 'sonner';

interface DaySchedule {
  day: number;
  dayName: string;
  enabled: boolean;
  slots: Array<{ startTime: string; endTime: string }>;
}

const DAYS_OF_WEEK = [
  { day: 1, name: 'Segunda-feira' },
  { day: 2, name: 'Terça-feira' },
  { day: 3, name: 'Quarta-feira' },
  { day: 4, name: 'Quinta-feira' },
  { day: 5, name: 'Sexta-feira' },
  { day: 6, name: 'Sábado' },
  { day: 0, name: 'Domingo' },
];

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Cuiaba',
  'America/Fortaleza',
  'America/Recife',
  'America/Belem',
  'America/New_York',
  'Europe/Lisbon',
  'Europe/London',
  'UTC',
];

export default function AvailabilityPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timeZone, setTimeZone] = useState('America/Sao_Paulo');
  const [scheduleName, setScheduleName] = useState('Horário de Trabalho');

  // Days state
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(
    DAYS_OF_WEEK.map((d) => ({
      day: d.day,
      dayName: d.name,
      enabled: d.day >= 1 && d.day <= 5, // Mon-Fri default enabled
      slots: [{ startTime: '09:00', endTime: '18:00' }],
    }))
  );

  const loadSchedule = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      await schedulingService.syncUser({
        id: user.id,
        name: user.name || user.email.split('@')[0],
        email: user.email,
      });

      const sched = await schedulingService.getUserSchedule(user.id);
      if (sched) {
        setTimeZone(sched.timeZone || 'America/Sao_Paulo');
        setScheduleName(sched.name || 'Horário de Trabalho');

        // Map availabilities to days
        const updated = DAYS_OF_WEEK.map((d) => {
          const matchingAvailabilities = sched.availabilities.filter(
            (a) => a.days && a.days.includes(d.day)
          );

          if (matchingAvailabilities.length > 0) {
            return {
              day: d.day,
              dayName: d.name,
              enabled: true,
              slots: matchingAvailabilities.map((a) => ({
                startTime: a.startTime,
                endTime: a.endTime,
              })),
            };
          }

          return {
            day: d.day,
            dayName: d.name,
            enabled: false,
            slots: [{ startTime: '09:00', endTime: '18:00' }],
          };
        });

        setWeeklySchedule(updated);
      }
    } catch (err: any) {
      console.error('Erro ao carregar disponibilidade:', err);
      toast.error('Erro ao carregar horários de disponibilidade.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const toggleDay = (day: number) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => (d.day === day ? { ...d, enabled: !d.enabled } : d))
    );
  };

  const updateSlotTime = (
    day: number,
    slotIdx: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d;
        const newSlots = [...d.slots];
        newSlots[slotIdx] = { ...newSlots[slotIdx], [field]: value };
        return { ...d, slots: newSlots };
      })
    );
  };

  const addSlot = (day: number) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d;
        return {
          ...d,
          slots: [...d.slots, { startTime: '14:00', endTime: '18:00' }],
        };
      })
    );
  };

  const removeSlot = (day: number, slotIdx: number) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d;
        const newSlots = d.slots.filter((_, i) => i !== slotIdx);
        return {
          ...d,
          slots: newSlots.length > 0 ? newSlots : [{ startTime: '09:00', endTime: '18:00' }],
          enabled: newSlots.length > 0 ? d.enabled : false,
        };
      })
    );
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Convert day schedules to availability records
      const availabilities: Array<{
        days: number[];
        startTime: string;
        endTime: string;
      }> = [];

      weeklySchedule
        .filter((d) => d.enabled)
        .forEach((d) => {
          d.slots.forEach((s) => {
            availabilities.push({
              days: [d.day],
              startTime: s.startTime,
              endTime: s.endTime,
            });
          });
        });

      await schedulingService.saveUserSchedule(user.id, {
        name: scheduleName,
        timeZone,
        availabilities,
      });

      toast.success('Disponibilidade salva com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar disponibilidade.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Disponibilidade
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina seus dias de atendimento, horários de trabalho e fuso horário.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p>Carregando sua grade de horários...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Settings Card */}
          <div className="bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Configurações Gerais
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome da Grade</label>
                <input
                  type="text"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  placeholder="Ex: Horário Comercial"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fuso Horário Padrão</label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Weekly Schedule Card */}
          <div className="bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-primary" />
              Horários Semanais
            </h2>
            <p className="text-xs text-muted-foreground">
              Marque os dias em que você aceita agendamentos e configure as faixas de horário.
            </p>

            <div className="divide-y divide-border">
              {weeklySchedule.map((item) => (
                <div
                  key={item.day}
                  className={`py-4 flex flex-col md:flex-row md:items-start gap-4 transition-colors ${
                    !item.enabled ? 'opacity-50' : ''
                  }`}
                >
                  {/* Day switch */}
                  <div className="w-44 flex items-center gap-3 shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => toggleDay(item.day)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                    </label>
                    <span className="text-sm font-semibold text-foreground">{item.dayName}</span>
                  </div>

                  {/* Slots */}
                  {item.enabled ? (
                    <div className="flex-1 space-y-2">
                      {item.slots.map((slot, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2 flex-wrap">
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) =>
                              updateSlotTime(item.day, sIdx, 'startTime', e.target.value)
                            }
                            className="h-9 px-2.5 rounded-md border border-input bg-background text-sm font-mono"
                          />
                          <span className="text-sm text-muted-foreground">até</span>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) =>
                              updateSlotTime(item.day, sIdx, 'endTime', e.target.value)
                            }
                            className="h-9 px-2.5 rounded-md border border-input bg-background text-sm font-mono"
                          />

                          {item.slots.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSlot(item.day, sIdx)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          {sIdx === item.slots.length - 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addSlot(item.day)}
                              className="h-8 px-2 text-xs flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Adicionar Intervalo
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 text-sm text-muted-foreground italic py-1">
                      Indisponível / Folga
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
