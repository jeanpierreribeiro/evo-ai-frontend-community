import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { schedulingService } from '@/services/scheduling/schedulingService';
import type { EventType } from '@/types/scheduling';
import {
  Layers,
  Plus,
  Clock,
  Copy,
  ExternalLink,
  Edit2,
  Trash2,
  Check,
  Loader2,
  ShieldAlert,
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

export default function EventTypesPage() {
  const { user } = useAuth();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedToDelete, setSelectedToDelete] = useState<EventType | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [length, setLength] = useState(30);
  const [beforeBuffer, setBeforeBuffer] = useState(0);
  const [afterBuffer, setAfterBuffer] = useState(0);
  const [minimumNotice, setMinimumNotice] = useState(60);
  const [color, setColor] = useState('#3b82f6');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const username = user?.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '-') || 'user';

  const loadEventTypes = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      await schedulingService.syncUser({
        id: user.id,
        name: user.name || user.email.split('@')[0],
        email: user.email,
        username,
      });
      const data = await schedulingService.getEventTypes(user.id);
      setEventTypes(data);
    } catch (err: any) {
      console.error('Erro ao carregar tipos de evento:', err);
      toast.error('Erro ao carregar tipos de evento.');
    } finally {
      setLoading(false);
    }
  }, [user, username]);

  useEffect(() => {
    loadEventTypes();
  }, [loadEventTypes]);

  const openCreateModal = () => {
    setEditingEventType(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setLength(30);
    setBeforeBuffer(0);
    setAfterBuffer(0);
    setMinimumNotice(60);
    setColor('#3b82f6');
    setModalOpen(true);
  };

  const openEditModal = (et: EventType) => {
    setEditingEventType(et);
    setTitle(et.title);
    setSlug(et.slug);
    setDescription(et.description || '');
    setLength(et.length);
    setBeforeBuffer(et.beforeBuffer);
    setAfterBuffer(et.afterBuffer);
    setMinimumNotice(et.minimumNotice);
    setColor(et.color || '#3b82f6');
    setModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingEventType) {
      // Auto-generate slug from title
      const generated = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsSubmitting(true);
      if (editingEventType) {
        await schedulingService.updateEventType(editingEventType.id, {
          title,
          slug,
          description,
          length: Number(length),
          beforeBuffer: Number(beforeBuffer),
          afterBuffer: Number(afterBuffer),
          minimumNotice: Number(minimumNotice),
          color,
        });
        toast.success('Tipo de evento atualizado!');
      } else {
        await schedulingService.createEventType({
          userId: user.id,
          title,
          slug,
          description,
          length: Number(length),
          beforeBuffer: Number(beforeBuffer),
          afterBuffer: Number(afterBuffer),
          minimumNotice: Number(minimumNotice),
          color,
        });
        toast.success('Tipo de evento criado com sucesso!');
      }

      setModalOpen(false);
      loadEventTypes();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar tipo de evento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (et: EventType) => {
    try {
      await schedulingService.updateEventType(et.id, { isActive: !et.isActive });
      toast.success(et.isActive ? 'Tipo de evento desativado' : 'Tipo de evento ativado');
      loadEventTypes();
    } catch (err: any) {
      toast.error('Erro ao alternar status.');
    }
  };

  const handleDelete = async () => {
    if (!selectedToDelete) return;
    try {
      setIsSubmitting(true);
      await schedulingService.deleteEventType(selectedToDelete.id);
      toast.success('Tipo de evento excluído.');
      setDeleteModalOpen(false);
      setSelectedToDelete(null);
      loadEventTypes();
    } catch (err: any) {
      toast.error('Erro ao excluir tipo de evento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = (etSlug: string) => {
    const url = `${window.location.origin}/book/${username}/${etSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(etSlug);
    toast.success('Link copiado para a área de transferência!');
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Tipos de Evento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure reuniões, serviços e durações disponíveis para seus leads e clientes.
          </p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Tipo de Evento
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p>Carregando serviços...</p>
        </div>
      ) : eventTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-border bg-card">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Layers className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Nenhum tipo de evento criado</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Crie seu primeiro tipo de evento (ex: Reunião 30min, Suporte 1h) para começar a agendar.
          </p>
          <Button onClick={openCreateModal} className="mt-5 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Criar Tipo de Evento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {eventTypes.map((et) => {
            const publicUrl = `${window.location.origin}/book/${username}/${et.slug}`;
            return (
              <div
                key={et.id}
                className={`bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm transition-all flex flex-col justify-between ${
                  !et.isActive ? 'opacity-60 bg-muted/30' : 'hover:border-primary/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: et.color || '#3b82f6' }}
                        />
                        <h3 className="font-semibold text-base text-foreground line-clamp-1">
                          {et.title}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        /{username}/{et.slug}
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={et.isActive}
                        onChange={() => handleToggleActive(et)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>

                  {et.description && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {et.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4 text-xs font-medium">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent text-accent-foreground">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {et.length} min
                    </span>

                    {(et.beforeBuffer > 0 || et.afterBuffer > 0) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent text-accent-foreground">
                        Intervalo: {et.beforeBuffer ? `${et.beforeBuffer}m antes` : ''}{' '}
                        {et.afterBuffer ? `${et.afterBuffer}m após` : ''}
                      </span>
                    )}

                    {et._count && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                        {et._count.bookings} agendamentos
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLink(et.slug)}
                      className="h-8 px-2 text-xs flex items-center gap-1.5"
                    >
                      {copiedSlug === et.slug ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-green-500 font-semibold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </Button>

                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(et)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedToDelete(et);
                        setDeleteModalOpen(true);
                      }}
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Criar / Editar Tipo de Evento */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEventType ? 'Editar Tipo de Evento' : 'Novo Tipo de Evento'}
            </DialogTitle>
            <DialogDescription>
              Defina as regras de duração, intervalo e link público para este serviço.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Título da Reunião</label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ex: Reunião de Alinhamento 30min"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Slug do Link</label>
              <div className="flex items-center rounded-md border border-input bg-background overflow-hidden text-sm">
                <span className="px-3 text-muted-foreground bg-muted/40 py-2 border-r border-input">
                  /book/{username}/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="reuniao-30min"
                  className="w-full h-10 px-3 bg-transparent outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explique ao cliente o objetivo da reunião..."
                rows={2}
                className="w-full p-3 rounded-md border border-input bg-background text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Duração (minutos)</label>
                <select
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos (1 hora)</option>
                  <option value={90}>90 minutos (1h 30m)</option>
                  <option value={120}>120 minutos (2 horas)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cor de Identificação</label>
                <div className="flex items-center gap-2 h-10">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 p-1 rounded-md border border-input bg-background cursor-pointer"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{color}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Intervalo Pré (min)</label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={beforeBuffer}
                  onChange={(e) => setBeforeBuffer(Number(e.target.value))}
                  placeholder="0"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Intervalo Pós (min)</label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={afterBuffer}
                  onChange={(e) => setAfterBuffer(Number(e.target.value))}
                  placeholder="10"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Antecedência Mínima (minutos)</label>
              <input
                type="number"
                min={0}
                step={15}
                value={minimumNotice}
                onChange={(e) => setMinimumNotice(Number(e.target.value))}
                placeholder="60"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Tempo mínimo de aviso prévio para que um cliente possa agendar.
              </p>
            </div>

            <DialogFooter className="mt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </span>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar Exclusão */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Excluir Tipo de Evento
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o tipo de evento{' '}
              <strong className="text-foreground">{selectedToDelete?.title}</strong>? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
