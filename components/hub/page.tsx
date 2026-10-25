'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Inbox, Lock, RefreshCw, Unplug } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Callout } from './primitives'

export const PAGE_STATES = [
  { id: 'populated', label: 'Populated' },
  { id: 'loading', label: 'Loading' },
  { id: 'empty', label: 'Empty' },
  { id: 'validation', label: 'Validation error' },
  { id: 'unavailable', label: 'Source unavailable' },
  { id: 'forbidden', label: 'Forbidden / direct link' },
  { id: 'success', label: 'Success' },
  { id: 'stale', label: 'Stale / partial' },
] as const

export type PageState = (typeof PAGE_STATES)[number]['id']

type PageProps = {
  viewId: string
  title: string
  description?: string
  features: string[]
  actions?: React.ReactNode
  emptyTitle?: string
  emptyBody?: string
  sourceName?: string
  forbidden?: boolean
  forbiddenBody?: string
  children: React.ReactNode
}

export function Page({ viewId, title, description, features, actions, emptyTitle, emptyBody, sourceName = 'Source', forbidden, forbiddenBody, children }: PageProps) {
  const [state, setState] = useState<PageState>('populated')
  const effective: PageState = forbidden ? 'forbidden' : state

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-col gap-3 border-b border-border bg-card px-6 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span>{viewId}</span>
            {features.map((f) => (
              <span key={f} className="rounded-sm bg-muted px-1">
                {f}
              </span>
            ))}
          </div>
          <h1 className="text-xl font-semibold text-balance text-foreground">{title}</h1>
          {description && <p className="max-w-3xl text-sm leading-relaxed text-pretty text-muted-foreground">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="whitespace-nowrap">State preview</span>
            <select
              value={state}
              onChange={(e) => setState(e.target.value as PageState)}
              className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground"
            >
              {PAGE_STATES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-6">
        {effective === 'loading' && <LoadingState />}
        {effective === 'empty' && (
          <StateBlock icon={<Inbox className="size-5" />} title={emptyTitle ?? 'Nothing here yet'} body={emptyBody ?? 'When records exist for your authorized scope they will appear here.'} />
        )}
        {effective === 'unavailable' && (
          <StateBlock
            icon={<Unplug className="size-5" />}
            title={`${sourceName} is unavailable`}
            body="Last successful refresh: 24 Oct 2026, 16:40. Figures are not shown as zero — they are unknown until the source responds. Contract dependency: central integration capability."
            action={
              <Button variant="outline" size="sm" onClick={() => setState('populated')}>
                <RefreshCw className="size-3.5" /> Retry
              </Button>
            }
          />
        )}
        {effective === 'forbidden' && (
          <StateBlock
            icon={<Lock className="size-5" />}
            title="You don't have access to this page"
            body={forbiddenBody ?? 'This link points to content outside your permissions. No details about the record are shown. Ask an administrator if you believe you need access.'}
            action={
              <Link href="/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Go to Intelligence Dossier
              </Link>
            }
          />
        )}
        {(effective === 'populated' || effective === 'validation' || effective === 'success' || effective === 'stale') && (
          <>
            {effective === 'validation' && (
              <Callout tone="danger" title="2 fields need attention before saving">
                Target period is required. Acceptance criteria must contain at least one measurable condition.
              </Callout>
            )}
            {effective === 'success' && <Callout tone="success" title="Changes saved">Revision recorded in the audit history with your name and time.</Callout>}
            {effective === 'stale' && (
              <Callout tone="warning" title="Partial data — one source is stale">
                {sourceName} last refreshed 26 hours ago. Affected figures are marked provisional; nothing is treated as zero.
              </Callout>
            )}
            {children}
          </>
        )}
      </div>
    </div>
  )
}

function StateBlock({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card p-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-1/3" />
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}
