import { useState, useEffect, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { schedulingService } from '@/services/scheduling/schedulingService';
import type { PublicEventData, AvailableSlot } from '@/types/scheduling';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  CalendarCheck,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';

export default function PublicBookingPage() {
  const { username, eventSlug } = useParams<{ username: string; eventSlug: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicEventData | null>(null);

  // Calendar & Slot selection
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo');

  // Step state
  const [step, setStep] = useState<'SELECT_TIME' | 'ENTER_DETAILS' | 'CONFIRMED'>('SELECT_TIME');

  // Lead form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load public event info
  useEffect(() => {
    if (!username || !eventSlug) return;
    setLoading(true);
    schedulingService
      .getPublicEvent(username, eventSlug)
      .then((res) => {
        setData(res);
        if (res.host.timeZone) {
          setTimeZone(res.host.timeZone);
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar dados do evento:', err);
        setError('Página de agendamento não encontrada ou link expirado.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [username, eventSlug]);

  // Load slots when a date is selected
  useEffect(() => {
    if (!username || !eventSlug || !selectedDate) return;

    setLoadingSlots(true);
    schedulingService
      .getSlots({
        username,
        eventSlug,
        date: selectedDate,
        timeZone,
      })
      .then((res) => {
        setSlots(res.slots);
        setSelectedSlot(null);
      })
      .catch((err) => {
        console.error('Erro ao carregar slots:', err);
        setSlots([]);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [username, eventSlug, selectedDate, timeZone]);

  const handleBookingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!data || !selectedSlot) return;

    try {
      setSubmitting(true);
      await schedulingService.createBooking({
        userId: data.host.id,
        eventTypeId: data.event.id,
        title: `${data.event.title} com ${name}`,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        attendeeName: name,
        attendeeEmail: email,
        attendeePhone: phone,
        attendeeNotes: notes,
      });

      setStep('CONFIRMED');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao realizar agendamento. Tente outro horário.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calendar navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Build calendar days
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: Array<{ dateStr: string; dayNum: number; isPast: boolean } | null> = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = 1; d <= daysInMonth; d++) {
    const dObj = new Date(year, month, d);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      dateStr,
      dayNum: d,
      isPast: dObj < today,
    });
  }

  const formatFullDate = (iso: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }).format(new Date(iso));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando horários...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Página Indisponível</h2>
          <p className="text-sm text-muted-foreground">{error || 'Não foi possível encontrar este evento.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background py-8 px-4 flex items-center justify-center">
      <div className="max-w-4xl w-full bg-card border border-border rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[560px]">
        {/* Left Column: Event & Host Info */}
        <div className="md:col-span-4 p-6 sm:p-8 bg-muted/20 border-b md:border-b-0 md:border-r border-border flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                {data.host.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Agendar com</p>
                <h3 className="text-sm font-semibold text-foreground">{data.host.name}</h3>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h1 className="text-2xl font-bold text-foreground tracking-tight leading-tight">
                {data.event.title}
              </h1>

              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>{data.event.length} minutos</span>
              </div>

              {data.event.description && (
                <p className="text-sm text-muted-foreground pt-2 leading-relaxed">
                  {data.event.description}
                </p>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-border mt-6 text-xs text-muted-foreground flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{timeZone}</span>
          </div>
        </div>

        {/* Right Column: Interaction Steps */}
        <div className="md:col-span-8 p-6 sm:p-8 flex flex-col justify-between">
          {step === 'SELECT_TIME' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">
                Selecione uma Data e Horário
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Month Calendar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2">
                    <span className="font-semibold text-sm text-foreground capitalize">
                      {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentMonth)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={prevMonth}
                        className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={nextMonth}
                        className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-1">
                    <span>Dom</span>
                    <span>Seg</span>
                    <span>Ter</span>
                    <span>Qua</span>
                    <span>Qui</span>
                    <span>Sex</span>
                    <span>Sáb</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((cd, idx) => {
                      if (!cd) return <div key={idx} className="h-8" />;
                      const isSelected = selectedDate === cd.dateStr;
                      return (
                        <button
                          key={idx}
                          disabled={cd.isPast}
                          onClick={() => setSelectedDate(cd.dateStr)}
                          className={`h-8 w-8 mx-auto rounded-full text-xs font-medium flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                              : cd.isPast
                              ? 'text-muted-foreground/30 cursor-not-allowed'
                              : 'hover:bg-accent text-foreground hover:font-bold'
                          }`}
                        >
                          {cd.dayNum}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Slots Column */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {selectedDate
                      ? new Intl.DateTimeFormat('pt-BR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        }).format(new Date(selectedDate + 'T12:00:00'))
                      : 'Escolha uma data'}
                  </h3>

                  {!selectedDate ? (
                    <div className="h-48 flex items-center justify-center text-xs text-muted-foreground italic border border-dashed border-border rounded-xl">
                      Clique em um dia ao lado
                    </div>
                  ) : loadingSlots ? (
                    <div className="h-48 flex items-center justify-center text-xs text-muted-foreground gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Buscando vagas...
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-xs text-destructive text-center p-3 border border-border rounded-xl">
                      Nenhum horário livre nesta data.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {slots.map((slot) => {
                        const isChosen = selectedSlot?.time === slot.time;
                        return (
                          <div key={slot.time} className="flex gap-2">
                            <button
                              onClick={() => setSelectedSlot(slot)}
                              className={`flex-1 py-2 px-3 text-sm font-semibold rounded-lg border transition-all text-center ${
                                isChosen
                                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                  : 'bg-background hover:border-primary/60 border-border text-foreground'
                              }`}
                            >
                              {slot.formattedTime}
                            </button>

                            {isChosen && (
                              <Button
                                size="sm"
                                onClick={() => setStep('ENTER_DETAILS')}
                                className="px-3"
                              >
                                Avançar
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'ENTER_DETAILS' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('SELECT_TIME')}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Seus Dados</h2>
                  <p className="text-xs text-muted-foreground">
                    Horário escolhido: <strong className="text-foreground">{formatFullDate(selectedSlot!.startTime)}</strong>
                  </p>
                </div>
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Seu Nome *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="João Silva"
                    required
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Seu E-mail *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="joao@empresa.com"
                    required
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">WhatsApp / Telefone *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(31) 99999-9999"
                    required
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Observações / Pauta</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Compartilhe o objetivo ou dúvidas para o encontro..."
                    rows={2}
                    className="w-full p-2.5 rounded-lg border border-input bg-background text-sm resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep('SELECT_TIME')}
                    disabled={submitting}
                  >
                    Voltar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Confirmando...
                      </span>
                    ) : (
                      'Confirmar Agendamento'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {step === 'CONFIRMED' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Agendamento Confirmado!</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Enviamos uma confirmação para <strong>{email}</strong> com todos os detalhes da reunião.
              </p>

              <div className="p-4 rounded-xl bg-accent/40 border border-border w-full max-w-md text-left space-y-2 text-sm mt-4">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <CalendarCheck className="w-4 h-4 text-primary" />
                  <span>{data.event.title}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{formatFullDate(selectedSlot!.startTime)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>{data.host.name}</span>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('SELECT_TIME');
                    setSelectedSlot(null);
                    setSelectedDate(null);
                  }}
                >
                  Agendar Outro Horário
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
