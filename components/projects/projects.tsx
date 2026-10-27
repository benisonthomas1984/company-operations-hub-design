'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Project } from '@/lib/fixtures'
import { fmtEUR, TODAY } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { countable, empOf, productOf, projectHealth, projectOf } from '@/lib/derive'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ApprovalProgress, Callout, DeptTag, IdChip, KV, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'
import { Page, StateBlock } from '@/components/hub/page'
import { ActivityTable } from '@/components/activities/activity-table'
import { Field, FormSheet, PeoplePicker, Select, TextArea, TextInput, required, useDeptOptions, usePeopleOptions, useForm } from '@/components/hub/form'

const healthTone = { 'On track': 'success', 'At risk': 'warning', Blocked: 'danger' } as const

function useProgress(p: Project) {
  const { company: c } = useHub()
  const acts = c.activities.filter((a) => a.projectId === p.id && a.status !== 'Cancelled')
  const accepted = acts.filter((a) => a.status === 'Accepted').length
  return { total: acts.length, accepted, pct: acts.length ? Math.round((accepted / acts.length) * 100) : 0 }
}

function ProjectRow({ p }: { p: Project }) {
  const { company: c } = useHub()
  const prog = useProgress(p)
  const h = projectHealth(c, p)
  const current = p.stages.find((s) => s.status === 'Current')
  return (
    <li>
      <Link href={`/projects/${p.id}`} className="grid gap-3 px-4 py-4 hover:bg-muted/50 md:grid-cols-[1fr_180px_160px_120px] md:items-center">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <IdChip>{p.id}</IdChip>
            <span className="truncate font-medium text-foreground">{p.name}</span>
          </div>
          <p className="line-clamp-1 text-sm text-muted-foreground">{p.purpose}</p>
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Stage: <span className="text-foreground">{current?.name ?? p.status}</span></span>
          <span>Target {p.target}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <Progress value={prog.pct} aria-label={`${prog.pct}% accepted`} />
          <span className="text-xs text-muted-foreground">
            {prog.accepted}/{prog.total} accepted
          </span>
        </div>
        <StatusPill status={h.value} tone={healthTone[h.value]} />
      </Link>
    </li>
  )
}

export function ProjectList() {
  const { company: c, can } = useHub()
  const [open, setOpen] = useState(false)
  const active = c.projects.filter((p) => p.status !== 'Closed')
  const closed = c.projects.filter((p) => p.status === 'Closed')
  return (
    <Page
      title="Projects"
      description="Cross-department delivery. Progress counts accepted activities only — submitted work is not done until reviewed."
      actions={
        can('manage') && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus aria-hidden /> New project
          </Button>
        )
      }
    >
      {!c.projects.length ? (
        <StateBlock title="No projects yet" body="Projects are created from committed backlog items or by managers." />
      ) : (
        <>
          <Panel title={`Active · ${active.length}`}>
            <ul className="-mx-4 -my-2 divide-y divide-border">{active.map((p) => <ProjectRow key={p.id} p={p} />)}</ul>
          </Panel>
          {closed.length > 0 && (
            <Panel title={`Closed · ${closed.length}`}>
              <ul className="-mx-4 -my-2 divide-y divide-border">{closed.map((p) => <ProjectRow key={p.id} p={p} />)}</ul>
            </Panel>
          )}
        </>
      )}
      <NewProject open={open} onOpenChange={setOpen} />
    </Page>
  )
}

