'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Lock, Save, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import type { AnalysisReport, Proposal } from '@/lib/fixtures'
import { Callout, IdChip, Panel, StatusPill } from '@/components/hub/primitives'
import { Field, PeoplePicker, Select, TextArea, TextInput, required, useForm } from '@/components/hub/form'
import { StateBlock } from '@/components/hub/page'
import { buildRound } from '@/components/approvals/approvals'
import { ANALYSIS_CREDITS, AnalysisEditor, requestAnalysis } from '@/components/company/proposal-report'

const stamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

export const proposalEditable = (p: Proposal, meId: string) => p.authorId === meId && (p.status === 'Draft' || p.status === 'Changes requested')

type Values = {
  title: string
  kind: string
  idea: string
  problem: string
  solution: string
  targetCustomer: string
  geography: string
  industry: string
  benefit: string
  marketingPlan: string
  steps: string
  skills: string
  dependencies: string
  timeline: string
  risks: string
  budgetMode: string
  budgetDev: string
  budgetOngoing: string
  effort: string
  productId: string
}

const toValues = (p?: Proposal): Values => ({
  title: p?.title ?? '',
  kind: p?.kind ?? 'Product',
  idea: p?.idea ?? '',
  problem: p?.problem ?? '',
  solution: p?.solution ?? '',
  targetCustomer: p?.targetCustomer ?? '',
  geography: p?.geography ?? '',
  industry: p?.industry ?? '',
  benefit: p?.benefit ?? '',
  marketingPlan: p?.marketingPlan ?? '',
  steps: p?.steps ?? '',
  skills: p?.skills ?? '',
  dependencies: p?.dependencies ?? '',
  timeline: p?.timeline ?? '',
  risks: p?.risks ?? '',
  budgetMode: p?.budgetMode ?? 'cash',
  budgetDev: p?.budgetDev != null ? String(p.budgetDev) : '',
  budgetOngoing: p?.budgetOngoing != null ? String(p.budgetOngoing) : '',
  effort: p?.effort ?? '',
  productId: p?.productId ?? '',
})

const num = (v: string) => (v.trim() === '' ? undefined : Number(v))

function applyValues(t: Proposal, v: Values) {
  t.title = v.title.trim()
  t.kind = v.kind as Proposal['kind']
  t.idea = v.idea
  t.problem = v.problem
  t.solution = v.solution
  t.targetCustomer = v.targetCustomer
  t.geography = v.geography
  t.industry = v.industry
  t.benefit = v.benefit
  t.marketingPlan = v.marketingPlan
  t.steps = v.steps
  t.skills = v.skills
  t.dependencies = v.dependencies
  t.timeline = v.timeline
  t.risks = v.risks
  t.budgetMode = v.budgetMode as Proposal['budgetMode']
  t.budgetDev = v.budgetMode === 'cash' ? num(v.budgetDev) : undefined
  t.budgetOngoing = v.budgetMode === 'cash' ? num(v.budgetOngoing) : undefined
  t.effort = v.budgetMode === 'effort' ? v.effort : undefined
  t.productId = v.productId || undefined
}

export function ProposalEditorPage({ id }: { id?: string }) {
  const { company: c, me } = useHub()
  if (!id) return <ProposalEditor />
  const p = c.proposals.find((x) => x.id === id)
  if (!p) return <StateBlock title="Proposal not found" body={`No proposal with id ${id}.`} action={<Link href="/proposals" className={buttonVariants({ variant: 'outline' })}>Back to proposals</Link>} />
  if (!proposalEditable(p, me.id))
    return (
      <StateBlock
        icon={<Lock className="size-5" />}
        title={p.authorId === me.id ? `This proposal is ${p.status.toLowerCase()}` : 'Only the author can edit this proposal'}
        body={p.authorId === me.id ? 'Once a proposal is submitted it is locked. If approvers request changes, it opens for editing again.' : 'You can view it and its approval from the proposals page.'}
        action={<Link href={`/proposals?id=${p.id}`} className={buttonVariants({ variant: 'outline' })}>View proposal</Link>}
      />
    )
  return <ProposalEditor key={p.id} existing={p} />
}

