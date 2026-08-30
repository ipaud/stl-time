import type { StlTimeApi } from '../shared/ipc.js'

declare global {
  interface Window {
    readonly stlTime: StlTimeApi
  }
}

export {}
