'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import { ProjectTree } from '@/components/sidebar/ProjectTree'
import { NoteEditor } from '@/components/editor/NoteEditor'
import { TOTPSetup } from '@/components/auth/TOTPSetup'
import { SettingsModal } from '@/components/auth/SettingsModal'
import { SearchModal } from '@/components/shared/SearchModal'

// ─── MainLayout ────────────────────────────────────────────────────────────────

export function MainLayout(){
  const {
    showTOTPSetup, setShowTOTPSetup, isTOTPEnabled,
    showSettings, setShowSettings,
    showSearch, setShowSearch,
    exportVault, importVault,
  } = useAppStore()

  // Cmd+K → ouvrir la recherche
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setShowSearch])

  // Écoute les événements du menu macOS
  useEffect(() => {
    const removeExport = window.vault.onMenuEvent('menu:export', () => {
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
          <div className="no-drag ml-auto flex items-center gap-2">
            {/* Indicateur TOTP */}
            <span
              className={`text-xs font-mono ${isTOTPEnabled ? 'text-vault-accent' : 'text-vault-text-dim/40'}`}
              title={isTOTPEnabled ? '2FA activé' : '2FA désactivé'}
            >
              2FA
            </span>

            {/* Bouton 2FA */}
            <button
              onClick={() => setShowTOTPSetup(true)}
              className="w-7 h-7 flex items-center justify-center rounded text-vault-text-dim hover:text-vault-accent hover:bg-vault-accent/10 transition-colors"
              title="Configurer le 2FA"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </button>

            {/* Bouton paramètres */}
            <button
              onClick={() => setShowSettings(true)}
              className="w-7 h-7 flex items-center justify-center rounded text-vault-text-dim hover:text-vault-accent hover:bg-vault-accent/10 transition-colors"
              title="Paramètres"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 flex overflow-hidden">
          <NoteEditor />
        </div>
      </div>

      {/* Modales */}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      {showTOTPSetup && <TOTPSetup onClose={() => setShowTOTPSetup(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
