import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { IPC, type JobEvent, type MenuEvent, type StartJobRequest } from '@shared/ipc.js'
import type { AppSettings, SlicerInfo } from '@shared/types.js'

/**
 * The renderer gets these functions and nothing else: no fs, no child_process,
 * no ipcRenderer. Every path it can name has already been through the main
 * process, which validates it before touching the disk.
 */
const api = {
  pickFile: () => ipcRenderer.invoke(IPC.PICK_FILE),
  readFile: (path: string) => ipcRenderer.invoke(IPC.READ_FILE, path),
  startJob: (request: StartJobRequest): Promise<string> =>
    ipcRenderer.invoke(IPC.START_JOB, request),
  cancelJob: (jobId: string): Promise<void> => ipcRenderer.invoke(IPC.CANCEL_JOB, jobId),

  onJobEvent: (listener: (event: JobEvent) => void) => {
    const handler = (_event: unknown, payload: JobEvent): void => listener(payload)
    ipcRenderer.on(IPC.JOB_EVENT, handler)
    return () => ipcRenderer.removeListener(IPC.JOB_EVENT, handler)
  },

  onMenuEvent: (listener: (event: MenuEvent) => void) => {
    const handler = (_event: unknown, payload: MenuEvent): void => listener(payload)
    ipcRenderer.on(IPC.MENU_EVENT, handler)
    return () => ipcRenderer.removeListener(IPC.MENU_EVENT, handler)
  },

  onOpenPath: (listener: (path: string) => void) => {
    const handler = (_event: unknown, path: string): void => listener(path)
    ipcRenderer.on(IPC.OPEN_PATH, handler)
    return () => ipcRenderer.removeListener(IPC.OPEN_PATH, handler)
  },

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.GET_SETTINGS),
  setSettings: (settings: AppSettings): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.SET_SETTINGS, settings),
  getSlicerInfo: (): Promise<SlicerInfo> => ipcRenderer.invoke(IPC.SLICER_INFO),

  // Drag & drop hands the page a File with no usable path; only the preload can
  // resolve it, and it never exposes anything else about the filesystem.
  pathForFile: (file: File): string => webUtils.getPathForFile(file),
}

contextBridge.exposeInMainWorld('stlTime', api)
