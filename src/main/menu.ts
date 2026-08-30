import { Menu, app, type BrowserWindow } from 'electron'
import { IPC, type MenuEvent } from '@shared/ipc.js'

export function buildMenu(getWindow: () => BrowserWindow | null): void {
  const send = (event: MenuEvent) => () => {
    const window = getWindow()
    if (window && !window.webContents.isDestroyed()) window.webContents.send(IPC.MENU_EVENT, event)
  }

  const menu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: send('open-settings') },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        { label: 'Open STL…', accelerator: 'CmdOrCtrl+O', click: send('open-file') },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    { label: 'Edit', submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }] },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { role: 'togglefullscreen' }],
    },
    { role: 'windowMenu' },
  ])

  Menu.setApplicationMenu(menu)
}
