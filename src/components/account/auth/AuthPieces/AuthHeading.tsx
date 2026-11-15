import { cn } from 'cn'
import { type ReactNode } from 'react'

/** The dialog's title; `acct-title` labels the dialog. */
export function AuthTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      id="acct-title"
      className="text-center font-heading text-[22px] font-bold tracking-[-0.01em] text-balance text-forest-ink"
    >
      {children}
    </h2>
  )
}

export function AuthSub({ children, center }: { children: ReactNode; center?: boolean }) {
  return (
    <p
      className={cn(
        'max-w-[34ch] text-[13px] leading-normal text-balance text-muted-foreground',
        center && 'justify-self-center text-center',
      )}
    >
      {children}
    </p>
  )
}

/** The centred line under a form: "New to Botanica? Create an account", "Back to sign in". */
export function AuthFoot({ children }: { children: ReactNode }) {
  return <p className="text-center text-[12.5px] text-muted-foreground">{children}</p>
}

/** The Botanica mark over a screen's title and optional subtitle. */
export function AuthHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="grid justify-items-center gap-2 text-center">
      <div className="mb-1 flex size-11 items-center justify-center rounded-[13px] bg-primary text-primary-foreground">
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" strokeLinejoin="round" />
          <path
            d="M12 22V12M12 12C12 9 15 7 17 8C17 11 15 12 12 12ZM12 12C12 9 9 7 7 8C7 11 9 12 12 12Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <AuthTitle>{title}</AuthTitle>
      {sub && <AuthSub>{sub}</AuthSub>}
    </div>
  )
}
