import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { schedulingService } from '@/services/scheduling/schedulingService';
import { Clock, ChevronRight, Loader2, User } from 'lucide-react';

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    schedulingService
      .getPublicProfile(username)
      .then((res) => {
        setProfile(res);
      })
      .catch((err) => {
        console.error('Erro ao buscar perfil público:', err);
        setError('Atendente não encontrado ou página indisponível.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-3">
          <User className="w-10 h-10 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Perfil Não Encontrado</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background py-12 px-4 flex justify-center">
      <div className="max-w-xl w-full space-y-6">
        {/* Profile Card */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary font-bold text-2xl flex items-center justify-center mx-auto shadow-sm">
            {profile.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">
            Escolha um dos serviços abaixo para agendar um horário diretamente na minha agenda.
          </p>
        </div>

        {/* Services List */}
        <div className="space-y-3">
          {(!profile.eventTypes || profile.eventTypes.length === 0) ? (
            <div className="p-8 text-center bg-card border border-border rounded-xl text-muted-foreground text-sm">
              Nenhum serviço disponível para agendamento no momento.
            </div>
          ) : (
            profile.eventTypes.map((et: any) => (
              <Link
                key={et.id}
                to={`/book/${username}/${et.slug}`}
                className="block p-5 bg-card hover:bg-accent/50 border border-border rounded-xl shadow-sm transition-all hover:border-primary/50 group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: et.color || '#3b82f6' }}
                      />
                      <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                        {et.title}
                      </h3>
                    </div>
                    {et.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {et.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>{et.length} minutos</span>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
