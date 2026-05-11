'use client'

import { useState, useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'

interface TOTPSetupProps {
  onClose: () => void
}

export function TOTPSetup({ onClose }: TOTPSetupProps){
  const { isTOTPEnabled, setupTotp, verifyTotpSetup, disableTotp } = useAppStore()

  const [step, setStep] = useState<'intro' | 'qr' | 'verify'>('intro')
  const [secret, setSecret] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleStartSetup = useCallback(async () => {
    setIsLoading(true)
    const { secret: s, qrCode: qr } = await setupTotp()
    setSecret(s)
    setQrCode(qr)
    setStep('qr')
    setIsLoading(false)
  }, [setupTotp])

  const handleVerify = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const ok = await verifyTotpSetup(code, secret)
    if (!ok) {
      setError('Code invalide — vérifiez votre application 2FA')
    } else {
      onClose()
    }
    setIsLoading(false)
  }, [code, secret, verifyTotpSetup, onClose])

  const handleDisable = useCallback(async () => {
    setIsLoading(true)
    await disableTotp()
    onClose()
    setIsLoading(false)
  }, [disableTotp, onClose])

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-vault-surface border border-vault-border rounded-lg w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-vault-text-bright font-semibold font-mono">2FA — TOTP</h2>
          <button onClick={onClose} className="text-vault-text-dim hover:text-vault-text">✕</button>
        </div>

        {/* Statut */}
        <div className={`text-xs px-3 py-2 rounded border mb-5 flex items-center gap-2 ${isTOTPEnabled ? 'bg-vault-accent/10 border-vault-accent/30 text-vault-accent' : 'bg-vault-muted border-vault-border text-vault-text-dim'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isTOTPEnabled ? 'bg-vault-accent animate-pulse' : 'bg-vault-text-dim/30'}`} />
          TOTP {isTOTPEnabled ? 'activé' : 'désactivé'}
        </div>

        {/* Étape intro */}
        {step === 'intro' && (
          <div className="space-y-4">
            <p className="text-vault-text-dim text-sm leading-relaxed">
              Le 2FA ajoute un code à 6 chiffres en plus du mot de passe. Compatible
              Google Authenticator, Authy, Bitwarden Authenticator.
            </p>
            {isTOTPEnabled ? (
              <button onClick={handleDisable} disabled={isLoading} className="btn-danger w-full justify-center">
                Désactiver le 2FA
              </button>
            ) : (
              <button onClick={handleStartSetup} disabled={isLoading} className="btn-primary w-full justify-center">
                {isLoading ? 'Génération...' : 'Configurer le 2FA'}
              </button>
            )}
          </div>
        )}

        {/* Étape QR */}
        {step === 'qr' && (
          <div className="space-y-4">
            <p className="text-vault-text-dim text-sm">Scannez ce QR code :</p>
            {qrCode && (
              <div className="flex justify-center bg-vault-bg p-4 rounded">
                <img src={qrCode} alt="QR TOTP" className="w-44 h-44" />
              </div>
            )}
            <p className="text-vault-text-dim text-xs">Secret manuel :</p>
            <code className="block text-vault-accent text-xs bg-vault-bg px-3 py-2 rounded border border-vault-border break-all selectable">
              {secret}
            </code>
            <button onClick={() => setStep('verify')} className="btn-primary w-full justify-center">
              Continuer →
            </button>
          </div>
        )}

        {/* Étape vérification */}
        {step === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-vault-text-dim text-sm">
              Entrez le code affiché dans votre app 2FA pour confirmer :
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              className="input-terminal text-center tracking-[0.5em] text-2xl"
              placeholder="000000"
              autoFocus
            />
            {error && (
              <div className="text-vault-danger text-xs py-1.5 px-3 bg-vault-danger/10 border border-vault-danger/30 rounded">
                ✗ {error}
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep('qr')} className="btn-terminal flex-1 justify-center">← Retour</button>
              <button type="submit" disabled={code.length !== 6 || isLoading} className="btn-primary flex-1 justify-center">
                {isLoading ? '...' : 'Activer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
