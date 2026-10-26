'use client'

import type { AnalysisReport, CompanyData, Proposal } from '@/lib/fixtures'
import { KV, PersonLink, SimLabel } from '@/components/hub/primitives'
import { Field, TextArea, TextInput } from '@/components/hub/form'

export const ANALYSIS_CREDITS = 40

type ProposalInput = Pick<Proposal, 'title' | 'kind' | 'problem' | 'solution' | 'targetCustomer' | 'geography' | 'industry' | 'benefit' | 'timeline'> & { marketingPlan?: string; budgetDev?: number }

/** Calls the server-side AI analysis and returns a report ready to store on the proposal. */
export async function requestAnalysis(c: CompanyData, p: ProposalInput, rev: number, now: string): Promise<AnalysisReport> {
  const res = await fetch('/api/proposals/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...p,
      marketingPlan: p.marketingPlan ?? '',
      company: {
        name: c.name,
        products: (c.products ?? []).slice(0, 30).map((x) => ({ name: x.name, targetCustomers: x.targetCustomers, clients: x.clients.length, activeUsers: x.activeUsers })),
      },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.report) throw new Error(data.error ?? 'Analysis failed')
  return { ...data.report, rev, generatedAt: now, sources: [{ title: 'AI market analysis (model knowledge, not live data)', date: now.slice(0, 10) }], source: 'ai' }
}

const fmtRange = (r?: { low: number; base: number; high: number }) => (r ? `${r.low.toLocaleString()} / ${r.base.toLocaleString()} / ${r.high.toLocaleString()}` : '—')

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
        {aside}
      </h3>
      {children}
    </section>
  )
}

function Prose({ label, text }: { label: string; text?: string }) {
  if (!text) return null
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground text-pretty">{text}</p>
    </div>
  )
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-base font-semibold text-foreground">{value}</span>
      {note && <span className="text-xs leading-relaxed text-muted-foreground">{note}</span>}
    </div>
  )
}

