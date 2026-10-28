import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  TrendingUp,
  Plus,
  Calendar,
  ArrowRight,
  Activity as ActivityIcon,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { projectsService } from '@/services/projects/projectsService';
import type { DashboardData } from '@/types/projects';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';

export const ProjectsHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { activeWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [activityLimit, setActivityLimit] = useState(7);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    projectsService
      .getDashboard(activeWorkspace.id)
      .then((res) => setData(res))
      .catch((err) => console.error('Erro ao carregar dashboard de projetos:', err))
      .finally(() => setLoading(false));
  }, [activeWorkspace?.id]);

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
            <FolderKanban className="w-4 h-4" />
            <span>Gestão de Projetos</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">
            {activeWorkspace?.name || 'Visão Geral'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhe o progresso de entregas, tarefas e aprovações em tempo real.
          </p>
        </div>

        {activeWorkspace && (
          <Button onClick={() => setIsCreateProjectOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Novo Projeto</span>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
          Carregando indicadores...
        </div>
      ) : !data ? (
        <div className="text-center p-12 border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground text-sm">Selecione ou crie um workspace para começar.</p>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total de Projetos</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{data.stats.totalProjects}</h3>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                <FolderKanban className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Tarefas em Andamento</p>
                <h3 className="text-2xl font-bold text-amber-500 mt-1">{data.stats.openTasks}</h3>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Tarefas Concluídas</p>
                <h3 className="text-2xl font-bold text-emerald-500 mt-1">{data.stats.completedTasks}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Taxa de Conclusão</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{data.stats.overallProgress}%</h3>
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${data.stats.overallProgress}%` }}
                  />
                </div>
              </div>
              <div className="p-3 bg-primary/10 text-primary rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* 2-Column Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Projects & Up Next */}
            <div className="lg:col-span-2 space-y-6">
              {/* Projects with Progress */}
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-primary" />
                    <span>Projetos da Empresa</span>
                  </h3>
                </div>

                {data.projects.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Nenhum projeto cadastrado nesta empresa ainda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.projects.map((proj) => (
                      <div
                        key={proj.id}
                        onClick={() => navigate(`/projects/${proj.id}/kanban`)}
                        className="p-3.5 rounded-lg border border-border/60 hover:border-primary/50 hover:bg-muted/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: proj.color || '#6366f1' }}
                          />
                          <div>
                            <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                              {proj.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {proj.completedTasks || 0} de {proj.totalTasks || 0} tarefas concluídas
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 w-32">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${proj.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {proj.progress || 0}%
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Up Next Tasks */}
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-amber-500" />
                    <span>Próximas Tarefas (Up Next)</span>
                  </h3>
                  <button
                    onClick={() => navigate('/projects/my-tasks')}
                    className="text-xs text-primary hover:underline"
                  >
                    Ver todas
                  </button>
                </div>

                {data.upcomingTasks.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Tudo em dia! Nenhuma tarefa pendente no radar.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.upcomingTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => navigate(`/projects/tasks/${task.id}`)}
                        className="p-3 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                        title="Ver detalhes da tarefa"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xs font-bold font-mono text-muted-foreground group-hover:text-primary transition-colors">
                            {task.displayCode || `#${task.taskNumber}`}
                          </span>
                          <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {task.title}
                          </span>
                          {task.project && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground flex-shrink-0">
                              {task.project.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {task.dueDate && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {task.column && (
                            <span
                              className="px-2 py-0.5 text-[10px] font-medium rounded text-white"
                              style={{ backgroundColor: task.column.color || '#3b82f6' }}
                            >
                              {task.column.name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Activity Feed */}
            <div className="space-y-4">
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ActivityIcon className="w-4 h-4 text-primary" />
                  <span>Atividades Recentes</span>
                </h3>

                {data.activities.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Nenhuma atividade registrada ainda.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {data.activities.slice(0, activityLimit).map((act) => (
                      <div key={act.id} className="flex items-start gap-2.5 text-xs">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-foreground">
                            <span className="font-semibold">{act.userName}</span>{' '}
                            <span className="text-muted-foreground">
                              {act.action === 'created_task' && 'criou a tarefa'}
                              {act.action === 'updated_task' && 'atualizou'}
                              {act.action === 'moved_column' && 'moveu de coluna'}
                              {act.action === 'added_comment' && 'comentou em'}
                              {act.action === 'delivery_approved' && 'aprovou a entrega da tarefa'}
                              {act.action === 'changes_requested' && 'solicitou ajustes na tarefa'}
                              {!['created_task', 'updated_task', 'moved_column', 'added_comment', 'delivery_approved', 'changes_requested'].includes(act.action) && act.action}
                            </span>{' '}
                            {act.task && (
                              <span
                                onClick={() => navigate(`/projects/tasks/${act.task!.id}`)}
                                className="font-medium text-primary hover:underline cursor-pointer"
                                title="Ver detalhes da tarefa"
                              >
                                #{act.task.taskNumber} {act.task.title}
                              </span>
                            )}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(act.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    ))}

                    {data.activities.length > activityLimit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActivityLimit((prev) => prev + 10)}
                        className="w-full text-xs text-muted-foreground hover:text-foreground h-8"
                      >
                        Carregar mais atividades ({data.activities.length - activityLimit} restantes)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeWorkspace && (
        <CreateProjectModal
          isOpen={isCreateProjectOpen}
          workspaceId={activeWorkspace.id}
          onClose={() => setIsCreateProjectOpen(false)}
          onSuccess={(newProject) => {
            navigate(`/projects/${newProject.id}/kanban`);
          }}
        />
      )}
    </div>
  );
};

export default ProjectsHomePage;
