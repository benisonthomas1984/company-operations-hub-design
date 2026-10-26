'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Lock, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { accessRoleLabel, fmtEUR, goalStatuses, relLabel, TODAY, type GoalStatus } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { directReports, empOf, personAllocation, productivity } from '@/lib/derive'
import { Button } from '@/components/ui/button'
import { Avatar, Callout, DeptTag, KV, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'
import { Page, StateBlock } from '@/components/hub/page'
import { ActivityTable } from '@/components/activities/activity-table'
import { Field, Select, TabBar, TextInput } from '@/components/hub/form'

const goalTone: Record<GoalStatus, string> = {
  'On track': 'bg-info',
  'At risk': 'bg-warning',
  Achieved: 'bg-success',
  Missed: 'bg-destructive',
}

export function EmployeeProfile({ id }: { id: string }) {
  const { company: c, me, can } = useHub()
  const e = empOf(c, id)
  const [tab, setTab] = useState('overview')

  if (!e || e.status === 'vacancy')
    return (
      <Page title="Employee not found" crumbs={[{ label: 'Employees', href: '/employees' }]}>
        <StateBlock title="Not found" body={`This person isn't in ${c.name}.`} />
      </Page>
    )

  const isSelf = me.id === e.id
  const isManagerOf = c.relationships.some((r) => r.from === e.id && r.to === me.id)
  const canAssign = isManagerOf || can('org.edit')
  const canSeePay = isSelf || isManagerOf || can('org.edit')
  const alloc = personAllocation(c, e.id)
  const goals = e.goals ?? []

  return (
    <Page
      title={
        <span className="flex items-center gap-3">
          <Avatar id={e.id} size="lg" />
          <span className="flex flex-col">
            {e.fullName}
            <span className="text-sm font-normal text-muted-foreground">{e.designation}</span>
          </span>
        </span>
      }
      crumbs={[{ label: 'Employees', href: '/employees' }]}
      actions={
        <Link href={`/activities?owner=${e.id}`} className="text-sm font-medium text-info hover:underline">
          View activities
        </Link>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <TabBar
            label="Employee sections"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'review', label: 'Performance review', count: goals.length },
              ...(canSeePay ? [{ id: 'value', label: 'Time & cost', count: alloc.rows.filter((r) => !r.former).length }] : []),
              { id: 'activities', label: 'Activities' },
            ]}
          />
          {tab === 'overview' && <Overview id={e.id} canAssign={canAssign} />}
          {tab === 'review' && <Review id={e.id} canEdit={canAssign} canSee={canSeePay || can('manage')} />}
          {tab === 'value' && canSeePay && <TimeValue id={e.id} />}
          {tab === 'activities' && (
            <Panel title="Activities">
              <ActivityTable filter={(a) => a.ownerId === e.id} caption={`Activities owned by ${e.fullName}`} empty="No activities you can see for this person." />
            </Panel>
          )}
        </div>
        <Sidebar id={e.id} canSeePay={canSeePay} />
      </div>
    </Page>
  )
}

