import { ipcMain, dialog, app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { IPC } from './channels'

// ─── IPC Handlers — I/O uniquement ────────────────────────────────────────────
// Le main process NE VOIT QUE des données chiffrées.
// Il lit/écrit des fichiers et gère les dialogs système.
// Toute la crypto reste dans le renderer.

// Chemin du fichier vault principal
const VAULT_FILE_NAME = 'vault.vlt'

function getVaultPath(): string {
  return path.join(app.getPath('userData'), VAULT_FILE_NAME)
}

type Result<T = void> = { ok: true; data: T } | { ok: false; error: string }

function ok<T>(data: T): Result<T> { return { ok: true, data } }
function fail(e: unknown): Result<never> {
  return { ok: false, error: e instanceof Error ? e.message : String(e) }
}

export function registerIPCHandlers(): void {
  // ── Fichier vault ──────────────────────────────────────────────────────────

  ipcMain.handle(IPC.FILE_VAULT_EXISTS, async () => {
    try {
      await fs.access(getVaultPath())
      return ok(true)
    } catch {
      return ok(false)
    }
  })

  ipcMain.handle(IPC.FILE_READ_VAULT, async () => {
    try {
      const content = await fs.readFile(getVaultPath(), 'utf8')
      return ok(content)
    } catch (e) {
      return fail(e)
    }
  })

  // Le renderer envoie le JSON chiffré complet — le main l'écrit atomiquement
  ipcMain.handle(IPC.FILE_WRITE_VAULT, async (_e, content: string) => {
    try {
      const vaultPath = getVaultPath()
      await fs.mkdir(path.dirname(vaultPath), { recursive: true })
      // Écriture atomique via fichier temporaire
      const tmpPath = vaultPath + '.tmp'
      await fs.writeFile(tmpPath, content, 'utf8')
      await fs.rename(tmpPath, vaultPath)
      return ok(undefined)
    } catch (e) {
      return fail(e)
    }
  })

  ipcMain.handle(IPC.FILE_GET_PATH, () => ok(getVaultPath()))

  // ── Dialogs ────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.DIALOG_SAVE, async (_e, defaultName: string) => {
    try {
      const { filePath } = await dialog.showSaveDialog({
        title: 'Exporter le vault',
        defaultPath: defaultName,
        filters: [{ name: 'VaultNotes Export', extensions: ['vault'] }],
      })
      return ok(filePath ?? null)
    } catch (e) {
      return fail(e)
    }
  })

  ipcMain.handle(IPC.DIALOG_OPEN, async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: 'Importer un vault',
        filters: [{ name: 'VaultNotes Export', extensions: ['vault'] }],
        properties: ['openFile'],
      })
      return ok(filePaths[0] ?? null)
    } catch (e) {
      return fail(e)
    }
  })

  // Le renderer envoie le contenu déjà chiffré (ChaCha20-Poly1305)
  ipcMain.handle(IPC.FILE_WRITE_EXPORT, async (_e, filePath: string, content: string) => {
    try {
      await fs.writeFile(filePath, content, 'utf8')
      return ok(undefined)
    } catch (e) {
      return fail(e)
    }
  })

  ipcMain.handle(IPC.FILE_READ_IMPORT, async (_e, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      return ok(content)
    } catch (e) {
      return fail(e)
    }
  })

  // ── Préférences (electron-store) ──────────────────────────────────────────
  // Stocke uniquement des préférences non sensibles (thème, auto-lock delay…)

  let store: import('electron-store').default | null = null

  async function getStore() {
    if (!store) {
      const { default: Store } = await import('electron-store')
      store = new Store({ name: 'preferences' })
    }
    return store
  }

  ipcMain.handle(IPC.PREFS_GET, async (_e, key: string) => {
    const s = await getStore()
    return ok(s.get(key))
  })

  ipcMain.handle(IPC.PREFS_SET, async (_e, key: string, value: unknown) => {
    const s = await getStore()
    s.set(key, value)
    return ok(undefined)
  })
}
