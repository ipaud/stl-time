import { readFileSync } from 'node:fs'
import { Menu, Tray, app, nativeImage } from 'electron'
// The menu bar mark is a simplified, three-plate version of the app icon: the
// full four-plate stack turns to mush at 16 px.
import trayIcon from '../../resources/trayTemplate.png?asset'
import trayIcon2x from '../../resources/trayTemplate@2x.png?asset'
import type { Actions } from './actions.js'

let tray: Tray | null = null

export function createTray(actions: Actions): Tray {
  const image = nativeImage.createFromPath(trayIcon)
  // Paired explicitly rather than relying on @2x filename discovery, because
  // the bundler decides what the emitted files are called.
  image.addRepresentation({ scaleFactor: 2, buffer: readFileSync(trayIcon2x) })
  // Template images are recoloured by macOS to match the menu bar.
  image.setTemplateImage(true)

  tray = new Tray(image)
  tray.setToolTip('STL Time')

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open STL…', accelerator: 'Cmd+O', click: actions.openFile },
      { label: 'Show STL Time', click: () => actions.show() },
      { type: 'separator' },
      { label: 'Settings…', accelerator: 'Cmd+,', click: actions.openSettings },
      { type: 'separator' },
      { label: 'Quit STL Time', accelerator: 'Cmd+Q', click: () => app.quit() },
    ]),
  )

  // A left click is the fast path: show the window, or tuck it away again.
  tray.on('click', actions.toggle)

  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