function Overview({ id, canAssign }: { id: string; canAssign: boolean }) {
  const { company: c, mutate } = useHub()
  const e = empOf(c, id)!
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const resp = c.responsibilities.filter((r) => r.employeeId === id && r.status === 'Active')
  const alloc = personAllocation(c, id)

  const addResp = (ev: React.FormEvent) => {
    ev.preventDefault()
    const text = draft.trim()
    if (!text) return
    mutate((c2, ctx) => {
      const rid = ctx.id('RSP')
      c2.responsibilities.push({ id: rid, employeeId: id, title: text, description: text, scope: '', assignerId: ctx.me.id, effective: TODAY, approvalRequired: false, status: 'Active', versions: [{ v: 1, text, at: ctx.now, by: ctx.me.id, note: 'Assigned' }] })
      ctx.audit('responsibility.assign', rid, `${text} → ${e.fullName}`)
    })
    toast.success('Responsibility added')
    setDraft('')
  }

  const removeResp = (rid: string) => {
    mutate((c2, ctx) => {
      const r = c2.responsibilities.find((x) => x.id === rid)
      if (!r) return
      r.status = 'Removed'
      ctx.audit('responsibility.remove', rid, `${r.title} — ${e.fullName}`)
    })
    toast.success('Responsibility removed')
  }

  return (
    <>
      <Panel
        title="Responsibilities"
        description="Ongoing accountabilities, separate from time-bound activities."
        action={
          canAssign &&
          !adding && (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus aria-hidden /> Add
            </Button>
          )
        }
      >
        {resp.length ? (
          <ul className="flex flex-col">
            {resp.map((r) => (
              <li key={r.id} className="group flex items-start gap-3 rounded-md px-1 py-1.5 hover:bg-muted/60">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="flex-1 text-sm leading-relaxed text-foreground" title={`Since ${r.effective} · assigned by ${empOf(c, r.assignerId)?.fullName ?? 'Unknown'}`}>
                  {r.title}
                </span>
                {canAssign && (
                  <button type="button" onClick={() => removeResp(r.id)} className="rounded p-1 text-muted-foreground opacity-0 hover:bg-background hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100" aria-label={`Remove responsibility: ${r.title}`}>
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          !adding && <p className="text-sm text-muted-foreground">No responsibilities yet.</p>
        )}
        {adding && (
          <form onSubmit={addResp} className="mt-2 flex items-center gap-2">
            <TextInput autoFocus value={draft} onChange={(ev) => setDraft(ev.target.value)} onKeyDown={(ev) => ev.key === 'Escape' && setAdding(false)} placeholder="e.g. Review integration pull requests within two days" aria-label="New responsibility" className="flex-1" />
            <Button type="submit" size="sm" disabled={!draft.trim()}>Add</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setAdding(false); setDraft('') }}>Done</Button>
          </form>
        )}
      </Panel>

      <Panel title="Projects" description="Role, share of working time and delivery record on each project.">
        {alloc.rows.length ? (
          <ul className="flex flex-col divide-y divide-border">
            {alloc.rows.map((r) => (
              <li key={r.project.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                <span className="flex min-w-0 flex-col">
                  <Link href={`/projects/${r.project.id}`} className="font-medium text-info hover:underline">{r.project.name}</Link>
                  <span className="text-xs text-muted-foreground">{r.role}{r.former ? ' · former member' : ''}</span>
                </span>
                <span className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span><span className="font-mono text-foreground">{r.allocation}%</span> time</span>
                  <span><span className="font-mono text-foreground">{r.accepted.length}/{r.acts.length}</span> accepted</span>
                  {r.overdue.length > 0 && <span className="text-destructive">{r.overdue.length} overdue</span>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Not on any project.</p>
        )}
      </Panel>
    </>
  )
}

function Review({ id, canEdit, canSee }: { id: string; canEdit: boolean; canSee: boolean }) {
  const { company: c, mutate } = useHub()
  const e = empOf(c, id)!
  const prod = productivity(c, id)
  const alloc = personAllocation(c, id)
  const goals = e.goals ?? []
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', measure: '', due: '' })

  if (!canSee)
    return (
      <Callout tone="muted" title="Restricted" icon={<Lock className="size-4" />}>
        Performance reviews are visible to this person, their manager and HR.
      </Callout>
    )

  const addGoal = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.title.trim() || !form.due) return
    mutate((c2, ctx) => {
      const emp = c2.employees.find((x) => x.id === id)
      if (!emp) return
      const gid = ctx.id('GOL')
      emp.goals = [...(emp.goals ?? []), { id: gid, title: form.title.trim(), measure: form.measure.trim(), due: form.due, status: 'On track', setBy: ctx.me.id, setAt: TODAY }]
      ctx.audit('goal.set', gid, `${form.title.trim()} → ${emp.fullName}`)
    })
    toast.success('Goal added')
    setForm({ title: '', measure: '', due: '' })
    setAdding(false)
  }

  const setStatus = (gid: string, status: GoalStatus) =>
    mutate((c2, ctx) => {
      const goal = c2.employees.find((x) => x.id === id)?.goals?.find((x) => x.id === gid)
      if (!goal) return
      goal.status = status
      ctx.audit('goal.status', gid, `${goal.title} → ${status}`)
    })

  const achieved = goals.filter((g) => g.status === 'Achieved').length
  const rate = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—')

  return (
    <>
      <Panel title="Review summary" description="Evidence from goals, accepted work and project contribution. Each measure stands on its own.">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Measure label="Goals achieved" value={`${achieved}/${goals.length}`} />
          <Measure label="Commitments accepted" value={`${prod.accepted.length}/${prod.commitments.length}`} />
          <Measure label="On-time delivery" value={rate(prod.onTime.length, prod.accepted.length)} />
          <Measure label="First-pass acceptance" value={rate(prod.firstPass.length, prod.accepted.length)} />
        </dl>
      </Panel>

      <Panel
        title="Goals"
        description="Agreed with the manager. Updated through the review period."
        action={canEdit && !adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add goal
          </Button>
        )}
      >
        {goals.length ? (
          <ul className="flex flex-col divide-y divide-border">
            {goals.map((g) => (
              <li key={g.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{g.title}</span>
                  {g.measure && <span className="text-sm leading-relaxed text-muted-foreground">{g.measure}</span>}
                  <span className="text-xs text-muted-foreground">Due {g.due} · set by {empOf(c, g.setBy)?.fullName ?? 'Unknown'}{g.note ? ` · ${g.note}` : ''}</span>
                </span>
                {canEdit ? (
                  <Select aria-label={`Status of ${g.title}`} value={g.status} onChange={(ev) => setStatus(g.id, ev.target.value as GoalStatus)} options={goalStatuses.map((s) => ({ value: s, label: s }))} className="w-32" />
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-foreground">
                    <span aria-hidden className={`size-2 rounded-full ${goalTone[g.status]}`} />
                    {g.status}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          !adding && <p className="text-sm text-muted-foreground">No goals set for this review period.</p>
        )}
        {adding && (
          <form onSubmit={addGoal} className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_160px]">
            <Field label="Goal" required>
              <TextInput autoFocus value={form.title} onChange={(ev) => setForm({ ...form, title: ev.target.value })} placeholder="e.g. Ship the billing connector" />
            </Field>
            <Field label="How it is measured">
              <TextInput value={form.measure} onChange={(ev) => setForm({ ...form, measure: ev.target.value })} placeholder="e.g. Accepted with tests green" />
            </Field>
            <Field label="Due" required>
              <TextInput type="date" value={form.due} onChange={(ev) => setForm({ ...form, due: ev.target.value })} />
            </Field>
            <div className="flex gap-2 md:col-span-3">
              <Button type="submit" size="sm" disabled={!form.title.trim() || !form.due}>Save goal</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </Panel>

      <Panel title="Project contribution" description="What was delivered on each project this person works on.">
        {alloc.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Project contribution for {e.fullName}</caption>
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Project</th>
                  <th className="py-2 pr-3 font-medium">Activities</th>
                  <th className="py-2 pr-3 font-medium">Accepted</th>
                  <th className="py-2 pr-3 font-medium">On time</th>
                  <th className="py-2 font-medium">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {alloc.rows.map((r) => (
                  <tr key={r.project.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3"><Link href={`/projects/${r.project.id}`} className="text-info hover:underline">{r.project.name}</Link></td>
                    <td className="py-2 pr-3 font-mono">{r.acts.length}</td>
                    <td className="py-2 pr-3 font-mono">{r.accepted.length}</td>
                    <td className="py-2 pr-3 font-mono">{r.onTime.length}</td>
                    <td className={`py-2 font-mono ${r.overdue.length ? 'text-destructive' : ''}`}>{r.overdue.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not on any project.</p>
        )}
      </Panel>
    </>
  )
}

function Measure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xl text-foreground">{value}</dd>
    </div>
  )
}

function TimeValue({ id }: { id: string }) {
  const { company: c } = useHub()
  const e = empOf(c, id)!
  const a = personAllocation(c, id)
  const active = a.rows.filter((r) => !r.former && r.allocation > 0)

  if (!a.salary)
    return (
      <Callout tone="muted" title="No salary recorded">
        Add a salary for {e.fullName} to see how their cost is distributed across projects.
      </Callout>
    )

  return (
    <>
      <Panel title="Where the monthly salary goes" description={`${fmtEUR(a.monthly)} a month (${fmtEUR(a.salary)} a year ÷ 12), split by allocation % on each project.`}>
        <div className="flex flex-col gap-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`${a.allocated}% allocated to projects, ${a.unallocated}% unallocated`}>
            {active.map((r, i) => (
              <span key={r.project.id} className={i % 2 ? 'bg-primary/60' : 'bg-primary'} style={{ width: `${Math.min(r.allocation, 100)}%` }} title={`${r.project.name} · ${r.allocation}%`} />
            ))}
          </div>
          <ul className="flex flex-col divide-y divide-border text-sm">
            {active.map((r) => (
              <li key={r.project.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/projects/${r.project.id}?tab=budget`} className="min-w-0 truncate text-info hover:underline">{r.project.name}</Link>
                <span className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-mono">{r.allocation}%</span>
                  <span className="w-20 text-right font-mono text-foreground">{fmtEUR(r.monthlyValue)}</span>
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 py-2">
              <span className="text-muted-foreground">Not allocated to a project</span>
              <span className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="font-mono">{a.unallocated}%</span>
                <span className={`w-20 text-right font-mono ${a.unallocated > 0 ? 'text-warning' : 'text-foreground'}`}>{fmtEUR(a.unallocatedMonthly)}</span>
              </span>
            </li>
          </ul>
          {a.overAllocated && (
            <Callout tone="warning" title={`Over-allocated: ${a.allocated}%`}>
              Project allocations add up to more than 100% of working time. Lower an allocation on one of the projects.
            </Callout>
          )}
          {!a.overAllocated && a.unallocated > 0 && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {fmtEUR(a.unallocatedMonthly)} a month is not attributed to any project. It counts as department operating cost: responsibilities, department activities and support work.
            </p>
          )}
        </div>
      </Panel>

      <Panel title="Cost charged to projects so far" description="Annual salary ÷ 365 × days on the project × allocation %. The same figure appears in each project's Budget & cost tab.">
        <ul className="flex flex-col divide-y divide-border text-sm">
          {a.rows.map((r) => (
            <li key={r.project.id} className="flex items-center justify-between gap-3 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-foreground">{r.project.name}</span>
                <span className="text-xs text-muted-foreground">{r.project.start} → {r.project.target}{r.former ? ' · left project' : ''}</span>
              </span>
              <span className="font-mono text-foreground">{fmtEUR(r.costToDate)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}

function Sidebar({ id, canSeePay }: { id: string; canSeePay: boolean }) {
  const { company: c, me, can } = useHub()
  const e = empOf(c, id)!
  const isSelf = me.id === id
  const isManagerOf = c.relationships.some((r) => r.from === id && r.to === me.id)
  const seePersonal = isSelf || can('org.edit')
  const outgoing = c.relationships.filter((r) => r.from === id)
  const reports = directReports(c, id)
  const prod = productivity(c, id)
  const alloc = personAllocation(c, id)

  return (
    <aside className="flex flex-col gap-4">
      <Panel title="Work profile">
        <div className="flex flex-col gap-3">
          <KV label="Status"><StatusPill status={e.status} /></KV>
          <KV label="Department"><DeptTag id={e.dept} /></KV>
          <KV label="Email"><a href={`mailto:${e.email}`} className="text-info hover:underline">{e.email}</a></KV>
          <KV label="Location">{e.location}</KV>
          <KV label="Joined">{e.joined}</KV>
          <KV label="Access">{accessRoleLabel[e.accessRole]}</KV>
        </div>
      </Panel>
      <Panel title="Compensation">
        {canSeePay ? (
          <div className="flex flex-col gap-3">
            <KV label="Annual salary"><span className="font-mono">{e.salary ? fmtEUR(e.salary) : 'Not recorded'}</span></KV>
            <KV label="Monthly"><span className="font-mono">{e.salary ? fmtEUR(alloc.monthly) : '—'}</span></KV>
            <KV label="Allocated to projects"><span className={`font-mono ${alloc.overAllocated ? 'text-destructive' : ''}`}>{alloc.allocated}%</span></KV>
          </div>
        ) : (
          <Callout tone="muted" title="Restricted" icon={<Lock className="size-4" />}>
            Visible to this person, their manager and HR.
          </Callout>
        )}
      </Panel>
      <Panel title="Reporting lines">
        <div className="flex flex-col gap-3">
          {outgoing.length ? (
            outgoing.map((r) => (
              <KV key={r.id} label={relLabel[r.type]}>
                <PersonLink id={r.to} showRole />
              </KV>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Top of the organization.</p>
          )}
          {reports.length > 0 && (
            <KV label={`Direct reports · ${reports.length}`}>
              <span className="flex flex-col gap-1">
                {reports.map((r) => <PersonLink key={r} id={r} />)}
              </span>
            </KV>
          )}
        </div>
      </Panel>
      {(isSelf || isManagerOf || can('manage')) && (
        <Panel title="Delivery · this period">
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <span><span className="font-mono text-foreground">{prod.accepted.length}</span> of {prod.commitments.length} commitments accepted</span>
            <span><span className="font-mono text-foreground">{prod.onTime.length}</span> on time · {prod.late.length} late · {prod.revised.length} revised</span>
            <Link href={`/productivity?person=${id}`} className="text-info hover:underline">Open productivity</Link>
          </div>
        </Panel>
      )}
      <Panel title="Personal details">
        {seePersonal ? (
          <div className="flex flex-col gap-3">
            <KV label="Phone">{e.phone ?? '—'}</KV>
            <KV label="Date of birth">{e.dob ?? '—'}</KV>
            <KV label="Emergency contact">{e.emergency ?? '—'}</KV>
          </div>
        ) : (
          <Callout tone="muted" title="Restricted" icon={<Lock className="size-4" />}>
            Visible only to this person and HR.
          </Callout>
        )}
      </Panel>
    </aside>
  )
}
