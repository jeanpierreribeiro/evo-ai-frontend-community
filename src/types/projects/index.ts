export type WorkspaceRole = 'ADMIN' | 'MEMBER' | 'VIEWER';
export type Priority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type RelationType = 'BLOCKS' | 'BLOCKED_BY' | 'RELATES_TO';
export type ApprovalStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: WorkspaceRole;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
  avatarUrl?: string | null;
  members?: WorkspaceMember[];
  _count?: {
    projects: number;
    tasks: number;
    members: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  projectId: string;
  name: string;
  position: number;
  color?: string | null;
  isDoneColumn: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  isArchived: boolean;
  columns?: Column[];
  totalTasks?: number;
  completedTasks?: number;
  progress?: number;
  _count?: {
    tasks: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
}

export interface TaskResource {
  id: string;
  taskId: string;
  title: string;
  url: string;
  type: string;
  createdAt: string;
}

export interface TaskRelation {
  id: string;
  taskId: string;
  relatedTaskId: string;
  type: RelationType;
  relatedTask?: {
    id: string;
    title: string;
    taskNumber: number;
    column?: Column;
  };
  task?: {
    id: string;
    title: string;
    taskNumber: number;
    column?: Column;
  };
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  description?: string | null;
  durationMinutes: number;
  date: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  taskNumber: number;
  workspaceId: string;
  projectId: string;
  columnId: string;
  title: string;
  description?: string | null;
  priority: Priority;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeAvatar?: string | null;
  position: number;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  tags: string[];
  isArchived: boolean;

  // Validation / Approval
  approvalStatus: ApprovalStatus;
  approvalToken?: string | null;
  approvalPin?: string | null;
  approvalFeedback?: string | null;
  approvedAt?: string | null;
  approvedIp?: string | null;

  // Relations & counts
  column?: Column;
  project?: {
    id: string;
    name: string;
    color?: string | null;
  };
  subtasks?: Subtask[];
  resources?: TaskResource[];
  relationsFrom?: TaskRelation[];
  relationsTo?: TaskRelation[];
  timeEntries?: TimeEntry[];
  comments?: Comment[];
  completedSubtasks?: number;
  totalSubtasks?: number;
  subtaskProgress?: number;

  _count?: {
    comments: number;
    subtasks: number;
    timeEntries: number;
  };

  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  taskId?: string | null;
  userId: string;
  userName: string;
  action: string;
  details?: any;
  createdAt: string;
  task?: {
    id: string;
    title: string;
    taskNumber: number;
  };
  project?: {
    id: string;
    name: string;
    color?: string | null;
  };
}

export interface Notification {
  id: string;
  workspaceId: string;
  userId: string;
  taskId?: string | null;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  task?: {
    id: string;
    title: string;
    taskNumber: number;
    projectId: string;
  };
}

export interface DashboardData {
  stats: {
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    openTasks: number;
    overallProgress: number;
  };
  projects: Project[];
  upcomingTasks: Task[];
  activities: Activity[];
}
