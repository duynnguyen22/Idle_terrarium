import { useEffect, useState } from 'react'

const pad = (n: number) => String(n).padStart(2, '0')

export function formatClock(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Local wall-clock `HH:MM:SS`, refreshed every second. */
export function useLocalClock(): string {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return formatClock(now)
}
