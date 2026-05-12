import { useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import { UnlockScreen } from '@/components/auth/UnlockScreen'
import { MainLayout } from '@/components/layout/MainLayout'
import { useAutoLock } from '@/hooks/useAutoLock'

export default function App(){
  const { isUnlocked, pendingRecoveryCode, checkVaultExists } = useAppStore()

  useEffect(() => { checkVaultExists() }, [checkVaultExists])
  useAutoLock()

  // Affiche l'écran de déverrouillage tant que le code de récup n'a pas été confirmé
  const showUnlock = !isUnlocked || pendingRecoveryCode !== null

  return (
    <div className="h-full scanlines">
      {showUnlock ? <UnlockScreen /> : <MainLayout />}
    </div>
  )
}
