import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workspace } from '@/types/projects';
import { projectsService } from '@/services/projects/projectsService';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;

  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  setActiveWorkspaceById: (id: string) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspace: null,
      isLoading: false,
      error: null,

      reset: () => {
        set({ workspaces: [], activeWorkspace: null, error: null, isLoading: false });
        try {
          localStorage.removeItem('jpros_workspace_storage');
        } catch {
          // noop
        }
      },

      fetchWorkspaces: async () => {
        set({ isLoading: true, error: null });
        try {
          const list = await projectsService.listWorkspaces();
          const currentActive = get().activeWorkspace;

          let selected = null;
          if (currentActive && list.some((w) => w.id === currentActive.id)) {
            selected = list.find((w) => w.id === currentActive.id) || null;
          } else if (list.length > 0) {
            selected = list[0];
          }

          set({ workspaces: list, activeWorkspace: selected, isLoading: false });
        } catch (err: any) {
          set({ error: err.message || 'Falha ao carregar workspaces', isLoading: false });
        }
      },

      setActiveWorkspace: (workspace) => {
        set({ activeWorkspace: workspace });
      },

      setActiveWorkspaceById: (id) => {
        const found = get().workspaces.find((w) => w.id === id || w.slug === id);
        if (found) {
          set({ activeWorkspace: found });
        }
      },
    }),
    {
      name: 'jpros_workspace_storage',
      partialize: (state) => ({ activeWorkspace: state.activeWorkspace }),
    }
  )
);
