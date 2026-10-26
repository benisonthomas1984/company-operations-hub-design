'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Brand } from '@/components/shell/app-shell'
import { OrgCanvas } from '@/components/org/org-canvas'
import { useStore } from '@/lib/store'

export default function OrgChartPage() {
  const { ready, company, me } = useStore()
  const router = useRouter()

  useEffect(() => {
    if (ready && (!company || !me)) router.replace('/login')
  }, [ready, company, me, router])

  if (!ready || !company || !me) {
    return <main className="flex h-dvh items-center justify-center text-sm text-muted-foreground">Loading organization chart…</main>
  }

  const backHref = company.onboarding.done ? '/organization' : '/onboarding'

  return (
    <main className="flex h-dvh flex-col bg-background">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Brand />
          <span className="h-5 w-px bg-border" aria-hidden="true" />
          <h1 className="truncate text-sm font-semibold">{company.name} — Organization chart</h1>
        </div>
        <Link href={backHref} className="text-sm font-medium text-primary hover:underline">
          {company.onboarding.done ? 'Back to Organization' : 'Back to onboarding'}
        </Link>
      </header>
      <div className="min-h-0 flex-1">
        <OrgCanvas fullscreen />
      </div>
    </main>
  )
}
