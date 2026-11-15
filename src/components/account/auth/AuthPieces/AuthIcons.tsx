import { type ReactNode } from 'react'

/** A 24-unit stroked icon. */
function Ic({ children }: { children: ReactNode }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const EyeIcon = () => (
  <Ic>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Ic>
)
export const EyeOffIcon = () => (
  <Ic>
    <path d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Ic>
)
export const MailIcon = () => (
  <Ic>
    <path d="M3 6h18v12H3z" />
    <path d="M3 7l9 6 9-6" />
  </Ic>
)
export const CheckIcon = () => (
  <Ic>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Ic>
)
