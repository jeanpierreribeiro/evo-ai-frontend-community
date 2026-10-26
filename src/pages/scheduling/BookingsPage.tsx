import { useState, useEffect, useCallback, type FormEvent } from 'react';
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
  XCircle,
  CalendarClock,
  Loader2,
  AlertCircle,
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | BookingStatus>('ALL');

  // Modals state
  const [newBookingModalOpen, setNewBookingModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Event types and slots for new booking modal
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
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

  // Sync user and fetch bookings
  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      await schedulingService.syncUser({
        id: user.id,
        name: user.name || user.email.split('@')[0],
        email: user.email,
      });

      const params = activeTab === 'ALL' ? { userId: user.id } : { userId: user.id, status: activeTab };
      const res = await schedulingService.getBookings(params);
      setBookings(res.data);
    } catch (err: any) {
      console.error('Erro ao carregar agendamentos:', err);
      toast.error('Não foi possível carregar os agendamentos.');
    } finally {
      setLoading(false);
    }
  }, [user, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load event types for modal
  useEffect(() => {
    if (newBookingModalOpen && user) {
      schedulingService.getEventTypes(user.id).then((types) => {
        setEventTypes(types.filter((t) => t.isActive));
        if (types.length > 0) {
          setSelectedEventTypeId(types[0].id);
        }
      });
    }
  }, [newBookingModalOpen, user]);

  // Load slots when date or event type changes
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
      // Reset form
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

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Confirmado
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pendente
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
            Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
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
            Gerencie e acompanhe todos os agendamentos e reuniões dos seus clientes.
          </p>
        </div>
        <Button
          onClick={() => setNewBookingModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
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
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p>Carregando compromissos...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-border bg-card">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CalendarClock className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Nenhum compromisso encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {activeTab === 'ALL'
              ? 'Você ainda não possui agendamentos marcados. Compartilhe seu link público ou crie um novo agendamento.'
              : `Não há compromissos com o status selecionado.`}
          </p>
          <Button
            variant="outline"
            onClick={() => setNewBookingModalOpen(true)}
            className="mt-5 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar Primeiro Agendamento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="space-y-1">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                      style={{ backgroundColor: booking.eventType?.color || '#3b82f6' }}
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {booking.eventType?.title || 'Reunião Direta'}
                    </span>
                    <h3 className="text-base font-semibold leading-tight text-foreground line-clamp-1">
                      {booking.title}
                    </h3>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>

                <div className="space-y-2 text-sm text-muted-foreground mt-4">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                    <span>{formatDate(booking.startTime)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 shrink-0" />
                    <span className="truncate">{booking.attendeeName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate">{booking.attendeeEmail}</span>
                  </div>

                  {booking.attendeePhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 shrink-0" />
                      <span>{booking.attendeePhone}</span>
                    </div>
                  )}

                  {booking.cancellationReason && (
                    <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs flex items-start gap-2 mt-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Motivo: {booking.cancellationReason}</span>
                    </div>
                  )}
                </div>
              </div>

              {booking.status === 'ACCEPTED' && (
                <div className="mt-5 pt-3 border-t border-border flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setCancelModalOpen(true);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          ))}
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
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
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
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                required
              />
            </div>

            {selectedDate && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Horários Disponíveis</label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
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
                <label className="text-sm font-medium">Observações</label>
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
