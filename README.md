# Botanica — Living Biosphere

A browser-based terrarium simulator: a living canvas biosphere of plants, soil, water and weather, ported from a single-file HTML prototype to React 19, Vite, TypeScript, Tailwind v4 and Zustand.

| Script               | Purpose                            |
| -------------------- | ---------------------------------- |
| `pnpm run dev`        | Start the Vite dev server          |
| `pnpm run build`      | Typecheck and build for production |
| `pnpm run preview`    | Preview the production build       |
| `pnpm run test`       | Run unit tests once (Vitest)       |
| `pnpm run test:watch` | Run unit tests in watch mode       |
| `pnpm run lint`       | Lint with ESLint                   |
| `pnpm run typecheck`  | Typecheck with `tsc`               |
| `pnpm run format`     | Format with Prettier               |
| `pnpm run e2e`        | Run Playwright end-to-end tests    |

## Deploying

`pnpm run build` writes a static site to `dist/`; any static host works. The app has no server and no client-side router, so no rewrite rules are needed.

### Vercel

Import the repository, framework preset **Vite**, build command `pnpm run build`, output directory `dist`. No environment variables are needed (the base path defaults to `/`).

### Netlify

Build command `pnpm run build`, publish directory `dist`. No environment variables are needed.

### GitHub Pages

Project pages are served from `https://<user>.github.io/<repo>/`, so build with the base path set:

```sh
VITE_BASE_PATH=/<repo>/ pnpm run build
```

Then publish `dist/` (for example with `actions/upload-pages-artifact` and `actions/deploy-pages`, or by pushing it to a `gh-pages` branch). `VITE_BASE_PATH` is read in `vite.config.ts` as Vite's `base`; leave it unset for root-hosted sites.
