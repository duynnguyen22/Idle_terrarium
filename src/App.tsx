import { TerrariumCanvas } from '@/components/stage/TerrariumCanvas'
import { loadFallsLake } from '@/dev/loadFallsLake'

export default function App() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-parchment text-ink">
      <TerrariumCanvas />
      <h1 className="sr-only">Botanica</h1>
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={loadFallsLake}
          className="absolute left-4 top-4 rounded-md bg-forest-deep px-3 py-1.5 font-mono text-xs text-parchment"
        >
          Falls Lake (dev)
        </button>
      )}
    </main>
  )
}
