import { join } from 'node:path'
import { BrowserWindow, shell } from 'electron'

export function createWindow(preloadPath: string, rendererUrl: string | null): BrowserWindow {
  const window = new BrowserWindow({
    width: 820,
    height: 720,
    minWidth: 680,
    minHeight: 600,
    show: false,
    title: 'STL Time',
    backgroundColor: '#151517',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.once('ready-to-show', () => window.show())

  // Nothing in this app should ever open a second window or navigate away.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (rendererUrl) void window.loadURL(rendererUrl)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))

  return window
}
