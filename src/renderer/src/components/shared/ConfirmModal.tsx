import { useEffect, useRef } from 'react'

// ─── ConfirmModal ──────────────────────────────────────────────────────────────
// Fenêtre de confirmation générique (suppression d'un projet, catégorie, note…)
// Appuyer sur Échap = annuler, Entrée = confirmer

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Supprimer',
  onConfirm,
  onCancel,
  danger = true,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Focus sur "Annuler" par défaut (évite suppression accidentelle)
  useEffect(() => { cancelRef.current?.focus() }, [])

  // Échap = annuler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-sm mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Icône */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${danger ? 'bg-vault-danger/15' : 'bg-vault-accent/15'}`}>
          <span className="text-xl">{danger ? '⚠' : 'ℹ'}</span>
        </div>

        <h3 className="text-vault-text-bright font-semibold text-sm mb-2">{title}</h3>
        <p className="text-vault-text-dim text-xs leading-relaxed mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="btn-terminal"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={danger ? 'btn-danger' : 'btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
