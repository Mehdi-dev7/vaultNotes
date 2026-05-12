'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useAppStore } from '@/stores/appStore'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { ProjectTemplatePopover } from '@/components/sidebar/ProjectTemplatePopover'
import { CategoryTypePopover } from '@/components/sidebar/CategoryTypePopover'
import type { Project, Category, ProjectTemplate, NoteType } from '@/types/vault.types'

// ─── ProjectTree ────────────────────────────────────────────────────────────────

const ChevronRight = ({ open }: { open: boolean }) => (
  <svg
    className={`w-3 h-3 transition-transform duration-200 shrink-0 ${open ? 'rotate-90' : ''}`}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

// ── Catégorie ─────────────────────────────────────────────────────────────────
function CategoryRow({ cat, project, isLast }: { cat: Category; project: Project; isLast: boolean }){
  const { selection, selectCategory, updateCategory, deleteCategory } = useAppStore()
  const isActive = selection.categoryId === cat.id
  const [showConfirm, setShowConfirm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(cat.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(cat.name)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [cat.name])

  const commitEdit = useCallback(async () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== cat.name) {
      await updateCategory(project.id, cat.id, { name: trimmed })
    }
    setEditing(false)
  }, [editValue, cat.name, cat.id, project.id, updateCategory])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { setEditing(false); setEditValue(cat.name) }
  }, [commitEdit, cat.name])

  const handleDelete = useCallback(async () => {
    await deleteCategory(project.id, cat.id)
    setShowConfirm(false)
  }, [project.id, cat.id, deleteCategory])

  return (
    <>
      <div
        className={`
          relative flex items-center gap-2 pr-2 py-1.5 rounded-md cursor-pointer group
          text-vault-text-dim text-xs
          hover:bg-vault-muted hover:text-vault-text transition-colors duration-100
          ${isActive ? 'text-vault-text-bright' : ''}
        `}
        style={isActive ? {
          backgroundColor: `${project.color}18`,
          paddingLeft: '28px',
          borderLeft: `3px solid ${project.color}`,
        } : { paddingLeft: '30px' }}
        onClick={() => { if (!editing) { selectCategory(project.id, cat.id); window.vault.pingActivity() } }}
      >
        {/* Encoche horizontale */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: '18px',
            top: '50%',
            width: '8px',
            height: '1px',
            backgroundColor: isActive ? `${project.color}60` : 'rgba(255,255,255,0.12)',
          }}
        />

        <span className="text-sm shrink-0">{cat.icon}</span>

        {editing ? (
          <input
            ref={inputRef}
            className="flex-1 bg-vault-muted border border-vault-accent/40 rounded px-1 py-0 text-xs text-vault-text-bright focus:outline-none focus:border-vault-accent caret-[#e8820c] selectable"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="truncate flex-1" onDoubleClick={startEdit}>{cat.name}</span>
        )}

        {!editing && (
          <>
            <span className="text-vault-text-dim/40 shrink-0 tabular-nums">{cat.notes.length}</span>
            <button
              className="opacity-0 group-hover:opacity-100 text-vault-danger/60 hover:text-vault-danger transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-vault-danger/10 shrink-0"
              onClick={e => { e.stopPropagation(); setShowConfirm(true) }}
              title="Supprimer la catégorie"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>

      {showConfirm && (
        <ConfirmModal
          title={`Supprimer « ${cat.name} » ?`}
          message={`Cette catégorie contient ${cat.notes.length} note${cat.notes.length > 1 ? 's' : ''}. Cette action est irréversible.`}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}

// ── Projet ────────────────────────────────────────────────────────────────────
function ProjectRow({ project }: { project: Project }){
  const { selection, selectProject, createCategory, updateProject, deleteProject } = useAppStore()
  const [isOpen, setIsOpen] = useState(selection.projectId === project.id)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editValue, setEditValue] = useState(project.name)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const isSelected = selection.projectId === project.id && !selection.categoryId
  const isActive = selection.projectId === project.id
  const nameColor = (isOpen || isActive) ? project.color : undefined

  const startEditName = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(project.name)
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.select(), 0)
  }, [project.name])

  const commitEditName = useCallback(async () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== project.name) {
      await updateProject(project.id, { name: trimmed })
    }
    setEditingName(false)
  }, [editValue, project.name, project.id, updateProject])

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEditName() }
    if (e.key === 'Escape') { setEditingName(false); setEditValue(project.name) }
  }, [commitEditName, project.name])

  const totalNotes = useMemo(
    () => project.categories.reduce((acc, c) => acc + c.notes.length, 0),
    [project.categories]
  )

  const handleCreateCategory = useCallback(async (
    name: string, icon: string, defaultNoteType: NoteType | undefined
  ) => {
    setShowCategoryPicker(false)
    await createCategory(project.id, name, icon, defaultNoteType)
    setIsOpen(true)
  }, [project.id, createCategory])

  const handleDelete = useCallback(async () => {
    await deleteProject(project.id)
    setShowConfirm(false)
  }, [project.id, deleteProject])

  return (
    <>
      <div>
        {/* ── Ligne projet ──────────────────────────────────────────── */}
        <div
          className={`
            flex items-center gap-2 px-2 py-1.5 rounded-md group
            transition-colors duration-100
            ${isSelected ? 'bg-vault-muted' : 'hover:bg-vault-muted/50'}
          `}
        >
          <button
            onClick={e => { e.stopPropagation(); setIsOpen(o => !o) }}
            className="w-5 h-5 flex items-center justify-center rounded text-vault-text-dim/50 hover:text-vault-text-dim hover:bg-vault-muted transition-colors shrink-0"
          >
            <ChevronRight open={isOpen} />
          </button>

          <div
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
            onClick={() => { if (!editingName) { selectProject(project.id); setIsOpen(true); window.vault.pingActivity() } }}
          >
            <span className="text-base shrink-0 leading-none">{project.icon}</span>
            {editingName ? (
              <input
                ref={nameInputRef}
                className="flex-1 bg-vault-muted border border-vault-accent/40 rounded px-1 py-0 text-xs font-medium focus:outline-none focus:border-vault-accent caret-[#e8820c] selectable"
                style={{ color: nameColor ?? '#8892a4' }}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={commitEditName}
                onKeyDown={handleNameKeyDown}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span
                className="truncate text-xs font-medium transition-colors duration-200"
                style={{ color: nameColor ?? '#8892a4' }}
                onDoubleClick={startEditName}
              >
                {project.name}
              </span>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
            <button
              onClick={e => {
                e.stopPropagation()
                setShowCategoryPicker(v => !v)
                setIsOpen(true)
              }}
              className="w-6 h-6 flex items-center justify-center rounded text-vault-text-dim hover:text-vault-accent hover:bg-vault-accent/10 transition-colors"
              title="Nouvelle catégorie"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              onClick={e => { e.stopPropagation(); setShowConfirm(true) }}
              className="w-6 h-6 flex items-center justify-center rounded text-vault-danger/50 hover:text-vault-danger hover:bg-vault-danger/10 transition-colors"
              title="Supprimer le projet"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Picker de type de catégorie ──────────────────────────── */}
        {showCategoryPicker && (
          <CategoryTypePopover
            onConfirm={handleCreateCategory}
            onCancel={() => setShowCategoryPicker(false)}
          />
        )}

        {/* ── Catégories avec lignes d'arbre ──────────────────────── */}
        {isOpen && (
          <div className="relative animate-slide-in">
            {project.categories.length > 0 && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: '19px',
                  top: '4px',
                  bottom: '10px',
                  width: '1px',
                  backgroundColor: `${project.color}35`,
                }}
              />
            )}

            {project.categories.map((cat, i) => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                project={project}
                isLast={i === project.categories.length - 1}
              />
            ))}

            {project.categories.length === 0 && !showCategoryPicker && (
              <div
                className="pl-8 py-1.5 text-vault-text-dim/30 text-xs italic cursor-pointer hover:text-vault-text-dim/50 transition-colors"
                onClick={() => setShowCategoryPicker(true)}
              >
                + ajouter une catégorie
              </div>
            )}
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmModal
          title={`Supprimer le projet « ${project.name} » ?`}
          message={`Ce projet contient ${project.categories.length} catégorie${project.categories.length > 1 ? 's' : ''} et ${totalNotes} note${totalNotes > 1 ? 's' : ''}. Cette action est irréversible.`}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export function ProjectTree(){
  const { vaultData, createProject, lockVault, setShowSearch } = useAppStore()
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)

  const favorites = useMemo(() => {
    if (!vaultData) return []
    return vaultData.projects.flatMap(p =>
      p.categories.flatMap(c => c.notes.filter(n => n.favorite))
    )
  }, [vaultData])

  const handleCreateProject = useCallback(async (name: string, template: ProjectTemplate) => {
    setShowTemplatePicker(false)
    await createProject(name, template.icon, template.color, template.categories)
  }, [createProject])

  return (
    <div className="h-full flex flex-col w-60 shrink-0 bg-vault-surface border-r border-vault-border relative">
      {/* Drag region macOS */}
      <div className="drag-region h-8 shrink-0" />

      {/* Header */}
      <div className="px-3 pb-2 flex items-center justify-between no-drag">
        <span className="text-vault-accent font-bold text-sm tracking-tight accent-glow">VaultNotes</span>
        <div className="flex items-center gap-1">
          {/* Bouton recherche */}
          <button
            onClick={() => setShowSearch(true)}
            className="w-7 h-7 flex items-center justify-center rounded text-vault-text-dim hover:text-vault-accent hover:bg-vault-accent/10 transition-colors"
            title="Rechercher (⌘K)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          <button
            onClick={() => setShowTemplatePicker(v => !v)}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
              showTemplatePicker
                ? 'text-vault-accent bg-vault-accent/10'
                : 'text-vault-text-dim hover:text-vault-accent hover:bg-vault-accent/10'
            }`}
            title="Nouveau projet"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d={showTemplatePicker ? 'M18 6L6 18M6 6l12 12' : 'M12 5v14M5 12h14'} />
            </svg>
          </button>
          <button
            onClick={lockVault}
            className="w-7 h-7 flex items-center justify-center rounded text-vault-text-dim hover:text-vault-danger hover:bg-vault-danger/10 transition-colors"
            title="Verrouiller (⌘L)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="h-px bg-vault-border mx-3 mb-2" />

      {/* Barre de recherche cliquable */}
      {!showTemplatePicker && (
        <button
          onClick={() => setShowSearch(true)}
          className="no-drag mx-3 mb-2 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-vault-muted/50 border border-vault-border hover:border-vault-accent/30 hover:bg-vault-muted transition-colors text-vault-text-dim/50 hover:text-vault-text-dim group shrink-0"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-xs flex-1 text-left">Rechercher…</span>
          <kbd className="text-xs opacity-50 group-hover:opacity-70 transition-opacity">⌘K</kbd>
        </button>
      )}

      {/* Template picker : overlay sur la liste des projets */}
      {showTemplatePicker && (
        <ProjectTemplatePopover
          onConfirm={handleCreateProject}
          onCancel={() => setShowTemplatePicker(false)}
        />
      )}

      {/* Favoris */}
      {!showTemplatePicker && favorites.length > 0 && (
        <div className="px-2 pb-1">
          <div className="text-vault-text-dim/40 text-xs px-2 py-1 uppercase tracking-wider font-medium">
            Favoris
          </div>
          {favorites.slice(0, 5).map(n => (
            <div key={n.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-vault-text-dim text-xs hover:bg-vault-muted hover:text-vault-text cursor-pointer transition-colors">
              <span>⭐</span>
              <span className="truncate">{n.title}</span>
            </div>
          ))}
          <div className="h-px bg-vault-border mx-1 my-1" />
        </div>
      )}

      {/* Projets */}
      {!showTemplatePicker && (
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-px">
          {vaultData?.projects.map(project => (
            <ProjectRow key={project.id} project={project} />
          ))}

          {vaultData?.projects.length === 0 && (
            <div className="text-vault-text-dim/30 text-xs px-3 py-4 text-center italic">
              Aucun projet
              <button
                onClick={() => setShowTemplatePicker(true)}
                className="text-vault-accent/60 hover:text-vault-accent transition-colors not-italic mt-1.5 block w-full"
              >
                + Créer un projet
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {!showTemplatePicker && (
        <div className="px-3 py-2 border-t border-vault-border shrink-0">
          <div className="flex items-center gap-1.5 text-vault-accent/60 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-vault-accent animate-pulse shrink-0" />
            <span>AES-256-GCM · Argon2id</span>
          </div>
        </div>
      )}
    </div>
  )
}
