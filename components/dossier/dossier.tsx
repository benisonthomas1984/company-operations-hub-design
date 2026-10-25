'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowUp, Lock, Sparkles, Trash2 } from 'lucide-react'
import type { CompanyData, Employee } from '@/lib/fixtures'
import { fmtEUR, PERIOD } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { canSeeActivity, dueOf, empOf, isOpen, isOverdue, pendingFor, productFinance, projectHealth } from '@/lib/derive'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Callout, IdChip, Panel, SourceChip } from '@/components/hub/primitives'
import { Page } from '@/components/hub/page'

type Source = { id: string; label: string; href: string }
type Answer = { lines: React.ReactNode[]; sources: Source[]; restricted?: string; empty?: boolean }

const CREDITS_PER_QUESTION = 2

function answer(c: CompanyData, me: Employee, q: string, caps: { finance: boolean; caseHandler: boolean }): Answer {
  const t = q.toLowerCase()
  const visible = c.activities.filter((a) => canSeeActivity(c, me, a))

  if (/(contribution|revenue|profit|finance|margin|cost)/.test(t)) {
    if (!caps.finance) return { lines: [], sources: [], restricted: 'Finance figures are limited to finance readers. No amounts were used to compose this answer.' }
    const rows = c.products.map((p) => ({ p, f: productFinance(c, p.id) })).filter((x) => x.f.hasRevenue || x.f.totalExpense > 0)
    if (!rows.length) return { lines: [`No recognized revenue or approved expense is recorded for ${PERIOD.label}.`], sources: [], empty: true }
    return {
      lines: rows.map(({ p, f }) => (
        <span key={p.id}>
          <strong className="text-foreground">{p.name}</strong>: {fmtEUR(f.recognized)} recognized − {fmtEUR(f.totalExpense)} attributable expense ={' '}
          <strong className="font-mono text-foreground">{fmtEUR(f.operatingProfit)}</strong> contribution.
          {f.pending.length > 0 && ` ${f.pending.length} pending expense(s) are excluded until approved.`}
        </span>
      )),
      sources: rows.map(({ p }) => ({ id: p.id, label: `${p.name} · ${PERIOD.short}`, href: `/finance?product=${p.id}` })),
    }
  }

  if (/(approv|waiting on me|decide)/.test(t)) {
    const mine = pendingFor(c, me.id, caps.caseHandler)
    if (!mine.length) return { lines: ['Nothing is waiting on your decision right now.'], sources: [], empty: true }
    return {
      lines: mine.map((r) => (
        <span key={r.id}>
          <strong className="text-foreground">{r.itemTitle}</strong> ({r.itemType}, round {r.round}) submitted by {empOf(c, r.submittedBy)?.fullName ?? 'someone'} on {r.submittedAt.slice(0, 10)}.
        </span>
      )),
      sources: mine.map((r) => ({ id: r.id, label: r.itemTitle, href: `/approvals?id=${r.id}` })),
    }
  }

  if (/(block|risk|stuck)/.test(t)) {
    const blocked = visible.filter((a) => a.status === 'Blocked')
    const risky = c.projects.filter((p) => p.status !== 'Closed').map((p) => ({ p, h: projectHealth(c, p) })).filter((x) => x.h.value !== 'On track')
    if (!blocked.length && !risky.length) return { lines: ['No blocked activities or at-risk projects in your scope.'], sources: [], empty: true }
    return {
      lines: [
        ...blocked.map((a) => (
          <span key={a.id}>
            <strong className="text-foreground">{a.title}</strong> is blocked{a.blocker ? `: ${a.blocker}` : '.'} Owner {empOf(c, a.ownerId)?.fullName}.
          </span>
        )),
        ...risky.map(({ p, h }) => (
          <span key={p.id}>
            Project <strong className="text-foreground">{p.name}</strong> is {h.value.toLowerCase()} — {h.reasons[0] ?? 'see project'}.
          </span>
        )),
      ],
      sources: [...blocked.map((a) => ({ id: a.id, label: a.title, href: `/activities?id=${a.id}` })), ...risky.map(({ p }) => ({ id: p.id, label: p.name, href: `/projects/${p.id}` }))],
    }
  }

  if (/(overdue|late|due)/.test(t)) {
    const late = visible.filter(isOverdue)
    if (!late.length) return { lines: ['Nothing in your scope is overdue.'], sources: [], empty: true }
    return {
      lines: late.map((a) => (
        <span key={a.id}>
          <strong className="text-foreground">{a.title}</strong> was due {dueOf(a)} ({a.status}) — {empOf(c, a.ownerId)?.fullName}.
        </span>
      )),
      sources: late.map((a) => ({ id: a.id, label: a.title, href: `/activities?id=${a.id}` })),
    }
  }

  const mine = c.activities.filter((a) => a.ownerId === me.id && isOpen(a))
  if (!mine.length) return { lines: ['You have no open activities. Ask about approvals, blockers, overdue work or product contribution.'], sources: [], empty: true }
  return {
    lines: mine.map((a) => (
      <span key={a.id}>
        <strong className="text-foreground">{a.title}</strong> — {a.status}, due {dueOf(a)}.
      </span>
    )),
    sources: mine.map((a) => ({ id: a.id, label: a.title, href: `/activities?id=${a.id}` })),
  }
}

