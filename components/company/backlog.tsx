'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { productOf } from '@/lib/derive'
import type { BacklogItem } from '@/lib/fixtures'
import { ApprovalProgress, DeptTag, IdChip, KV, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'
import { Field, FormSheet, PeoplePicker, Select, TextArea, TextInput, required, useForm, useParam, useProductOptions, usePeopleOptions } from '@/components/hub/form'
import { ActivityTable } from '@/components/activities/activity-table'
import { StateBlock } from '@/components/hub/page'
import { buildRound } from '@/components/approvals/approvals'
import { cn } from '@/lib/utils'

export function Backlog() {
  const { company: c, me, mutate } = useHub()
  const [sel, setSel] = useParam('id', c.backlog[0]?.id ?? '')
  const [product, setProduct] = useParam('product', '')
  const [open, setOpen] = useState(false)
  const [approvers, setApprovers] = useState<string[]>([])
  const productOptions = useProductOptions()
  const peopleOptions = usePeopleOptions()
  const f = useForm({ productId: product || c.products[0]?.id || '', title: '', problem: '', outcome: '', criteria: '', ownerId: me.id, priority: 'Medium', proposedTarget: '' })

  const list = c.backlog.filter((b) => !product || b.productId === product)
  const b = list.find((x) => x.id === sel) ?? list[0]
  const round = b && c.approvals.find((r) => r.id === b.approvalId)
  const groups = Array.from(new Set(list.map((x) => x.committedTarget ?? x.proposedTarget)))

  const create = () => {
    if (!f.validate({ productId: required('Product'), title: required('Title'), problem: required('Problem'), criteria: required('Acceptance criteria'), proposedTarget: required('Proposed target') })) return
    if (approvers.length === 0) return toast.error('Choose at least one approver')
    let id = ''
    mutate((co, ctx) => {
      id = ctx.id('BLI')
      const v = f.values
      const item: BacklogItem = {
        id,
        productId: v.productId,
        title: v.title,
        problem: v.problem,
        description: v.problem,
        outcome: v.outcome,
        criteria: v.criteria.split('\n').map((s) => s.trim()).filter(Boolean),
        requesterId: ctx.me.id,
        ownerId: v.ownerId,
        teams: [ctx.me.dept],
        dependencies: '',
        priority: v.priority as BacklogItem['priority'],
        priorityRationale: '',
        proposedTarget: v.proposedTarget,
        status: 'Submitted for approval',
        approverIds: approvers,
        projectIds: [],
        history: [{ at: ctx.now, by: ctx.me.id, text: 'Created and submitted for approval' }],
      }
      co.backlog.unshift(item)
      item.approvalId = buildRound(co, { id: ctx.id('APR'), itemType: 'Backlog item', itemId: id, itemTitle: v.title, revision: 'r1', approverIds: approvers, submittedBy: ctx.me.id, now: ctx.now, summary: v.problem })
      ctx.audit('Submitted backlog item', id, v.title)
    })
    toast.success('Backlog item submitted', { description: 'It becomes committed once every approver approves.' })
    setOpen(false)
    f.reset()
    setApprovers([])
    setSel(id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="Filter by product" value={product} onChange={(e) => setProduct(e.target.value)} options={[{ value: '', label: 'All products' }, ...productOptions]} className="w-56" />
        <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}>
          <Plus /> New backlog item
        </Button>
      </div>
      {!b ? (
        <StateBlock title="No backlog items" body="Approved proposals land here, or add an item directly." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="flex flex-col gap-4">
            {groups.map((g) => (
              <Panel key={g} title={g || 'Unscheduled'}>
                <ul className="divide-y divide-border">
                  {list
                    .filter((x) => (x.committedTarget ?? x.proposedTarget) === g)
                    .map((x) => (
                      <li key={x.id}>
                        <button type="button" onClick={() => setSel(x.id)} aria-current={b.id === x.id} className={cn('flex w-full flex-col gap-1 px-4 py-2.5 text-left', b.id === x.id ? 'bg-accent' : 'hover:bg-muted/50')}>
                          <span className="flex items-center gap-2">
                            <IdChip>{x.id}</IdChip>
                            <span className="truncate text-sm font-medium text-foreground">{x.title}</span>
                          </span>
                          <StatusPill status={x.status} className="self-start" />
                        </button>
                      </li>
                    ))}
                </ul>
              </Panel>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <Panel title={b.title} description={`${b.id} · ${productOf(c, b.productId)?.name ?? 'Unknown product'} · ${b.priority} priority`} action={<StatusPill status={b.status} />}>
              <div className="flex flex-col gap-4 p-4">
                <p className="text-sm leading-relaxed text-foreground">{b.problem}</p>
                <dl className="grid gap-4 md:grid-cols-3">
                  <KV label="Owner"><PersonLink id={b.ownerId} /></KV>
                  <KV label="Target">{b.committedTarget ? `${b.committedTarget} (committed)` : `${b.proposedTarget} (proposed)`}</KV>
                  <KV label="Origin">{b.originProposalId ? <IdChip href={`/proposals?id=${b.originProposalId}`}>{b.originProposalId}</IdChip> : 'Direct entry'}</KV>
                  <KV label="Teams">
                    <span className="flex flex-wrap gap-2">{b.teams.map((t) => <DeptTag key={t} id={t} />)}</span>
                  </KV>
                  <KV label="Projects">
                    <span className="flex gap-1">
                      {b.projectIds.map((p) => <IdChip key={p} href={`/projects/${p}`}>{p}</IdChip>)}
                      {!b.projectIds.length && '—'}
                    </span>
                  </KV>
                  <KV label="Release">{b.releaseId ?? '—'}</KV>
                </dl>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Acceptance criteria</span>
                  <ul className="flex flex-col gap-1 text-sm text-foreground">
                    {b.criteria.map((x) => (
                      <li key={x} className="flex gap-2">
                        <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Panel>
            {round && (
              <Panel title="Commitment approval" description={`${round.id} · ${round.workflowVersion} · round ${round.round}`} action={<StatusPill status={round.status} />}>
                <div className="px-4 py-3"><ApprovalProgress decisions={round.stages.flatMap((s) => s.decisions)} /></div>
                <Link href={`/approvals?id=${round.id}`} className="border-t border-border px-4 py-2.5 text-sm font-medium text-info hover:underline">Open approval</Link>
              </Panel>
            )}
            <Panel title="Delivery activities">
              <ActivityTable filter={(a) => a.backlogId === b.id} caption={`Activities for ${b.id}`} />
            </Panel>
          </div>
        </div>
      )}
      <FormSheet open={open} onOpenChange={setOpen} title="New backlog item" description="Submitted to approvers; committed once all approve." onSubmit={create} submitLabel="Submit for approval" wide>
        <Field label="Product" required error={f.errors.productId}><Select {...f.bind('productId')} options={productOptions} /></Field>
        <Field label="Title" required error={f.errors.title}><TextInput {...f.bind('title')} /></Field>
        <Field label="Problem" required error={f.errors.problem}><TextArea rows={3} {...f.bind('problem')} /></Field>
        <Field label="Desired outcome"><TextArea rows={2} {...f.bind('outcome')} /></Field>
        <Field label="Acceptance criteria" required hint="One per line" error={f.errors.criteria}><TextArea rows={3} {...f.bind('criteria')} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Owner"><Select {...f.bind('ownerId')} options={peopleOptions} /></Field>
          <Field label="Priority"><Select {...f.bind('priority')} options={['Low', 'Medium', 'High', 'Critical'].map((x) => ({ value: x, label: x }))} /></Field>
          <Field label="Proposed target" required error={f.errors.proposedTarget}><TextInput placeholder="e.g. Q1 2027" {...f.bind('proposedTarget')} /></Field>
        </div>
        <PeoplePicker label="Approvers (all must approve)" value={approvers} onChange={setApprovers} />
      </FormSheet>
    </div>
  )
}
