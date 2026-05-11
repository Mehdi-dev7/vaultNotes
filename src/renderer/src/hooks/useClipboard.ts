import { useState, useCallback, useRef } from 'react'

// ─── useClipboard — auto-clear après 30s ──────────────────────────────────────
// Copie une valeur sensible dans le presse-papiers.
// Après 30 secondes, vide automatiquement le presse-papiers
// en écrivant un espace vide (si la valeur n'a pas changé entre-temps).
//
// Retourne { copy, isCopied } :
//   · copy(value)  → copie + démarre le timer
//   · isCopied     → true pendant 2s (feedback visuel)

const CLEAR_DELAY_MS = 30_000   // 30 secondes
const FEEDBACK_MS = 2_000       // feedback "Copié !" pendant 2s

export function useClipboard() {
  const [isCopied, setIsCopied] = useState(false)
  const clearTimerRef = useRef<NodeJS.Timeout | null>(null)
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null)
  const copiedValueRef = useRef<string>('')

  const copy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      copiedValueRef.current = value

      // Feedback visuel 2s
      setIsCopied(true)
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = setTimeout(() => setIsCopied(false), FEEDBACK_MS)

      // Auto-clear après 30s
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
      clearTimerRef.current = setTimeout(async () => {
        // Vérifie que le presse-papiers contient toujours notre valeur
        // avant de l'effacer (l'utilisateur a peut-être copié autre chose)
        try {
          const current = await navigator.clipboard.readText()
          if (current === copiedValueRef.current) {
            await navigator.clipboard.writeText('')
          }
        } catch {
          // readText peut échouer si la fenêtre n'est plus en focus
          // On tente quand même d'effacer
          await navigator.clipboard.writeText('').catch(() => {})
        }
        copiedValueRef.current = ''
      }, CLEAR_DELAY_MS)
    } catch (e) {
      console.error('Clipboard error:', e)
    }
  }, [])

  return { copy, isCopied }
}
