import { useState, useRef, useEffect, useCallback } from 'react'
import { CATEGORY_TEMPLATES } from '@/types/vault.types'
import type { NoteType } from '@/types/vault.types'

// ─── CategoryTypePopover ──────────────────────────────────────────────────────
// Grille de types pour créer une catégorie rapidement.
// Les types prédéfinis créent la catégorie immédiatement.
// "Personnalisée" affiche un input de nom libre.

interface Props {
  onConfirm: (name: string, icon: string, defaultNoteType: NoteType | undefined) => void
  onCancel: () => void
}

export function CategoryTypePopover({ onConfirm, onCancel }: Props) {
  const [customMode, setCustomMode] = useState(false)
  const [customName, setCustomName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (customMode) inputRef.current?.focus()
  }, [customMode])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const handlePick = useCallback((t: typeof CATEGORY_TEMPLATES[number]) => {
    if (t.defaultNoteType === null) {
      setCustomMode(true)
    } else {
      onConfirm(t.name, t.icon, t.defaultNoteType as NoteType)
    }
  }, [onConfirm])

  const handleCustomSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!customName.trim()) return
    onConfirm(customName.trim(), '📂', undefined)
  }, [customName, onConfirm])

  return (
    <div className="mx-1 mb-1 rounded-md border border-vault-border bg-vault-bg overflow-hidden animate-slide-in">
      {!customMode ? (
        <>
          <div className="px-3 py-2 border-b border-vault-border flex items-center justify-between">
            <span className="text-vault-text-dim/60 text-xs">Type de catégorie</span>
            <button
              onClick={onCancel}
              className="text-vault-text-dim hover:text-vault-text transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Grille 2 colonnes */}
          <div className="grid grid-cols-2 gap-px p-1.5 bg-vault-border">
            {CATEGORY_TEMPLATES.map(t => (
              <button
                key={t.name}
                onClick={() => handlePick(t)}
                className="flex items-center gap-2 px-2.5 py-2 bg-vault-surface hover:bg-vault-muted rounded transition-colors text-left"
              >
                <span className="text-base shrink-0 leading-none">{t.icon}</span>
                <span className="text-vault-text-dim hover:text-vault-text text-xs truncate transition-colors">
                  {t.name}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <form onSubmit={handleCustomSubmit} className="flex items-center gap-1 p-1.5">
          <input
            ref={inputRef}
            type="text"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setCustomMode(false); onCancel() } }}
            className="flex-1 bg-vault-muted border border-vault-accent/40 rounded px-2 py-1 text-xs text-vault-text-bright focus:outline-none focus:border-vault-accent caret-[#e8820c] selectable"
            placeholder="Nom de la catégorie..."
            autoComplete="off"
          />
          <button type="submit" className="text-vault-accent text-sm hover:opacity-70 px-1">✓</button>
          <button type="button" onClick={onCancel} className="text-vault-text-dim text-sm hover:text-vault-text px-1">✕</button>
        </form>
      )}
    </div>
  )
}
