import { Menu, app } from 'electron'
import type { Actions } from './actions.js'

export function buildMenu(actions: Actions): void {
  const menu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: actions.openSettings },
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
        { label: 'Open STL…', accelerator: 'CmdOrCtrl+O', click: actions.openFile },
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
