# App Icons

electron-builder reads icons from this directory.

Required files (replace the placeholders before building):

| File | Platform | Minimum size |
|---|---|---|
| `icon.png` | Linux | 512×512 px |
| `icon.ico` | Windows | Multi-size ICO (16/32/48/64/128/256 px) |
| `icon.icns` | macOS | Multi-size ICNS |

## Quick icon generation from a single PNG

Install `electron-icon-builder` once:
```
npm install --save-dev electron-icon-builder
```

Then run (from `deckbuilder-desktop/`):
```
npx electron-icon-builder --input=assets/icon.png --output=assets/
```

This generates `icon.ico` and `icon.icns` from your source `icon.png`.

## electron-builder icon resolution

The `"icon": "assets/icon"` key in `package.json` is a *base path* — electron-builder
appends `.ico` / `.icns` / `.png` automatically per platform. Keep all three files in
this folder with the same basename (`icon`).
