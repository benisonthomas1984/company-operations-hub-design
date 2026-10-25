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
import { Field, FormSheet, Select, TextArea, TextInput, required, useDeptOptions, usePeopleOptions, useForm } from '@/components/hub/form'

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
  const f = useForm({ name: '', purpose: '', pmId: '', sponsorId: '', ownerDept: '', target: '' })
  const submit = () => {
    const ok = f.validate({ name: required('Name'), purpose: required('Purpose'), pmId: required('Project manager'), sponsorId: required('Sponsor'), ownerDept: required('Owning department'), target: required('Target date') })
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
        members: [{ personId: f.values.pmId, role: 'Project manager' }],
        formerMembers: [],
        productIds: [],
        ownerDept: f.values.ownerDept,
        deptIds: [f.values.ownerDept],
        start: TODAY,
        target: f.values.target,
        deliverables: [],
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
    <FormSheet open={open} onOpenChange={onOpenChange} title="New project" description="Projects start in Planning. Stages and approvers can be refined later." onSubmit={submit} submitLabel="Create project">
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
      <Field label="Target date" required error={f.errors.target}>
        <TextInput type="date" value={f.values.target} onChange={(e) => f.set('target', e.target.value)} invalid={!!f.errors.target} />
      </Field>
    </FormSheet>
  )
}

export function ProjectDetail({ id }: { id: string }) {
  const { company: c, me, can, mutate } = useHub()
  const p = projectOf(c, id)
  const memberIds = p ? [p.pmId, p.sponsorId, ...p.members.map((m) => m.personId)] : []
  const allowed = !!p && (can('manage') || memberIds.includes(me.id))
  const prog = useProgress(p ?? ({ id } as Project))

  if (!p) return <Page title="Project not found"><StateBlock title="Not found" body={`This project isn't in ${c.name}.`} /></Page>
  if (!allowed) return <Page title="Project" forbidden>{null}</Page>

  const h = projectHealth(c, p)
  const decisions = c.decisions.filter((d) => d.ctx === `project:${p.id}`)
  const meetings = c.meetings.filter((m) => m.ctx === `project:${p.id}` && m.status === 'Scheduled')
  const spend = c.expenses.filter((e) => e.projectId === p.id && countable(e)).reduce((s, e) => s + e.amount, 0)
  const isPm = p.pmId === me.id || can('manage')

  const advance = () =>
    mutate((c2, ctx) => {
      const pr = c2.projects.find((x) => x.id === p.id)!
      const i = pr.stages.findIndex((s) => s.status === 'Current')
      if (i < 0) return
      pr.stages[i].status = 'Done'
      if (pr.stages[i + 1]) pr.stages[i + 1].status = 'Current'
      else pr.status = 'Closing'
      if (pr.status === 'Planning') pr.status = 'Active'
      pr.history.unshift({ at: ctx.now, by: ctx.me.id, text: `Stage "${pr.stages[i].name}" marked done` })
      ctx.audit('project.stage', pr.id, pr.stages[i].name)
    })

  return (
    <Page
      title={p.name}
      description={p.purpose}
      crumbs={[{ label: 'Projects', href: '/projects' }]}
      actions={
        <>
          <Link href={`/communications?ctx=project:${p.id}`} className="text-sm font-medium text-info hover:underline">
            Open conversation
          </Link>
          <Link href={`/activities?project=${p.id}`} className="text-sm font-medium text-info hover:underline">
            Activities
          </Link>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Callout tone={h.value === 'On track' ? 'success' : 'warning'} title={`Health: ${h.value}`}>
            <ul className="list-disc pl-4">
              {h.reasons.slice(0, 4).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {h.manual && <p className="mt-1 text-xs">{h.manual}</p>}
          </Callout>

          <Panel title="Stages" description="A stage closes when its owner confirms the required outcome.">
            <ol className="flex flex-col gap-2">
              {p.stages.map((s) => {
                const round = s.approvalId ? c.approvals.find((r) => r.id === s.approvalId) : undefined
                return (
                  <li key={s.name} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.needs}</span>
                      <span className="text-xs text-muted-foreground">
                        Owner <PersonLink id={s.ownerId} />
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {round && <ApprovalProgress decisions={round.stages.flatMap((st) => st.decisions)} compact />}
                      <StatusPill status={s.status} tone={s.status === 'Done' ? 'success' : s.status === 'Current' ? 'info' : 'muted'} />
                      {s.status === 'Current' && isPm && (
                        <Button size="sm" variant="outline" onClick={advance}>
                          Mark done
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </Panel>

          <Panel title="Activities">
            <ActivityTable filter={(a) => a.projectId === p.id} caption={`Activities in ${p.name}`} />
          </Panel>

          <Panel title="Decisions">
            {decisions.length ? (
              <ul className="divide-y divide-border">
                {decisions.map((d) => (
                  <li key={d.id} className="flex flex-col gap-1 py-2">
                    <span className="font-medium text-foreground">{d.title}</span>
                    <span className="text-sm text-muted-foreground">{d.text}</span>
                    <span className="text-xs text-muted-foreground">
                      {d.at} · <PersonLink id={d.deciderId} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No decisions recorded.</p>
            )}
          </Panel>
        </div>

        <aside className="flex flex-col gap-4">
          <Panel title="Summary">
            <div className="flex flex-col gap-3">
              <KV label="Status"><StatusPill status={p.status} /></KV>
              <KV label="Project manager"><PersonLink id={p.pmId} /></KV>
              <KV label="Sponsor"><PersonLink id={p.sponsorId} /></KV>
              <KV label="Owner"><DeptTag id={p.ownerDept} /></KV>
              <KV label="Dates">{p.start} → {p.target}</KV>
              <KV label="Progress">{prog.accepted}/{prog.total} accepted ({prog.pct}%)</KV>
              {p.budget !== undefined && (
                <KV label="Spend">
                  {fmtEUR(spend)} of {fmtEUR(p.budget)}
                </KV>
              )}
              {p.productIds.length > 0 && (
                <KV label="Products">
                  <span className="flex flex-wrap gap-1">
                    {p.productIds.map((pid) => (
                      <Link key={pid} href={`/products/${pid}`} className="text-info hover:underline">
                        {productOf(c, pid)?.name ?? pid}
                      </Link>
                    ))}
                  </span>
                </KV>
              )}
            </div>
          </Panel>
          <Panel title={`Team · ${p.members.length}`}>
            <ul className="flex flex-col gap-2">
              {p.members.map((m) => (
                <li key={m.personId} className="flex items-center justify-between gap-2 text-sm">
                  <PersonLink id={m.personId} />
                  <span className="text-xs text-muted-foreground">{m.role}</span>
                </li>
              ))}
            </ul>
            {p.formerMembers.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Former: {p.formerMembers.map((m) => `${empOf(c, m.personId)?.fullName ?? m.personId} (until ${m.until})`).join(', ')}
              </p>
            )}
          </Panel>
          <Panel title="Upcoming meetings">
            {meetings.length ? (
              <ul className="flex flex-col gap-2 text-sm">
                {meetings.map((m) => (
                  <li key={m.id} className="flex flex-col">
                    <span className="font-medium text-foreground">{m.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.date} {m.time} {m.tz}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">None scheduled.</p>
            )}
          </Panel>
          <Panel title="History">
            <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
              {p.history.slice(0, 8).map((x, i) => (
                <li key={i}>
                  {x.at} · {empOf(c, x.by)?.fullName ?? 'System'} — {x.text}
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </Page>
  )
}
