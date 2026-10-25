'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useHub } from '@/lib/store'
import { TODAY, type Activity, type ActivityStatus } from '@/lib/fixtures'
import { canSeeActivity, dueOf, empOf, isOpen, isOverdue, originOf } from '@/lib/derive'
import { ActivityTable, DueCell } from './activity-table'
import { Callout, IdChip, KV, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'
import { Field, FormSheet, Select, TabBar, TextArea, TextInput, required, useDeptOptions, useForm, useParam, usePeopleOptions, useProductOptions, useProjectOptions } from '@/components/hub/form'
import { StateBlock } from '@/components/hub/page'

type Scope = 'mine' | 'review' | 'team' | 'overdue'

export function ActivitiesWorkspace() {
  const { company: c, me } = useHub()
  const [scope, setScope] = useParam('scope', 'mine')
  const [selected, setSelected] = useParam('id')
  const [creating, setCreating] = useState(false)

  const filters: Record<Scope, (a: Activity) => boolean> = {
    mine: (a) => a.ownerId === me.id,
    review: (a) => a.reviewerId === me.id && a.status === 'Submitted for review',
    team: () => true,
    overdue: isOverdue,
  }
  const visible = c.activities.filter((a) => canSeeActivity(c, me, a))
  const tabs = [
    { id: 'mine', label: 'Owned by me', count: visible.filter(filters.mine).length },
    { id: 'review', label: 'Awaiting my review', count: visible.filter(filters.review).length },
    { id: 'overdue', label: 'Overdue', count: visible.filter(filters.overdue).length },
    { id: 'team', label: 'All I can see', count: visible.length },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <TabBar label="Activity scope" tabs={tabs} value={scope} onChange={(v) => setScope(v)} />
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> New activity
        </Button>
      </div>
      <Panel>
        <ActivityTable caption="Activities" filter={filters[(scope as Scope) in filters ? (scope as Scope) : 'mine']} selectedId={selected} onSelect={(id) => setSelected(id)} empty={scope === 'review' ? 'Nothing is waiting for your review.' : 'No activities in this view.'} />
      </Panel>
      <ActivityDetail id={selected} onClose={() => setSelected(null)} />
      <CreateActivity open={creating} onOpenChange={setCreating} onCreated={(id) => setSelected(id)} />
    </>
  )
}

function ActivityDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { company: c, me, mutate } = useHub()
  const a = c.activities.find((x) => x.id === id)
  const allowed = a && canSeeActivity(c, me, a)
  const [evidence, setEvidence] = useState('')
  const [note, setNote] = useState('')
  const [revise, setRevise] = useState({ date: '', reason: '' })
  const [err, setErr] = useState('')

  const update = (fn: (x: Activity, now: string) => void, msg: string) => {
    mutate((co, { now, audit, me: who }) => {
      const x = co.activities.find((y) => y.id === id)
      if (!x) return
      fn(x, now)
      x.history.push({ at: now, by: who.id, text: msg })
      audit(msg, x.id)
    })
    toast.success(msg)
    setErr('')
  }

  const isOwner = a?.ownerId === me.id
  const isReviewer = a?.reviewerId === me.id
  const setStatus = (s: ActivityStatus, extra?: (x: Activity) => void) => update((x) => ((x.status = s), extra?.(x)), `Status → ${s}`)

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
        {!a || !allowed ? (
          <div className="p-6">
            <SheetHeader className="p-0">
              <SheetTitle>Activity unavailable</SheetTitle>
              <SheetDescription>It does not exist or is outside your permissions.</SheetDescription>
            </SheetHeader>
          </div>
        ) : (
          <>
            <SheetHeader className="border-b border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <IdChip>{a.id}</IdChip>
                <StatusPill status={a.status} />
                {isOverdue(a) && <StatusPill status="Overdue" tone="danger" />}
              </div>
              <SheetTitle className="text-pretty">{a.title}</SheetTitle>
              <SheetDescription>{a.outcome}</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-5 p-4">
              <dl className="grid grid-cols-2 gap-4">
                <KV label="Owner">
                  <PersonLink id={a.ownerId} />
                </KV>
                <KV label="Reviewer">
                  <PersonLink id={a.reviewerId} />
                </KV>
                <KV label="Origin">
                  <Link href={originOf(c, a).href} className="hover:underline">
                    {originOf(c, a).label}
                  </Link>
                </KV>
                <KV label="Due">
                  <DueCell a={a} />
                </KV>
                <KV label="Priority">{a.priority}</KV>
                <KV label="Revision">r{a.revision}{a.reworkCount ? ` · reworked ${a.reworkCount}×` : ''}</KV>
              </dl>
              {a.revisionReason && <Callout tone="muted" title="Due date revised">{a.revisionReason}</Callout>}
              {a.blocker && a.status === 'Blocked' && <Callout tone="danger" title="Blocked">{a.blocker}</Callout>}
              {a.evidence && <Callout tone="info" title="Evidence submitted">{a.evidence}</Callout>}
              {err && <Callout tone="danger" title={err} />}

              {a.checklist.length > 0 && (
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="pb-1 text-xs font-medium text-foreground">Checklist</legend>
                  {a.checklist.map((item, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={item.done} disabled={!isOwner || !isOpen(a)} onChange={() => update((x) => void (x.checklist[i].done = !x.checklist[i].done), `Checklist: ${item.text}`)} />
                      {item.text}
                    </label>
                  ))}
                </fieldset>
              )}

              {isOwner && isOpen(a) && a.status !== 'Submitted for review' && (
                <section className="flex flex-col gap-3 rounded-md border border-border p-3">
                  <h3 className="text-sm font-semibold text-foreground">Owner actions</h3>
                  <div className="flex flex-wrap gap-2">
                    {a.status !== 'In progress' && <Button size="sm" variant="outline" onClick={() => setStatus('In progress', (x) => (x.blocker = undefined))}>Start / resume</Button>}
                    {a.status !== 'Blocked' && (
                      <Button size="sm" variant="outline" onClick={() => (note.trim() ? setStatus('Blocked', (x) => (x.blocker = note.trim())) : setErr('Describe the blocker in the note field first.'))}>
                        Mark blocked
                      </Button>
                    )}
                  </div>
                  <Field label="Note / blocker reason">
                    <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
                  </Field>
                  <Field label="Completion evidence" hint="Link or description the reviewer will check.">
                    <TextArea value={evidence} onChange={(e) => setEvidence(e.target.value)} />
                  </Field>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!evidence.trim()) return setErr('Evidence is required to submit for review.')
                      update((x) => ((x.status = 'Submitted for review'), (x.evidence = evidence.trim())), `Submitted for review to ${empOf(c, a.reviewerId)?.fullName}`)
                      setEvidence('')
                    }}
                  >
                    Submit for review
                  </Button>
                </section>
              )}

              {isReviewer && a.status === 'Submitted for review' && (
                <section className="flex flex-col gap-3 rounded-md border border-border p-3">
                  <h3 className="text-sm font-semibold text-foreground">Review</h3>
                  <Field label="Review note" hint="Required when reopening.">
                    <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => update((x) => ((x.status = 'Accepted'), (x.acceptedAt = TODAY)), 'Accepted by reviewer')}>
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!note.trim()) return setErr('Explain what needs to change before reopening.')
                        update((x) => ((x.status = 'Reopened'), x.reworkCount++, (x.evidence = `Reviewer: ${note.trim()}`)), 'Reopened by reviewer')
                        setNote('')
                      }}
                    >
                      Reopen
                    </Button>
                  </div>
                </section>
              )}

              {(isOwner || isReviewer) && isOpen(a) && (
                <section className="flex flex-col gap-3 rounded-md border border-border p-3">
                  <h3 className="text-sm font-semibold text-foreground">Revise due date</h3>
                  <p className="text-xs text-muted-foreground">The original date {a.originalDue} is always kept for productivity evidence.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="New due date">
                      <TextInput type="date" value={revise.date} onChange={(e) => setRevise({ ...revise, date: e.target.value })} />
                    </Field>
                    <Field label="Reason">
                      <TextInput value={revise.reason} onChange={(e) => setRevise({ ...revise, reason: e.target.value })} />
                    </Field>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="self-start"
                    onClick={() => {
                      if (!revise.date || !revise.reason.trim()) return setErr('A new date and a reason are both required.')
                      update((x) => ((x.revisedDue = revise.date), (x.revisionReason = revise.reason.trim()), x.revision++), `Due revised ${dueOf(a)} → ${revise.date}`)
                      setRevise({ date: '', reason: '' })
                    }}
                  >
                    Save revised date
                  </Button>
                </section>
              )}

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-foreground">History</h3>
                <ol className="flex flex-col gap-1.5 border-l border-border pl-3">
                  {[...a.history].reverse().map((h, i) => (
                    <li key={i} className="text-xs leading-relaxed">
                      <span className="font-mono text-muted-foreground">{h.at}</span> <span className="text-foreground">{h.text}</span>{' '}
                      <span className="text-muted-foreground">— {empOf(c, h.by)?.fullName ?? 'System'}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export function CreateActivity({ open, onOpenChange, onCreated, preset }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated?: (id: string) => void; preset?: { projectId?: string; productId?: string; dept?: string; backlogId?: string } }) {
  const { me, mutate } = useHub()
  const people = usePeopleOptions()
  const depts = useDeptOptions()
  const products = useProductOptions()
  const projects = useProjectOptions()
  const f = useForm({ title: '', outcome: '', ownerId: me.id, reviewerId: '', dept: preset?.dept ?? me.dept, projectId: preset?.projectId ?? '', productId: preset?.productId ?? '', due: '', priority: 'Medium' })

  const submit = () => {
    const ok = f.validate({
      title: required('Title'),
      outcome: required('Expected outcome'),
      reviewerId: (v, all) => (!v ? 'Reviewer is required' : v === all.ownerId ? 'Reviewer must differ from owner' : undefined),
      due: (v) => (!v ? 'Due date is required' : String(v) < TODAY ? 'Due date cannot be in the past' : undefined),
    })
    if (!ok) return
    let newId = ''
    mutate((co, { id, now, audit, me: who }) => {
      newId = id('ACT')
      const v = f.values
      co.activities.unshift({
        id: newId,
        title: v.title.trim(),
        outcome: v.outcome.trim(),
        ownerId: v.ownerId,
        reviewerId: v.reviewerId,
        dept: v.dept,
        projectId: v.projectId || null,
        productId: v.productId || null,
        backlogId: preset?.backlogId,
        status: 'Planned',
        priority: v.priority as Activity['priority'],
        start: TODAY,
        originalDue: v.due,
        revisedDue: null,
        revision: 1,
        checklist: [],
        reworkCount: 0,
        history: [{ at: now, by: who.id, text: 'Created' }],
      })
      audit('Created activity', newId, v.title)
    })
    toast.success('Activity created')
    f.reset()
    onOpenChange(false)
    setTimeout(() => newId && onCreated?.(newId), 0)
  }

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="New activity" description="One canonical record. The owner submits evidence; the reviewer accepts or reopens." onSubmit={submit} submitLabel="Create activity">
      <Field label="Title" required error={f.errors.title}>
        <TextInput {...f.bind('title')} />
      </Field>
      <Field label="Expected outcome" required error={f.errors.outcome}>
        <TextArea {...f.bind('outcome')} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Owner" required>
          <Select options={people} {...f.bind('ownerId')} />
        </Field>
        <Field label="Reviewer" required error={f.errors.reviewerId}>
          <Select placeholder="Choose reviewer" options={people} {...f.bind('reviewerId')} />
        </Field>
        <Field label="Department">
          <Select options={depts} {...f.bind('dept')} />
        </Field>
        <Field label="Due date" required error={f.errors.due}>
          <TextInput type="date" {...f.bind('due')} />
        </Field>
        <Field label="Project (optional)">
          <Select placeholder="None" options={projects} {...f.bind('projectId')} />
        </Field>
        <Field label="Product / service (optional)">
          <Select placeholder="None" options={products} {...f.bind('productId')} />
        </Field>
        <Field label="Priority">
          <Select options={['Low', 'Medium', 'High', 'Critical'].map((p) => ({ value: p, label: p }))} {...f.bind('priority')} />
        </Field>
      </div>
    </FormSheet>
  )
}

export function NoAccess() {
  return <StateBlock title="Not available" body="This record is outside your permissions." />
}
