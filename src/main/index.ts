import { join } from 'node:path'
import { BrowserWindow, app } from 'electron'
import { registerIpc } from './ipc.js'
import { buildMenu } from './menu.js'
import { cancelCurrentJobSync } from './slicer/jobs.js'
import { logSlicerStartup } from './slicer/orca.js'
import { cleanupAllJobs } from './temp.js'
import { createWindow } from './window.js'

app.setName('STL Time')

let mainWindow: BrowserWindow | null = null

// A single window utility: a second launch focuses the one that is already open
// rather than starting a rival copy that would wipe the first one's temp files.
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

app.on('second-instance', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

const devServerUrl = process.env['ELECTRON_RENDERER_URL'] ?? null

void app.whenReady().then(async () => {
  await cleanupAllJobs()
  registerIpc()
  buildMenu(() => mainWindow)

  const preload = join(__dirname, '../preload/index.js')
  mainWindow = createWindow(preload, devServerUrl)
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  void logSlicerStartup()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow(preload, devServerUrl)
    }
  })
})

// Kill any live slicer child and drop its temp directory before the app goes away.
app.on('before-quit', () => {
  cancelCurrentJobSync()
})

app.on('window-all-closed', () => {
  app.quit()
})
