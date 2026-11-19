import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { schedulingService } from '@/services/scheduling/schedulingService';
import type { Booking, BookingStatus, EventType, AvailableSlot } from '@/types/scheduling';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Plus,
  CalendarClock,
  Loader2,
  AlertCircle,
  Search,
  X,
  MessageCircle,
  Sparkles,
  ChevronRight,
  RefreshCw,
  FileText,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@evoapi/design-system';
import { toast } from 'sonner';

export default function BookingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters initialized from URL
  const [activeTab, setActiveTab] = useState<'ALL' | BookingStatus>(
    (searchParams.get('status') as BookingStatus) || 'ALL'
  );
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') || '');
  const [startDate, setStartDate] = useState(searchParams.get('from') || '');
  const [endDate, setEndDate] = useState(searchParams.get('to') || '');
  const [selectedFilterEventType, setSelectedFilterEventType] = useState(searchParams.get('eventType') || '');

  // Data states
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);

  // Modals state
  const [newBookingModalOpen, setNewBookingModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // New booking modal state
  const [selectedEventTypeId, setSelectedEventTypeId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // New booking form fields
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [attendeeNotes, setAttendeeNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[]>([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<AvailableSlot | null>(null);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Sync state to URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'ALL') params.set('status', activeTab);
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (startDate) params.set('from', startDate);
    if (endDate) params.set('to', endDate);
    if (selectedFilterEventType) params.set('eventType', selectedFilterEventType);

    setSearchParams(params, { replace: true });
  }, [activeTab, debouncedSearch, startDate, endDate, selectedFilterEventType, setSearchParams]);

  // Load event types for dropdowns
  useEffect(() => {
    if (!user) return;
    schedulingService.getEventTypes(user.id).then((types) => {
      setEventTypes(types);
      if (types.length > 0 && !selectedEventTypeId) {
        setSelectedEventTypeId(types[0].id);
      }
    }).catch((err) => {
      console.error('Erro ao carregar tipos de evento:', err);
    });
  }, [user]);

  // Fetch bookings with filters
  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      await schedulingService.syncUser({
        id: user.id,
        name: user.name || user.email.split('@')[0],
        email: user.email,
      });

      const params: Record<string, any> = {
        userId: user.id,
      };

      if (activeTab !== 'ALL') {
        params.status = activeTab;
      }
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (startDate) {
        params.from = new Date(startDate).toISOString();
      }
      if (endDate) {
        // Set to end of the day in ISO
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        params.to = endD.toISOString();
      }
      if (selectedFilterEventType) {
        params.eventTypeId = selectedFilterEventType;
      }

      const res = await schedulingService.getBookings(params);
      setBookings(res.data);
    } catch (err: any) {
      console.error('Erro ao carregar agendamentos:', err);
      toast.error('Não foi possível carregar os agendamentos.');
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, debouncedSearch, startDate, endDate, selectedFilterEventType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load slots for new booking
  useEffect(() => {
    if (!user || !selectedDate || !newBookingModalOpen) return;

    setLoadingSlots(true);
    schedulingService
      .getSlots({
        userId: user.id,
        eventTypeId: selectedEventTypeId || undefined,
        date: selectedDate,
      })
      .then((res) => {
        setAvailableSlots(res.slots);
        setSelectedSlot(null);
      })
      .catch((err) => {
        console.error('Erro ao buscar slots:', err);
        setAvailableSlots([]);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [user, selectedDate, selectedEventTypeId, newBookingModalOpen]);

  // Load slots for reschedule modal
  useEffect(() => {
    if (!user || !rescheduleDate || !rescheduleModalOpen || !selectedBooking) return;

    setLoadingRescheduleSlots(true);
    schedulingService
      .getSlots({
        userId: user.id,
        eventTypeId: selectedBooking.eventTypeId || undefined,
        date: rescheduleDate,
        excludeBookingId: selectedBooking.id,
      })
      .then((res) => {
        setRescheduleSlots(res.slots);
        setSelectedRescheduleSlot(null);
      })
      .catch((err) => {
        console.error('Erro ao buscar slots para reagendamento:', err);
        setRescheduleSlots([]);
      })
      .finally(() => {
        setLoadingRescheduleSlots(false);
      });
  }, [user, rescheduleDate, rescheduleModalOpen, selectedBooking]);

  // Cancel booking handler
  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    try {
      setIsSubmitting(true);
      await schedulingService.cancelBooking(selectedBooking.id, cancellationReason);
      toast.success('Agendamento cancelado com sucesso.');
      setCancelModalOpen(false);
      setSelectedBooking(null);
      setCancellationReason('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cancelar agendamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reschedule booking handler
  const handleRescheduleBooking = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !selectedRescheduleSlot) {
      toast.error('Selecione uma data e horário para reagendar.');
      return;
    }

    try {
      setIsSubmitting(true);
      await schedulingService.rescheduleBooking(
        selectedBooking.id,
        selectedRescheduleSlot.startTime,
        selectedRescheduleSlot.endTime
      );
      toast.success('Reunião reagendada com sucesso!');
      setRescheduleModalOpen(false);
      setSelectedBooking(null);
      setRescheduleDate('');
      setSelectedRescheduleSlot(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reagendar reunião.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit new booking
  const handleCreateBooking = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !selectedSlot) {
      toast.error('Selecione uma data e horário.');
      return;
    }

    const event = eventTypes.find((t) => t.id === selectedEventTypeId);
    const title = event ? `${event.title} com ${attendeeName}` : `Reunião com ${attendeeName}`;

    try {
      setIsSubmitting(true);
      await schedulingService.createBooking({
        userId: user.id,
        eventTypeId: selectedEventTypeId || undefined,
        title,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        attendeeName,
        attendeeEmail,
        attendeePhone,
        attendeeNotes,
      });

      toast.success('Agendamento criado com sucesso!');
      setNewBookingModalOpen(false);
      setAttendeeName('');
      setAttendeeEmail('');
      setAttendeePhone('');
      setAttendeeNotes('');
      setSelectedDate('');
      setSelectedSlot(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar agendamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helpers
  const formatWhatsAppLink = (phone?: string | null): string | null => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    const fullNumber = digits.startsWith('55') ? digits : `55${digits}`;
    return `https://wa.me/${fullNumber}`;
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Confirmado
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pendente
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
            Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  const formatDateDisplay = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const dateStr = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(start);

    const timeStartStr = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(start);

    const timeEndStr = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(end);

    return {
      date: dateStr,
      time: `${timeStartStr} - ${timeEndStr}`,
    };
  };

  const hasActiveFilters = useMemo(() => {
    return Boolean(debouncedSearch.trim() || startDate || endDate || selectedFilterEventType);
  }, [debouncedSearch, startDate, endDate, selectedFilterEventType]);

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStartDate('');
    setEndDate('');
    setSelectedFilterEventType('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Compromissos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie reuniões, navegue pelos tópicos com IA e acesse links com facilidade.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => setNewBookingModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Text Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por título, participante, email ou telefone..."
              className="w-full h-9 pl-9 pr-8 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Event Type Filter */}
          <div>
            <select
              value={selectedFilterEventType}
              onChange={(e) => setSelectedFilterEventType(e.target.value)}
              className="w-full h-9 px-3 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Todos os tipos de evento</option>
              {eventTypes.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Data inicial (De)"
              placeholder="De"
              className="w-full h-9 px-3 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="Data final (Até)"
              placeholder="Até"
              className="w-full h-9 px-3 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-destructive shrink-0"
                title="Limpar todos os filtros"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          {(
            [
              { key: 'ALL', label: 'Todos' },
              { key: 'ACCEPTED', label: 'Confirmados' },
              { key: 'PENDING', label: 'Pendentes' },
              { key: 'CANCELLED', label: 'Cancelados' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List (Executive Horizontal Full-Width Layout) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card rounded-xl border border-border">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p className="text-sm">Carregando compromissos...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-border bg-card">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CalendarClock className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Nenhum compromisso encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {hasActiveFilters
              ? 'Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os termos de busca ou o período.'
              : activeTab === 'ALL'
              ? 'Você ainda não possui agendamentos cadastrados. Crie um novo agendamento ou compartilhe seu link público.'
              : `Não há reuniões com o status selecionado.`}
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Limpar Filtros
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setNewBookingModalOpen(true)}
              className="mt-5 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Primeiro Agendamento
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const dateInfo = formatDateDisplay(booking.startTime, booking.endTime);
            const waUrl = formatWhatsAppLink(booking.attendeePhone);

            return (
              <div
                key={booking.id}
                onClick={() => navigate(`/scheduling/bookings/${booking.id}`)}
                className="group bg-card text-card-foreground rounded-xl border border-border p-4 sm:p-5 shadow-sm hover:shadow hover:border-primary/40 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Date / Time + Event Type + Status */}
                <div className="flex items-start sm:items-center gap-4 lg:w-1/4 shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground capitalize">
                      {dateInfo.date}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{dateInfo.time}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: booking.eventType?.color || '#3b82f6' }}
                        />
                        {booking.eventType?.title || 'Reunião Direta'}
                      </span>
                      {getStatusBadge(booking.status)}
                    </div>
                  </div>
                </div>

                {/* Center: Title + Attendee details */}
                <div className="lg:w-2/5 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {booking.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-foreground font-medium truncate">
                      <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {booking.attendeeName}
                    </span>

                    <span className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      {booking.attendeeEmail}
                    </span>

                    {booking.attendeePhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{booking.attendeePhone}</span>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 transition-colors"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {booking.attendeeNotes && (
                    <p className="text-xs text-muted-foreground/80 line-clamp-1 italic">
                      &quot;{booking.attendeeNotes}&quot;
                    </p>
                  )}

                  {booking.cancellationReason && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>Motivo: {booking.cancellationReason}</span>
                    </div>
                  )}
                </div>

                {/* Right: AI Badge & Actions */}
                <div
                  className="flex items-center justify-between lg:justify-end gap-3 lg:w-1/3 pt-3 lg:pt-0 border-t lg:border-t-0 border-border"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    {booking.hasSummary ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        <Sparkles className="w-3.5 h-3.5" />
                        Tópicos IA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-muted-foreground/70">
                        <FileText className="w-3 h-3" />
                        Sem tópicos
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {booking.status !== 'CANCELLED' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setRescheduleDate('');
                            setRescheduleSlots([]);
                            setSelectedRescheduleSlot(null);
                            setRescheduleModalOpen(true);
                          }}
                        >
                          Reagendar
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setCancelModalOpen(true);
                          }}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs flex items-center gap-1 group-hover:border-primary/50 group-hover:text-primary transition-colors"
                      onClick={() => navigate(`/scheduling/bookings/${booking.id}`)}
                    >
                      <span>Ver Reunião</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Novo Agendamento */}
      <Dialog open={newBookingModalOpen} onOpenChange={setNewBookingModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>
              Selecione o serviço, data e horário para confirmar o agendamento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBooking} className="space-y-4 py-2">
            {eventTypes.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo de Evento</label>
                <select
                  value={selectedEventTypeId}
                  onChange={(e) => setSelectedEventTypeId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground"
                >
                  {eventTypes.map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.title} ({et.length} min)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground"
                required
              />
            </div>

            {selectedDate && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Horários Disponíveis</label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Buscando horários livres...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-xs text-destructive py-2">
                    Nenhum horário disponível para a data selecionada.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot?.time === slot.time;
                      return (
                        <button
                          type="button"
                          key={slot.time}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-3 text-xs font-semibold rounded-md border transition-all ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-card hover:bg-accent border-border text-foreground'
                          }`}
                        >
                          {slot.formattedTime}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-border pt-3 space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome do Participante</label>
                <input
                  type="text"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">E-mail</label>
                <input
                  type="email"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  placeholder="joao@exemplo.com"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">WhatsApp / Telefone</label>
                <input
                  type="tel"
                  value={attendeePhone}
                  onChange={(e) => setAttendeePhone(e.target.value)}
                  placeholder="(31) 99999-9999"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Observações / Pauta</label>
                <textarea
                  value={attendeeNotes}
                  onChange={(e) => setAttendeeNotes(e.target.value)}
                  placeholder="Notas ou pauta da reunião..."
                  rows={2}
                  className="w-full p-3 rounded-md border border-input bg-background text-sm resize-none"
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewBookingModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedSlot}>
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Agendando...
                  </span>
                ) : (
                  'Confirmar Agendamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Reagendar Reunião */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reagendar Reunião</DialogTitle>
            <DialogDescription>
              Selecione uma nova data e horário para a reunião com{' '}
              <strong className="text-foreground">{selectedBooking?.attendeeName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRescheduleBooking} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nova Data</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground"
                required
              />
            </div>

            {rescheduleDate && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Novo Horário Disponível</label>
                {loadingRescheduleSlots ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Buscando horários livres...
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <p className="text-xs text-destructive py-2">
                    Nenhum horário disponível para a data selecionada.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                    {rescheduleSlots.map((slot) => {
                      const isSelected = selectedRescheduleSlot?.time === slot.time;
                      return (
                        <button
                          type="button"
                          key={slot.time}
                          onClick={() => setSelectedRescheduleSlot(slot)}
                          className={`py-2 px-3 text-xs font-semibold rounded-md border transition-all ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-card hover:bg-accent border-border text-foreground'
                          }`}
                        >
                          {slot.formattedTime}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRescheduleModalOpen(false)}
                disabled={isSubmitting}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedRescheduleSlot}
              >
                {isSubmitting ? 'Reagendando...' : 'Confirmar Reagendamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Cancelar Agendamento */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Agendamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar o agendamento de{' '}
              <strong className="text-foreground">{selectedBooking?.attendeeName}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3">
            <label className="text-sm font-medium">Motivo do Cancelamento (opcional)</label>
            <input
              type="text"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Ex: Imprevisto pelo cliente"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelModalOpen(false)}
              disabled={isSubmitting}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
