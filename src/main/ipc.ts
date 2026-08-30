import { readFile, stat } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IPC, type StartJobRequest } from '@shared/ipc.js'
import type { ModelAnalysis, SlicerInfo } from '@shared/types.js'
import { detectSlicer } from './slicer/detect.js'
import { cancelCurrentJob, startJob } from './slicer/jobs.js'
import { getSettings, setSettings } from './settings.js'

/** Refuse anything that is not a readable .stl on disk. */
async function assertStlPath(value: unknown): Promise<string> {
  if (typeof value !== 'string' || value.length === 0) throw new Error('Invalid file path')
  if (extname(value).toLowerCase() !== '.stl') throw new Error('Only STL files are supported')
  const info = await stat(value)
  if (!info.isFile()) throw new Error('Invalid file path')
  return value
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

function assertAnalysis(value: unknown): ModelAnalysis {
  const a = value as Partial<ModelAnalysis> | null
  const d = a?.dimensions
  const ok =
    !!a &&
    typeof a.filename === 'string' &&
    isFiniteNumber(a.fileSizeBytes) &&
    isFiniteNumber(a.triangleCount) &&
    isFiniteNumber(a.volumeMm3) &&
    isFiniteNumber(a.surfaceAreaMm2) &&
    typeof a.fitsPrinter === 'boolean' &&
    !!d &&
    isFiniteNumber(d.x) &&
    isFiniteNumber(d.y) &&
    isFiniteNumber(d.z)

  if (!ok) throw new Error('Invalid model analysis')
  return a as ModelAnalysis
}

export function registerIpc(): void {
  ipcMain.handle(IPC.PICK_FILE, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(window ?? undefined!, {
      properties: ['openFile'],
      filters: [{ name: 'STL', extensions: ['stl'] }],
    })
    const path = result.filePaths[0]
    if (result.canceled || !path) return null

    const info = await stat(path)
    return { path, name: basename(path), sizeBytes: info.size }
  })

  ipcMain.handle(IPC.READ_FILE, async (_event, rawPath: unknown) => {
    const path = await assertStlPath(rawPath)
    const info = await stat(path)
    const buffer = await readFile(path)
    // Copied into a plain ArrayBuffer so the structured clone carries only bytes.
    const bytes = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer
    return { name: basename(path), sizeBytes: info.size, bytes }
  })

  ipcMain.handle(IPC.START_JOB, async (event, raw: unknown) => {
    const request = raw as Partial<StartJobRequest> | null
    const path = await assertStlPath(request?.path)
    const analysis = assertAnalysis(request?.analysis)
    const sender = event.sender

    return startJob(path, analysis, (jobEvent) => {
      if (!sender.isDestroyed()) sender.send(IPC.JOB_EVENT, jobEvent)
    })
  })

  ipcMain.handle(IPC.CANCEL_JOB, async () => {
    await cancelCurrentJob()
  })

  ipcMain.handle(IPC.GET_SETTINGS, () => getSettings())
  ipcMain.handle(IPC.SET_SETTINGS, (_event, value: unknown) => setSettings(value))

  ipcMain.handle(IPC.SLICER_INFO, async (): Promise<SlicerInfo> => {
    const install = await detectSlicer()
    return install
      ? { available: true, name: install.name, version: install.version }
      : { available: false }
  })
}
