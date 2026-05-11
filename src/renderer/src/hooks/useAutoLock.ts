import { useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
const PING_THROTTLE_MS = 10_000  // ping au max toutes les 10s (évite le spam IPC)

export function useAutoLock(): void {
  const { lockVault, isUnlocked, setShowSearch, setShowSettings } = useAppStore()

  // Écoute le signal de verrouillage automatique du main process
  useEffect(() => {
    const remove = window.vault.onAutoLocked(() => lockVault())
    return remove
  }, [lockVault])

  // Écoute les événements menu macOS
  useEffect(() => {
    const removeLock = window.vault.onMenuEvent('menu:lock', () => lockVault())
    const removeSearch = window.vault.onMenuEvent('menu:search', () => setShowSearch(true))
    const removeSettings = window.vault.onMenuEvent('menu:settings', () => setShowSettings(true))
    return () => { removeLock(); removeSearch(); removeSettings() }
  }, [lockVault, setShowSearch, setShowSettings])

  // Envoie les pings d'activité (throttlés) pour réinitialiser le timer
  useEffect(() => {
    if (!isUnlocked) return

    let lastPing = 0
    function handleActivity(): void {
      const now = Date.now()
      if (now - lastPing < PING_THROTTLE_MS) return
      lastPing = now
      window.vault.pingActivity()
    }

    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, handleActivity, { passive: true }))
    return () => ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, handleActivity))
  }, [isUnlocked])
}
