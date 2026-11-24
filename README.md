# LONEWOLF OS

Hades's personal study rig. Offline-first PWA.

## Tabs
- **Intel**: mission cards for each topic
- **Burner**: spaced-repetition flashcards
- **Blackbook**: write code blind, then compare
- **Terminal**: real PHP 8.2 in the browser, with missions
- **Breach log**: XP, rank, streak, progress map
- **Ask AI**: copies your context and opens Claude, Gemini, ChatGPT or Copilot

## Run locally
Open the folder in VS Code and click **Go Live** (Live Server extension).

## Updating
After changing any file, bump `VERSION` in `sw.js` so installed copies refresh.

## Structure
- `index.html` layout and styles
- `app.js` app logic
- `pwa.js` install button, online/offline, service worker registration
- `sw.js` offline cache
- `modules/` study modules (`index.json` lists them)
- `libs/` CodeMirror, marked, php-wasm
- `icons/` wolf icons
