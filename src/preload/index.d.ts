import type { VaultAPI } from './index'

declare global {
  interface Window {
    vault: VaultAPI
  }
}
