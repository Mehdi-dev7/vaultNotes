import { useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import { UnlockScreen } from '@/components/auth/UnlockScreen'
import { MainLayout } from '@/components/layout/MainLayout'
import { useAutoLock } from '@/hooks/useAutoLock'

export default function App(){
  const { isUnlocked, checkVaultExists } = useAppStore()

  // Vérifie si un vault existe dès le démarrage
  useEffect(() => { checkVaultExists() }, [checkVaultExists])

  // Active le système auto-lock + listeners menu macOS
  useAutoLock()

  return (
    <div className="h-full scanlines">
      {isUnlocked ? <MainLayout /> : <UnlockScreen />}
    </div>
  )
}
