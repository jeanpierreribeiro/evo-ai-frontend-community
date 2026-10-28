import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Archive,
  ArchiveRestore,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import type { Project, Column, CustomField } from '@/types/projects';
import { projectsService } from '@/services/projects/projectsService';

interface Props {
  project: Project;
  columns: Column[];
  onProjectChange: () => void;
}

export const ProjectSettingsView: React.FC<Props> = ({
  project,
  columns,
  onProjectChange,
}) => {
  const navigate = useNavigate();

  // Columns Management State
  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState('#94a3b8');
  const [isDone, setIsDone] = useState(false);
  const [addingCol, setAddingCol] = useState(false);

  // Backlog Column Setting State
  const [backlogColumnId, setBacklogColumnId] = useState<string>(
    project.backlogColumnId || ''
  );
  const [savingBacklogCol, setSavingBacklogCol] = useState(false);

  // Custom Fields State
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'select'>('text');
  const [newFieldIsPublic, setNewFieldIsPublic] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>(['']);
  const [savingField, setSavingField] = useState(false);

  // Load custom fields for project
  const loadCustomFields = useCallback(async () => {
    setLoadingFields(true);
    try {
      const fields = await projectsService.listCustomFields(project.id);
      setCustomFields(fields || []);
    } catch (err) {
      console.error('Erro ao carregar campos personalizados:', err);
    } finally {
      setLoadingFields(false);
    }
  }, [project.id]);

  useEffect(() => {
    loadCustomFields();
  }, [loadCustomFields]);

  useEffect(() => {
    setBacklogColumnId(project.backlogColumnId || '');
  }, [project.backlogColumnId]);

  // Handlers for Columns
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

  // Handler for Backlog Column
  const handleSaveBacklogColumn = async (colId: string) => {
    setSavingBacklogCol(true);
    setBacklogColumnId(colId);
    try {
      await projectsService.updateProject(project.id, {
        backlogColumnId: colId || null,
      });
      onProjectChange();
    } catch (err) {
      console.error('Erro ao salvar coluna de backlog:', err);
    } finally {
      setSavingBacklogCol(false);
    }
  };

  // Handlers for Custom Fields
  const handleAddOptionInput = () => {
    setNewFieldOptions((prev) => [...prev, '']);
  };

  const handleOptionChange = (index: number, val: string) => {
    setNewFieldOptions((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleRemoveOptionInput = (index: number) => {
    setNewFieldOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    setSavingField(true);
    try {
      const options =
        newFieldType === 'select'
          ? newFieldOptions
              .filter((o) => o.trim() !== '')
              .map((label) => ({ label: label.trim() }))
          : undefined;

      await projectsService.createCustomField(project.id, {
        name: newFieldName.trim(),
        type: newFieldType,
        isPublicEligible: newFieldIsPublic,
        options,
      });

      setNewFieldName('');
      setNewFieldType('text');
      setNewFieldIsPublic(false);
      setNewFieldOptions(['']);
      setIsAddingField(false);
      loadCustomFields();
    } catch (err) {
      console.error('Erro ao criar campo personalizado:', err);
    } finally {
      setSavingField(false);
    }
  };

  const handleDeleteCustomField = async (fieldId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este campo personalizado?')) return;
    try {
      await projectsService.deleteCustomField(fieldId);
      loadCustomFields();
    } catch (err) {
      console.error('Erro ao excluir campo personalizado:', err);
    }
  };

  // Handlers for Project Lifecycle
  const handleArchiveProject = async () => {
    if (!window.confirm(`Tem certeza que deseja arquivar o projeto "${project.name}"?`)) return;
    try {
      await projectsService.archiveProject(project.id);
      onProjectChange();
    } catch (err) {
      console.error('Erro ao arquivar projeto:', err);
    }
  };

  const handleUnarchiveProject = async () => {
    try {
      await projectsService.unarchiveProject(project.id);
      onProjectChange();
    } catch (err) {
      console.error('Erro ao desarquivar projeto:', err);
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
          Gerencie colunas, campos personalizados, triagem de backlog e ciclo de vida do projeto.
        </p>
      </div>

      {/* Project Status Banner if Archived */}
      {project.isArchived && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                Este projeto está arquivado
              </h4>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                O projeto está em modo de apenas leitura. Você pode desarquivá-lo a qualquer momento.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleUnarchiveProject}
            className="flex items-center gap-1.5 text-xs border-amber-500/40 hover:bg-amber-500/20"
          >
            <ArchiveRestore className="w-4 h-4" />
            <span>Desarquivar</span>
          </Button>
        </div>
      )}

      {/* Backlog Column Configuration (E3.10-c / E3.10-f) */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Coluna Padrão de Backlog</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Selecione a coluna que servirá como fila de triagem de demandas e ideias não priorizadas na aba Backlog.
        </p>

        <div className="flex items-center gap-3">
          <select
            value={backlogColumnId}
            onChange={(e) => handleSaveBacklogColumn(e.target.value)}
            disabled={savingBacklogCol}
            className="px-3 py-1.5 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary max-w-xs text-foreground"
          >
            <option value="">Automático (coluna com nome 'Backlog' ou primeira)</option>
            {columns.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name} {col.isDoneColumn ? '(Conclusão)' : ''}
              </option>
            ))}
          </select>
          {savingBacklogCol && (
            <span className="text-xs text-muted-foreground animate-pulse">Salvando...</span>
          )}
        </div>
      </div>

      {/* Columns Management (Kanban Workflow) */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-semibold text-foreground">Colunas do Fluxo (Kanban)</h3>
        <p className="text-xs text-muted-foreground">
          Defina as etapas pelas quais as tarefas se movem. A coluna marcada como "Conclusão" registrará entregas finalizadas.
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
                {project.backlogColumnId === col.id && (
                  <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    <Layers className="w-3 h-3" />
                    Coluna de Backlog
                  </span>
                )}
              </div>

              {columns.length > 1 && (
                <button
                  onClick={() => handleDeleteColumn(col.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-500 rounded hover:bg-muted transition-colors"
                  title="Excluir coluna"
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

      {/* Custom Fields Management (E3.8 / E3.10-f) */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Campos Personalizados do Projeto</h3>
          </div>
          {!isAddingField && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingField(true)}
              className="text-xs h-7 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Campo</span>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Configure metadados operacionais das tarefas deste projeto (texto, número, data ou seleção) e sua elegibilidade para clientes.
        </p>

        {loadingFields ? (
          <div className="text-xs text-muted-foreground py-4 text-center">Carregando campos...</div>
        ) : customFields.length === 0 && !isAddingField ? (
          <div className="p-6 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
            Nenhum campo personalizado cadastrado neste projeto.
          </div>
        ) : (
          <div className="space-y-2">
            {customFields.map((field) => (
              <div
                key={field.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-background"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-foreground">{field.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground uppercase">
                    {field.type}
                  </span>
                  {field.isPublicEligible && (
                    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      Elegível para Cliente
                    </span>
                  )}
                  {field.type === 'select' && field.options && field.options.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      ({field.options.map((o) => o.label).join(', ')})
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteCustomField(field.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-500 rounded hover:bg-muted transition-colors"
                  title="Excluir campo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Custom Field Form */}
        {isAddingField && (
          <form
            onSubmit={handleCreateCustomField}
            className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-primary/20">
              <h4 className="text-xs font-bold text-foreground">Novo Campo Personalizado</h4>
              <button
                type="button"
                onClick={() => setIsAddingField(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Nome do Campo
                </label>
                <input
                  type="text"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Ex: Custo Estimado, Fase da Obra..."
                  className="w-full px-3 py-1.5 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Tipo de Dado
                </label>
                <select
                  value={newFieldType}
                  onChange={(e) =>
                    setNewFieldType(e.target.value as 'text' | 'number' | 'date' | 'select')
                  }
                  className="w-full px-3 py-1.5 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="date">Data</option>
                  <option value="select">Lista de Seleção (Select)</option>
                </select>
              </div>
            </div>

            {/* Select Options Manager */}
            {newFieldType === 'select' && (
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-[11px] font-semibold text-muted-foreground block">
                  Opções do Select
                </label>
                {newFieldOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(i, e.target.value)}
                      placeholder={`Opção ${i + 1}`}
                      className="flex-1 px-3 py-1 text-xs bg-background border border-input rounded-md"
                    />
                    {newFieldOptions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOptionInput(i)}
                        className="text-muted-foreground hover:text-red-500 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddOptionInput}
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar opção</span>
                </button>
              </div>
            )}

            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={newFieldIsPublic}
                  onChange={(e) => setNewFieldIsPublic(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                <span>Elegível para compartilhamento com o cliente (card público por PIN)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingField(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={savingField} className="text-xs">
                {savingField ? 'Salvando...' : 'Salvar Campo'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Lifecycle Actions: Archive & Danger Zone */}
      <div className="space-y-4">
        {/* Archive / Unarchive */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-xs">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Archive className="w-4 h-4 text-muted-foreground" />
            <span>Ciclo de Vida do Projeto</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Arquivar um projeto desativa notificações e edições ativas, mantendo todo o histórico preservado para consulta e auditoria.
          </p>

          {project.isArchived ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnarchiveProject}
              className="text-xs flex items-center gap-1.5"
            >
              <ArchiveRestore className="w-4 h-4" />
              <span>Desarquivar este Projeto</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchiveProject}
              className="text-xs flex items-center gap-1.5"
            >
              <Archive className="w-4 h-4" />
              <span>Arquivar este Projeto</span>
            </Button>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Zona de Perigo</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            A exclusão definitiva do projeto removerá todas as suas tarefas, subtarefas, arquivos e histórico associados irreversivelmente.
          </p>
          <Button variant="destructive" size="sm" onClick={handleDeleteProject} className="text-xs">
            Excluir Definitivamente este Projeto
          </Button>
        </div>
      </div>
    </div>
  );
};
