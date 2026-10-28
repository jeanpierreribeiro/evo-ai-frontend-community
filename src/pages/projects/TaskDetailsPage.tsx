import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Menu, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { projectsService } from '@/services/projects/projectsService';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { Task, Column } from '@/types/projects';
import { TaskCardView } from '@/components/projects/task/TaskCardView';
import { ProjectsSidebarDrawer } from '@/components/projects/ProjectsSidebarDrawer';

/**
 * TaskDetailsPage (E3.9-a)
 * Rota canônica `/projects/tasks/:taskId`.
 * Abertura direta e refresh por ID da tarefa.
 * Sincroniza o seletor de workspace e renderiza o TaskCardView unificado em tela cheia.
 */
export const TaskDetailsPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const { activeWorkspace, setActiveWorkspaceById, fetchWorkspaces } = useWorkspaceStore();

  const [task, setTask] = useState<Task | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const loadTaskData = async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const taskData = await projectsService.getTask(taskId);
      setTask(taskData);

      // Sincroniza o workspace ativo com o workspace da tarefa
      if (taskData.workspaceId) {
        setActiveWorkspaceById(taskData.workspaceId);
      }

      // Busca colunas do projeto
      if (taskData.projectId) {
        const cols = await projectsService.listColumns(taskData.projectId);
        setColumns(cols);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao carregar a tarefa.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    loadTaskData();
  }, [taskId]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Sidebar Drawer para Projetos */}
      <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <ProjectsSidebarDrawer onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Backdrop no mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
        />
      )}

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Barra superior de navegação da página */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-card/40 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground md:hidden"
              title="Abrir Menu de Projetos"
            >
              <Menu className="w-4 h-4" />
            </button>

            {task && (
              <button
                onClick={() => navigate(`/projects/${task.projectId}`)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                title="Voltar ao Projeto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar ao Projeto</span>
              </button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {activeWorkspace?.name ? `Workspace: ${activeWorkspace.name}` : ''}
          </div>
        </div>

        {/* Corpo da Página */}
        <div className="flex-1 p-4 md:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Carregando detalhes da tarefa...</span>
            </div>
          ) : error || !task ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-card/40 border border-border rounded-2xl max-w-lg mx-auto mt-12">
              <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
              <h3 className="text-lg font-bold text-foreground">Tarefa Indisponível</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {error || 'A tarefa requisitada não existe ou seu usuário não possui permissão para acessá-la.'}
              </p>
              <div className="flex items-center gap-2 mt-6">
                <Button size="sm" onClick={() => navigate('/projects')}>
                  Ir para Projetos
                </Button>
              </div>
            </div>
          ) : (
            <TaskCardView
              taskId={task.id}
              initialTask={task}
              columns={columns}
              mode="page"
              onTaskUpdate={loadTaskData}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsPage;
