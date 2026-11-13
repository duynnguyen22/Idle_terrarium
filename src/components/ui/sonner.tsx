import { Toaster as Sonner, type ToasterProps } from 'sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react'

/** shadcn Toaster. The app is light-only, so the next-themes lookup from upstream is dropped. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          // Botanical pill: the app's toast has always been a dark forest capsule.
          '--normal-bg': 'var(--primary)',
          '--normal-text': 'var(--primary-foreground)',
          '--normal-border': 'var(--primary)',
          '--border-radius': '9999px',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            'cn-toast !w-fit !mx-auto !left-0 !right-0 !px-4 !py-2 !text-xs !font-medium !shadow-lg',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
