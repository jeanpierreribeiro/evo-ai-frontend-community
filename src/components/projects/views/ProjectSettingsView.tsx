import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import type { Project, Column } from '@/types/projects';
import { projectsService } from '@/services/projects/projectsService';

interface Props {
  project: Project;
  columns: Column[];
  onProjectChange: () => void;
}

export const ProjectSettingsView: React.FC<Props> = ({ project, columns, onProjectChange }) => {
  const navigate = useNavigate();
  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState('#94a3b8');
  const [isDone, setIsDone] = useState(false);
  const [addingCol, setAddingCol] = useState(false);

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    setAddingCol(true);
    try {
      await projectsService.createColumn(project.id, {
        name: newColName.trim(),
        color: newColColor,
        isDoneColumn: isDone,
      });
      setNewColName('');
      setIsDone(false);
      onProjectChange();
    } catch (err) {
      console.error('Erro ao adicionar coluna:', err);
    } finally {
      setAddingCol(false);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!window.confirm('Tem certeza que deseja remover esta coluna e suas tarefas?')) return;
    try {
      await projectsService.deleteColumn(columnId);
      onProjectChange();
    } catch (err) {
      console.error('Erro ao remover coluna:', err);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE o projeto "${project.name}"?`)) return;
    try {
      await projectsService.deleteProject(project.id);
      navigate('/projects');
    } catch (err) {
      console.error('Erro ao excluir projeto:', err);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto overflow-y-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <span>Configurações do Projeto</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gerencie colunas do fluxo de trabalho e opções avançadas deste projeto.
        </p>
      </div>

      {/* Columns Management */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">Colunas do Fluxo (Kanban)</h3>
        <p className="text-xs text-muted-foreground">
          Defina as etapas pelas quais as tarefas se movem. A coluna marcada como "Concluído" finalizará entregas.
        </p>

        <div className="space-y-2">
          {columns.map((col) => (
            <div
              key={col.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-background"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: col.color || '#94a3b8' }}
                />
                <span className="text-xs font-semibold text-foreground">{col.name}</span>
                {col.isDoneColumn && (
                  <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Coluna de Conclusão
                  </span>
                )}
              </div>

              {columns.length > 1 && (
                <button
                  onClick={() => handleDeleteColumn(col.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-500 rounded hover:bg-muted transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add column form */}
        <form onSubmit={handleAddColumn} className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
          <input
            type="text"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            placeholder="Nome da nova coluna"
            className="flex-1 min-w-48 px-3 py-1.5 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <input
            type="color"
            value={newColColor}
            onChange={(e) => setNewColColor(e.target.value)}
            className="w-8 h-8 rounded border border-border cursor-pointer p-0.5 bg-background"
            title="Cor da coluna"
          />

          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isDone}
              onChange={(e) => setIsDone(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary"
            />
            <span>Marcar como Concluído</span>
          </label>

          <Button type="submit" size="sm" disabled={addingCol || !newColName.trim()} className="text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Adicionar Coluna
          </Button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Zona de Perigo</span>
        </h3>
        <p className="text-xs text-muted-foreground">
          A exclusão do projeto removerá todas as suas tarefas, subtarefas, arquivos e histórico associados.
        </p>
        <Button variant="destructive" size="sm" onClick={handleDeleteProject} className="text-xs">
          Excluir este Projeto
        </Button>
      </div>
    </div>
  );
};
