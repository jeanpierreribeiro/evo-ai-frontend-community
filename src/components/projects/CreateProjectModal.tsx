import React, { useState } from 'react';
import { Button } from '@evoapi/design-system';
import { X, FolderPlus } from 'lucide-react';
import { projectsService } from '@/services/projects/projectsService';
import type { Project } from '@/types/projects';

interface Props {
  isOpen: boolean;
  workspaceId: string;
  onClose: () => void;
  onSuccess: (project: Project) => void;
}

const PRESET_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'];

export const CreateProjectModal: React.FC<Props> = ({ isOpen, workspaceId, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do projeto');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const created = await projectsService.createProject(workspaceId, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      onSuccess(created);
      onClose();
      setName('');
      setDescription('');
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Erro ao criar projeto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Novo Projeto</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Nome do Projeto *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Redesign Web, Campanha Natal, Onboarding Clientes"
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Descrição (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivo principal e escopo deste projeto"
              rows={2}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Cor do Projeto
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-80 hover:opacity-100'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Projeto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