/** Read-only, organized view of an AI analysis report. */
export function AnalysisView({ a }: { a: AnalysisReport }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <SimLabel>{a.source === 'ai' ? 'AI generated' : 'Sample report'}</SimLabel>
        <span>Revision {a.rev} · {a.generatedAt}</span>
        {a.editedBy && <span>· edited by <PersonLink id={a.editedBy} />{a.editedAt ? ` on ${a.editedAt}` : ''}</span>}
      </div>
      {a.summary && <p className="text-sm font-medium leading-relaxed text-foreground text-pretty">{a.summary}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Figure label="Existing customers to offer it to" value={a.currentCustomers ? a.currentCustomers.count.toLocaleString() : '—'} note={a.currentCustomers?.description} />
        <Figure label="Reachable customers (low / base / high)" value={fmtRange(a.users)} note={a.users.assumption} />
        <Figure label="New customers acquired (low / base / high)" value={fmtRange(a.newCustomers)} note={a.newCustomers?.assumption} />
      </div>
      <Prose label="Market" text={a.market} />
      <Prose label="Marketing plan impact" text={a.marketingImpact} />
      {a.competitors.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Competitors</span>
          <ul className="flex flex-col gap-1">
            {a.competitors.map((x) => (
              <li key={x.name} className="text-sm leading-relaxed text-foreground">
                <span className="font-medium">{x.name}</span> <span className="text-muted-foreground">— {x.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <dl className="grid gap-4 sm:grid-cols-2">
        <KV label="Adoption">{a.adoption}</KV>
        <KV label="Pricing">{a.pricing}</KV>
        <KV label="Delivery steps">{a.steps}</KV>
        <KV label="Staffing">{a.staffing}</KV>
        <KV label="Budget">{a.budget}</KV>
        <KV label="Risks">{a.risks}</KV>
      </dl>
      <Prose label="Recommendation" text={a.recommendation} />
      <p className="text-xs text-muted-foreground">{a.sources.map((s) => `${s.title} (${s.date})`).join(' · ')}</p>
    </div>
  )
}

/** Lets the author correct any part of the report before (re)submitting. */
export function AnalysisEditor({ value, onChange }: { value: AnalysisReport; onChange: (a: AnalysisReport) => void }) {
  const set = <K extends keyof AnalysisReport>(k: K, v: AnalysisReport[K]) => onChange({ ...value, [k]: v })
  const users = value.users
  const nc = value.newCustomers ?? { low: 0, base: 0, high: 0, assumption: '' }
  const cc = value.currentCustomers ?? { count: 0, description: '' }
  return (
    <div className="flex flex-col gap-4">
      <Field label="Summary"><TextArea rows={2} value={value.summary ?? ''} onChange={(e) => set('summary', e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <Field label="Existing customers"><TextInput type="number" min={0} value={cc.count} onChange={(e) => set('currentCustomers', { ...cc, count: num(e.target.value) })} /></Field>
        <Field label="Who they are"><TextInput value={cc.description} onChange={(e) => set('currentCustomers', { ...cc, description: e.target.value })} /></Field>
      </div>
      <RangeFields label="Reachable customers" value={users} onChange={(r) => set('users', r)} />
      <RangeFields label="New customers acquired" value={nc} onChange={(r) => set('newCustomers', r)} />
      <Field label="Market"><TextArea rows={3} value={value.market} onChange={(e) => set('market', e.target.value)} /></Field>
      <Field label="Marketing plan impact"><TextArea rows={3} value={value.marketingImpact ?? ''} onChange={(e) => set('marketingImpact', e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Adoption"><TextArea rows={2} value={value.adoption} onChange={(e) => set('adoption', e.target.value)} /></Field>
        <Field label="Pricing"><TextArea rows={2} value={value.pricing} onChange={(e) => set('pricing', e.target.value)} /></Field>
        <Field label="Staffing"><TextArea rows={2} value={value.staffing} onChange={(e) => set('staffing', e.target.value)} /></Field>
        <Field label="Budget"><TextArea rows={2} value={value.budget} onChange={(e) => set('budget', e.target.value)} /></Field>
      </div>
      <Field label="Risks"><TextArea rows={2} value={value.risks} onChange={(e) => set('risks', e.target.value)} /></Field>
      <Field label="Recommendation"><TextArea rows={2} value={value.recommendation ?? ''} onChange={(e) => set('recommendation', e.target.value)} /></Field>
    </div>
  )
}

type Range = { low: number; base: number; high: number; assumption: string }
const num = (v: string) => Math.max(0, Math.round(Number(v) || 0))

function RangeFields({ label, value: r, onChange: change }: { label: string; value: Range; onChange: (r: Range) => void }) {
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-medium text-foreground">{label} (low / base / high)</legend>
        <div className="grid grid-cols-3 gap-2">
          <TextInput type="number" min={0} aria-label={`${label} low`} value={r.low} onChange={(e) => change({ ...r, low: num(e.target.value) })} />
          <TextInput type="number" min={0} aria-label={`${label} base`} value={r.base} onChange={(e) => change({ ...r, base: num(e.target.value) })} />
          <TextInput type="number" min={0} aria-label={`${label} high`} value={r.high} onChange={(e) => change({ ...r, high: num(e.target.value) })} />
        </div>
        <TextInput aria-label={`${label} assumption`} placeholder="Assumption" value={r.assumption} onChange={(e) => change({ ...r, assumption: e.target.value })} />
      </fieldset>
    )
}

/** Everything the author submitted, grouped the same way on the proposal page and in approvals. */
export function ProposalDetails({ p, showAnalysis = true }: { p: Proposal; showAnalysis?: boolean }) {
  const budget = p.budgetMode === 'cash' && p.budgetDev ? `€${p.budgetDev.toLocaleString()}` : (p.effort ?? 'Effort only')
  return (
    <div className="flex flex-col gap-4">
      <Section title="Overview">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KV label="Type">{p.kind}</KV>
          <KV label="Author"><PersonLink id={p.authorId} showRole /></KV>
          <KV label="Development budget"><span className="font-mono">{budget}</span></KV>
          <KV label="Timeline">{p.timeline || '—'}</KV>
        </dl>
      </Section>
      <Section title="Market">
        <dl className="grid gap-4 sm:grid-cols-3">
          <KV label="Target customer">{p.targetCustomer || '—'}</KV>
          <KV label="Geography">{p.geography || '—'}</KV>
          <KV label="Industry">{p.industry || '—'}</KV>
        </dl>
      </Section>
      <Section title="The case">
        <Prose label="Problem" text={p.problem} />
        <Prose label="Proposed solution" text={p.solution} />
        <Prose label="Expected benefit" text={p.benefit} />
        <Prose label="Marketing plan" text={p.marketingPlan} />
        <Prose label="Risks" text={p.risks} />
      </Section>
      {showAnalysis && (
        <Section title="AI analysis">
          {p.analysis ? <AnalysisView a={p.analysis} /> : <p className="text-sm text-muted-foreground">No AI analysis was attached.</p>}
        </Section>
      )}
    </div>
  )
}
