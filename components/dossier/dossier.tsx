'use client'

import { useRef, useState } from 'react'
import { ArrowUp, FileText, History, Lock, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useStore, type PerspectiveId } from '@/lib/store'
import { Callout, IdChip, SimLabel, SourceChip } from '@/components/hub/primitives'
import { fmtEUR, finance } from '@/lib/fixtures'
import { cn } from '@/lib/utils'

type Source = { id: string; title: string; type: string; freshness: string; state: 'ok' | 'stale' | 'down'; excerpt: string; href?: string }
type Answer = { body: React.ReactNode; sources: Source[]; confidence: 'High' | 'Medium' | 'Low'; warnings?: string[]; restricted?: string; credits: number }
type Turn = { id: string; q: string; a: Answer | 'loading' | 'exhausted' | 'cancelled' }

const SRC = {
  act1051: { id: 'ACT-1051', title: 'Launch messaging and pricing page', type: 'Activity', freshness: 'updated 24 Oct 11:22', state: 'ok', excerpt: 'Status: Blocked. Blocker: waiting on final release scope (BLI-88 execution approval).', href: '/activities?id=ACT-1051' },
  apr320: { id: 'APR-320', title: 'BLI-88 execution scope approval', type: 'Approval round', freshness: 'updated 23 Oct', state: 'ok', excerpt: 'Stage 1 Technical review (Noor) pending. Stage 2 Release board waiting on stage 1.', href: '/approvals?id=APR-320' },
  act1042: { id: 'ACT-1042', title: 'Connect accounting API', type: 'Activity', freshness: 'updated 24 Oct 09:40', state: 'ok', excerpt: 'Submitted — awaiting acceptance by Noor. Revised due 6 Nov (vendor sandbox delay).', href: '/activities?id=ACT-1042' },
  dec14: { id: 'DEC-14', title: 'Ship handwriting behind 70% threshold', type: 'Decision', freshness: '23 Oct', state: 'ok', excerpt: 'Decision captured from #prj-07 message by Noor.', href: '/communications?tab=decisions' },
  fin: { id: 'FIN-OCT-READER', title: 'Orion Receipt Reader · October contribution', type: 'Finance report', freshness: 'revenue feed 26h stale', state: 'stale', excerpt: 'Revenue €10,000 · attributable expense €6,000 (incl. €600 hosting allocation from EXP-5510) · contribution €4,000.', href: '/finance' },
  exp5510: { id: 'EXP-5510', title: 'Shared cloud hosting — allocation', type: 'Expense', freshness: 'settled 12 Oct', state: 'ok', excerpt: '€1,000 allocated 60/40: €600 Reader, €400 Ledger Sync (policy AP-2).', href: '/finance?tab=expenses' },
  mail: { id: 'msg_a91', title: 'Sandbox credentials for accounting API', type: 'My Mail (private to you)', freshness: '24 Oct 16:12', state: 'ok', excerpt: 'Keys rotate every 30 days; webhooks require X-Ledgerly-Signature header…', href: '/mail?m=msg_a91' },
  myacts: { id: 'ACT · Ana', title: 'Your assigned activities', type: 'Activities', freshness: 'live', state: 'ok', excerpt: 'ACT-1042 Submitted · ACT-1019 Reopened · ACT-1008 Accepted.', href: '/productivity' },
  sup: { id: 'SUP feed', title: 'Central support tickets (read-only)', type: 'Support source', freshness: 'last sync 6h ago · partial', state: 'stale', excerpt: '3 open tickets for Orion Receipt Reader in fixture; ticket history beyond 30 days not imported.', href: '/products/bps_orion_reader?tab=support' },
} satisfies Record<string, Source>

const promptsFor: Record<PerspectiveId, string[]> = {
  maya: ['What is blocking the Reader v2 release?', "What is Orion Receipt Reader's contribution this period?", 'How are support tickets trending for Reader?'],
  ravi: ['What is blocking the Reader v2 release?', "What is Orion Receipt Reader's contribution this period?"],
  noor: ['What is blocking the Reader v2 release?', 'How are support tickets trending for Reader?'],
  luca: ['What is blocking the Reader v2 release?', 'How are support tickets trending for Reader?'],
  ana: ['What are my open tasks and what is our product profit?', 'Summarize the vendor email about API credentials'],
  elena: ['Which announcements still need acknowledgment?'],
  nina: ["What is Orion Receipt Reader's contribution this period?"],
  sam: ['How are support tickets trending for Reader?'],
}