function NewProject({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { mutate } = useHub()
  const people = usePeopleOptions()
  const depts = useDeptOptions()
  const f = useForm({ name: '', purpose: '', pmId: '', sponsorId: '', ownerDept: '', target: '', budget: '', budgetApprovers: [] as string[], timelineApprovers: [] as string[] })
  const submit = () => {
    const ok = f.validate({ name: required('Name'), purpose: required('Purpose'), pmId: required('Project manager'), sponsorId: required('Sponsor'), ownerDept: required('Owning department'),
      target: (t) => (!t ? 'Target date is required' : String(t) < TODAY ? 'Target cannot be in the past' : undefined),
      budget: (b) => (!(Number(b) > 0) ? 'Enter the approved budget' : undefined),
      budgetApprovers: (x) => (!(x as string[]).length ? 'Pick who approves budget changes and expenses' : undefined),
      timelineApprovers: (x) => (!(x as string[]).length ? 'Pick who approves timeline changes' : undefined),
    })
    if (!ok) return
    mutate((c, ctx) => {
      const id = ctx.id('PRJ')
      c.projects.unshift({
        id,
        name: f.values.name,
        purpose: f.values.purpose,
        pmId: f.values.pmId,
        sponsorId: f.values.sponsorId,
        status: 'Planning',
        members: [{ personId: f.values.pmId, role: 'Project manager', allocation: 100 }],
        formerMembers: [],
        productIds: [],
        ownerDept: f.values.ownerDept,
        deptIds: [f.values.ownerDept],
        start: TODAY,
        target: f.values.target,
        deliverables: [],
        budget: Math.round(Number(f.values.budget)),
        approvers: { budget: f.values.budgetApprovers, timeline: f.values.timelineApprovers },
        stages: [
          { name: 'Plan', ownerId: f.values.pmId, needs: 'Scope and plan agreed', approverIds: [f.values.sponsorId], status: 'Current' },
          { name: 'Deliver', ownerId: f.values.pmId, needs: 'All activities accepted', approverIds: [f.values.sponsorId], status: 'Upcoming' },
        ],
        history: [{ at: ctx.now, by: ctx.me.id, text: 'Project created' }],
      })
      ctx.audit('project.create', id, f.values.name)
    })
    toast.success('Project created')
    f.reset()
    onOpenChange(false)
  }
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="New project" description="Projects start in Planning. Decide up front who approves budget and timeline changes." onSubmit={submit} submitLabel="Create project">
      <Field label="Name" required error={f.errors.name}>
        <TextInput value={f.values.name} onChange={(e) => f.set('name', e.target.value)} invalid={!!f.errors.name} />
      </Field>
      <Field label="Purpose" required error={f.errors.purpose}>
        <TextArea value={f.values.purpose} onChange={(e) => f.set('purpose', e.target.value)} invalid={!!f.errors.purpose} />
      </Field>
      <Field label="Project manager" required error={f.errors.pmId}>
        <Select options={people} placeholder="Select person" value={f.values.pmId} onChange={(e) => f.set('pmId', e.target.value)} invalid={!!f.errors.pmId} />
      </Field>
      <Field label="Sponsor" required error={f.errors.sponsorId}>
        <Select options={people} placeholder="Select person" value={f.values.sponsorId} onChange={(e) => f.set('sponsorId', e.target.value)} invalid={!!f.errors.sponsorId} />
      </Field>
      <Field label="Owning department" required error={f.errors.ownerDept}>
        <Select options={depts} placeholder="Select department" value={f.values.ownerDept} onChange={(e) => f.set('ownerDept', e.target.value)} invalid={!!f.errors.ownerDept} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target date" required error={f.errors.target}>
          <TextInput type="date" value={f.values.target} onChange={(e) => f.set('target', e.target.value)} invalid={!!f.errors.target} />
        </Field>
        <Field label="Budget (EUR)" required error={f.errors.budget}>
          <TextInput type="number" inputMode="numeric" min="0" step="100" value={f.values.budget} onChange={(e) => f.set('budget', e.target.value)} invalid={!!f.errors.budget} />
        </Field>
      </div>
      <PeoplePicker label="Budget approvers" value={f.values.budgetApprovers} onChange={(x) => f.set('budgetApprovers', x)} error={f.errors.budgetApprovers} />
      <PeoplePicker label="Timeline approvers" value={f.values.timelineApprovers} onChange={(x) => f.set('timelineApprovers', x)} error={f.errors.timelineApprovers} />
      <p className="text-xs leading-relaxed text-muted-foreground">All listed approvers must approve. Budget approvers sign off budget changes and project expenses of {fmtEUR(500)} or more; timeline approvers sign off target date changes.</p>
    </FormSheet>
  )
}

export { ProjectDetail } from './project-detail'
