const pad2 = (n: number): string => String(n).padStart(2, '0')

export function formatClock(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

export function formatDepthMm(mm: number): string {
  return `${Math.round(mm)} mm`
}
