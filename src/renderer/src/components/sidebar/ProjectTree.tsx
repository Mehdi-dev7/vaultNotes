'use client'

import { useState, useCallback, useMemo } from 'react'
import { useAppStore } from '@/stores/appStore'
import type { Project, Category } from '@/types/vault.types'

// ─── ProjectTree ────────────────────────────────────────────────────────────────
// Sidebar : arborescence Projets > Catégories > (nombre de notes)

const ChevronRight = ({ open }: { open: boolean }) => (
  <svg className={`w-2.5 h-2.5 transition-transform shrink-0 ${open ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

// ── Formulaire inline ─────────────────────────────────────────────────────────
function InlineForm({ placeholder, onSubmit, onCancel }: {
  placeholder: string
  onSubmit: (name: string) => void
  onCancel: () => void
}){
  const [value, setValue] = useState('')
  return (
    <form
      className="flex gap-1 pl-5 pr-2 py-0.5"
      onSubmit={e => { e.preventDefault(); if (value.trim()) onSubmit(value.trim()) }}
    >
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onCancel()}
        className="flex-1 bg-vault-muted border border-vault-accent/40 rounded px-2 py-0.5 text-xs text-vault-text-bright focus:outline-none focus:border-vault-accent caret-[#e8820c] selectable"
        placeholder={placeholder}
        autoFocus
      />
      <button type="submit" className="text-vault-accent text-xs hover:opacity-70">✓</button>
      <button type="button" onClick={onCancel} className="text-vault-text-dim text-xs hover:text-vault-text">✕</button>
    </form>
  )
}

// ── Catégorie ─────────────────────────────────────────────────────────────────
function CategoryRow({ cat, project }: { cat: Category; project: Project }){
  const { selection, selectCategory, deleteCategory } = useAppStore()
  const isActive = selection.categoryId === cat.id

  return (
    <div
      className={`sidebar-item pl-7 group ${isActive ? 'active' : ''}`}
      onClick={() => { selectCategory(project.id, cat.id); window.vault.pingActivity() }}
    >
      <span className="text-sm">{cat.icon}</span>
      <span className="truncate flex-1 text-xs">{cat.name}</span>
      <span className="text-vault-text-dim/40 text-xs shrink-0">{cat.notes.length}</span>
      <button
        className="opacity-0 group-hover:opacity-100 text-vault-danger/60 hover:text-vault-danger text-xs transition-opacity ml-1"
        onClick={e => { e.stopPropagation(); deleteCategory(project.id, cat.id) }}
        title="Supprimer"
      >
        ×
      </button>
    </div>
  )
}

// ── Projet ────────────────────────────────────────────────────────────────────
function ProjectRow({ project }: { project: Project }){
  const { selection, selectProject, createCategory, deleteProject } = useAppStore()
  const [isOpen, setIsOpen] = useState(selection.projectId === project.id)
  const [addingCategory, setAddingCategory] = useState(false)

  const isActive = selection.projectId === project.id && !selection.categoryId

  const handleAddCategory = useCallback(async (name: string) => {
    await createCategory(project.id, name)
    setAddingCategory(false)
  }, [project.id, createCategory])

  return (
    <div>
      <div className={`sidebar-item group ${isActive ? 'active' : ''}`}>
        {/* Toggle collapsible */}
        <button
          onClick={e => { e.stopPropagation(); setIsOpen(o => !o) }}
          className="text-vault-text-dim/50 hover:text-vault-text-dim transition-colors"
        >
          <ChevronRight open={isOpen} />
        </button>

        {/* Clic sur le nom → sélectionne le projet */}
        <div
          className="flex items-center gap-1.5 flex-1 min-w-0"
          onClick={() => { selectProject(project.id); setIsOpen(true); window.vault.pingActivity() }}
        >
          <span className="text-sm shrink-0">{project.icon}</span>
          <span className="truncate text-xs" style={{ color: isActive ? project.color : undefined }}>
            {project.name}
          </span>
        </div>

        {/* Actions au hover */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); setAddingCategory(true); setIsOpen(true) }}
            className="text-vault-text-dim hover:text-vault-accent text-sm"
            title="Nouvelle catégorie"
          >
            +
          </button>
          <button
            onClick={e => { e.stopPropagation(); deleteProject(project.id) }}
            className="text-vault-text-dim/40 hover:text-vault-danger text-xs"
            title="Supprimer le projet"
          >
            ×
          </button>
        </div>
      </div>

      {/* Catégories */}
      {isOpen && (
        <div className="animate-slide-in">
          {project.categories.map(cat => (
            <CategoryRow key={cat.id} cat={cat} project={project} />
          ))}

          {addingCategory && (
            <InlineForm
              placeholder="Nom de la catégorie..."
              onSubmit={handleAddCategory}
              onCancel={() => setAddingCategory(false)}
            />
          )}

          {project.categories.length === 0 && !addingCategory && (
            <div className="pl-7 py-1 text-vault-text-dim/30 text-xs italic">(vide)</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export function ProjectTree(){
  const { vaultData, createProject, lockVault } = useAppStore()

  // useMemo évite de créer un nouveau tableau à chaque render (boucle infinie Zustand)
  const favorites = useMemo(() => {
    if (!vaultData) return []
    return vaultData.projects
      .flatMap(p => p.categories.flatMap(c => c.notes.filter(n => n.favorite)))
  }, [vaultData])
  const [addingProject, setAddingProject] = useState(false)

  const handleAddProject = useCallback(async (name: string) => {
    await createProject(name)
    setAddingProject(false)
  }, [createProject])

  return (
    <div className="h-full flex flex-col w-60 shrink-0 bg-vault-surface border-r border-vault-border">
      {/* Drag region macOS */}
      <div className="drag-region h-8 shrink-0" />

      {/* Header */}
      <div className="px-3 pb-2 flex items-center justify-between no-drag">
        <span className="text-vault-accent font-bold text-sm tracking-tight accent-glow">VaultNotes</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddingProject(true)}
            className="text-vault-text-dim hover:text-vault-accent transition-colors text-base font-light"
            title="Nouveau projet"
          >
            +
          </button>
          <button
            onClick={lockVault}
            className="text-vault-text-dim hover:text-vault-danger transition-colors"
            title="Verrouiller (⌘L)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="h-px bg-vault-border mx-3 mb-1" />

      {/* Favoris */}
      {favorites.length > 0 && (
        <div className="px-2 pb-1">
          <div className="text-vault-text-dim/50 text-xs px-2 py-1 uppercase tracking-wider">Favoris</div>
          {favorites.slice(0, 5).map(n => (
            <div key={n.id} className="sidebar-item pl-3 text-xs">
              <span>⭐</span>
              <span className="truncate">{n.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Projets */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-px">
        {vaultData?.projects.map(project => (
          <ProjectRow key={project.id} project={project} />
        ))}

        {addingProject && (
          <InlineForm
            placeholder="Nom du projet..."
            onSubmit={handleAddProject}
            onCancel={() => setAddingProject(false)}
          />
        )}

        {vaultData?.projects.length === 0 && !addingProject && (
          <div className="text-vault-text-dim/30 text-xs px-3 py-2 italic">
            Aucun projet — cliquez sur +
          </div>
        )}
      </div>

      {/* Footer : statut sécurité */}
      <div className="px-3 py-2 border-t border-vault-border">
        <div className="flex items-center gap-1.5 text-vault-accent/70 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-vault-accent animate-pulse" />
          <span>AES-256-GCM · Argon2id</span>
        </div>
      </div>
    </div>
  )
}
