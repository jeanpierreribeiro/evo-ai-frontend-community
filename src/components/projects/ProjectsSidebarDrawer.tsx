import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  X,
  ChevronDown,
  Building2,
  Plus,
  Home,
  Inbox,
  CheckSquare,
  Users2,
  FolderKanban,
  Kanban,
  List,
  GitGraph,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@evoapi/design-system';
import { cn } from '@/utils/cn';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { projectsService } from '@/services/projects/projectsService';
import type { Project } from '@/types/projects';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { CreateProjectModal } from './CreateProjectModal';

interface Props {
  onClose: () => void;
}

export const ProjectsSidebarDrawer: React.FC<Props> = ({ onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const { workspaces, activeWorkspace, fetchWorkspaces, setActiveWorkspace } = useWorkspaceStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Fetch workspaces on mount
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Load projects whenever active workspace changes
  useEffect(() => {
    if (!activeWorkspace?.id) return;
    setLoadingProjects(true);
    projectsService
      .listProjects(activeWorkspace.id)
      .then((data) => {
        setProjects(data);
      })
      .catch((err) => console.error('Erro ao buscar projetos:', err))
      .finally(() => setLoadingProjects(false));
  }, [activeWorkspace?.id]);

  // Determine which project is active from the URL path
  useEffect(() => {
    const match = pathname.match(/\/projects\/([a-zA-Z0-9_-]+)/);
    if (match && !['inbox', 'my-tasks', 'members'].includes(match[1])) {
      setExpandedProjectId(match[1]);
    }
  }, [pathname]);

  const handleSelectWorkspace = (w: typeof activeWorkspace) => {
    setActiveWorkspace(w);
    setIsWorkspaceDropdownOpen(false);
    navigate('/projects');
  };

  const isGlobalActive = (path: string) => {
    if (path === '/projects') return pathname === '/projects';
    return pathname.startsWith(path);
  };

  const isProjectViewActive = (projectId: string, view: string) => {
    return pathname === `/projects/${projectId}/${view}`;
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-64 select-none">
      {/* Drawer Header: Workspace Selector & Close */}
      <div className="flex items-center justify-between p-3 border-b border-sidebar-border">
        {/* Workspace Dropdown Trigger */}
        <div className="relative flex-1 min-w-0 mr-2">
          <button
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-sidebar-accent text-left transition-colors"
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: activeWorkspace?.color || '#3b82f6' }}
            >
              {activeWorkspace?.name?.charAt(0).toUpperCase() || 'W'}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-xs font-semibold text-sidebar-foreground truncate">
                {activeWorkspace?.name || 'Selecione a Empresa'}
              </span>
              <span className="block text-[10px] text-muted-foreground truncate">Workspace</span>
            </div>
            <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform duration-150', isWorkspaceDropdownOpen && 'rotate-180')} />
          </button>

          {/* Workspace Dropdown Menu */}
          {isWorkspaceDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-60 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Suas Empresas / Workspaces
              </div>
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => handleSelectWorkspace(w)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-accent transition-colors',
                    w.id === activeWorkspace?.id && 'bg-primary/10 text-primary font-medium'
                  )}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: w.color || '#3b82f6' }}
                  />
                  <span className="truncate flex-1">{w.name}</span>
                </button>
              ))}

              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsWorkspaceDropdownOpen(false);
                    setIsCreateWorkspaceOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-primary hover:bg-accent transition-colors font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Empresa</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 hover:bg-sidebar-accent text-sidebar-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Fechar menu</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Navigation Body */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Global Company Views */}
        <div className="space-y-0.5">
          <Link
            to="/projects"
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
              isGlobalActive('/projects')
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
            )}
          >
            <Home className="w-4 h-4" />
            <span>Início (Dashboard)</span>
          </Link>

          <Link
            to="/projects/inbox"
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
              isGlobalActive('/projects/inbox')
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
            )}
          >
            <Inbox className="w-4 h-4" />
            <span>Caixa de Entrada</span>
          </Link>

          <Link
            to="/projects/my-tasks"
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
              isGlobalActive('/projects/my-tasks')
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
            )}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Minhas Tarefas</span>
          </Link>

          <Link
            to="/projects/members"
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
              isGlobalActive('/projects/members')
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
            )}
          >
            <Users2 className="w-4 h-4" />
            <span>Membros</span>
          </Link>
        </div>

        {/* Projects Section */}
        <div className="pt-2 border-t border-sidebar-border">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Projetos ({projects.length})
            </span>
            <button
              onClick={() => setIsCreateProjectOpen(true)}
              className="p-1 text-muted-foreground hover:text-primary rounded hover:bg-sidebar-accent transition-colors"
              title="Novo Projeto"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingProjects && (
            <div className="text-xs text-muted-foreground px-2 py-1">Carregando projetos...</div>
          )}

          {!loadingProjects && projects.length === 0 && (
            <div className="text-center p-3 text-xs text-muted-foreground border border-dashed border-sidebar-border rounded-lg">
              Nenhum projeto ainda.
              <button
                onClick={() => setIsCreateProjectOpen(true)}
                className="block text-primary hover:underline mx-auto mt-1"
              >
                + Criar primeiro
              </button>
            </div>
          )}

          <div className="space-y-1">
            {projects.map((project) => {
              const isExpanded = expandedProjectId === project.id;

              return (
                <div key={project.id} className="space-y-0.5">
                  <div
                    onClick={() => {
                      setExpandedProjectId(isExpanded ? null : project.id);
                      navigate(`/projects/${project.id}/kanban`);
                    }}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors group',
                      pathname.startsWith(`/projects/${project.id}`)
                        ? 'bg-sidebar-accent text-sidebar-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                    )}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color || '#6366f1' }}
                    />
                    <span className="truncate flex-1 font-medium">{project.name}</span>
                    <ChevronDown
                      className={cn(
                        'w-3 h-3 text-muted-foreground transition-transform duration-150',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </div>

                  {/* Sub-views for expanded project */}
                  {isExpanded && (
                    <div className="pl-6 pr-1 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                      <Link
                        to={`/projects/${project.id}/kanban`}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors',
                          isProjectViewActive(project.id, 'kanban')
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                        )}
                      >
                        <Kanban className="w-3.5 h-3.5" />
                        <span>Quadro (Kanban)</span>
                      </Link>

                      <Link
                        to={`/projects/${project.id}/list`}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors',
                          isProjectViewActive(project.id, 'list')
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                        )}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Lista</span>
                      </Link>

                      <Link
                        to={`/projects/${project.id}/gantt`}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors',
                          isProjectViewActive(project.id, 'gantt')
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                        )}
                      >
                        <GitGraph className="w-3.5 h-3.5" />
                        <span>Gráfico de Gantt</span>
                      </Link>

                      <Link
                        to={`/projects/${project.id}/calendar`}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors',
                          isProjectViewActive(project.id, 'calendar')
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                        )}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Calendário</span>
                      </Link>

                      <Link
                        to={`/projects/${project.id}/backlog`}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors',
                          isProjectViewActive(project.id, 'backlog')
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                        )}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Backlog</span>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
      />

      {activeWorkspace && (
        <CreateProjectModal
          isOpen={isCreateProjectOpen}
          workspaceId={activeWorkspace.id}
          onClose={() => setIsCreateProjectOpen(false)}
          onSuccess={(newProject) => {
            setProjects((prev) => [newProject, ...prev]);
            setExpandedProjectId(newProject.id);
            navigate(`/projects/${newProject.id}/kanban`);
          }}
        />
      )}
    </div>
  );
};
