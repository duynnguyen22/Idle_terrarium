# Botanica — Living Biosphere

A browser-based terrarium simulator: a living canvas biosphere of plants, soil, water and weather, ported from a single-file HTML prototype to React 19, Vite, TypeScript, Tailwind v4 and Zustand.

| Script               | Purpose                            |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Start the Vite dev server          |
| `npm run build`      | Typecheck and build for production |
| `npm run preview`    | Preview the production build       |
| `npm run test`       | Run unit tests once (Vitest)       |
| `npm run test:watch` | Run unit tests in watch mode       |
| `npm run lint`       | Lint with ESLint                   |
| `npm run typecheck`  | Typecheck with `tsc`               |
| `npm run format`     | Format with Prettier               |
| `npm run e2e`        | Run Playwright end-to-end tests    |

## Deploying

`npm run build` writes a static site to `dist/`; any static host works. The app has no server and no client-side router, so no rewrite rules are needed.

### Vercel

Import the repository, framework preset **Vite**, build command `npm run build`, output directory `dist`. No environment variables are needed (the base path defaults to `/`).

### Netlify

Build command `npm run build`, publish directory `dist`. No environment variables are needed.

### GitHub Pages

Project pages are served from `https://<user>.github.io/<repo>/`, so build with the base path set:

```sh
VITE_BASE_PATH=/<repo>/ npm run build
```

Then publish `dist/` (for example with `actions/upload-pages-artifact` and `actions/deploy-pages`, or by pushing it to a `gh-pages` branch). `VITE_BASE_PATH` is read in `vite.config.ts` as Vite's `base`; leave it unset for root-hosted sites.