function answerFor(q: string, ctx: { pid: PerspectiveId; finance: boolean }): Answer {
  const s = q.toLowerCase()
  if (/mail|email|inbox/.test(s)) {
    if (ctx.pid !== 'ana' || /ana's|ana’s|her |his |their /.test(s)) {
      return { body: <p>I can&apos;t search or summarize another employee&apos;s private mailbox. Mail is visible only to its connected owner — no administrator or AI override exists.</p>, sources: [], confidence: 'High', restricted: 'Private mailbox excluded before retrieval', credits: 1 }
    }
    return {
      body: (
        <div className="flex flex-col gap-2">
          <p>Marta (Ledgerly) confirmed your sandbox is ready. Key points:</p>
          <ul className="list-disc pl-5">
            <li>API keys rotate every 30 days — schedule rotation before 23 Nov.</li>
            <li>Webhooks must verify the <code className="font-mono text-xs">X-Ledgerly-Signature</code> header.</li>
            <li>A quickstart PDF is attached.</li>
          </ul>
          <p className="text-xs text-muted-foreground">Private to you. This answer is not shared with anyone and does not enter company search.</p>
        </div>
      ),
      sources: [SRC.mail],
      confidence: 'High',
      credits: 3,
    }
  }
  if (/block|release|reader v2/.test(s)) {
    return {
      body: (
        <div className="flex flex-col gap-2">
          <p>Reader v2 (PRJ-07) has one hard blocker and one pending review:</p>
          <ol className="list-decimal pl-5">
            <li>
              <strong>APR-320</strong> — BLI-88 execution scope is waiting on stage 1 technical review by Noor. Until it completes, stage 2 (release board) cannot start.
            </li>
            <li>
              <strong>ACT-1051</strong> launch messaging is blocked on that final scope.
            </li>
            <li>
              <strong>ACT-1042</strong> is submitted and awaiting Noor&apos;s acceptance; ACT-1047 release testing depends on it.
            </li>
          </ol>
          <p>Related decision: DEC-14 ships handwriting behind a 70% confidence threshold.</p>
        </div>
      ),
      sources: [SRC.apr320, SRC.act1051, SRC.act1042, SRC.dec14],
      confidence: 'High',
      credits: 4,
    }
  }
  if (/profit|contribution|revenue|margin/.test(s)) {
    if (!ctx.finance) {
      const tasks = /task/.test(s)
      return {
        body: (
          <div className="flex flex-col gap-2">
            {tasks && (
              <>
                <p>Your open work:</p>
                <ul className="list-disc pl-5">
                  <li>ACT-1042 Connect accounting API — submitted, awaiting Noor (revised due 6 Nov)</li>
                  <li>ACT-1019 Retry logic for ledger webhook — reopened (QA-77)</li>
                </ul>
              </>
            )}
            <p>Product profit isn&apos;t available to you. Finance reports require finance authorization.</p>
          </div>
        ),
        sources: tasks ? [SRC.myacts] : [],
        confidence: 'High',
        restricted: 'Finance figures excluded — not shown, summarized or hinted',
        credits: 2,
      }
    }
    return {
      body: (
        <div className="flex flex-col gap-2">
          <p>
            For {finance.period}, Orion Receipt Reader contributed <strong className="font-mono">{fmtEUR(finance.reader.contribution)}</strong>:
          </p>
          <p className="font-mono text-sm">
            {fmtEUR(finance.reader.revenue)} revenue − {fmtEUR(finance.reader.attributableExpense)} attributable expense = {fmtEUR(finance.reader.contribution)}
          </p>
          <p>Attributable expense includes {fmtEUR(finance.reader.hostingAllocation)} of shared hosting (60% of EXP-5510). This is contribution, not net profit.</p>
        </div>
      ),
      sources: [SRC.fin, SRC.exp5510],
      confidence: 'Medium',
      warnings: ['Provisional — central revenue feed last refreshed 26 hours ago.'],
      credits: 4,
    }
  }
  if (/support|ticket/.test(s)) {
    return {
      body: <p>The support source shows 3 open tickets for Orion Receipt Reader, led by handwritten-total detection (SUP-4821, high priority). Trend beyond 30 days can&apos;t be computed — older history isn&apos;t imported.</p>,
      sources: [SRC.sup],
      confidence: 'Low',
      warnings: ['Partial — support feed synced 6h ago; history limited to 30 days.'],
      credits: 3,
    }
  }
  if (/announce|acknowledg/.test(s)) {
    return { body: <p>ANN-33 &ldquo;Open enrollment for 2027 benefits&rdquo; has 11 of 15 acknowledgments. 4 people haven&apos;t acknowledged yet.</p>, sources: [], confidence: 'High', credits: 2 }
  }
  return {
    body: <p>This prototype answers scripted questions only. Try one of the suggested prompts. In production, answers come from authorized operational sources with citations.</p>,
    sources: [],
    confidence: 'Low',
    credits: 0,
  }
}

