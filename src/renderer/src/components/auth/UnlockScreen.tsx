'use client'

import { useState, useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'

// ─── UnlockScreen ─────────────────────────────────────────────────────────────
// Gère : création vault · déverrouillage · affichage code de récup · recovery

type Phase =
  | 'password'       // saisie du mot de passe (create ou unlock)
  | 'totp'           // saisie du code 2FA
  | 'recoveryCode'   // affichage du code de récup après création (à sauvegarder)
  | 'recovery'       // saisie du code de récup (mdp oublié)
  | 'resetPassword'  // définir un nouveau mot de passe après validation du code

export function UnlockScreen(){
  const {
    vaultExists, setupVault, unlockVault, isTOTPEnabled, isLoading,
    pendingRecoveryCode, clearPendingRecoveryCode,
    validateRecoveryCode, resetPasswordViaRecovery,
  } = useAppStore()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [enableTOTP, setEnableTOTP] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<Phase>('password')

  // ── Recovery ──────────────────────────────────────────────────────────────
  const [recoveryInput, setRecoveryInput] = useState('')
  const [validatedCode, setValidatedCode] = useState('')  // code validé, stocké pour resetPassword
  const [newPw, setNewPw] = useState('')
  const [confirmNewPw, setConfirmNewPw] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)

  const isNewVault = vaultExists === false

  // ── Création vault ────────────────────────────────────────────────────────
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
    if (result.error) {
      setError(result.error)
    } else {
      // Le pendingRecoveryCode est dans le store — on passe en mode affichage
      setPhase('recoveryCode')
    }
  }, [password, confirmPassword, enableTOTP, setupVault])

  // ── Déverrouillage normal ─────────────────────────────────────────────────
  const handleUnlock = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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

  // ── Validation code de récupération ──────────────────────────────────────
  const handleValidateRecovery = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!recoveryInput.trim()) {
      setError('Saisissez votre code de récupération')
      return
    }

    const ok = await validateRecoveryCode(recoveryInput.trim())
    if (ok) {
      setValidatedCode(recoveryInput.trim())
      setPhase('resetPassword')
    } else {
      setError('Code de récupération invalide')
    }
  }, [recoveryInput, validateRecoveryCode])

  // ── Réinitialisation du mot de passe ──────────────────────────────────────
  const handleResetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPw.length < 12) {
      setError('Le mot de passe doit faire au moins 12 caractères')
      return
    }
    if (newPw !== confirmNewPw) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    const ok = await resetPasswordViaRecovery(validatedCode, newPw)
    if (!ok) setError('Erreur lors de la réinitialisation')
  }, [newPw, confirmNewPw, validatedCode, resetPasswordViaRecovery])

  // ── Copy recovery code ────────────────────────────────────────────────────
  const handleCopyCode = useCallback(() => {
    if (!pendingRecoveryCode) return
    navigator.clipboard.writeText(pendingRecoveryCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }, [pendingRecoveryCode])

  if (vaultExists === null) {
    return (
      <div className="h-full flex items-center justify-center bg-vault-bg">
        <span className="text-vault-text-dim animate-pulse">initialisation...</span>
      </div>
    )
  }

  // ── Affichage du code de récupération (après création) ────────────────────
  if (phase === 'recoveryCode' && pendingRecoveryCode) {
    return (
      <div className="h-full flex items-center justify-center bg-vault-bg">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-vault-accent text-2xl font-bold tracking-tight accent-glow">VaultNotes</h1>
            <p className="text-vault-text-dim text-xs mt-1">Code de récupération</p>
          </div>

          <div className="bg-vault-surface border border-vault-border rounded-lg p-6 space-y-5">
            {/* Icône */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-vault-accent/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-lg">🔐</span>
              </div>
              <div>
                <p className="text-vault-text-bright text-sm font-semibold mb-1">Sauvegardez ce code maintenant</p>
                <p className="text-vault-text-dim text-xs leading-relaxed">
                  Ce code est le <strong className="text-vault-text">seul moyen de récupérer votre vault</strong> si vous oubliez votre mot de passe.
                  Il ne sera affiché qu'une seule fois.
                </p>
              </div>
            </div>

            {/* Code */}
            <div className="bg-vault-bg border border-vault-accent/30 rounded-lg p-4 text-center">
              <code className="text-vault-accent font-mono text-lg tracking-widest select-all">
                {pendingRecoveryCode}
              </code>
            </div>

            {/* Bouton copier */}
            <button
              onClick={handleCopyCode}
              className="w-full btn-terminal justify-center text-xs"
            >
              {codeCopied ? '✓ Copié dans le presse-papiers' : '⎘ Copier le code'}
            </button>

            <div className="bg-vault-danger/10 border border-vault-danger/30 rounded p-3">
              <p className="text-vault-danger text-xs leading-relaxed">
                ⚠ Notez ce code sur papier ou dans un endroit sûr. Sans lui, un mot de passe oublié = accès définitivement perdu.
              </p>
            </div>

            <button
              onClick={clearPendingRecoveryCode}
              className="btn-primary w-full justify-center"
            >
              J'ai sauvegardé ce code → Continuer
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Saisie du code de récupération ────────────────────────────────────────
  if (phase === 'recovery') {
    return (
      <div className="h-full flex items-center justify-center bg-vault-bg">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="text-center mb-10">
            <h1 className="text-vault-accent text-2xl font-bold tracking-tight accent-glow">VaultNotes</h1>
            <p className="text-vault-text-dim text-xs mt-1">$ vault recover</p>
          </div>

          <form
            onSubmit={handleValidateRecovery}
            className="bg-vault-surface border border-vault-border rounded-lg p-6 space-y-4"
          >
            <div>
              <label className="block text-vault-text-dim text-xs mb-1.5">
                Code de récupération
              </label>
              <input
                type="text"
                value={recoveryInput}
                onChange={e => setRecoveryInput(e.target.value)}
                className="input-terminal font-mono text-center tracking-wider"
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-vault-text-dim/60 text-xs mt-1">
                Format : 5 groupes de 4 caractères séparés par des tirets
              </p>
            </div>

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
              {isLoading ? 'Vérification… (≈2s)' : 'Vérifier le code'}
            </button>

            <button
              type="button"
              onClick={() => { setPhase('password'); setError('') }}
              className="text-vault-text-dim text-xs hover:text-vault-text transition-colors w-full text-center"
            >
              ← Retour à la connexion
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Nouveau mot de passe après validation du code ─────────────────────────
  if (phase === 'resetPassword') {
    return (
      <div className="h-full flex items-center justify-center bg-vault-bg">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="text-center mb-10">
            <h1 className="text-vault-accent text-2xl font-bold tracking-tight accent-glow">VaultNotes</h1>
            <p className="text-vault-text-dim text-xs mt-1">$ vault reset-password</p>
          </div>

          <form
            onSubmit={handleResetPassword}
            className="bg-vault-surface border border-vault-border rounded-lg p-6 space-y-4"
          >
            <p className="text-vault-accent text-xs flex items-center gap-2">
              <span>✓</span> Code de récupération validé
            </p>

            <div>
              <label className="block text-vault-text-dim text-xs mb-1.5">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className="input-terminal"
                placeholder="min. 12 caractères"
                autoFocus
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-vault-text-dim text-xs mb-1.5">Confirmer</label>
              <input
                type="password"
                value={confirmNewPw}
                onChange={e => setConfirmNewPw(e.target.value)}
                className="input-terminal"
                placeholder="••••••••••••"
                autoComplete="new-password"
              />
            </div>

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
              {isLoading ? 'Argon2id en cours… (≈4s)' : 'Définir le nouveau mot de passe'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Écran principal (create / unlock) ─────────────────────────────────────
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

          {/* Lien récupération (uniquement en mode unlock) */}
          {!isNewVault && phase === 'password' && (
            <button
              type="button"
              onClick={() => { setPhase('recovery'); setError('') }}
              className="text-vault-text-dim/60 text-xs hover:text-vault-text-dim transition-colors w-full text-center"
            >
              Mot de passe oublié ?
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
