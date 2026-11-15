import { useStore } from 'jotai'
import { Button } from '@/components/ui/button'
import { useAuthEnv } from '../authEnv'
import { viewDataAtom } from '@/services/account'

/** Google and Apple buttons; both open the provider consent screen. */
export function Providers({ mode }: { mode: 'signin' | 'signup' }) {
  const store = useStore()
  const { account } = useAuthEnv()
  const verb = mode === 'signup' ? 'Sign up' : 'Continue'
  const go = (provider: string) => {
    account.goView('provider', { provider, email: store.get(viewDataAtom).email ?? '' })
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          ['Google', 'G'],
          ['Apple', 'A'],
        ] as const
      ).map(([provider, mono]) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          size="lg"
          className="h-10 bg-white text-forest-ink"
          onClick={() => go(provider)}
        >
          <span
            className="inline-flex size-5.5 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-primary"
            aria-hidden="true"
          >
            {mono}
          </span>
          {`${verb} with ${provider}`}
        </Button>
      ))}
    </div>
  )
}
