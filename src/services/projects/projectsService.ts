import { projectsApi } from './projectsApi';
import type {
  Workspace,
  WorkspaceMember,
  Project,
  Column,
  Task,
  DashboardData,
  Notification,
  Priority,
  RelationType,
} from '@/types/projects';

export const projectsService = {
  // --- Workspaces ---
  async listWorkspaces(): Promise<Workspace[]> {
    const { data } = await projectsApi.get('/workspaces');
    return data.data;
  },

  async createWorkspace(payload: { name: string; description?: string; color?: string }): Promise<Workspace> {
    const { data } = await projectsApi.post('/workspaces', payload);
    return data.data;
  },

  async getWorkspace(id: string): Promise<Workspace> {
    const { data } = await projectsApi.get(`/workspaces/${id}`);
    return data.data;
  },

  async updateWorkspace(id: string, payload: Partial<Workspace>): Promise<Workspace> {
    const { data } = await projectsApi.put(`/workspaces/${id}`, payload);
    return data.data;
  },

  async deleteWorkspace(id: string): Promise<void> {
    await projectsApi.delete(`/workspaces/${id}`);
  },

  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const { data } = await projectsApi.get(`/workspaces/${workspaceId}/members`);
    return data.data;
  },

  async addMember(workspaceId: string, payload: { userId: string; email: string; name: string; role?: string }): Promise<WorkspaceMember> {
    const { data } = await projectsApi.post(`/workspaces/${workspaceId}/members`, payload);
    return data.data;
  },

  async removeMember(workspaceId: string, memberId: string): Promise<void> {
    await projectsApi.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  },

  // --- Dashboard ---
  async getDashboard(workspaceId: string): Promise<DashboardData> {
    const { data } = await projectsApi.get(`/workspaces/${workspaceId}/dashboard`);
    return data.data;
  },

  // --- Inbox ---
  async getInbox(workspaceId: string): Promise<Notification[]> {
    const { data } = await projectsApi.get(`/workspaces/${workspaceId}/inbox`);
    return data.data;
  },

  async markNotificationRead(id: string): Promise<void> {
    await projectsApi.patch(`/inbox/${id}/read`);
  },

  async markAllNotificationsRead(workspaceId: string): Promise<void> {
    await projectsApi.post(`/workspaces/${workspaceId}/inbox/mark-all-read`);
  },

  // --- My Tasks ---
  async getMyTasks(workspaceId: string): Promise<Task[]> {
    const { data } = await projectsApi.get(`/workspaces/${workspaceId}/my-tasks`);
    return data.data;
  },

  // --- Projects ---
  async listProjects(workspaceId: string, includeArchived = false): Promise<Project[]> {
    const { data } = await projectsApi.get(`/workspaces/${workspaceId}/projects`, {
      params: { includeArchived },
    });
    return data.data;
  },

  async createProject(workspaceId: string, payload: { name: string; description?: string; color?: string; icon?: string }): Promise<Project> {
    const { data } = await projectsApi.post(`/workspaces/${workspaceId}/projects`, payload);
    return data.data;
  },

  async getProject(id: string): Promise<Project> {
    const { data } = await projectsApi.get(`/projects/${id}`);
    return data.data;
  },

  async updateProject(id: string, payload: Partial<Project>): Promise<Project> {
    const { data } = await projectsApi.put(`/projects/${id}`, payload);
    return data.data;
  },

  async deleteProject(id: string): Promise<void> {
    await projectsApi.delete(`/projects/${id}`);
  },

  // --- Columns ---
  async listColumns(projectId: string): Promise<Column[]> {
    const { data } = await projectsApi.get(`/projects/${projectId}/columns`);
    return data.data;
  },

  async createColumn(projectId: string, payload: { name: string; color?: string; isDoneColumn?: boolean }): Promise<Column> {
    const { data } = await projectsApi.post(`/projects/${projectId}/columns`, payload);
    return data.data;
  },

  async updateColumn(id: string, payload: Partial<Column>): Promise<Column> {
    const { data } = await projectsApi.put(`/columns/${id}`, payload);
    return data.data;
  },

  async reorderColumns(projectId: string, columns: { id: string; position: number }[]): Promise<void> {
    await projectsApi.put(`/projects/${projectId}/columns/reorder`, { columns });
  },

  async deleteColumn(id: string): Promise<void> {
    await projectsApi.delete(`/columns/${id}`);
  },

  // --- Tasks ---
  async listTasks(projectId: string, filters?: { columnId?: string; assigneeId?: string; priority?: Priority }): Promise<Task[]> {
    const { data } = await projectsApi.get(`/projects/${projectId}/tasks`, { params: filters });
    return data.data;
  },

  async createTask(projectId: string, payload: Partial<Task>): Promise<Task> {
    const { data } = await projectsApi.post(`/projects/${projectId}/tasks`, payload);
    return data.data;
  },

  async getTask(id: string): Promise<Task> {
    const { data } = await projectsApi.get(`/tasks/${id}`);
    return data.data;
  },

  async updateTask(id: string, payload: Partial<Task>): Promise<Task> {
    const { data } = await projectsApi.put(`/tasks/${id}`, payload);
    return data.data;
  },

  async moveTask(id: string, targetColumnId: string, targetPosition: number): Promise<Task> {
    const { data } = await projectsApi.put(`/tasks/${id}/move`, { targetColumnId, targetPosition });
    return data.data;
  },

  async deleteTask(id: string): Promise<void> {
    await projectsApi.delete(`/tasks/${id}`);
  },

  async generateApprovalLink(taskId: string): Promise<{
    taskId: string;
    taskNumber: number;
    approvalToken: string;
    approvalPin: string;
    approvalStatus: string;
  }> {
    const { data } = await projectsApi.post(`/tasks/${taskId}/approval/generate`);
    return data.data;
  },

  // Subtasks
  async addSubtask(taskId: string, title: string) {
    const { data } = await projectsApi.post(`/tasks/${taskId}/subtasks`, { title });
    return data.data;
  },

  async updateSubtask(id: string, payload: { title?: string; completed?: boolean; position?: number }) {
    const { data } = await projectsApi.put(`/subtasks/${id}`, payload);
    return data.data;
  },

  async deleteSubtask(id: string) {
    await projectsApi.delete(`/subtasks/${id}`);
  },

  // Relations
  async addRelation(taskId: string, relatedTaskId: string, type: RelationType) {
    const { data } = await projectsApi.post(`/tasks/${taskId}/relations`, { relatedTaskId, type });
    return data.data;
  },

  async removeRelation(id: string) {
    await projectsApi.delete(`/relations/${id}`);
  },

  // Resources
  async addResource(taskId: string, payload: { title: string; url: string; type?: string }) {
    const { data } = await projectsApi.post(`/tasks/${taskId}/resources`, payload);
    return data.data;
  },

  async removeResource(id: string) {
    await projectsApi.delete(`/resources/${id}`);
  },

  // Time Entries
  async addTimeEntry(taskId: string, payload: { description?: string; durationMinutes: number; date?: string }) {
    const { data } = await projectsApi.post(`/tasks/${taskId}/time-entries`, payload);
    return data.data;
  },

  async removeTimeEntry(id: string) {
    await projectsApi.delete(`/time-entries/${id}`);
  },

  // Comments
  async addComment(taskId: string, content: string) {
    const { data } = await projectsApi.post(`/tasks/${taskId}/comments`, { content });
    return data.data;
  },

  async deleteComment(id: string) {
    await projectsApi.delete(`/comments/${id}`);
  },

  // Public Validation Portal
  async getPublicTaskPreview(token: string) {
    const { data } = await projectsApi.get(`/public/tasks/${token}/preview`);
    return data.data;
  },

  async validateTaskPin(token: string, pin: string) {
    const { data } = await projectsApi.post(`/public/tasks/${token}/validate-pin`, { pin });
    return data.data;
  },

  async approveDelivery(token: string, pin: string) {
    const { data } = await projectsApi.post(`/public/tasks/${token}/approve`, { pin });
    return data;
  },

  async requestChanges(token: string, pin: string, feedback: string) {
    const { data } = await projectsApi.post(`/public/tasks/${token}/request-changes`, { pin, feedback });
    return data;
  },
};

export default projectsService;
