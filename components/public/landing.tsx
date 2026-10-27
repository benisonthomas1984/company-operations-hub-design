'use client'

import Link from 'next/link'
import { ArrowRight, Check, Lock } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { packages, fmtEUR } from '@/lib/fixtures'
import { useStore } from '@/lib/store'
import { Brand } from '@/components/shell/app-shell'
import { LanguageSwitcher } from '@/components/shell/language-switcher'
import { cn } from '@/lib/utils'

const trail = [
  { id: 'PRP-24', kind: 'Proposal', title: 'Supplier invoice inbox', state: 'Approved by board · 3/3' },
  { id: 'BLI-88', kind: 'Backlog item', title: 'Handwritten receipt support', state: 'Target 28 Nov committed' },
  { id: 'ACT-1042', kind: 'Activity', title: 'Connect accounting API', state: 'Accepted by reviewer' },
  { id: 'v2.0', kind: 'Release', title: 'Orion Receipt Reader v2.0', state: 'Released · current version' },
  { id: 'Oct 2026', kind: 'Product profit', title: '€10,000 revenue − €6,000 cost', state: '40% operating margin' },
]

const pillars = [
  { title: 'Structure you can edit', body: 'Draw departments and reporting lines on a canvas, invite people into real roles, and keep vacancies visible.' },
  { title: 'Work that proves itself', body: 'Activities carry owners, reviewers, evidence and agreed dates. Productivity is shown as evidence — never a single score.' },
  { title: 'Approvals with consequences', body: 'Proposals, backlog commitments, project stages, expenses and releases move only when every required approver agrees.' },
  { title: 'Private by design', body: 'Your mail and AI answers stay yours. Complaints reach only the committee. Nothing private is searchable by anyone else.' },
]

export function Landing() {
  const { session, setSignupDraft } = useStore()
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Brand />
        <nav aria-label="Account" className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="#pricing" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Pricing
          </Link>
          {session ? (
            <Link href="/dossier" className={buttonVariants({ size: 'sm' })}>
              Open workspace
            </Link>
          ) : (
            <Link href="/login" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Log in
            </Link>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-10 md:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-16">
          <div className="flex flex-col gap-5">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Company Operations Hub</p>
            <h1 className="text-4xl font-semibold leading-tight text-balance text-foreground md:text-5xl">One operating record, from idea to profit.</h1>
            <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
              Every proposal, approval, activity, release and expense is a single linked record. Change it once and every page that depends on it — project health,
              product profit, someone&apos;s productivity — updates with it.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="#pricing" className={buttonVariants({ size: 'lg' })}>
                Choose a package <ArrowRight />
              </Link>
              <Link href="/login" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                Explore the Comet Works demo
              </Link>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock aria-hidden className="size-3.5" /> Interactive prototype. Checkout, email and integrations are simulated; data stays in this browser.
            </p>
          </div>

          <ol aria-label="Example record trail" className="flex flex-col rounded-xl border border-border bg-card p-2 shadow-sm">
            {trail.map((t, i) => (
              <li key={t.id} className="relative flex items-start gap-3 rounded-lg px-3 py-3">
                <span className="flex flex-col items-center self-stretch">
                  <span aria-hidden className={cn('mt-1 size-2.5 rounded-full', i === trail.length - 1 ? 'bg-success' : 'bg-primary')} />
                  {i < trail.length - 1 && <span aria-hidden className="mt-1 w-px flex-1 bg-border" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-sm border border-border bg-muted px-1.5 font-mono text-[11px]">{t.id}</span>
                    {t.kind}
                  </span>
                  <span className="truncate text-sm font-medium text-foreground">{t.title}</span>
                  <span className="text-xs text-muted-foreground">{t.state}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="pillars" className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-px px-4 py-12 md:grid-cols-2 md:px-6 lg:grid-cols-4">
            <h2 id="pillars" className="sr-only">
              What it does
            </h2>
            {pillars.map((p) => (
              <div key={p.title} className="flex flex-col gap-2 p-4">
                <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" aria-labelledby="pricing-title" className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 md:px-6">
          <div className="flex flex-col gap-2">
            <h2 id="pricing-title" className="text-2xl font-semibold text-foreground">
              Packages
            </h2>
            <p className="text-sm text-muted-foreground">Monthly prices from the central product catalogue (simulated). Change or cancel anytime.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {packages.map((p) => (
              <article key={p.id} className={cn('flex flex-col gap-4 rounded-xl border bg-card p-5', p.highlight ? 'border-primary shadow-sm' : 'border-border')}>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
                  {p.highlight && <span className="text-xs font-medium text-primary">Full access</span>}
                </div>
                <p className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-foreground">{fmtEUR(p.price)}</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Up to {p.employees} employees · {p.aiCredits.toLocaleString('en')} AI credits / month
                </p>
                <ul className="flex flex-1 flex-col gap-2">
                  {p.limits.map((l) => (
                    <li key={l} className="flex items-start gap-2 text-sm text-foreground">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                      {l}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/signup?package=${p.id}`}
                  onClick={() => setSignupDraft({ packageId: p.id, interval: 'month' })}
                  className={buttonVariants({ variant: p.highlight ? 'default' : 'outline' })}
                >
                  Start with {p.name}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground md:px-6">
          <span>Company Operations Hub · design prototype</span>
          <span>All companies, people and figures are synthetic.</span>
        </div>
      </footer>
    </div>
  )
}
