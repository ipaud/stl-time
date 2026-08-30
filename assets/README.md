# Brand assets

`app-icon.svg` and `mark.svg` are the source of every icon in the project.
Everything else is generated from them.

| Source | Generates | Used for |
|--------|-----------|----------|
| `app-icon.svg` | `build/icon.png`, `build/icon.icns` | The app icon, in the Dock and in Finder |
| `mark.svg` | `src/renderer/assets/mark.svg` | The mark in the title bar and the empty state |
| `mark-menubar.svg` | `resources/trayTemplate.png`, `resources/trayTemplate@2x.png` | The menu bar icon |

`mark-menubar.svg` is `mark.svg` with one of the four plates removed and the
accent recoloured to black. Both changes are for the menu bar: a template image
has to be black plus alpha so macOS can recolour it, and the full four-plate
stack turns to mush at 16 px.

## Regenerating

Needs [`librsvg`](https://formulae.brew.sh/formula/librsvg) (`brew install librsvg`).

```bash
# App icon
rsvg-convert -w 1024 -h 1024 assets/app-icon.svg -o build/icon.png
mkdir -p build/icon.iconset
for s in 16 32 128 256 512; do
  rsvg-convert -w $s -h $s assets/app-icon.svg -o "build/icon.iconset/icon_${s}x${s}.png"
  rsvg-convert -w $((s*2)) -h $((s*2)) assets/app-icon.svg -o "build/icon.iconset/icon_${s}x${s}@2x.png"
done
iconutil -c icns build/icon.iconset -o build/icon.icns

# Menu bar template
rsvg-convert -h 16 assets/mark-menubar.svg -o resources/trayTemplate.png
rsvg-convert -h 32 assets/mark-menubar.svg -o resources/trayTemplate@2x.png
```

The committed PNGs were downscaled from a 128 px render with a slight alpha
curve so the gaps between plates survive; a straight `rsvg-convert -h 16` is
close enough if you are just iterating.
