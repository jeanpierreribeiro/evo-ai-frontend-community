import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { schedulingService } from '@/services/scheduling/schedulingService';
import type { EventType } from '@/types/scheduling';
import {
  Globe,
  Copy,
  ExternalLink,
  Check,
  Layers,
  Sparkles,
  Bot,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { toast } from 'sonner';

export default function PublicPreviewPage() {
  const { user } = useAuth();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const username = user?.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '-') || 'user';
  const mainPublicUrl = `${window.location.origin}/book/${username}`;

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      await schedulingService.syncUser({
        id: user.id,
        name: user.name || user.email.split('@')[0],
        email: user.email,
        username,
      });
      const types = await schedulingService.getEventTypes(user.id);
      setEventTypes(types.filter((t) => t.isActive));
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [user, username]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyToClipboard = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(key);
    toast.success('Link copiado para a área de transferência!');
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          Minha Página Pública de Agendamento
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envie seus links de agendamento diretamente para clientes, insira na assinatura de e-mail ou utilize nas automações do WhatsApp.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p>Carregando páginas públicas...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main User Link Banner */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Link Central do Atendente
              </span>
              <h3 className="text-lg font-semibold text-foreground">
                Página Principal de Serviços
              </h3>
              <p className="text-sm text-muted-foreground font-mono">
                {mainPublicUrl}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(mainPublicUrl, 'main')}
                className="flex items-center gap-1.5"
              >
                {copiedLink === 'main' ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-green-500 font-medium">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar Link
                  </>
                )}
              </Button>
              <a
                href={mainPublicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-input bg-background hover:bg-accent text-foreground"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Individual Event Types */}
          <div className="bg-card text-card-foreground rounded-xl border border-border p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Links Específicos por Tipo de Serviço
            </h2>

            {eventTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-3">
                Você ainda não possui tipos de evento ativos. Crie um na aba "Tipos de Evento".
              </p>
            ) : (
              <div className="divide-y divide-border">
                {eventTypes.map((et) => {
                  const eventUrl = `${window.location.origin}/book/${username}/${et.slug}`;
                  return (
                    <div
                      key={et.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: et.color || '#3b82f6' }}
                          />
                          <h4 className="font-semibold text-sm text-foreground">{et.title}</h4>
                          <span className="text-xs text-muted-foreground">({et.length} min)</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{eventUrl}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(eventUrl, et.id)}
                          className="h-8 px-2 text-xs flex items-center gap-1.5"
                        >
                          {copiedLink === et.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-500" />
                              <span className="text-green-500 font-semibold">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </Button>

                        <a
                          href={eventUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI and WhatsApp Automation Tips */}
          <div className="bg-card text-card-foreground rounded-xl border border-border p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              Integrações com WhatsApp e Agentes de IA
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-lg bg-accent/40 border border-border space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Bot className="w-4 h-4 text-primary" />
                  Agentes de IA (Evo Bot Runtime)
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Os agentes de IA podem consultar automaticamente sua disponibilidade via API e oferecer horários livres no fluxo da conversa do WhatsApp, realizando o agendamento sem intervenção manual.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-accent/40 border border-border space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Respostas Rápidas & Campanhas
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cadastre o link do seu tipo de evento em "Respostas Rápidas" ou insira em suas campanhas ativas para que o lead selecione o melhor horário diretamente no navegador.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
