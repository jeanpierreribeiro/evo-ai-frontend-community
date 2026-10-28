import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Kanban,
  List,
  GitGraph,
  Calendar,
  Layers,
  Settings,
  Plus,
  ChevronRight,
  FolderKanban,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { projectsService } from '@/services/projects/projectsService';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { Project, Column, Task } from '@/types/projects';
import { cn } from '@/utils/cn';

// Views
import { KanbanView } from '@/components/projects/views/KanbanView';
import { ListView } from '@/components/projects/views/ListView';
import { GanttView } from '@/components/projects/views/GanttView';
import { CalendarView } from '@/components/projects/views/CalendarView';
import { BacklogView } from '@/components/projects/views/BacklogView';
import { ProjectSettingsView } from '@/components/projects/views/ProjectSettingsView';
import { CreateTaskModal } from '@/components/projects/modals/CreateTaskModal';
import { TaskDetailDrawer } from '@/components/projects/task/TaskDetailDrawer';

export const ProjectDetailsPage: React.FC = () => {
  const { projectId, view = 'kanban' } = useParams<{ projectId: string; view?: string }>();
  const navigate = useNavigate();

  const { activeWorkspace } = useWorkspaceStore();

  const [project, setProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | undefined>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const loadProjectData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [projData, tasksData] = await Promise.all([
        projectsService.getProject(projectId),
        projectsService.listTasks(projectId),
      ]);
      setProject(projData);
      setColumns(projData.columns || []);
      setTasks(tasksData);
    } catch (err) {
      console.error('Erro ao carregar projeto:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    loadProjectData();
  }, [loadProjectData]);

  const handleOpenCreateTask = (columnId?: string) => {
    setSelectedColumnId(columnId);
    setIsCreateTaskOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-sm text-muted-foreground">
        Carregando projeto...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <FolderKanban className="w-10 h-10 text-muted-foreground/60 mb-2" />
        <h2 className="text-base font-bold text-foreground">Projeto não encontrado</h2>
        <Button onClick={() => navigate('/projects')} className="mt-4 text-xs">
          Voltar para Início
        </Button>
      </div>
    );
  }

  const tabs = [
    { key: 'kanban', label: 'Quadro (Kanban)', icon: Kanban },
    { key: 'list', label: 'Lista', icon: List },
    { key: 'gantt', label: 'Gráfico de Gantt', icon: GitGraph },
    { key: 'calendar', label: 'Calendário', icon: Calendar },
    { key: 'backlog', label: 'Backlog', icon: Layers },
    { key: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Project Top Bar */}
      <div className="p-4 border-b border-border bg-card/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              onClick={() => navigate('/projects')}
              className="hover:text-foreground cursor-pointer transition-colors"
            >
              {activeWorkspace?.name || 'Workspace'}
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: project.color || '#6366f1' }}
              />
              {project.name}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">
            {project.description || `${tasks.length} tarefas cadastradas neste fluxo.`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleOpenCreateTask()}
            size="sm"
            className="flex items-center gap-1.5 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Tarefa</span>
          </Button>
        </div>
      </div>

      {/* Views Navigation Tabs */}
      <div className="flex items-center gap-1 px-4 border-b border-border bg-card/20 overflow-x-auto flex-shrink-0">
        {tabs.map((tab) => {
          const isActive = view === tab.key;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              onClick={() => navigate(`/projects/${project.id}/${tab.key}`)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap',
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === 'kanban' && (
          <KanbanView
            projectId={project.id}
            columns={columns}
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onTasksChange={loadProjectData}
            onOpenCreateTask={handleOpenCreateTask}
          />
        )}

        {view === 'list' && (
          <ListView
            columns={columns}
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onOpenCreateTask={handleOpenCreateTask}
          />
        )}

        {view === 'gantt' && (
          <GanttView tasks={tasks} onTaskClick={handleTaskClick} />
        )}

        {view === 'calendar' && (
          <CalendarView tasks={tasks} onTaskClick={handleTaskClick} />
        )}

        {view === 'backlog' && (
          <BacklogView
            project={project}
            columns={columns}
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onTasksChange={loadProjectData}
            onOpenCreateTask={handleOpenCreateTask}
          />
        )}

        {view === 'settings' && (
          <ProjectSettingsView
            project={project}
            columns={columns}
            onProjectChange={loadProjectData}
          />
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        projectId={project.id}
        columns={columns}
        defaultColumnId={selectedColumnId}
        onClose={() => setIsCreateTaskOpen(false)}
        onSuccess={() => loadProjectData()}
      />

      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          columns={columns}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={() => loadProjectData()}
        />
      )}
    </div>
  );
};

export default ProjectDetailsPage;
