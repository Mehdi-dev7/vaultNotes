'use client'

import { useState, useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'

// ─── UnlockScreen ─────────────────────────────────────────────────────────────
// Deux modes : création du premier vault, ou déverrouillage normal.

export function UnlockScreen(){
  const { vaultExists, setupVault, unlockVault, isTOTPEnabled, isLoading } = useAppStore()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [enableTOTP, setEnableTOTP] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'password' | 'totp'>('password')

  const isNewVault = vaultExists === false

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 12) {
      setError('Le mot de passe doit faire au moins 12 caractères')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    const result = await setupVault(password, enableTOTP)
    if (result.error) setError(result.error)
  }, [password, confirmPassword, enableTOTP, setupVault])

  const handleUnlock = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Si TOTP requis et pas encore saisi → passe à l'étape TOTP
    if (isTOTPEnabled && phase === 'password') {
      setPhase('totp')
      return
    }

    const ok = await unlockVault(password, isTOTPEnabled ? totpCode : undefined)
    if (!ok) {
      setError(isTOTPEnabled ? 'Mot de passe ou code 2FA incorrect' : 'Mot de passe incorrect')
      setPhase('password')
      setTotpCode('')
    }
  }, [password, totpCode, isTOTPEnabled, phase, unlockVault])

  // null = pas encore vérifié
  if (vaultExists === null) {
    return (
      <div className="h-full flex items-center justify-center bg-vault-bg">
        <span className="text-vault-text-dim animate-pulse">initialisation...</span>
      </div>
    )
  }

  return (
    <div className="h-full flex items-center justify-center bg-vault-bg">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-vault-accent text-2xl font-bold tracking-tight accent-glow">
            VaultNotes
          </h1>
          <p className="text-vault-text-dim text-xs mt-1">
            {isNewVault ? '$ vault init' : '$ vault unlock'}
            <span className="cursor" />
          </p>
        </div>

        <form
          onSubmit={isNewVault ? handleCreate : handleUnlock}
          className="bg-vault-surface border border-vault-border rounded-lg p-6 space-y-4"
        >
          {/* Étape : mot de passe */}
          {phase === 'password' && (
            <>
              <div>
                <label className="block text-vault-text-dim text-xs mb-1.5">
                  {isNewVault ? 'Mot de passe maître' : 'Mot de passe'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-terminal"
                  placeholder={isNewVault ? 'min. 12 caractères' : '••••••••••••'}
                  autoFocus
                  autoComplete={isNewVault ? 'new-password' : 'current-password'}
                />
              </div>

              {isNewVault && (
                <>
                  <div>
                    <label className="block text-vault-text-dim text-xs mb-1.5">
                      Confirmer
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="input-terminal"
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                    />
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={enableTOTP}
                      onChange={e => setEnableTOTP(e.target.checked)}
                      className="accent-[#e8820c] w-4 h-4"
                    />
                    <span className="text-vault-text-dim text-xs group-hover:text-vault-text transition-colors">
                      Activer l'authentification 2FA (TOTP)
                    </span>
                  </label>
                </>
              )}
            </>
          )}

          {/* Étape : TOTP */}
          {phase === 'totp' && (
            <div>
              <label className="block text-vault-text-dim text-xs mb-1.5">
                Code d'authentification 2FA
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className="input-terminal text-center tracking-[0.5em] text-xl"
                placeholder="000000"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setPhase('password')}
                className="text-vault-text-dim text-xs mt-2 hover:text-vault-text transition-colors"
              >
                ← Retour
              </button>
            </div>
          )}

          {error && (
            <div className="text-vault-danger text-xs py-1.5 px-3 bg-vault-danger/10 border border-vault-danger/30 rounded font-mono">
              ✗ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full justify-center"
          >
            {isLoading
              ? 'Dérivation Argon2id… (≈2s)'
              : isNewVault
                ? 'Créer le vault'
                : phase === 'totp'
                  ? 'Vérifier le code'
                  : 'Déverrouiller'}
          </button>

          {isNewVault && (
            <p className="text-vault-text-dim/60 text-xs text-center leading-relaxed">
              Argon2id · 64 MB · 3 iter · AES-256-GCM<br />
              Le mot de passe n'est jamais stocké sur disque.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
