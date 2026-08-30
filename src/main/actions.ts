import { extname } from 'node:path'
import type { BrowserWindow } from 'electron'
import { IPC, type MenuEvent } from '@shared/ipc.js'

/**
 * The three things both the app menu and the menu bar icon can ask for. They
 * are routed to the renderer, which owns the file dialog and the settings
 * sheet, so there is exactly one implementation of each.
 */
export function createActions(getWindow: () => BrowserWindow | null) {
  const show = (): BrowserWindow | null => {
    const window = getWindow()
    if (!window) return null
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
    return window
  }

  const send = (event: MenuEvent) => (): void => {
    const window = show()
    if (window && !window.webContents.isDestroyed()) window.webContents.send(IPC.MENU_EVENT, event)
  }

  /** Held until the renderer is ready, so a launch-time file is not lost. */
  let queuedPath: string | null = null

  const deliver = (window: BrowserWindow, path: string): void => {
    if (!window.webContents.isDestroyed()) window.webContents.send(IPC.OPEN_PATH, path)
  }

  return {
    show,

    /** A path from Finder, the dock, or the command line. */
    openPath: (path: string): void => {
      if (extname(path).toLowerCase() !== '.stl') return
      const window = show()
      if (!window) {
        queuedPath = path
        return
      }
      if (window.webContents.isLoading()) {
        window.webContents.once('did-finish-load', () => deliver(window, path))
      } else {
        deliver(window, path)
      }
    },

    /** Called once the window exists, to flush anything that arrived first. */
    flushQueuedPath: (window: BrowserWindow): void => {
      if (!queuedPath) return
      const path = queuedPath
      queuedPath = null
      window.webContents.once('did-finish-load', () => deliver(window, path))
    },

    openFile: send('open-file'),
    openSettings: send('open-settings'),
    toggle: (): void => {
      const window = getWindow()
      if (!window) return
      if (window.isVisible() && !window.isMinimized() && window.isFocused()) window.hide()
      else show()
    },
  }
}

export type Actions = ReturnType<typeof createActions>
