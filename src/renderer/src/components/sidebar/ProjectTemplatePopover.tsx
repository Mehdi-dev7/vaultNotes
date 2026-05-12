import { useState, useRef, useEffect, useCallback } from 'react'
import { PROJECT_TEMPLATES, type ProjectTemplate } from '@/types/vault.types'

// ─── ProjectTemplatePopover ───────────────────────────────────────────────────
// Coule dans le flex column de la sidebar (pas d'absolute) pour éviter
// le chevauchement avec la drag-region macOS qui capture les clics.

interface Props {
  onConfirm: (name: string, template: ProjectTemplate) => void
  onCancel: () => void
}

export function ProjectTemplatePopover({ onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<'pick' | 'name'>('pick')
  const [selected, setSelected] = useState<ProjectTemplate | null>(null)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'name') inputRef.current?.focus()
  }, [step])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const handlePickTemplate = useCallback((t: ProjectTemplate) => {
    setSelected(t)
    setName('')
    setStep('name')
  }, [])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !selected) return
    onConfirm(name.trim(), selected)
  }, [name, selected, onConfirm])

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-vault-surface animate-fade-in">
      {/* Label de section */}
      <div className="px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {step === 'name' && (
            <button
              onClick={() => setStep('pick')}
              className="no-drag text-vault-text-dim hover:text-vault-text transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <span className="text-vault-text-dim/50 text-xs uppercase tracking-wider">
            {step === 'pick' ? 'Template' : `${selected?.icon} ${selected?.label}`}
          </span>
        </div>
      </div>

      <div className="h-px bg-vault-border mx-3 mb-1 shrink-0" />

      {/* Étape 1 : choix du template */}
      {step === 'pick' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {PROJECT_TEMPLATES.map(t => (
            <button
              key={t.label}
              onClick={() => handlePickTemplate(t)}
              className="no-drag w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-vault-muted transition-colors group"
            >
              <span className="text-xl shrink-0 mt-0.5">{t.icon}</span>
              <div className="min-w-0">
                <div
                  className="text-xs font-semibold mb-0.5 transition-colors"
                  style={{ color: t.color }}
                >
                  {t.label}
                </div>
                <div className="text-vault-text-dim/60 text-xs">{t.description}</div>
                {t.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {t.categories.map(c => (
                      <span
                        key={c.name}
                        className="text-xs px-1.5 py-0.5 rounded bg-vault-muted text-vault-text-dim/70"
                      >
                        {c.icon} {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Étape 2 : saisie du nom */}
      {step === 'name' && selected && (
        <div className="flex-1 flex flex-col justify-center px-3 py-4">
          <p className="text-vault-text-dim/60 text-xs mb-3 leading-relaxed">
            {selected.categories.length > 0
              ? `Créera ${selected.categories.length} catégorie${selected.categories.length > 1 ? 's' : ''} automatiquement`
              : 'Projet vierge — tu ajouteras les catégories toi-même'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-terminal text-sm"
              placeholder="Nom du projet..."
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="no-drag btn-primary w-full justify-center py-1.5 text-xs disabled:opacity-40"
              style={name.trim() ? { borderColor: selected.color, color: selected.color } : {}}
            >
              Créer le projet
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
