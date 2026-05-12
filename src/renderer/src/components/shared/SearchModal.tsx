import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'
import { NOTE_TYPE_ICONS, NOTE_TYPE_COLORS } from '@/types/vault.types'
import type { Note, Project, Category } from '@/types/vault.types'

// ─── SearchModal ──────────────────────────────────────────────────────────────
// Recherche globale Cmd+K : titre des notes, nom de projet, tags.
// Navigation clavier ↑↓ + Enter pour ouvrir, Escape pour fermer.

interface SearchResult {
  note: Note
  project: Project
  category: Category
}

interface SearchModalProps {
  onClose: () => void
}

export function SearchModal({ onClose }: SearchModalProps) {
  const { vaultData, selectNote } = useAppStore()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Aplatit toutes les notes avec leur contexte projet/catégorie
  const allNotes = useMemo<SearchResult[]>(() => {
    if (!vaultData) return []
    return vaultData.projects.flatMap(project =>
      project.categories.flatMap(category =>
        category.notes.map(note => ({ note, project, category }))
      )
    )
  }, [vaultData])

  // Filtre sur titre, tags, ou nom de projet
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allNotes.slice(0, 20)
    return allNotes.filter(({ note, project }) =>
      note.title.toLowerCase().includes(q) ||
      project.name.toLowerCase().includes(q) ||
      note.tags.some(tag => tag.toLowerCase().includes(q))
    )
  }, [query, allNotes])

  // Remet l'index à 0 quand les résultats changent
  useEffect(() => { setActiveIndex(0) }, [results])

  // Focus input au montage
  useEffect(() => { inputRef.current?.focus() }, [])

  // Fermeture Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSelect = useCallback((r: SearchResult) => {
    selectNote(r.project.id, r.category.id, r.note.id)
    window.vault.pingActivity()
    onClose()
  }, [selectNote, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[activeIndex]) handleSelect(results[activeIndex])
    }
  }, [results, activeIndex, handleSelect])

  // Scroll automatique sur l'item actif
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 bg-vault-surface border border-vault-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Barre de recherche */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-vault-border">
          <svg className="w-4 h-4 text-vault-text-dim shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-vault-text-bright text-sm focus:outline-none placeholder:text-vault-text-dim/40"
            placeholder="Rechercher une note, un projet, un tag…"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="text-vault-text-dim/40 text-xs border border-vault-border rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>

        {/* Résultats */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-vault-text-dim/40 text-sm">
              Aucun résultat pour « {query} »
            </div>
          ) : (
            results.map((r, i) => {
              const color = NOTE_TYPE_COLORS[r.note.type]
              const icon = NOTE_TYPE_ICONS[r.note.type]
              const isActive = i === activeIndex
              return (
                <button
                  key={r.note.id}
                  data-index={i}
                  onClick={() => handleSelect(r)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors ${
                    isActive ? 'bg-vault-muted' : 'hover:bg-vault-muted/50'
                  }`}
                >
                  {/* Icône type */}
                  <span className="text-base shrink-0">{icon}</span>

                  {/* Titre + chemin */}
                  <div className="flex-1 min-w-0">
                    <div className="text-vault-text-bright text-sm truncate">
                      {highlightMatch(r.note.title, query)}
                    </div>
                    <div className="text-vault-text-dim/50 text-xs truncate mt-0.5">
                      {r.project.icon} {r.project.name} / {r.category.icon} {r.category.name}
                    </div>
                  </div>

                  {/* Tags */}
                  {r.note.tags.length > 0 && (
                    <div className="flex gap-1 shrink-0">
                      {r.note.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5 rounded bg-vault-muted text-vault-text-dim/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Badge type */}
                  <span className="text-xs shrink-0" style={{ color }}>{r.note.type}</span>
                </button>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-vault-border flex items-center gap-3 text-vault-text-dim/30 text-xs">
            <span>↑↓ naviguer</span>
            <span>↵ ouvrir</span>
            <span>{results.length} résultat{results.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Met en gras la portion qui correspond à la recherche
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const q = query.trim().toLowerCase()
  const idx = text.toLowerCase().indexOf(q)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-vault-accent/25 text-vault-accent rounded-sm">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}
