'use client'

import Link from 'next/link'
import { ChevronRight, Inbox, Lock } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

type PageProps = {
  /** Spec view reference (e.g. V04). Kept for traceability; not rendered. */
  viewId?: string
  features?: string[]
  sourceName?: string
  emptyTitle?: string
  emptyBody?: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  crumbs?: { label: string; href: string }[]
  forbidden?: boolean
  forbiddenBody?: string
  children: React.ReactNode
}

export function Page({ title, description, actions, crumbs, forbidden, forbiddenBody, children }: PageProps) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-4 md:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          {crumbs && crumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {crumbs.map((c) => (
                <span key={c.href} className="flex items-center gap-1">
                  <Link href={c.href} className="hover:text-foreground hover:underline">
                    {c.label}
                  </Link>
                  <ChevronRight aria-hidden className="size-3" />
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-xl font-semibold text-balance text-foreground">{title}</h1>
          {description && <div className="max-w-3xl text-sm leading-relaxed text-pretty text-muted-foreground">{description}</div>}
        </div>
        {actions && !forbidden && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {forbidden ? (
          <StateBlock
            icon={<Lock className="size-5" />}
            title="You don't have access to this page"
            body={forbiddenBody ?? 'This link points to content outside your permissions. No details about the record are shown. Ask an administrator if you believe you need access.'}
            action={
              <Link href="/dossier" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Go to Intelligence Dossier
              </Link>
            }
          />
        ) : (
          children
        )}
      </div>
    </div>
  )
}

export function StateBlock({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card p-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon ?? <Inbox className="size-5" />}</span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="max-w-md text-sm leading-relaxed text-muted-foreground">{body}</div>
      {action}
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>
}
