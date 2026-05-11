// Déclarations de types pour les APIs exposées via contextBridge

type IpcResult<T = void> = { ok: true; data: T } | { ok: false; error: string }

interface Window {
  vault: {
    vaultExists:      ()                                  => Promise<IpcResult<boolean>>
    readVault:        ()                                  => Promise<IpcResult<string>>
    writeVault:       (content: string)                   => Promise<IpcResult>
    getVaultPath:     ()                                  => Promise<IpcResult<string>>

    showSaveDialog:   (defaultName: string)               => Promise<IpcResult<string | null>>
    showOpenDialog:   ()                                  => Promise<IpcResult<string | null>>
    writeExport:      (filePath: string, content: string) => Promise<IpcResult>
    readImport:       (filePath: string)                  => Promise<IpcResult<string>>

    getPreference:    (key: string)                       => Promise<IpcResult<unknown>>
    setPreference:    (key: string, value: unknown)       => Promise<IpcResult>

    onAutoLocked:     (cb: () => void)                    => () => void
    onMenuEvent:      (event: string, cb: () => void)     => () => void

    pingActivity:     ()                                  => void
    notifyLocked:     ()                                  => void
    setAutoLockDelay: (ms: number)                        => void
  }
}
