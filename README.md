# LONEWOLF OS

Hades's personal study rig. Offline-first PWA, hosted free on GitHub Pages.

## Tabs

- **Intel**: mission cards for each topic
- **Burner**: spaced-repetition flashcards
- **Blackbook**: write code or definitions blind, then compare
- **Terminal**: real PHP 8.2 and Python 3.12 in the browser, with missions
- **Breach log**: XP, rank, streak, daily contract, progress map
- **Forge**: build or update modules from packs or notes
- **Rig**: exams, contract, Gemini key, sync, backup
- **Ask AI**: copies your context and opens Claude, Gemini, ChatGPT or Copilot

## Updating the app

1. Edit files in VS Code.
2. Bump `VERSION` in `sw.js`.
3. Source Control: message, Commit, Sync Changes.

## Files

- `index.html` layout and styles
- `app.js` core (vault, modules, study tabs, Ask AI)
- `forge.js` Forge tab
- `rig.js` settings, Gemini, Supabase sync, backup
- `pwa.js` install button, online/offline, service worker registration
- `sw.js` offline cache
- `modules/` built-in modules (`index.json` lists them)
- `libs/` CodeMirror, marked, php-wasm, Pyodide, pdf.js, mammoth, supabase-js
- `docs/` setup guides
