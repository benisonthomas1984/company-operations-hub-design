'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { empOf } from '@/lib/derive'
import type { Proposal } from '@/lib/fixtures'
import { ApprovalProgress, Callout, IdChip, KV, Panel, PersonLink, SimLabel, StatusPill } from '@/components/hub/primitives'
import { Field, FormSheet, PeoplePicker, Select, TextArea, TextInput, required, useForm, useParam } from '@/components/hub/form'
import { StateBlock } from '@/components/hub/page'
import { buildRound } from '@/components/approvals/approvals'
import { cn } from '@/lib/utils'

const blank = { title: '', kind: 'Product', idea: '', problem: '', solution: '', targetCustomer: '', geography: '', industry: '', benefit: '', budgetDev: '', timeline: '' }

export function Proposals() {
  const { company: c, me, mutate } = useHub()
  const visible = c.proposals.filter((p) => p.status !== 'Draft' || p.authorId === me.id)
  const [sel, setSel] = useParam('id', visible[0]?.id ?? '')
  const [open, setOpen] = useState(false)
  const [approvers, setApprovers] = useState<string[]>(c.committees.find((m) => /board/i.test(m.name))?.memberIds ?? [])
  const f = useForm(blank)
  const p = visible.find((x) => x.id === sel) ?? visible[0]
  const round = p && c.approvals.find((r) => r.id === p.approvalId)

  const create = (submit: boolean) => {
    if (!f.validate({ title: required('Title'), problem: required('Problem'), solution: required('Solution'), targetCustomer: required('Target customer') })) return
    if (submit && approvers.length === 0) return toast.error('Choose at least one approver')
    let newId = ''
    mutate((co, ctx) => {
      newId = ctx.id('PRP')
      const v = f.values
      const prop: Proposal = {
        id: newId,
        title: v.title,
        kind: v.kind as Proposal['kind'],
        idea: v.idea,
        problem: v.problem,
        solution: v.solution,
        targetCustomer: v.targetCustomer,
        geography: v.geography,
        industry: v.industry,
        benefit: v.benefit,
        steps: '',
        skills: '',
        dependencies: '',
        timeline: v.timeline,
        risks: '',
        docs: [],
        budgetMode: v.budgetDev ? 'cash' : 'none',
        budgetDev: v.budgetDev ? Number(v.budgetDev) : undefined,
        currency: 'EUR',
        authorId: ctx.me.id,
        status: submit ? 'Submitted' : 'Draft',
        revision: 1,
        revisions: [{ rev: 1, at: ctx.now, by: ctx.me.id, note: 'Created' }],
        approverMode: 'named',
        approverIds: approvers,
        updated: ctx.now,
      }
      co.proposals.unshift(prop)
      if (submit) prop.approvalId = buildRound(co, { id: ctx.id('APR'), itemType: 'Proposal', itemId: newId, itemTitle: v.title, revision: 'r1', approverIds: approvers, submittedBy: ctx.me.id, now: ctx.now, summary: v.problem })
      ctx.audit(submit ? 'Submitted proposal' : 'Saved proposal draft', newId, v.title)
    })
    toast.success(submit ? 'Proposal submitted for approval' : 'Draft saved')
    setOpen(false)
    f.reset()
    setSel(newId)
  }

  const submitExisting = (x: Proposal) => {
    if (!x.approverIds.length) return toast.error('No approvers configured on this proposal')
    mutate((co, ctx) => {
      const t = co.proposals.find((y) => y.id === x.id)!
      if (t.status === 'Changes requested') {
        t.revision++
        t.revisions.push({ rev: t.revision, at: ctx.now, by: ctx.me.id, note: 'Resubmitted' })
      }
      t.status = 'Submitted'
      t.updated = ctx.now
      t.approvalId = buildRound(co, { id: ctx.id('APR'), itemType: 'Proposal', itemId: t.id, itemTitle: t.title, revision: `r${t.revision}`, approverIds: t.approverIds, submittedBy: ctx.me.id, now: ctx.now, summary: t.problem })
      ctx.audit('Submitted proposal', t.id, `r${t.revision}`)
    })
    toast.success('Submitted for approval')
  }

  const analyse = (x: Proposal) => {
    const op = `analysis-${x.id}-r${x.revision}`
    if (c.credits.ops.includes(op)) return toast('Already analysed for this revision', { description: 'No extra credits charged.' })
    if (c.credits.limit - c.credits.used < 40) return toast.error('AI credits exhausted', { description: 'Ask an admin to add credits. Core features keep working.' })
    mutate((co, ctx) => {
      co.credits.used += 40
      co.credits.ops.push(op)
      const t = co.proposals.find((y) => y.id === x.id)!
      t.analysis = {
        rev: t.revision,
        generatedAt: ctx.now,
        market: `Demand signals for ${t.targetCustomer || 'the target segment'}${t.geography ? ` in ${t.geography}` : ''} look moderate; validate with 5 customer interviews.`,
        competitors: [{ name: 'Incumbent suites', note: 'Broad but slow to adapt' }],
        sources: [{ title: 'Simulated public source', date: ctx.now.slice(0, 10) }],
        users: { low: 40, base: 120, high: 300, assumption: 'Conversion from existing client base' },
        adoption: 'Pilot with two existing clients before wide release.',
        pricing: 'Add-on to current plan.',
        steps: 'Discovery → prototype → pilot → release',
        staffing: 'One engineer and one product owner part-time',
        budget: t.budgetDev ? `€${t.budgetDev.toLocaleString()} development` : 'Effort-only',
        risks: t.risks || 'Scope creep; unclear success metric.',
      }
      ctx.audit('Generated AI analysis', t.id, '40 credits')
    })
    toast.success('Analysis generated', { description: '40 credits used. Review before relying on it.' })
  }

  return (
    <>
      {!p ? (
        <StateBlock title="No proposals yet" body="Anyone can propose a product, service or process change." action={<Button onClick={() => setOpen(true)}><Plus /> New proposal</Button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Panel title="Proposals" action={<Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus /> New</Button>}>
            <ul className="divide-y divide-border">
              {visible.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => setSel(x.id)} aria-current={p.id === x.id} className={cn('flex w-full flex-col gap-1 px-4 py-3 text-left', p.id === x.id ? 'bg-accent' : 'hover:bg-muted/50')}>
                    <span className="flex items-center gap-2">
                      <IdChip>{x.id}</IdChip>
                      <span className="text-xs text-muted-foreground">by {empOf(c, x.authorId)?.fullName}</span>
                    </span>
                    <span className="text-sm font-medium text-foreground">{x.title}</span>
                    <StatusPill status={x.status} className="self-start" />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          <div className="flex flex-col gap-4">
            <Panel
              title={p.title}
              description={`${p.id} · ${p.kind} · revision ${p.revision} · updated ${p.updated}`}
              action={
                <span className="flex items-center gap-2">
                  <StatusPill status={p.status} />
                  {(p.status === 'Draft' || p.status === 'Changes requested') && p.authorId === me.id && (
                    <Button size="sm" onClick={() => submitExisting(p)}>
                      {p.status === 'Draft' ? 'Submit' : 'Resubmit'}
                    </Button>
                  )}
                </span>
              }
            >
              <div className="flex flex-col gap-4 p-4">
                <dl className="grid gap-4 md:grid-cols-2">
                  <KV label="Author"><PersonLink id={p.authorId} showRole /></KV>
                  <KV label="Budget">{p.budgetMode === 'cash' && p.budgetDev ? <span className="font-mono">€{p.budgetDev.toLocaleString()}</span> : p.effort ?? 'Effort only'}</KV>
                  <KV label="Target customer">{p.targetCustomer || '—'}</KV>
                  <KV label="Geography · industry">{[p.geography, p.industry].filter(Boolean).join(' · ') || '—'}</KV>
                </dl>
                <Block label="Problem" text={p.problem} />
                <Block label="Proposed solution" text={p.solution} />
                {p.benefit && <Block label="Expected benefit" text={p.benefit} />}
                {p.converted && (
                  <Callout tone="success" title={`Converted to ${p.converted.type}`}>
                    <IdChip href={p.converted.type === 'backlog' ? `/backlog?id=${p.converted.id}` : p.converted.type === 'project' ? `/projects/${p.converted.id}` : `/products/${p.converted.id}`}>{p.converted.id}</IdChip>
                  </Callout>
                )}
              </div>
            </Panel>
            {round ? (
              <Panel title="Approval" description={`${round.id} · ${round.workflowVersion} · round ${round.round}`} action={<ApprovalProgress decisions={round.stages.flatMap((s) => s.decisions)} />}>
                <div className="flex flex-col gap-2 p-4">
                  <p className="text-sm text-foreground">Every listed approver must approve. Approved proposals convert to backlog automatically.</p>
                  <Link href={`/approvals?id=${round.id}`} className="text-sm font-medium text-info hover:underline">Open approval {round.id}</Link>
                </div>
              </Panel>
            ) : (
              <Callout tone="muted" title="Not submitted">Drafts are private to the author until submitted.</Callout>
            )}
            <Panel title="AI analysis" description="Market, users, budget and risk. Labeled as AI; never auto-submitted." action={<SimLabel>AI · 40 credits</SimLabel>}>
              <div className="flex flex-col gap-3 p-4">
                {p.analysis ? (
                  <dl className="grid gap-3 md:grid-cols-2">
                    <KV label={`Market (rev ${p.analysis.rev})`}>{p.analysis.market}</KV>
                    <KV label="Users (low / base / high)"><span className="font-mono">{p.analysis.users.low} / {p.analysis.users.base} / {p.analysis.users.high}</span></KV>
                    <KV label="Staffing">{p.analysis.staffing}</KV>
                    <KV label="Risks">{p.analysis.risks}</KV>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">No analysis for this revision yet.</p>
                )}
                {p.analysis?.rev !== p.revision && (
                  <Button size="sm" variant="outline" className="self-start" onClick={() => analyse(p)}>
                    <Sparkles /> {p.analysis ? 'Re-analyse this revision' : 'Generate analysis'}
                  </Button>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}
      <FormSheet open={open} onOpenChange={setOpen} title="New proposal" description="Saved as a private draft, or submitted straight to approvers." onSubmit={() => create(true)} submitLabel="Submit for approval" secondary={<Button type="button" variant="outline" onClick={() => create(false)}>Save draft</Button>} wide>
        <Field label="Title" required error={f.errors.title}><TextInput {...f.bind('title')} /></Field>
        <Field label="Type">
          <Select {...f.bind('kind')} options={['Product', 'Service', 'Process'].map((k) => ({ value: k, label: k }))} />
        </Field>
        <Field label="Problem" required error={f.errors.problem}><TextArea rows={3} {...f.bind('problem')} /></Field>
        <Field label="Proposed solution" required error={f.errors.solution}><TextArea rows={3} {...f.bind('solution')} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Target customer" required error={f.errors.targetCustomer}><TextInput {...f.bind('targetCustomer')} /></Field>
          <Field label="Geography"><TextInput {...f.bind('geography')} /></Field>
          <Field label="Industry"><TextInput {...f.bind('industry')} /></Field>
        </div>
        <Field label="Expected benefit"><TextArea rows={2} {...f.bind('benefit')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Development budget (EUR)" hint="Leave empty for effort-only"><TextInput type="number" min={0} inputMode="numeric" {...f.bind('budgetDev')} /></Field>
          <Field label="Timeline"><TextInput {...f.bind('timeline')} /></Field>
        </div>
        <PeoplePicker label="Approvers (all must approve)" value={approvers} onChange={setApprovers} />
      </FormSheet>
    </>
  )
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm leading-relaxed text-foreground">{text}</p>
    </div>
  )
}