export function Dossier() {
  const { perspective, can, aiCreditsUsed, aiCreditsLimit, spendAi, setAiExhausted } = useStore()
  const [turns, setTurns] = useState<Turn[]>([])
  const [q, setQ] = useState('')
  const [source, setSource] = useState<Source | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exhausted = aiCreditsUsed >= aiCreditsLimit

  const ask = (question: string) => {
    if (!question.trim()) return
    const id = `op_${Date.now()}`
    const answer = answerFor(question, { pid: perspective.id, finance: can('finance.read') })
    setQ('')
    setTurns((t) => [...t, { id, q: question, a: 'loading' }])
    timer.current = setTimeout(() => {
      const result = answer.credits === 0 ? 'charged' : spendAi(id, answer.credits)
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, a: result === 'exhausted' ? 'exhausted' : answer } : x)))
    }, 900)
  }

  const cancel = (id: string) => {
    if (timer.current) clearTimeout(timer.current)
    setTurns((t) => t.map((x) => (x.id === id ? { ...x, a: 'cancelled' } : x)))
  }

  const history = perspective.id === 'ana' ? ['Vendor email summary', 'My activities this week'] : perspective.id === 'maya' ? ['Board items needing my decision', 'Reader v2 blockers', 'October expense outliers'] : ['Reader v2 blockers']

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[220px_1fr]">
      <aside className="hidden flex-col gap-3 lg:flex" aria-label="Your private dossier history">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <History aria-hidden className="size-3.5" /> Your history
          </p>
          <ul className="flex flex-col gap-1">
            {history.map((h) => (
              <li key={h}>
                <button type="button" className="w-full truncate rounded px-2 py-1 text-left text-sm text-foreground hover:bg-muted" onClick={() => ask(h)}>
                  {h}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lock aria-hidden className="size-3" /> Private to {perspective.label.split(' ')[0]}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">AI allowance</span>
            <span className="font-mono text-foreground">
              {aiCreditsUsed.toLocaleString()}/{aiCreditsLimit.toLocaleString()}
            </span>
          </div>
          <Progress value={(aiCreditsUsed / aiCreditsLimit) * 100} aria-label="AI allowance used" />
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Company-wide, charged once per successful operation. Retries are not double-charged.</p>
          <label className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={exhausted} onChange={(e) => setAiExhausted(e.target.checked)} />
            Simulate exhausted allowance
          </label>
        </div>
      </aside>

      <section className="flex min-h-[560px] flex-col rounded-lg border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {turns.length === 0 ? (
            <div className="mx-auto flex max-w-2xl flex-col gap-6 py-8">
              <div className="flex flex-col gap-2">
                <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Sparkles aria-hidden className="size-4" />
                </span>
                <h2 className="text-2xl font-semibold text-balance text-foreground">Ask about Comet Works operations</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Answers use only records {perspective.label.split(' ')[0]} is authorized to see, with citations and freshness. Restricted information is excluded before retrieval — never summarized or hinted.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">Suggested for {perspective.role}</p>
                <div className="flex flex-col gap-2">
                  {promptsFor[perspective.id].map((p) => (
                    <button key={p} type="button" onClick={() => ask(p)} className="rounded-md border border-border bg-background px-3 py-2.5 text-left text-sm text-foreground hover:border-ring hover:bg-accent">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <SourceChip label="Activities" freshness="live" />
                <SourceChip label="Approvals" freshness="live" />
                <SourceChip label="Finance" freshness={can('finance.read') ? '26h stale' : 'not authorized'} state={can('finance.read') ? 'stale' : 'down'} />
                <SourceChip label="Support feed" freshness="6h" state="stale" />
                {perspective.id === 'ana' && <SourceChip label="My Mail" freshness="private" />}
              </div>
            </div>
          ) : (
            <ol className="mx-auto flex max-w-3xl flex-col gap-6">
              {turns.map((t) => (
                <li key={t.id} className="flex flex-col gap-3">
                  <p className="self-end rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">{t.q}</p>
                  {t.a === 'loading' && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
                      <span className="size-2 animate-pulse rounded-full bg-info" />
                      Retrieving authorized sources…
                      <Button variant="ghost" size="xs" onClick={() => cancel(t.id)}>
                        <X /> Cancel
                      </Button>
                    </div>
                  )}
                  {t.a === 'cancelled' && <p className="text-sm text-muted-foreground">Cancelled. No allowance was charged.</p>}
                  {t.a === 'exhausted' && (
                    <Callout tone="warning" title="AI allowance exhausted">
                      No answer was generated and nothing was charged. Your company admin can review usage in Subscription &amp; Integrations. Non-AI features keep working.
                    </Callout>
                  )}
                  {typeof t.a === 'object' && <AnswerCard a={t.a} onSource={setSource} />}
                </li>
              ))}
            </ol>
          )}
        </div>
        <form
          className="border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault()
            ask(q)
          }}
        >
          <div className="flex items-end gap-2 rounded-lg border border-input bg-background p-2 focus-within:border-ring">
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
              placeholder="Ask about people, work, approvals, products…"
              className="max-h-32 min-h-8 flex-1 resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="icon" aria-label="Ask" disabled={!q.trim()}>
              <ArrowUp />
            </Button>
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <SimLabel>Scripted answers</SimLabel> No live AI model is connected in this prototype.
          </p>
        </form>
      </section>

      <Sheet open={!!source} onOpenChange={(o) => !o && setSource(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {source && (
            <>
              <SheetHeader>
                <SheetTitle>{source.title}</SheetTitle>
                <SheetDescription>
                  {source.type} · {source.id}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4">
                <SourceChip label="Freshness" freshness={source.freshness} state={source.state} />
                <blockquote className="border-l-2 border-border pl-3 text-sm leading-relaxed text-foreground">{source.excerpt}</blockquote>
                {source.href && (
                  <a href={source.href} className="text-sm font-medium text-info hover:underline">
                    Open source record
                  </a>
                )}
                <p className="text-xs leading-relaxed text-muted-foreground">Permission re-checked when opened. If your access changes, this citation will stop resolving.</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function AnswerCard({ a, onSource }: { a: Answer; onSource: (s: Source) => void }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
      <div className="text-sm leading-relaxed text-foreground">{a.body}</div>
      {a.warnings?.map((w) => (
        <Callout key={w} tone="warning" title={w} />
      ))}
      {a.restricted && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock aria-hidden className="size-3" /> {a.restricted}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {a.sources.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSource(s)}
            className={cn('inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-xs hover:border-ring', s.state === 'stale' ? 'border-warning/40 bg-warning/10' : 'border-border bg-card')}
          >
            <span className="font-mono text-[10px] text-muted-foreground">[{i + 1}]</span>
            <FileText aria-hidden className="size-3 text-muted-foreground" />
            <span className="font-mono text-foreground">{s.id}</span>
          </button>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground">
          Confidence: {a.confidence} · {a.credits} credits
        </span>
      </div>
    </article>
  )
}