export function Dossier() {
  const { company: c, me, can, priv, setPriv, spendAi } = useHub()
  const [q, setQ] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const caps = { finance: can('finance.read'), caseHandler: can('complaints.case') }
  const prompts = ['What is waiting on my approval?', 'What is blocked right now?', 'What is overdue?', ...(caps.finance ? [`What is each product's contribution in ${PERIOD.short}?`] : []), 'What are my open activities?']
  const left = Math.max(0, c.credits.limit - c.credits.used)

  const ask = (text: string) => {
    const question = text.trim()
    if (!question) return
    const opId = `dossier-${me.id}-${priv.dossier.length}-${question}`
    const res = spendAi(opId, CREDITS_PER_QUESTION)
    if (res === 'exhausted') {
      setNotice('Your company has used all AI credits for this period. Records remain available in each module; an owner can add credits under Settings → Subscription.')
      return
    }
    setNotice(null)
    setPriv((p) => ({ ...p, dossier: [...p.dossier, { id: opId, q: question, credits: res === 'charged' ? CREDITS_PER_QUESTION : 0 }] }))
    setQ('')
  }

  return (
    <Page
      title="Intelligence Dossier"
      description={`Ask about ${c.name}. Answers are composed only from records you're allowed to see, and every claim links to its source. Your history is private to you.`}
      actions={
        priv.dossier.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setPriv((p) => ({ ...p, dossier: [] }))}>
            <Trash2 aria-hidden /> Clear history
          </Button>
        )
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          {priv.dossier.length === 0 && (
            <Panel title="Start with a question">
              <div className="flex flex-wrap gap-2">
                {prompts.map((p) => (
                  <Button key={p} size="sm" variant="outline" onClick={() => ask(p)}>
                    {p}
                  </Button>
                ))}
              </div>
            </Panel>
          )}

          <ol className="flex flex-col gap-4" aria-live="polite">
            {priv.dossier.map((turn) => {
              const a = answer(c, me, turn.q, caps)
              return (
                <li key={turn.id} className="flex flex-col gap-2">
                  <p className="self-end rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">{turn.q}</p>
                  <article className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                    <header className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles aria-hidden className="size-3.5 text-info" />
                      <span>Composed from live records · {turn.credits ? `${turn.credits} credits` : 'no charge (repeat)'}</span>
                    </header>
                    {a.restricted ? (
                      <Callout tone="muted" title="Restricted" icon={<Lock className="size-4" />}>
                        {a.restricted}
                      </Callout>
                    ) : (
                      <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm leading-relaxed text-muted-foreground">
                        {a.lines.map((l, i) => (
                          <li key={i}>{l}</li>
                        ))}
                      </ul>
                    )}
                    {a.sources.length > 0 && (
                      <footer className="flex flex-wrap gap-2 border-t border-border pt-3">
                        {a.sources.map((s) => (
                          <Link key={s.id} href={s.href} className="flex items-center gap-1.5 text-xs text-info hover:underline">
                            <IdChip>{s.id}</IdChip>
                            <span className="max-w-48 truncate">{s.label}</span>
                          </Link>
                        ))}
                      </footer>
                    )}
                  </article>
                </li>
              )
            })}
          </ol>

          {notice && <Callout tone="warning" title="AI credits exhausted">{notice}</Callout>}

          <form
            className="sticky bottom-4 flex items-end gap-2 rounded-lg border border-border bg-card p-2 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault()
              ask(q)
            }}
          >
            <label htmlFor="dossier-q" className="sr-only">
              Ask the dossier
            </label>
            <textarea
              id="dossier-q"
              rows={1}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault()
                  ask(q)
                }
              }}
              placeholder="Ask about activities, approvals, projects or products…"
              className="min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="icon" disabled={!q.trim()} aria-label="Ask">
              <ArrowUp aria-hidden />
            </Button>
          </form>
        </div>

        <aside className="flex flex-col gap-4">
          <Panel title="AI credits">
            <div className="flex flex-col gap-2">
              <Progress value={(c.credits.used / c.credits.limit) * 100} aria-label="Credits used" />
              <p className="text-sm text-muted-foreground">
                <span className="font-mono text-foreground">{left}</span> of {c.credits.limit} left this period · {CREDITS_PER_QUESTION} per question. Repeats are free.
              </p>
            </div>
          </Panel>
          <Panel title="What it can read">
            <div className="flex flex-col gap-2">
              <SourceChip label="Activities in your scope" freshness="live" />
              <SourceChip label="Approvals naming you" freshness="live" />
              <SourceChip label="Projects" freshness="live" />
              <SourceChip label="Product finance" freshness={caps.finance ? 'live' : 'restricted'} state={caps.finance ? 'ok' : 'down'} />
            </div>
          </Panel>
        </aside>
      </div>
    </Page>
  )
}
