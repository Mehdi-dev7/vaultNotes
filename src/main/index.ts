import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import path from 'path'
import { registerIPCHandlers } from './ipc/handlers'

// ─── Auto-lock ────────────────────────────────────────────────────────────────
// Le timer tourne dans le main process.
// Le renderer envoie 'activity:ping' à chaque interaction (throttlé).
// Quand le timer expire → 'vault:auto-locked' envoyé au renderer.

let mainWindow: BrowserWindow | null = null
let autoLockTimer: NodeJS.Timeout | null = null
let autoLockDelay = 5 * 60 * 1000  // défaut 5min, modifiable via préférences

function resetAutoLockTimer(): void {
  if (autoLockTimer) clearTimeout(autoLockTimer)
  autoLockTimer = setTimeout(() => {
    mainWindow?.webContents.send('vault:auto-locked')
  }, autoLockDelay)
}

function stopAutoLockTimer(): void {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer)
    autoLockTimer = null
  }
}

ipcMain.on('activity:ping', resetAutoLockTimer)
ipcMain.on('lock:manual', stopAutoLockTimer)  // renderer a verrouillé manuellement

// Permet au renderer de modifier le délai d'auto-lock
ipcMain.on('autolock:setDelay', (_e, ms: number) => {
  autoLockDelay = ms
  resetAutoLockTimer()
})

// ─── Fenêtre principale ───────────────────────────────────────────────────────

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0b0d',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
  resetAutoLockTimer()
}

// ─── Menu macOS ───────────────────────────────────────────────────────────────

function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        { label: 'À propos de VaultNotes', role: 'about' },
        { type: 'separator' },
        {
          label: 'Verrouiller',
          accelerator: 'CmdOrCtrl+L',
          click: () => mainWindow?.webContents.send('menu:lock')
        },
        {
          label: 'Préférences…',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('menu:settings')
        },
        { type: 'separator' },
        { label: 'Masquer', role: 'hide' },
        { label: 'Masquer les autres', role: 'hideOthers' },
        { type: 'separator' },
        { label: 'Quitter', role: 'quit' },
      ]
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ]
    },
    {
      label: 'Notes',
      submenu: [
        {
          label: 'Nouvelle note',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:newNote')
        },
        {
          label: 'Rechercher',
          accelerator: 'CmdOrCtrl+K',
          click: () => mainWindow?.webContents.send('menu:search')
        },
        { type: 'separator' },
        {
          label: 'Exporter le vault…',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWindow?.webContents.send('menu:export')
        },
        {
          label: 'Importer un vault…',
          click: () => mainWindow?.webContents.send('menu:import')
        },
      ]
    },
    {
      label: 'Fenêtre',
      submenu: [
        { role: 'minimize' }, { role: 'close' }, { role: 'togglefullscreen' }
      ]
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  registerIPCHandlers()
  buildMenu()
  createMainWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  // Signal au renderer de zero-fill la masterKey avant fermeture
  mainWindow?.webContents.send('vault:auto-locked')
})
