import { extname, isAbsolute, join } from 'node:path'
import { type BrowserWindow, app } from 'electron'
import { createActions } from './actions.js'
import { registerIpc } from './ipc.js'
import { log } from './log.js'
import { buildMenu } from './menu.js'
import { cancelCurrentJobSync } from './slicer/jobs.js'
import { logSlicerStartup } from './slicer/orca.js'
import { cleanupAllJobs } from './temp.js'
import { createTray, destroyTray } from './tray.js'
import { createWindow } from './window.js'

app.setName('STL Time')

let mainWindow: BrowserWindow | null = null

/** Distinguishes "the user closed the window" from "the app is going away". */
let isQuitting = false

let isReady = false

// A single window utility: a second launch focuses the one that is already open
// rather than starting a rival copy that would wipe the first one's temp files.
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

const devServerUrl = process.env['ELECTRON_RENDERER_URL'] ?? null

/**
 * The one window, created on demand. Closing it normally only hides it, so the
 * loaded model survives; but if it ever does go away the menu bar has to be
 * able to bring a fresh one back.
 */
function ensureWindow(): BrowserWindow | null {
  if (!isReady) return null
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow

  const window = createWindow(join(__dirname, '../preload/index.js'), devServerUrl)

  window.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    window.hide()
    log('window', 'hidden; still running in the menu bar')
  })

  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })

  mainWindow = window
  return window
}

const actions = createActions(ensureWindow)

/** The STL among a set of command line arguments, if there is one. */
function stlFromArgv(argv: readonly string[]): string | null {
  const found = argv
    .slice(1)
    .find((arg) => !arg.startsWith('-') && isAbsolute(arg) && extname(arg).toLowerCase() === '.stl')
  return found ?? null
}

// Finder's "Open With" and dropping a file on the dock icon both arrive here,
// and can fire before the app is ready.
app.on('open-file', (event, path) => {
  event.preventDefault()
  actions.openPath(path)
})

app.on('second-instance', (_event, argv) => {
  const path = stlFromArgv(argv)
  if (path) actions.openPath(path)
  else actions.show()
})

void app.whenReady().then(async () => {
  await cleanupAllJobs()
  registerIpc()
  buildMenu(actions)
  createTray(actions)

  isReady = true
  const window = ensureWindow()
  if (window) actions.flushQueuedPath(window)

  const launchPath = stlFromArgv(process.argv)
  if (launchPath) actions.openPath(launchPath)

  void logSlicerStartup()

  app.on('activate', () => {
    actions.show()
  })
})

app.on('before-quit', () => {
  isQuitting = true
  // Kill any live slicer child and drop its temp directory before we go.
  cancelCurrentJobSync()
  destroyTray()
})

// Electron quits by default once the last window goes, even on macOS. This app
// keeps running in the menu bar instead, so that default has to be overridden.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
