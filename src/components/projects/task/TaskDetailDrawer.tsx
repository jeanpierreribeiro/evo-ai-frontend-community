import React from 'react';
import type { Task, Column } from '@/types/projects';
import { TaskCardView } from './TaskCardView';

interface Props {
  task: Task;
  columns: Column[];
  onClose: () => void;
  onTaskUpdate: () => void;
}

/**
 * TaskDetailDrawer (E3.9-a)
 * Encapsula o TaskCardView no modo "drawer" lateral para visualizações Kanban, Lista, etc.
 * Mantém o mesmo componente e estado unificado do modo página cheia.
 */
export const TaskDetailDrawer: React.FC<Props> = ({
  task,
  columns,
  onClose,
  onTaskUpdate,
}) => {
  return (
    <TaskCardView
      taskId={task.id}
      initialTask={task}
      columns={columns}
      mode="drawer"
      onClose={onClose}
      onTaskUpdate={onTaskUpdate}
    />
  );
};

export default TaskDetailDrawer;
