/** Stroked line icons from the v6 prototype (24-unit viewBox, `.ic` style). */
export const ICONS = {
  sunrise: 'M12 2v4M4.9 8.9l1.4 1.4M2 16h2M20 16h2M17.7 10.3l1.4-1.4M17 16a5 5 0 0 0-10 0M2 20h20',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  sunset: 'M12 10V6M17 16a5 5 0 0 0-10 0M2 16h2M20 16h2M4.9 8.9l1.4 1.4M17.7 10.3l1.4-1.4M2 20h20',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  leaf: 'M5 19c0-8 5-14 15-15c0 10-6 15-14 15zM5 19l7-7',
  vol: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l4 6M21 9l-4 6',
  dice: 'M4 4h16v16H4zM8.5 8.5h.01M15.5 15.5h.01M12 12h.01',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 10a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z',
  auto: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5',
  jar: 'M8 3h8M7 6h10v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2zM7 11h10',
  sprout: 'M12 21v-9M12 12c0-4 3-6 7-6c0 4-3 6-7 6zM12 14c0-3-2-5-6-5c0 3 2 5 6 5z',
  rock: 'M3 18l3-8l5-3l6 2l4 9zM3 18h18',
  bug: 'M7 14a5 4 0 1 0 10 0a5 4 0 1 0-10 0zM8.5 9a1.5 1.5 0 1 0 .01 0M15.5 9a1.5 1.5 0 1 0 .01 0M5 18l-2 2M19 18l2 2',
  drop: 'M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z',
  waves:
    'M2 9c2 0 2-2 4-2s2 2 4 2s2-2 4-2s2 2 4 2s2-2 4-2M2 15c2 0 2-2 4-2s2 2 4 2s2-2 4-2s2 2 4 2s2-2 4-2',
  palm: 'M12 22V12M12 12c-2-3-6-3-8-1M12 12c2-3 6-3 8-1M12 12c-1-4 1-7 4-8M12 12c1-4-1-7-4-8',
  cactus: 'M12 21V5a2 2 0 0 1 4 0v8M12 15H9a2 2 0 0 1-2-2V9a1.5 1.5 0 0 1 3 0M8 21h8',
  hand: 'M8 12V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5L8 14',
  scissors: 'M6 4.5a2.5 2.5 0 1 0 .01 0M6 17a2.5 2.5 0 1 0 .01 0M8 8l12 10M8 16L20 6',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevronUp: 'M6 15l6-6l6 6',
  eraser: 'M4 16l9-9l7 7l-6 6H8zM10 20h10',
} as const

export type IconName = keyof typeof ICONS

export function LineIcon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONS[name]} />
    </svg>
  )
}
