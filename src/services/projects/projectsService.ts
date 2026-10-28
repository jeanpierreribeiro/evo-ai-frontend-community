import { projectsApi } from './projectsApi';
import type {
  Workspace,
  WorkspaceMember,
  Project,
  Column,
  Task,
  Label,
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

  async addMember(workspaceId: string, payload: { userId: string; email: string; name: string; role?: string; avatarUrl?: string }): Promise<WorkspaceMember> {
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
  async getInbox(workspaceId: string, params?: { unreadOnly?: boolean; archived?: boolean; includeArchived?: boolean }): Promise<Notification[]> {
    const { data } = await projectsApi.get(`/workspaces/${workspaceId}/inbox`, { params });
    return data.data;
  },

  async markNotificationRead(id: string): Promise<void> {
    await projectsApi.patch(`/inbox/${id}/read`);
  },

  async markAllNotificationsRead(workspaceId: string): Promise<void> {
    await projectsApi.post(`/workspaces/${workspaceId}/inbox/mark-all-read`);
  },

  async archiveNotification(id: string): Promise<void> {
    await projectsApi.patch(`/inbox/${id}/archive`);
  },

  async unarchiveNotification(id: string): Promise<void> {
    await projectsApi.patch(`/inbox/${id}/unarchive`);
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

  async createProject(
    workspaceId: string,
    payload: { name: string; key?: string; description?: string; color?: string; icon?: string; backlogColumnId?: string }
  ): Promise<Project> {
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

  async deleteColumn(id: string, destinationColumnId?: string): Promise<void> {
    await projectsApi.delete(`/columns/${id}`, {
      data: destinationColumnId ? { destinationColumnId } : undefined,
      params: destinationColumnId ? { destinationColumnId } : undefined,
    });
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

  async updateTask(id: string, payload: Partial<Task> & { expectedVersion?: number }): Promise<Task> {
    const { data } = await projectsApi.patch(`/tasks/${id}`, payload);
    return data.data;
  },

  async moveTask(id: string, targetColumnId: string, targetPosition: number): Promise<Task> {
    const { data } = await projectsApi.put(`/tasks/${id}/move`, { targetColumnId, targetPosition });
    return data.data;
  },

  async deleteTask(id: string): Promise<void> {
    await projectsApi.delete(`/tasks/${id}`);
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

  // Public Task Sharing (Phase 2 - E2.2 & E2.3)
  async previewTaskShare(taskId: string, payload: any) {
    const { data } = await projectsApi.post(`/tasks/${taskId}/shares/preview`, payload);
    return data;
  },

  async createTaskShare(taskId: string, payload: any) {
    const { data } = await projectsApi.post(`/tasks/${taskId}/shares`, payload);
    return data;
  },

  async listTaskShares(taskId: string) {
    const { data } = await projectsApi.get(`/tasks/${taskId}/shares`);
    return data.data;
  },

  async patchTaskShare(shareId: string, payload: any) {
    const { data } = await projectsApi.patch(`/shares/${shareId}`, payload);
    return data;
  },

  async revokeTaskShare(shareId: string) {
    const { data } = await projectsApi.post(`/shares/${shareId}/revoke`);
    return data;
  },

  async reissueTaskShare(shareId: string) {
    const { data } = await projectsApi.post(`/shares/${shareId}/reissue`);
    return data;
  },

  async unlockPublicShare(token: string, pin: string) {
    const { data } = await projectsApi.post(`/public/shares/${token}/unlock`, { pin });
    return data;
  },

  async getPublicTaskCard(token: string, sessionToken?: string) {
    const headers: Record<string, string> = {};
    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }
    const { data } = await projectsApi.get(`/public/shares/${token}/card`, { headers });
    return data.data;
  },

  async logoutPublicShare(token: string) {
    const { data } = await projectsApi.post(`/public/shares/${token}/logout`);
    return data;
  },

  // --- Labels (E3.3-a) ---
  async listLabels(workspaceId: string): Promise<Label[]> {
    const { data } = await projectsApi.get(`/workspaces/${workspaceId}/labels`);
    return data.data;
  },

  async createLabel(workspaceId: string, payload: { name: string; color?: string }): Promise<Label> {
    const { data } = await projectsApi.post(`/workspaces/${workspaceId}/labels`, payload);
    return data.data;
  },

  async updateLabel(id: string, payload: { name?: string; color?: string }): Promise<Label> {
    const { data } = await projectsApi.patch(`/labels/${id}`, payload);
    return data.data;
  },

  async deleteLabel(id: string): Promise<void> {
    await projectsApi.delete(`/labels/${id}`);
  },

  // --- Attachments (E3.7) ---
  async listTaskAttachments(taskId: string) {
    const { data } = await projectsApi.get(`/tasks/${taskId}/attachments`);
    return data.data;
  },

  async uploadTaskAttachment(taskId: string, file: File, commentId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (commentId) {
      formData.append('commentId', commentId);
    }
    const { data } = await projectsApi.post(`/tasks/${taskId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data.data;
  },

  async deleteTaskAttachment(id: string): Promise<void> {
    await projectsApi.delete(`/attachments/${id}`);
  },

  getAttachmentDownloadUrl(id: string): string {
    const rawBaseUrl = import.meta.env.VITE_PROJECTS_API_URL || 'http://localhost:3013';
    const clean = rawBaseUrl.endsWith('/api/v1/projects')
      ? rawBaseUrl
      : `${rawBaseUrl.replace(/\/+$/, '')}/api/v1/projects`;
    return `${clean}/attachments/${id}/download`;
  },

  // --- Custom Fields (E3.8) ---
  async listCustomFields(projectId: string) {
    const { data } = await projectsApi.get(`/projects/${projectId}/custom-fields`);
    return data.data;
  },

  async createCustomField(projectId: string, payload: { name: string; type: string; options?: any[]; isPublicEligible?: boolean }) {
    const { data } = await projectsApi.post(`/projects/${projectId}/custom-fields`, payload);
    return data.data;
  },

  async updateCustomField(id: string, payload: { name?: string; options?: any[]; isPublicEligible?: boolean }) {
    const { data } = await projectsApi.patch(`/custom-fields/${id}`, payload);
    return data.data;
  },

  async deleteCustomField(id: string): Promise<void> {
    await projectsApi.delete(`/custom-fields/${id}`);
  },

  async getTaskCustomFieldValues(taskId: string) {
    const { data } = await projectsApi.get(`/tasks/${taskId}/custom-field-values`);
    return data.data;
  },

  async setTaskCustomFieldValues(taskId: string, values: Array<{ fieldId: string; value?: any }>) {
    const { data } = await projectsApi.put(`/tasks/${taskId}/custom-field-values`, { values });
    return data.data;
  },

  // --- Time Entries Details (E3.8-c) ---
  async listTimeEntries(taskId: string): Promise<{ entries: any[]; totalMinutes: number; totalHours: number }> {
    const { data } = await projectsApi.get(`/tasks/${taskId}/time-entries`);
    return data.data;
  },

  async updateTimeEntry(id: string, payload: { description?: string; durationMinutes?: number; date?: string }) {
    const { data } = await projectsApi.patch(`/time-entries/${id}`, payload);
    return data.data;
  },

  // --- Cross-Project Transfer (E3.6-e) ---
  async previewTaskTransfer(taskId: string, targetProjectId: string) {
    const { data } = await projectsApi.post(`/tasks/${taskId}/transfer/preview`, { targetProjectId });
    return data.data;
  },

  async executeTaskTransfer(taskId: string, targetProjectId: string, targetColumnId?: string) {
    const { data } = await projectsApi.post(`/tasks/${taskId}/transfer`, { targetProjectId, targetColumnId });
    return data.data;
  },

  // --- Lifecycle: Archive, Unarchive & Restore (E3.6-d) ---
  async archiveTask(taskId: string) {
    const { data } = await projectsApi.post(`/tasks/${taskId}/archive`);
    return data.data;
  },

  async unarchiveTask(taskId: string) {
    const { data } = await projectsApi.post(`/tasks/${taskId}/unarchive`);
    return data.data;
  },

  async restoreTask(taskId: string) {
    const { data } = await projectsApi.post(`/tasks/${taskId}/restore`);
    return data.data;
  },

  async archiveProject(projectId: string) {
    const { data } = await projectsApi.post(`/projects/${projectId}/archive`);
    return data.data;
  },

  async unarchiveProject(projectId: string) {
    const { data } = await projectsApi.post(`/projects/${projectId}/unarchive`);
    return data.data;
  },

  async restoreProject(projectId: string) {
    const { data } = await projectsApi.post(`/projects/${projectId}/restore`);
    return data.data;
  },
};

export default projectsService;