function ProposalEditor({ existing }: { existing?: Proposal }) {
  const { company: c, mutate } = useHub()
  const router = useRouter()
  const f = useForm<Values>(toValues(existing))
  const [approvers, setApprovers] = useState<string[]>(existing?.approverIds.length ? existing.approverIds : (c.committees.find((m) => /board/i.test(m.name))?.memberIds ?? []))
  const [report, setReport] = useState<AnalysisReport | null>(existing?.analysis ?? null)
  const [busy, setBusy] = useState(false)
  const v = f.values

  const rules = { title: required('Title'), problem: required('Problem'), solution: required('Solution'), targetCustomer: required('Target customer') }
  const check = () => {
    if (f.validate(rules)) return true
    toast.error('Fill in the required fields', { description: 'Title, problem, solution and target customer are needed.' })
    return false
  }

  const analyse = async () => {
    if (!check()) return
    if (c.credits.limit - c.credits.used < ANALYSIS_CREDITS) return toast.error('AI credits exhausted', { description: 'Ask an admin to add credits. Core features keep working.' })
    setBusy(true)
    try {
      const draft = { ...v, kind: v.kind as Proposal['kind'], budgetDev: num(v.budgetDev) }
      const next = await requestAnalysis(c, draft, existing?.revision ?? 1, stamp())
      setReport(next)
      mutate((co, ctx) => {
        co.credits.used += ANALYSIS_CREDITS
        co.credits.ops.push(`analysis-${existing?.id ?? 'new'}-${Date.now()}`)
        ctx.audit('Generated AI analysis', existing?.id ?? 'new proposal', `${ANALYSIS_CREDITS} credits`)
      })
      toast.success('AI analysis ready', { description: 'Review and edit the report before submitting.' })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const save = (submit: boolean) => {
    if (!check()) return
    if (submit && approvers.length === 0) return toast.error('Choose at least one approver')
    let savedId = existing?.id ?? ''
    let blocked = false
    mutate((co, ctx) => {
      let t: Proposal
      if (existing) {
        const found = co.proposals.find((y) => y.id === existing.id)
        if (!found || found.authorId !== ctx.me.id || (found.status !== 'Draft' && found.status !== 'Changes requested')) {
          blocked = true
          return
        }
        t = found
      } else {
        savedId = ctx.id('PRP')
        t = {
          id: savedId, title: '', kind: 'Product', idea: '', problem: '', solution: '', targetCustomer: '', geography: '', industry: '', benefit: '',
          steps: '', skills: '', dependencies: '', timeline: '', risks: '', docs: [], budgetMode: 'none', currency: 'EUR',
          authorId: ctx.me.id, status: 'Draft', revision: 1, revisions: [{ rev: 1, at: ctx.now, by: ctx.me.id, note: 'Created' }],
          approverMode: 'named', approverIds: [], updated: ctx.now,
        }
        co.proposals.unshift(t)
      }
      applyValues(t, v)
      t.approverIds = approvers
      t.analysis = report ? { ...report, rev: t.revision } : undefined
      t.updated = ctx.now
      if (submit) {
        if (t.status === 'Changes requested') {
          t.revision++
          t.revisions.push({ rev: t.revision, at: ctx.now, by: ctx.me.id, note: 'Resubmitted' })
          if (t.analysis) t.analysis.rev = t.revision
        }
        t.status = 'Submitted'
        t.approvalId = buildRound(co, { id: ctx.id('APR'), itemType: 'Proposal', itemId: t.id, itemTitle: t.title, revision: `r${t.revision}`, approverIds: approvers, submittedBy: ctx.me.id, now: ctx.now, summary: t.problem, amount: t.budgetDev })
      }
      ctx.audit(submit ? 'Submitted proposal' : 'Saved proposal draft', t.id, t.title)
    })
    if (blocked) return toast.error('This proposal is locked', { description: 'It was submitted and can no longer be edited.' })
    if (submit) {
      toast.success('Proposal submitted for approval', { description: 'It is now locked until approvers respond.' })
      router.push(`/proposals?id=${savedId}`)
    } else {
      toast.success('Draft saved', { description: 'You can keep editing until you submit.' })
      if (!existing) router.replace(`/proposals/${savedId}/edit`)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">
        <Panel title="Overview" description="What you are proposing, in one line and a short pitch.">
          <div className="flex flex-col gap-4 p-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
              <Field label="Title" required error={f.errors.title}><TextInput {...f.bind('title')} placeholder="e.g. Supplier invoice inbox" /></Field>
              <Field label="Type"><Select {...f.bind('kind')} options={['Product', 'Service', 'Process'].map((k) => ({ value: k, label: k }))} /></Field>
            </div>
            <Field label="Related product or service" hint="When approved, the new project is linked to this product and shows up on its page.">
              <Select {...f.bind('productId')} options={[{ value: '', label: 'None — new idea' }, ...c.products.map((p) => ({ value: p.id, label: `${p.name} (${p.kind})` }))]} />
            </Field>
            <Field label="The idea" hint="An elevator pitch: what it is and why now."><TextArea rows={4} {...f.bind('idea')} /></Field>
          </div>
        </Panel>

        <Panel title="Problem and solution">
          <div className="flex flex-col gap-4 p-4">
            <Field label="Problem" required error={f.errors.problem} hint="Who is hurting, how often, and what it costs them today."><TextArea rows={6} {...f.bind('problem')} /></Field>
            <Field label="Proposed solution" required error={f.errors.solution}><TextArea rows={6} {...f.bind('solution')} /></Field>
            <Field label="Expected benefit" hint="Revenue, savings, retention or risk reduction."><TextArea rows={4} {...f.bind('benefit')} /></Field>
          </div>
        </Panel>

        <Panel title="Market" description="The AI analysis uses these to size existing, reachable and new customers.">
          <div className="flex flex-col gap-4 p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Target customer" required error={f.errors.targetCustomer}><TextInput {...f.bind('targetCustomer')} /></Field>
              <Field label="Geography"><TextInput {...f.bind('geography')} /></Field>
              <Field label="Industry"><TextInput {...f.bind('industry')} /></Field>
            </div>
            <Field label="Marketing plan" hint="Channels, campaigns and budget."><TextArea rows={6} {...f.bind('marketingPlan')} /></Field>
          </div>
        </Panel>

        <Panel title="Delivery">
          <div className="flex flex-col gap-4 p-4">
            <Field label="Implementation steps"><TextArea rows={5} {...f.bind('steps')} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Skills needed"><TextArea rows={3} {...f.bind('skills')} /></Field>
              <Field label="Dependencies"><TextArea rows={3} {...f.bind('dependencies')} /></Field>
            </div>
            <Field label="Timeline"><TextInput {...f.bind('timeline')} placeholder="e.g. 3 months to pilot" /></Field>
            <Field label="Risks"><TextArea rows={4} {...f.bind('risks')} /></Field>
          </div>
        </Panel>

        <Panel title="Budget">
          <div className="flex flex-col gap-4 p-4">
            <Field label="Budget type">
              <Select {...f.bind('budgetMode')} options={[{ value: 'cash', label: 'Cash budget' }, { value: 'effort', label: 'Effort only' }, { value: 'none', label: 'No budget needed' }]} />
            </Field>
            {v.budgetMode === 'cash' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Development budget (EUR)"><TextInput type="number" min={0} inputMode="numeric" {...f.bind('budgetDev')} /></Field>
                <Field label="Ongoing cost per year (EUR)"><TextInput type="number" min={0} inputMode="numeric" {...f.bind('budgetOngoing')} /></Field>
              </div>
            )}
            {v.budgetMode === 'effort' && <Field label="Effort estimate" hint="e.g. 2 engineers for 6 weeks"><TextInput {...f.bind('effort')} /></Field>}
          </div>
        </Panel>

        <Panel
          title="AI analysis"
          description={`Attached to the proposal so approvers see it. ${ANALYSIS_CREDITS} credits per run. You can edit the report freely before submitting.`}
          action={
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={analyse}>
              {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? 'Analysing…' : report ? 'Run again' : 'Run AI analysis'}
            </Button>
          }
        >
          <div className="p-4">
            {report ? <AnalysisEditor value={report} onChange={setReport} /> : <p className="text-sm text-muted-foreground">No analysis yet. Fill in the problem, solution and market, then run it.</p>}
          </div>
        </Panel>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <Panel title={existing ? existing.title || existing.id : 'New proposal'} action={existing && <StatusPill status={existing.status} />}>
          <div className="flex flex-col gap-3 p-4">
            {existing && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <IdChip>{existing.id}</IdChip> revision {existing.revision} · updated {existing.updated}
              </span>
            )}
            {existing?.status === 'Changes requested' && <Callout tone="warning" title="Changes requested">Update the proposal, then resubmit as a new revision.</Callout>}
            <p className="text-sm leading-relaxed text-muted-foreground">Drafts are private and stay editable. Once you submit, the proposal is locked for you while approvers review it.</p>
            <Button type="button" variant="outline" onClick={() => save(false)}><Save /> Save draft</Button>
            <Button type="button" onClick={() => save(true)}><Send /> {existing?.status === 'Changes requested' ? 'Resubmit for approval' : 'Submit for approval'}</Button>
            <Link href={existing ? `/proposals?id=${existing.id}` : '/proposals'} className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'self-start' })}><ArrowLeft /> Back to proposals</Link>
          </div>
        </Panel>
        <Panel title="Approvers" description="Every approver must approve. Approved proposals become projects automatically.">
          <div className="p-4">
            <PeoplePicker label="Approvers (all must approve)" value={approvers} onChange={setApprovers} />
          </div>
        </Panel>
      </aside>
    </div>
  )
}
