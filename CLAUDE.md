# Rules for coding assistants

Botanica is a React + TypeScript + Vite + Jotai terrarium app.

- Follow `CONTRIBUTING.md` and `docs/ARCHITECTURE.md`.
- Run `pnpm verify` before you say work is done. Fix every failure.
- Never add an entry to `eslint.legacy.js`. You may only delete entries.
- Never edit test assertions during a refactor. Only import paths, mock paths and file locations may change.
- Keep files under 300 lines and functions under 80 lines.
- Do not leave re-exports at old locations when you move code.
- Do not change behavior, storage keys or saved JSON shapes unless asked.
