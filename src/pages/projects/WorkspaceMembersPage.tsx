import React, { useEffect, useState } from 'react';
import { Users2, UserPlus, Trash2, Shield, User as UserIcon, Eye, X, Search, AlertTriangle } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { projectsService } from '@/services/projects/projectsService';
import { usersService } from '@/services/users/usersService';
import type { WorkspaceMember, WorkspaceRole } from '@/types/projects';
import type { User } from '@/types/users';

export const WorkspaceMembersPage: React.FC = () => {
  const { activeWorkspace } = useWorkspaceStore();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Seleção canônica de usuário pelo diretório do Auth (E1.6-g)
  const [userSearch, setUserSearch] = useState('');
  const [directoryUsers, setDirectoryUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searching, setSearching] = useState(false);

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

  // Busca de usuários no diretório do Auth
  useEffect(() => {
    if (!isInviteOpen) return;

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await usersService.getUsers({
          q: userSearch.trim() || undefined,
          per_page: 10,
        });
        setDirectoryUsers(res.data || []);
      } catch (err) {
        console.error('Falha ao buscar usuários no diretório:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [userSearch, isInviteOpen]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace?.id || !selectedUser) {
      setError('Selecione um usuário cadastrado no sistema.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // Envia ID canônico UUID do usuário no Auth, nunca email puro como userId (S7 / E1.6-g)
      await projectsService.addMember(activeWorkspace.id, {
        userId: String(selectedUser.id),
        name: selectedUser.name || selectedUser.email,
        email: selectedUser.email,
        role,
        avatarUrl: selectedUser.avatar_url,
      });
      setIsInviteOpen(false);
      setSelectedUser(null);
      setUserSearch('');
      loadMembers();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err.message ||
          'Erro ao adicionar membro'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeWorkspace?.id || !window.confirm('Tem certeza que deseja remover este membro da empresa?')) return;
    try {
      await projectsService.removeMember(activeWorkspace.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao remover membro');
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

        <Button
          onClick={() => {
            setSelectedUser(null);
            setUserSearch('');
            setError(null);
            setIsInviteOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Adicionar Membro</span>
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Carregando membros...</div>
      ) : members.length === 0 ? (
        <div className="border border-border/60 bg-card rounded-xl p-8 text-center space-y-3">
          <Users2 className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-foreground">Nenhum membro vinculado</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Adicione operadores e gestores autorizados para colaborar nas demandas deste workspace.
          </p>
        </div>
      ) : (
        <div className="border border-border/60 bg-card rounded-xl overflow-hidden shadow-sm">
          <div className="divide-y divide-border/60">
            {members.map((member) => (
              <div
                key={member.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">{member.name}</span>
                      {member.status === 'PENDING' && (
                        <span className="flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          Reconciliação Pendente
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground block truncate">{member.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      member.role === 'ADMIN'
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                        : member.role === 'MEMBER'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                        : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
                    }`}
                  >
                    {member.role === 'ADMIN' ? (
                      <Shield className="w-3.5 h-3.5" />
                    ) : member.role === 'MEMBER' ? (
                      <UserIcon className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    {member.role === 'ADMIN'
                      ? 'Administrador'
                      : member.role === 'MEMBER'
                      ? 'Membro'
                      : 'Visualizador'}
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
                  Buscar Usuário no Sistema *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      if (selectedUser) setSelectedUser(null);
                    }}
                    placeholder="Digite nome ou e-mail..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>

                {searching && (
                  <p className="text-xs text-muted-foreground mt-1.5">Buscando no diretório do Auth...</p>
                )}

                {/* Lista de sugestões encontradas */}
                {!selectedUser && directoryUsers.length > 0 && (
                  <div className="mt-2 border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border/60 bg-card">
                    {directoryUsers.map((u) => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setUserSearch(`${u.name} (${u.email})`);
                          setError(null);
                        }}
                        className="w-full text-left p-2.5 hover:bg-muted/50 flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{u.name}</p>
                          <p className="text-muted-foreground">{u.email}</p>
                        </div>
                        <span className="text-[10px] text-primary font-mono">UUID #{u.id}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedUser && (
                  <div className="mt-2 p-2.5 rounded-lg border border-primary/30 bg-primary/5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-primary">{selectedUser.name}</p>
                      <p className="text-muted-foreground">{selectedUser.email}</p>
                    </div>
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono">
                      Selecionado
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Nível de Acesso (Papel no Workspace)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as WorkspaceRole)}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                >
                  <option value="ADMIN">Administrador (Gestão de membros e configurações)</option>
                  <option value="MEMBER">Membro (Cria e edita tarefas)</option>
                  <option value="VIEWER">Visualizador (Apenas leitura)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting || !selectedUser}>
                  {submitting ? 'Vinculando...' : 'Adicionar ao Workspace'}
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
