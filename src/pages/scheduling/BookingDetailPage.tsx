import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { schedulingService } from '@/services/scheduling/schedulingService';
import type {
  Booking,
  BookingStatus,
  MeetingSummary,
  MeetingTopics,
  AiStatusResponse,
} from '@/types/scheduling';
import {
  Calendar,
  Clock,
  User,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Edit2,
  Check,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Users,
  Target,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
  ListTodo,
  Building2,
  MessageCircle,
  RefreshCw,
  Link as LinkIcon,
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

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Core data states
  const [booking, setBooking] = useState<Booking | null>(null);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);

  // Title edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  // External URLs modal state
  const [linksModalOpen, setLinksModalOpen] = useState(false);
  const [fullSummaryUrlInput, setFullSummaryUrlInput] = useState('');
  const [transcriptUrlInput, setTranscriptUrlInput] = useState('');
  const [savingLinks, setSavingLinks] = useState(false);

  // AI Modal state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Individual block edit state
  // key: 'topic' | 'participants' | 'keyPoints' | 'decisions' | 'learnings' | 'factsAndFigures' | 'nextSteps' | 'mentionedEntities'
  const [editingBlock, setEditingBlock] = useState<keyof MeetingTopics | null>(null);
  const [blockTextValue, setBlockTextValue] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);

  // Polling ref for async AI generation
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load meeting & summary
  const loadMeetingData = useCallback(async (isPolling = false) => {
    if (!id) return;
    try {
      if (!isPolling) setLoading(true);

      const [bookingData, summaryData] = await Promise.all([
        schedulingService.getBooking(id),
        schedulingService.getSummary(id).catch(() => null),
      ]);

      setBooking(bookingData);
      setTitleInput(bookingData.title);

      if (summaryData) {
        setSummary(summaryData);
        setFullSummaryUrlInput(summaryData.fullSummaryUrl || '');
        setTranscriptUrlInput(summaryData.transcriptUrl || '');

        // If PENDING, schedule next poll
        if (summaryData.status === 'PENDING') {
          if (pollingRef.current) clearTimeout(pollingRef.current);
          pollingRef.current = setTimeout(() => {
            loadMeetingData(true);
          }, 3000);
        } else if (isPolling) {
          // Completed or Failed after polling
          if (summaryData.status === 'DONE') {
            toast.success('Tópicos da reunião gerados com sucesso pela IA!');
          } else if (summaryData.status === 'FAILED') {
            toast.error(summaryData.errorMessage || 'Falha ao processar tópicos com IA.');
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar detalhes da reunião:', err);
      if (!isPolling) {
        toast.error('Não foi possível carregar a reunião.');
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMeetingData();
    // Load AI engine status
    schedulingService.getAiStatus().then(setAiStatus).catch(() => null);

    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [loadMeetingData]);

  // Format WhatsApp
  const formatWhatsAppLink = (phone?: string | null): string | null => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    const fullNumber = digits.startsWith('55') ? digits : `55${digits}`;
    return `https://wa.me/${fullNumber}`;
  };

  // Status Badge
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

  // Format Dates
  const formatDateDisplay = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const fullDate = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(start);

    const startTimeStr = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(start);

    const endTimeStr = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(end);

    return {
      date: fullDate,
      time: `${startTimeStr} às ${endTimeStr}`,
    };
  };

  // Save Inline Title
  const handleSaveTitle = async () => {
    if (!id || !titleInput.trim()) return;
    try {
      setSavingTitle(true);
      await schedulingService.updateBooking(id, { title: titleInput.trim() });
      setBooking((prev) => (prev ? { ...prev, title: titleInput.trim() } : prev));
      setIsEditingTitle(false);
      toast.success('Título da reunião atualizado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar título.');
    } finally {
      setSavingTitle(false);
    }
  };

  // Save External Links
  const handleSaveLinks = async () => {
    if (!id) return;

    const fullSummary = fullSummaryUrlInput.trim();
    const transcript = transcriptUrlInput.trim();

    if (fullSummary && !fullSummary.startsWith('https://')) {
      toast.error('O link do resumo completo deve ser uma URL segura começando com https://');
      return;
    }
    if (transcript && !transcript.startsWith('https://')) {
      toast.error('O link da transcrição deve ser uma URL segura começando com https://');
      return;
    }

    try {
      setSavingLinks(true);
      const updated = await schedulingService.updateSummary(id, {
        fullSummaryUrl: fullSummary || null,
        transcriptUrl: transcript || null,
      });
      setSummary(updated);
      setLinksModalOpen(false);
      toast.success('Links atualizados com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar links externos.');
    } finally {
      setSavingLinks(false);
    }
  };

  // Start Editing a Topic Block
  const startEditingBlock = (key: keyof MeetingTopics) => {
    if (!summary?.topics) return;
    const value = summary.topics[key];
    if (Array.isArray(value)) {
      setBlockTextValue(value.join('\n'));
    } else {
      setBlockTextValue(value || '');
    }
    setEditingBlock(key);
  };

  // Save an Edited Block
  const handleSaveBlock = async () => {
    if (!id || !editingBlock) return;
    try {
      setSavingBlock(true);

      let parsedValue: string | string[];
      if (editingBlock === 'topic') {
        parsedValue = blockTextValue.trim();
      } else {
        // Multi-line list
        parsedValue = blockTextValue
          .split('\n')
          .map((s) => s.trim().replace(/^[-*•]\s*/, ''))
          .filter(Boolean);
      }

      const updatedTopics: Partial<MeetingTopics> = {
        [editingBlock]: parsedValue,
      };

      const updatedSummary = await schedulingService.updateSummary(id, {
        topics: updatedTopics as any,
      });

      setSummary(updatedSummary);
      setEditingBlock(null);
      setBlockTextValue('');
      toast.success('Bloco atualizado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar alterações no bloco.');
    } finally {
      setSavingBlock(false);
    }
  };

  // Submit AI Generation
  const handleGenerateAi = async () => {
    if (!id || !transcriptText.trim()) {
      toast.error('Cole a transcrição ou o resumo da reunião para iniciar.');
      return;
    }

    if (transcriptText.trim().length < 20) {
      toast.error('O texto da reunião é muito curto. Cole o conteúdo completo.');
      return;
    }

    try {
      setIsGeneratingAi(true);
      const res = await schedulingService.generateSummary(id, transcriptText.trim());
      setSummary(res);
      setAiModalOpen(false);
      setTranscriptText('');
      toast.info('IA iniciou a extração dos 8 tópicos. Aguarde alguns instantes...');

      // Start polling
      if (pollingRef.current) clearTimeout(pollingRef.current);
      pollingRef.current = setTimeout(() => {
        loadMeetingData(true);
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao acionar motor de IA.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm">Carregando detalhes da reunião...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Reunião não encontrada</h2>
        <p className="text-sm text-muted-foreground">
          O compromisso solicitado não existe ou você não tem permissão para acessá-lo.
        </p>
        <Button onClick={() => navigate('/scheduling/bookings')}>
          Voltar para compromissos
        </Button>
      </div>
    );
  }

  const dateInfo = formatDateDisplay(booking.startTime, booking.endTime);
  const waUrl = formatWhatsAppLink(booking.attendeePhone);
  const topics = summary?.topics;
  const isPending = summary?.status === 'PENDING';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/scheduling/bookings')}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar para compromissos
        </button>

        <div className="flex items-center gap-2">
          {/* External Links */}
          {summary?.fullSummaryUrl && (
            <a
              href={summary.fullSummaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border text-foreground hover:border-primary/40 hover:text-primary transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Resumo completo</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
          )}

          {summary?.transcriptUrl && (
            <a
              href={summary.transcriptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border text-foreground hover:border-primary/40 hover:text-primary transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Transcrição</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLinksModalOpen(true)}
            className="text-xs flex items-center gap-1.5 h-8"
            title="Configurar links do Google Drive ou transcrição"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Links
          </Button>

          {/* AI Trigger */}
          <Button
            size="sm"
            onClick={() => setAiModalOpen(true)}
            disabled={isPending}
            className="flex items-center gap-1.5 h-8 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-primary-foreground shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {topics ? 'Regerar com IA' : 'Gerar Tópicos com IA'}
          </Button>
        </div>
      </div>

      {/* Main Header / Title & Badges */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 max-w-xl">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="flex-1 h-10 px-3 text-lg font-bold rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleSaveTitle}
                  disabled={savingTitle || !titleInput.trim()}
                  className="h-10"
                >
                  {savingTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTitleInput(booking.title);
                    setIsEditingTitle(false);
                  }}
                  className="h-10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {booking.title}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-accent"
                  title="Editar título da reunião"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: booking.eventType?.color || '#3b82f6' }}
                />
                {booking.eventType?.title || 'Reunião Direta'}
              </span>

              {getStatusBadge(booking.status)}

              {booking.eventType?.length && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {booking.eventType.length} minutos
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Meeting Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-border/70 text-sm">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Data e Horário
              </p>
              <p className="font-medium text-foreground capitalize mt-0.5">
                {dateInfo.date}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {dateInfo.time}
              </p>
            </div>
          </div>

          {/* Attendee */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Participante
              </p>
              <p className="font-medium text-foreground mt-0.5 truncate">
                {booking.attendeeName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {booking.attendeeEmail}
              </p>
              {booking.attendeePhone && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{booking.attendeePhone}</span>
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 transition-colors"
                      title="Abrir WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3" />
                      WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes / Subject */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pauta / Observações
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 italic line-clamp-2">
                {booking.attendeeNotes || 'Nenhuma observação informada.'}
              </p>
              {booking.cancellationReason && (
                <p className="text-xs text-destructive mt-1">
                  <strong>Cancelado:</strong> {booking.cancellationReason}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Background AI Processing Alert */}
      {isPending && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-foreground">
              Inteligência Artificial processando a reunião...
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              A transcrição está sendo analisada e estruturada nos 8 blocos de tópicos executivos. Esta página será atualizada automaticamente em alguns segundos.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadMeetingData(true)}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Checar agora
          </Button>
        </div>
      )}

      {/* AI Error Alert */}
      {summary?.status === 'FAILED' && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-destructive">
              Falha na extração de tópicos com IA
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {summary.errorMessage || 'Ocorreu um erro no processamento do modelo de inteligência artificial.'}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAiModalOpen(true)}
            className="text-xs"
          >
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* Tópicos da Reunião Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Tópicos da Reunião
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Estrutura executiva em 8 blocos estratégicos para acompanhamento de decisões e alinhamentos.
          </p>
        </div>
        {topics && (
          <div className="text-xs text-muted-foreground">
            {summary?.generatedAt && (
              <span>Gerado em {new Date(summary.generatedAt).toLocaleString('pt-BR')}</span>
            )}
          </div>
        )}
      </div>

      {/* Empty State when no topics exist */}
      {!topics && !isPending && (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-semibold text-foreground">
              Nenhum tópico gerado para esta reunião
            </h3>
            <p className="text-xs text-muted-foreground">
              Cole a transcrição ou o resumo do Google Meet / Microsoft Teams / Gemini para que a inteligência artificial organize automaticamente os 8 blocos de decisões, aprendizados e próximos passos.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => setAiModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground"
            >
              <Sparkles className="w-4 h-4" />
              Gerar Tópicos com IA
            </Button>
          </div>
        </div>
      )}

      {/* 8 Structured Topic Blocks */}
      {topics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Block 1: ASSUNTO (Full width) */}
          <div className="md:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Assunto
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => startEditingBlock('topic')}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>
            </div>

            {editingBlock === 'topic' ? (
              <div className="space-y-2">
                <textarea
                  value={blockTextValue}
                  onChange={(e) => setBlockTextValue(e.target.value)}
                  className="w-full p-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setEditingBlock(null)}
                    disabled={savingBlock}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleSaveBlock}
                    disabled={savingBlock}
                  >
                    {savingBlock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {topics.topic || 'Não especificado.'}
              </p>
            )}
          </div>

          {/* Block 2: PARTICIPANTES */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Participantes ({topics.participants?.length || 0})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => startEditingBlock('participants')}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>
            </div>

            {editingBlock === 'participants' ? (
              <div className="space-y-2">
                <textarea
                  value={blockTextValue}
                  onChange={(e) => setBlockTextValue(e.target.value)}
                  placeholder="Um participante por linha..."
                  className="w-full p-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={4}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setEditingBlock(null)}
                    disabled={savingBlock}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleSaveBlock}
                    disabled={savingBlock}
                  >
                    {savingBlock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topics.participants?.length > 0 ? (
                  topics.participants.map((p, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground"
                    >
                      <User className="w-3 h-3 text-muted-foreground" />
                      {p}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum participante listado.</p>
                )}
              </div>
            )}
          </div>

          {/* Block 3: CLIENTES E PROJETOS CITADOS */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Clientes e Projetos Citados ({topics.mentionedEntities?.length || 0})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => startEditingBlock('mentionedEntities')}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>
            </div>

            {editingBlock === 'mentionedEntities' ? (
              <div className="space-y-2">
                <textarea
                  value={blockTextValue}
                  onChange={(e) => setBlockTextValue(e.target.value)}
                  placeholder="Um cliente ou projeto por linha..."
                  className="w-full p-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={4}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setEditingBlock(null)}
                    disabled={savingBlock}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleSaveBlock}
                    disabled={savingBlock}
                  >
                    {savingBlock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topics.mentionedEntities?.length > 0 ? (
                  topics.mentionedEntities.map((ent, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                    >
                      <Building2 className="w-3 h-3" />
                      {ent}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum cliente ou projeto identificado.</p>
                )}
              </div>
            )}
          </div>

          {/* Block 4: PRINCIPAIS PONTOS */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Principais Pontos ({topics.keyPoints?.length || 0})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => startEditingBlock('keyPoints')}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>
            </div>

            {editingBlock === 'keyPoints' ? (
              <div className="space-y-2">
                <textarea
                  value={blockTextValue}
                  onChange={(e) => setBlockTextValue(e.target.value)}
                  placeholder="Um item por linha..."
                  className="w-full p-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={5}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setEditingBlock(null)}
                    disabled={savingBlock}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleSaveBlock}
                    disabled={savingBlock}
                  >
                    {savingBlock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {topics.keyPoints?.length > 0 ? (
                  topics.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum ponto registrado.</p>
                )}
              </ul>
            )}
          </div>

          {/* Block 5: DECISÕES */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Decisões ({topics.decisions?.length || 0})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => startEditingBlock('decisions')}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>
            </div>

            {editingBlock === 'decisions' ? (
              <div className="space-y-2">
                <textarea
                  value={blockTextValue}
                  onChange={(e) => setBlockTextValue(e.target.value)}
                  placeholder="Uma decisão por linha..."
                  className="w-full p-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={5}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setEditingBlock(null)}
                    disabled={savingBlock}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleSaveBlock}
                    disabled={savingBlock}
                  >
                    {savingBlock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-foreground">
                {topics.decisions?.length > 0 ? (
                  topics.decisions.map((dec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{dec}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma decisão registrada.</p>
                )}
              </ul>
            )}
          </div>

          {/* Block 6: APRENDIZADOS */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Aprendizados ({topics.learnings?.length || 0})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => startEditingBlock('learnings')}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>
            </div>

            {editingBlock === 'learnings' ? (
              <div className="space-y-2">
                <textarea
                  value={blockTextValue}
                  onChange={(e) => setBlockTextValue(e.target.value)}
                  placeholder="Um aprendizado por linha..."
                  className="w-full p-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={5}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setEditingBlock(null)}
                    disabled={savingBlock}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleSaveBlock}
                    disabled={savingBlock}
                  >
                    {savingBlock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {topics.learnings?.length > 0 ? (
                  topics.learnings.map((learn, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                      <span>{learn}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum aprendizado listado.</p>
                )}
              </ul>
            )}
          </div>

          {/* Block 7: FATOS E NÚMEROS */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Fatos e Números ({topics.factsAndFigures?.length || 0})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => startEditingBlock('factsAndFigures')}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>
            </div>

            {editingBlock === 'factsAndFigures' ? (
              <div className="space-y-2">
                <textarea
                  value={blockTextValue}
                  onChange={(e) => setBlockTextValue(e.target.value)}
                  placeholder="Um fato ou número por linha..."
                  className="w-full p-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={5}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setEditingBlock(null)}
                    disabled={savingBlock}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleSaveBlock}
                    disabled={savingBlock}
                  >
                    {savingBlock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {topics.factsAndFigures?.length > 0 ? (
                  topics.factsAndFigures.map((fact, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 shrink-0" />
                      <span>{fact}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum dado numérico identificado.</p>
                )}
              </ul>
            )}
          </div>

          {/* Block 8: PRÓXIMOS PASSOS (Full width) */}
          <div className="md:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ListTodo className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Próximos Passos ({topics.nextSteps?.length || 0})
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    Apenas registros de alinhamento em texto simples (sem geração automática de tarefas).
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => startEditingBlock('nextSteps')}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>
            </div>

            {editingBlock === 'nextSteps' ? (
              <div className="space-y-2">
                <textarea
                  value={blockTextValue}
                  onChange={(e) => setBlockTextValue(e.target.value)}
                  placeholder="Um próximo passo por linha..."
                  className="w-full p-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={5}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setEditingBlock(null)}
                    disabled={savingBlock}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleSaveBlock}
                    disabled={savingBlock}
                  >
                    {savingBlock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-foreground">
                {topics.nextSteps?.length > 0 ? (
                  topics.nextSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-accent/40 border border-border/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum próximo passo registrado.</p>
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Modal: Gerar Tópicos com IA */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Extrair Tópicos da Reunião com IA
            </DialogTitle>
            <DialogDescription>
              Cole a transcrição da reunião, notas de ata ou resumo gerado pelo Google Meet / Teams / Gemini. A IA analisará todo o conteúdo e preencherá os 8 blocos de tópicos executivos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* AI Engine Status Info */}
            <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-foreground">Motor de IA Ativo:</span>
                <span className="text-muted-foreground">{aiStatus?.host || 'OpenAI / OpenRouter / Gemini'}</span>
              </div>
              <span className="text-muted-foreground font-mono">
                {aiStatus?.model || 'gpt-4o-mini'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <label className="font-medium text-foreground">
                  Transcrição ou Resumo Completo
                </label>
                <span>{transcriptText.length.toLocaleString('pt-BR')} / 120.000 caracteres</span>
              </div>
              <textarea
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="Cole aqui o texto completo da reunião (ex: transcrição do Meet, resumo de ata ou exportação de áudio)..."
                rows={12}
                maxLength={120000}
                className="w-full p-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAiModalOpen(false)}
              disabled={isGeneratingAi}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateAi}
              disabled={isGeneratingAi || transcriptText.trim().length < 20}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground"
            >
              {isGeneratingAi ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Iniciando processamento...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Extrair Tópicos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Links Externos (Google Drive / Docs) */}
      <Dialog open={linksModalOpen} onOpenChange={setLinksModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary" />
              Links Externos da Reunião
            </DialogTitle>
            <DialogDescription>
              Insira links para documentos do Google Drive, Google Docs ou transcrições completas da reunião.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Link do Resumo Completo</label>
              <input
                type="url"
                value={fullSummaryUrlInput}
                onChange={(e) => setFullSummaryUrlInput(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground"
              />
              <p className="text-[11px] text-muted-foreground">
                Exibido no botão &quot;Resumo completo ↗&quot; no topo da página.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Link da Transcrição Completa</label>
              <input
                type="url"
                value={transcriptUrlInput}
                onChange={(e) => setTranscriptUrlInput(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground"
              />
              <p className="text-[11px] text-muted-foreground">
                Exibido no botão &quot;Transcrição ↗&quot; no topo da página.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLinksModalOpen(false)}
              disabled={savingLinks}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveLinks} disabled={savingLinks}>
              {savingLinks ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Salvando...
                </>
              ) : (
                'Salvar Links'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
