'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import { ProjectTree } from '@/components/sidebar/ProjectTree'
import { NoteEditor } from '@/components/editor/NoteEditor'
import { TOTPSetup } from '@/components/auth/TOTPSetup'

// ─── MainLayout ────────────────────────────────────────────────────────────────

export function MainLayout(){
  const { showTOTPSetup, setShowTOTPSetup, isTOTPEnabled, exportVault, importVault } = useAppStore()

  // Écoute les événements du menu macOS
  useEffect(() => {
    const removeExport = window.vault.onMenuEvent('menu:export', () => {
      // L'export demande un mot de passe → on ouvre les settings ou on utilise un prompt simple
      const pw = prompt('Mot de passe pour l\'export (différent du mot de passe maître) :')
      if (pw) exportVault(pw)
    })
    const removeImport = window.vault.onMenuEvent('menu:import', async () => {
      const pw = prompt('Mot de passe de l\'export à importer :')
      if (pw) await importVault(pw)
    })
    const removeNewNote = window.vault.onMenuEvent('menu:newNote', () => {
      useAppStore.getState().setShowSettings(false)
    })
    return () => { removeExport(); removeImport(); removeNewNote() }
  }, [exportVault, importVault])

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar gauche */}
      <ProjectTree />

      {/* Zone principale */}
      <div className="flex-1 flex flex-col overflow-hidden bg-vault-bg">
        {/* Barre de titre macOS (drag region) */}
        <div className="drag-region h-8 shrink-0 border-b border-vault-border flex items-center px-4">
          <div className="no-drag ml-auto flex items-center gap-3">
            {/* Indicateur TOTP */}
            <span
              className={`text-xs font-mono ${isTOTPEnabled ? 'text-vault-accent' : 'text-vault-text-dim/40'}`}
              title={isTOTPEnabled ? '2FA activé' : '2FA désactivé'}
            >
              2FA
            </span>
            <button
              onClick={() => setShowTOTPSetup(true)}
              className="text-vault-text-dim text-xs hover:text-vault-accent transition-colors"
              title="Configurer le 2FA"
            >
              ⚙
            </button>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 flex overflow-hidden">
          <NoteEditor />
        </div>
      </div>

      {/* Modale TOTP */}
      {showTOTPSetup && (
        <TOTPSetup onClose={() => setShowTOTPSetup(false)} />
      )}
    </div>
  )
}
