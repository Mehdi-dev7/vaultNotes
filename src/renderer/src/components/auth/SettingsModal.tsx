import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'

// ─── SettingsModal ─────────────────────────────────────────────────────────────

interface SettingsModalProps {
  onClose: () => void
}

// Délais disponibles : null = jamais, sinon en minutes
const AUTO_LOCK_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: 'Jamais',    minutes: null },
  { label: '1 minute',  minutes: 1    },
  { label: '5 minutes', minutes: 5    },
  { label: '15 minutes',minutes: 15   },
  { label: '30 minutes',minutes: 30   },
]

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { changePassword, isLoading } = useAppStore()

  const [tab, setTab] = useState<'password' | 'autolock'>('password')

  // ── Changement de mot de passe ────────────────────────────────────────────
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)

    if (newPw.length < 12) {
      setPwError('Le nouveau mot de passe doit faire au moins 12 caractères')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('Les mots de passe ne correspondent pas')
      return
    }
    if (newPw === oldPw) {
      setPwError('Le nouveau mot de passe doit être différent de l\'ancien')
      return
    }

    const ok = await changePassword(oldPw, newPw)
    if (ok) {
      setPwSuccess(true)
      setOldPw(''); setNewPw(''); setConfirmPw('')
    } else {
      setPwError('Mot de passe actuel incorrect')
    }
  }, [oldPw, newPw, confirmPw, changePassword])

  // ── Auto-lock ─────────────────────────────────────────────────────────────
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(5)

  // Charge la préférence sauvegardée
  useEffect(() => {
    window.vault.getPreference('autoLockMinutes').then(res => {
      if (res.ok) {
        const val = res.data as number | null | undefined
        setSelectedMinutes(val ?? 5)
      }
    })
  }, [])

  const handleAutoLockChange = useCallback(async (minutes: number | null) => {
    setSelectedMinutes(minutes)
    const ms = minutes === null ? 0 : minutes * 60 * 1000
    window.vault.setAutoLockDelay(ms)
    await window.vault.setPreference('autoLockMinutes', minutes)
  }, [])

  // ── Fermeture clavier ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const tabs: { id: 'password' | 'autolock'; label: string }[] = [
    { id: 'password', label: 'Mot de passe maître' },
    { id: 'autolock', label: 'Verrouillage auto' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-vault-surface border border-vault-border rounded-lg w-full max-w-md mx-4 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-vault-border">
          <h2 className="text-vault-text-bright font-semibold text-sm">Paramètres</h2>
          <button
            onClick={onClose}
            className="text-vault-text-dim hover:text-vault-text transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-vault-border px-5 gap-4">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-3 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-vault-accent text-vault-accent'
                  : 'border-transparent text-vault-text-dim hover:text-vault-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenu */}
        <div className="p-5">

          {/* ── Onglet mot de passe ── */}
          {tab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <p className="text-vault-text-dim text-xs leading-relaxed">
                Modifier le mot de passe maître. Un nouveau sel Argon2id sera généré et toutes les données
                seront re-chiffrées. Le code de récupération reste valide.
              </p>

              <div>
                <label className="block text-vault-text-dim text-xs mb-1.5">Mot de passe actuel</label>
                <input
                  type="password"
                  value={oldPw}
                  onChange={e => setOldPw(e.target.value)}
                  className="input-terminal"
                  placeholder="••••••••••••"
                  autoFocus
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label className="block text-vault-text-dim text-xs mb-1.5">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="input-terminal"
                  placeholder="min. 12 caractères"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-vault-text-dim text-xs mb-1.5">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className="input-terminal"
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                />
              </div>

              {pwError && (
                <div className="text-vault-danger text-xs py-1.5 px-3 bg-vault-danger/10 border border-vault-danger/30 rounded font-mono">
                  ✗ {pwError}
                </div>
              )}

              {pwSuccess && (
                <div className="text-vault-accent text-xs py-1.5 px-3 bg-vault-accent/10 border border-vault-accent/30 rounded font-mono">
                  ✓ Mot de passe modifié avec succès
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !oldPw || !newPw || !confirmPw}
                className="btn-primary w-full justify-center"
              >
                {isLoading ? 'Argon2id en cours… (≈4s)' : 'Changer le mot de passe'}
              </button>
            </form>
          )}

          {/* ── Onglet auto-lock ── */}
          {tab === 'autolock' && (
            <div className="space-y-4">
              <p className="text-vault-text-dim text-xs leading-relaxed">
                Le vault se verrouille automatiquement après une période d'inactivité.
                Le timer est réinitialisé à chaque interaction (souris, clavier).
              </p>

              <div className="space-y-1.5">
                {AUTO_LOCK_OPTIONS.map(opt => {
                  const isSelected = opt.minutes === selectedMinutes
                  return (
                    <button
                      key={String(opt.minutes)}
                      onClick={() => handleAutoLockChange(opt.minutes)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors border ${
                        isSelected
                          ? 'border-vault-accent/50 bg-vault-accent/10 text-vault-accent'
                          : 'border-vault-border bg-vault-muted/50 text-vault-text-dim hover:text-vault-text hover:bg-vault-muted'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>

              {selectedMinutes === null && (
                <div className="text-vault-text-dim/60 text-xs py-2 px-3 bg-vault-muted rounded border border-vault-border">
                  ⚠ Sans verrouillage automatique, le vault reste ouvert indéfiniment.
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
