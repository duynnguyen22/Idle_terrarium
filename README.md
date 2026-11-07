# Botanica — Living Biosphere

A browser-based terrarium simulator: a living canvas biosphere of plants, soil, water and weather, ported from a single-file HTML prototype to React 19, Vite, TypeScript, Tailwind v4 and Zustand.

| Script               | Purpose                            |
| -------------------- | ---------------------------------- |
| `pnpm dev`        | Start the Vite dev server          |
| `pnpm build`      | Typecheck and build for production |
| `pnpm preview`    | Preview the production build       |
| `pnpm test`       | Run unit tests once (Vitest)       |
| `pnpm test:watch` | Run unit tests in watch mode       |
| `pnpm lint`       | Lint with ESLint                   |
| `pnpm typecheck`  | Typecheck with `tsc`               |
| `pnpm format`     | Format with Prettier               |
| `pnpm e2e`           | Run Playwright end-to-end tests    |

## Deploying

`pnpm build` writes a static site to `dist/`; any static host works. The app has no server and no client-side router, so no rewrite rules are needed.

### Vercel

Import the repository, framework preset **Vite**, build command `pnpm build`, output directory `dist`. No environment variables are needed (the base path defaults to `/`).

### Netlify

Build command `pnpm build`, publish directory `dist`. No environment variables are needed.

### GitHub Pages

Project pages are served from `https://<user>.github.io/<repo>/`, so build with the base path set:

```sh
VITE_BASE_PATH=/<repo>/ pnpm build
```

Then publish `dist/` (for example with `actions/upload-pages-artifact` and `actions/deploy-pages`, or by pushing it to a `gh-pages` branch). `VITE_BASE_PATH` is read in `vite.config.ts` as Vite's `base`; leave it unset for root-hosted sites.
