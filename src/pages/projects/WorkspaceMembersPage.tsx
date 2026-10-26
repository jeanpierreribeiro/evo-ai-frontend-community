import React, { useEffect, useState } from 'react';
import { Users2, UserPlus, Trash2, Shield, User, Eye, X } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { projectsService } from '@/services/projects/projectsService';
import type { WorkspaceMember, WorkspaceRole } from '@/types/projects';

export const WorkspaceMembersPage: React.FC = () => {
  const { activeWorkspace } = useWorkspaceStore();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('MEMBER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    projectsService
      .listMembers(activeWorkspace.id)
      .then((data) => setMembers(data))
      .catch((err) => console.error('Erro ao carregar membros:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMembers();
  }, [activeWorkspace?.id]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace?.id || !name.trim() || !email.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await projectsService.addMember(activeWorkspace.id, {
        userId: email.trim().toLowerCase(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
      });
      setIsInviteOpen(false);
      setName('');
      setEmail('');
      loadMembers();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Erro ao adicionar membro');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeWorkspace?.id || !window.confirm('Tem certeza que deseja remover este membro da empresa?')) return;
    try {
      await projectsService.removeMember(activeWorkspace.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error('Erro ao remover membro:', err);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
            <Users2 className="w-4 h-4" />
            <span>Controle de Acessos</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">Membros da Empresa</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie operadores, gerentes e visualizadores vinculados a{' '}
            <span className="font-semibold text-foreground">{activeWorkspace?.name}</span>.
          </p>
        </div>

        <Button onClick={() => setIsInviteOpen(true)} className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          <span>Convidar Membro</span>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Carregando membros...
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="divide-y divide-border">
            {members.map((member) => (
              <div
                key={member.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{member.name}</h4>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                    {member.role === 'ADMIN' && <Shield className="w-3.5 h-3.5 text-blue-500" />}
                    {member.role === 'MEMBER' && <User className="w-3.5 h-3.5 text-emerald-500" />}
                    {member.role === 'VIEWER' && <Eye className="w-3.5 h-3.5 text-amber-500" />}
                    {member.role === 'ADMIN' && 'Administrador'}
                    {member.role === 'MEMBER' && 'Membro'}
                    {member.role === 'VIEWER' && 'Visualizador'}
                  </span>

                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1.5 text-muted-foreground hover:text-red-500 rounded-md hover:bg-muted transition-colors"
                    title="Remover Membro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Adicionar Membro</h3>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-5 space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ana Silva"
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  E-mail *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ana@empresa.com"
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Nível de Acesso (Papel)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as WorkspaceRole)}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                >
                  <option value="ADMIN">Administrador (Acesso total)</option>
                  <option value="MEMBER">Membro (Cria e edita tarefas)</option>
                  <option value="VIEWER">Visualizador (Apenas leitura)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInviteOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? 'Adicionando...' : 'Adicionar Membro'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceMembersPage;
