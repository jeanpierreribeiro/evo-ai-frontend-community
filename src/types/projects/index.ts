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
  status?: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
  avatarUrl?: string | null;
  timezone?: string;
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
  key?: string;
  taskCounter?: number;
  backlogColumnId?: string | null;
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
  projectKey?: string;
  displayCode?: string;
  version: number;
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
  estimatedMinutes?: number | null;
  estimatedHours?: number | null;
  tags: string[];
  labels?: Array<{
    id: string;
    name: string;
    normalizedName?: string;
    color: string;
  }>;
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
  relations?: Array<{
    id: string;
    type: 'BLOCKS' | 'BLOCKED_BY' | 'RELATES_TO';
    relatedTask: {
      id: string;
      title: string;
      taskNumber: number;
      displayCode?: string;
      column?: Column;
    };
    createdAt: string;
  }>;
  timeEntries?: TimeEntry[];
  comments?: Comment[];
  activities?: Activity[];
  attachments?: Attachment[];
  customFields?: TaskCustomFieldValue[];
  customFieldValues?: TaskCustomFieldValue[];
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
  archivedAt?: string | null;
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

export interface TaskPublicDTO {
  taskId: string;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  startDate?: string | null;
  dueDate?: string | null;
  checklist?: Array<{ id: string; title: string; completed: boolean }>;
  resources?: Array<{ id: string; title: string; url: string; type: string }>;
  customFields?: Array<{ name: string; value: string }>;
  publicContentUpdatedAt: string;
}

export interface ShareManagementDTO {
  id: string;
  taskId: string;
  expiresAt: string;
  revokedAt?: string | null;
  createdAt: string;
  createdBy: { type: string; id: string; name?: string };
  sections: {
    showStatus: boolean;
    showPriority: boolean;
    showDates: boolean;
    showChecklist: boolean;
  };
}

export interface ShareIssuedDTO {
  shareId: string;
  url: string;
  pin: string;
  expiresAt: string;
}

export interface Label {
  id: string;
  workspaceId: string;
  name: string;
  normalizedName: string;
  color: string;
  taskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShareInput {
  expiresInDays?: number;
  showDescription?: boolean;
  showSubtasks?: boolean;
  showResources?: boolean;
  showAttachments?: boolean;
  showCustomFields?: boolean;
  selectedResourceIds?: string[];
  selectedAttachmentIds?: string[];
  selectedCustomFieldIds?: string[];
}

export interface Attachment {
  id: string;
  taskId: string;
  commentId?: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  hashSha256: string;
  downloadUrl?: string;
  uploadedById: string;
  createdAt: string;
}

export interface CustomFieldOption {
  id: string;
  label: string;
  color?: string | null;
}

export interface CustomField {
  id: string;
  projectId: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: CustomFieldOption[];
  isPublicEligible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCustomFieldValue {
  fieldId: string;
  fieldName: string;
  type: 'text' | 'number' | 'date' | 'select';
  value: any;
  displayValue: any;
  options?: CustomFieldOption[];
  isPublicEligible: boolean;
}

export interface TransferPreviewData {
  taskId: string;
  currentProject: { id: string; name: string; key: string };
  targetProject: { id: string; name: string; key: string };
  fromDisplayCode: string;
  toDisplayCode: string;
  columnsAvailable: Array<{ id: string; name: string }>;
  relationsToSever: Array<{ id: string; targetTaskId: string; type: string }>;
  activeSharesToRevokeCount: number;
}

