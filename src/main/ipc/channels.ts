// ─── Canaux IPC — VaultNotes ──────────────────────────────────────────────────
// Philosophie : le main process ne voit que des octets chiffrés.
// Toute la crypto (Argon2id, AES-GCM, ChaCha20) se fait dans le renderer.

export const IPC = {
  // ── Fichier vault (.vlt) ────────────────────────────────────────────────────
  FILE_VAULT_EXISTS:  'file:vaultExists',
  FILE_READ_VAULT:    'file:readVault',
  FILE_WRITE_VAULT:   'file:writeVault',
  FILE_GET_PATH:      'file:getVaultPath',

  // ── Dialogs système (export / import) ───────────────────────────────────────
  DIALOG_SAVE:        'dialog:save',
  DIALOG_OPEN:        'dialog:open',
  FILE_WRITE_EXPORT:  'file:writeExport',
  FILE_READ_IMPORT:   'file:readImport',

  // ── Préférences non-sensibles (electron-store) ───────────────────────────────
  PREFS_GET:          'prefs:get',
  PREFS_SET:          'prefs:set',
} as const

export type IPCChannel = typeof IPC[keyof typeof IPC]
