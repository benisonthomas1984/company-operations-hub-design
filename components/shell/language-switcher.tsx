'use client'

import { Languages } from 'lucide-react'
import { useI18n, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const options: { value: Lang; short: string; name: string }[] = [
  { value: 'en', short: 'EN', name: 'English' },
  { value: 'es', short: 'ES', name: 'Español' },
]

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n()
  return (
    <div role="radiogroup" aria-label="Language / Idioma" translate="no" className={cn('flex h-8 items-center gap-0.5 rounded-md border border-border bg-card p-0.5', className)}>
      <Languages aria-hidden className="mx-1 size-3.5 text-muted-foreground" />
      {options.map((o) => {
        const active = lang === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.name}
            title={o.name}
            onClick={() => setLang(o.value)}
            className={cn(
              'h-full rounded px-1.5 font-mono text-[11px] font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {o.short}
          </button>
        )
      })}
    </div>
  )
}
