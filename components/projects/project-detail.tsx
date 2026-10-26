'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Receipt, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Expense, ExpenseCategory, Project } from '@/lib/fixtures'
import { fmtEUR, TODAY } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { empOf, productOf, projectCost, projectHealth, projectOf } from '@/lib/derive'
import { Conversation, DecisionsPanel, EmptyLine, FilesPanel, HistoryList, MeetingsPanel, TabHeader } from '@/components/workspace/collab'
import { buildRound } from '@/components/approvals/approvals'
import { APPROVAL_THRESHOLD, categories } from '@/components/finance/finance'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, PersonLink, StatusPill } from '@/components/hub/primitives'
import { Page, StateBlock } from '@/components/hub/page'
import { ActivityTable } from '@/components/activities/activity-table'
import { CreateActivity } from '@/components/activities/activities-workspace'
import { Field, FormSheet, PeoplePicker, Select, TabBar, TextArea, TextInput, required, useForm, usePeopleOptions } from '@/components/hub/form'

type Stage = Project['stages'][number]
const healthTone = { 'On track': 'success', 'At risk': 'warning', Blocked: 'danger' } as const

/** Keeps stage order meaningful: done stages stay done, the first open stage is current. */
function normalizeStages(stages: Stage[]) {
  let current = false
  stages.forEach((s) => {
    if (s.status === 'Done') return
    s.status = current ? 'Upcoming' : 'Current'
    current = true
  })
}

function useProjectEditor(projectId: string) {
  const { mutate } = useHub()
  return (summary: string, fn: (p: Project) => void) =>
    mutate((c2, ctx) => {
      const pr = c2.projects.find((x) => x.id === projectId)
      if (!pr) return
      fn(pr)
      pr.history.unshift({ at: ctx.now, by: ctx.me.id, text: summary })
      ctx.audit('project.update', pr.id, summary)
    })
}

export function ProjectDetail({ id }: { id: string }) {
  const { company: c, me, can } = useHub()
  const p = projectOf(c, id)
  const [tab, setTab] = useState('conversation')
  const [editOpen, setEditOpen] = useState(false)

  if (!p) return <Page title="Project not found"><StateBlock title="Not found" body={`This project isn't in ${c.name}.`} /></Page>
  const memberIds = [p.pmId, p.sponsorId, ...p.members.map((m) => m.personId)]
  if (!(can('manage') || memberIds.includes(me.id))) return <Page title="Project" forbidden>{null}</Page>

  const canEdit = can('manage') || p.pmId === me.id
  const canSeeCost = canEdit || can('finance.read') || p.sponsorId === me.id
  const ctxKey = `project:${p.id}`
  const count = {
    conversation: c.messages.filter((m) => m.ctx === ctxKey).length,
    activities: c.activities.filter((a) => a.projectId === p.id).length,
    people: p.members.length,
    stages: p.stages.length,
    decisions: c.decisions.filter((d) => d.ctx === ctxKey).length,
    files: c.files.filter((f) => f.ctx === ctxKey).length,
    meetings: c.meetings.filter((m) => m.ctx === ctxKey && m.status === 'Scheduled').length,
  }

  return (
    <Page
      title={p.name}
      description={p.purpose}
      crumbs={[{ label: 'Projects', href: '/projects' }]}
      actions={
        canEdit && (
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil aria-hidden /> Edit details
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <ProjectSummary p={p} />
        <TabBar
          label="Project sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'conversation', label: 'Conversation', count: count.conversation },
            { id: 'activities', label: 'Activities', count: count.activities },
            { id: 'people', label: 'People', count: count.people },
            { id: 'stages', label: 'Stages', count: count.stages },
            ...(canSeeCost ? [{ id: 'budget', label: 'Budget & cost' }] : []),
            { id: 'decisions', label: 'Decisions', count: count.decisions },
            { id: 'files', label: 'Files', count: count.files },
            { id: 'meetings', label: 'Meetings', count: count.meetings },
            { id: 'history', label: 'History' },
          ]}
        />
        <div role="tabpanel" aria-label={tab}>
          {tab === 'conversation' && <Conversation ctx={ctxKey} name={p.name} canPost={memberIds.includes(me.id) || can('manage')} readOnlyHint="Only project members can post." />}
          {tab === 'activities' && <ActivitiesTab p={p} />}
          {tab === 'people' && <PeopleTab p={p} canEdit={canEdit} />}
          {tab === 'stages' && <StagesTab p={p} canEdit={canEdit} />}
          {tab === 'budget' && canSeeCost && <BudgetTab p={p} canEdit={canEdit} />}
          {tab === 'decisions' && <DecisionsPanel ctx={ctxKey} />}
          {tab === 'files' && <FilesPanel ctx={ctxKey} />}
          {tab === 'meetings' && <MeetingsPanel ctx={ctxKey} defaultAttendees={Array.from(new Set(memberIds))} />}
          {tab === 'history' && <HistoryList items={p.history} />}
        </div>
      </div>
      {canEdit && <EditProject p={p} open={editOpen} onOpenChange={setEditOpen} />}
    </Page>
  )
}

function ProjectSummary({ p }: { p: Project }) {
  const { company: c } = useHub()
  const acts = c.activities.filter((a) => a.projectId === p.id && a.status !== 'Cancelled')
  const accepted = acts.filter((a) => a.status === 'Accepted').length
  const pct = acts.length ? Math.round((accepted / acts.length) * 100) : 0
  const h = projectHealth(c, p)
  const spend = projectCost(c, p).toDate

  return (
    <section aria-label="Project summary" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <span className="flex items-center gap-2">
          <StatusPill status={p.status} />
          <StatusPill status={h.value} tone={healthTone[h.value as keyof typeof healthTone] ?? 'muted'} />
        </span>
        <Fact label="Project manager"><PersonLink id={p.pmId} /></Fact>
        <Fact label="Sponsor"><PersonLink id={p.sponsorId} /></Fact>
        <Fact label="Target">{p.target}</Fact>
        {p.budget !== undefined && <Fact label="Cost to date">{fmtEUR(spend)} of {fmtEUR(p.budget)}</Fact>}
        {p.productIds.length > 0 && (
          <Fact label="Products">
            {p.productIds.map((pid, i) => (
              <span key={pid}>
                {i > 0 && ', '}
                <Link href={`/products/${pid}`} className="text-info hover:underline">{productOf(c, pid)?.name ?? pid}</Link>
              </span>
            ))}
          </Fact>
        )}
        <div className="flex min-w-40 flex-1 items-center gap-2">
          <Progress value={pct} className="h-1.5" aria-label={`${pct}% of activities accepted`} />
          <span className="shrink-0 text-xs text-muted-foreground">{accepted}/{acts.length} done</span>
        </div>
      </div>
      {p.stages.length > 0 && (
        <ol aria-label="Stages" className="flex gap-1">
          {p.stages.map((s, i) => (
            <li key={i} className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className={cn('h-1.5 rounded-full', s.status === 'Done' ? 'bg-success' : s.status === 'Current' ? 'bg-primary' : 'bg-muted')} />
              <span className={cn('truncate text-xs', s.status === 'Current' ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {s.status === 'Done' && <Check className="mr-0.5 inline size-3 text-success" aria-hidden />}
                {s.name}
                <span className="sr-only"> — {s.status}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      {h.value !== 'On track' && h.reasons.length > 0 && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Why {h.value.toLowerCase()}:</span> {h.reasons.slice(0, 3).join(' · ')}
        </p>
      )}
    </section>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </span>
  )
}

/* ——— Activities ——— */

function ActivitiesTab({ p }: { p: Project }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <TabHeader text="Every piece of work in this project. Accepted activities count towards progress.">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus aria-hidden /> New activity
        </Button>
      </TabHeader>
      <ActivityTable filter={(a) => a.projectId === p.id} caption={`Activities in ${p.name}`} empty="No activities yet." />
      <CreateActivity open={open} onOpenChange={setOpen} preset={{ projectId: p.id, dept: p.ownerDept }} />
    </div>
  )
}

/* ——— People ——— */

function PeopleTab({ p, canEdit }: { p: Project; canEdit: boolean }) {
  const { company: c } = useHub()
  const edit = useProjectEditor(p.id)
  const memberIds = new Set(p.members.map((m) => m.personId))
  const options = usePeopleOptions((pid) => !memberIds.has(pid))
  const [person, setPerson] = useState('')
  const [role, setRole] = useState('')
  const [alloc, setAlloc] = useState('100')

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!person) return
    const name = empOf(c, person)?.fullName ?? person
    const allocation = clampPct(alloc)
    edit(`${name} added as ${role.trim() || 'Member'} at ${allocation}%`, (pr) => {
      pr.members.push({ personId: person, role: role.trim() || 'Member', allocation })
      pr.formerMembers = pr.formerMembers.filter((f) => f.personId !== person)
    })
    toast.success(`${name} added to the project`)
    setPerson('')
    setRole('')
    setAlloc('100')
  }

  const setAllocFor = (pid: string, next: number) => edit(`Time on project for ${empOf(c, pid)?.fullName ?? pid} set to ${next}%`, (pr) => {
    const m = pr.members.find((x) => x.personId === pid)
    if (m) m.allocation = next
  })

  const remove = (pid: string) => {
    const name = empOf(c, pid)?.fullName ?? pid
    edit(`${name} removed`, (pr) => {
      const m = pr.members.find((x) => x.personId === pid)
      pr.members = pr.members.filter((x) => x.personId !== pid)
      if (m) pr.formerMembers.push({ ...m, until: TODAY })
    })
    toast.success(`${name} removed from the project`)
  }

  const setRoleFor = (pid: string, next: string) => edit(`Role for ${empOf(c, pid)?.fullName ?? pid} changed to ${next}`, (pr) => {
    const m = pr.members.find((x) => x.personId === pid)
    if (m) m.role = next
  })

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <form onSubmit={add} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center">
          <Select options={options} value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Choose a person…" aria-label="Person to add" className="sm:w-64" />
          <TextInput value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role on this project (e.g. Designer)" aria-label="Role" className="flex-1" />
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <TextInput type="number" min={5} max={100} step={5} value={alloc} onChange={(e) => setAlloc(e.target.value)} aria-label="Percent of time on this project" className="w-20" />
            % time
          </label>
          <Button type="submit" size="sm" disabled={!person}>
            <Plus aria-hidden /> Add to project
          </Button>
        </form>
      )}
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
        {p.members.map((m) => (
          <li key={m.personId} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <div className="min-w-48 flex-1">
              <PersonLink id={m.personId} showRole />
            </div>
            {m.personId === p.pmId && <StatusPill status="Project manager" tone="info" />}
            {m.personId === p.sponsorId && <StatusPill status="Sponsor" tone="muted" />}
            {canEdit ? (
              <RoleInput value={m.role} onSave={(v) => setRoleFor(m.personId, v)} />
            ) : (
              <span className="text-sm text-muted-foreground">{m.role}</span>
            )}
            {canEdit ? (
              <AllocInput value={m.allocation ?? 100} onSave={(v) => setAllocFor(m.personId, v)} />
            ) : (
              <span className="w-20 text-right text-sm tabular-nums text-muted-foreground">{m.allocation ?? 100}%</span>
            )}
            {canEdit && m.personId !== p.pmId && (
              <Button size="icon" variant="ghost" className="size-8" onClick={() => remove(m.personId)} aria-label={`Remove ${empOf(c, m.personId)?.fullName}`}>
                <X aria-hidden />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {p.formerMembers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Former members: {p.formerMembers.map((m) => `${empOf(c, m.personId)?.fullName ?? m.personId} (${m.role}, until ${m.until})`).join(', ')}
        </p>
      )}
    </div>
  )
}

function RoleInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value)
  const commit = () => {
    const next = v.trim()
    if (next && next !== value) onSave(next)
    else setV(value)
  }
  return (
    <TextInput
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
      aria-label="Project role"
      className="h-8 w-52 border-transparent bg-transparent hover:border-border focus:border-border"
    />
  )
}

const clampPct = (v: string | number) => Math.min(100, Math.max(5, Math.round(Number(v) || 100)))

function AllocInput({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value))
  const commit = () => {
    const next = clampPct(v)
    setV(String(next))
    if (next !== value) onSave(next)
  }
  return (
    <label className="flex items-center gap-1 text-sm text-muted-foreground">
      <TextInput
        type="number"
        min={5}
        max={100}
        step={5}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        aria-label="Percent of time on this project"
        className="h-8 w-16 border-transparent bg-transparent text-right tabular-nums hover:border-border focus:border-border"
      />
      %
    </label>
  )
}

/* ——— Budget & cost ——— */

function BudgetTab({ p, canEdit }: { p: Project; canEdit: boolean }) {
  const { company: c, can } = useHub()
  const [open, setOpen] = useState(false)
  const cost = projectCost(c, p)
  const showSalary = can('finance.read') || can('org.edit')
  const budget = p.budget
  const used = budget ? Math.min(100, Math.round((cost.toDate / budget) * 100)) : 0
  const over = budget !== undefined && cost.projected > budget

  return (
    <div className="flex flex-col gap-4">
      <TabHeader text="Cost = each person’s salary × time on the project (% allocation) + approved expenses. Pending expenses count in the projection only.">
        {canEdit && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus aria-hidden /> Add expense
          </Button>
        )}
      </TabHeader>

      <section aria-label="Cost summary" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Budget" value={budget !== undefined ? fmtEUR(budget) : 'Not set'} />
          <Stat label="Cost to date" value={fmtEUR(cost.toDate)} sub={`${fmtEUR(cost.peopleToDate)} people · ${fmtEUR(cost.expensesTotal)} expenses`} />
          <Stat label="Projected at target" value={fmtEUR(cost.projected)} sub={`through ${p.target}`} tone={over ? 'danger' : undefined} />
          <Stat label={budget !== undefined && cost.projected > budget ? 'Projected overrun' : 'Projected remaining'} value={budget !== undefined ? fmtEUR(Math.abs(budget - cost.projected)) : '—'} tone={over ? 'danger' : 'success'} />
        </dl>
        {budget !== undefined && (
          <div className="flex items-center gap-3">
            <Progress value={used} className={cn('h-2', over && '[&>*]:bg-destructive')} aria-label={`${used}% of budget used`} />
            <span className="shrink-0 text-xs text-muted-foreground">{used}% used</span>
          </div>
        )}
        {cost.missingSalary.length > 0 && (
          <p className="text-xs text-warning-foreground">
            No salary on file for {cost.missingSalary.map((id) => empOf(c, id)?.fullName ?? id).join(', ')} — their time is counted as €0. Add it on their employee profile.
          </p>
        )}
      </section>

      <section aria-labelledby="people-cost" className="flex flex-col gap-2">
        <h3 id="people-cost" className="text-sm font-semibold text-foreground">People cost</h3>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Person</th>
                <th scope="col" className="px-4 py-2 font-medium">Role</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Time</th>
                {showSalary && <th scope="col" className="px-4 py-2 text-right font-medium">Annual salary</th>}
                <th scope="col" className="px-4 py-2 text-right font-medium">Days</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">To date</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Projected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cost.people.map((l) => (
                <tr key={`${l.personId}-${l.former ? 'f' : 'c'}`} className={cn(l.former && 'text-muted-foreground')}>
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-2">
                      <PersonLink id={l.personId} />
                      {l.former && <span className="text-xs">(left)</span>}
                    </span>
                  </td>
                  <td className="px-4 py-2">{l.role}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{l.allocation}%</td>
                  {showSalary && <td className="px-4 py-2 text-right tabular-nums">{l.salary ? fmtEUR(l.salary) : '—'}</td>}
                  <td className="px-4 py-2 text-right tabular-nums">{l.daysToDate}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtEUR(l.costToDate)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtEUR(l.projected)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border font-medium">
              <tr>
                <td className="px-4 py-2" colSpan={showSalary ? 5 : 4}>Total people cost</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtEUR(cost.peopleToDate)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtEUR(cost.peopleProjected)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section aria-labelledby="project-expenses" className="flex flex-col gap-2">
        <h3 id="project-expenses" className="text-sm font-semibold text-foreground">Expenses</h3>
        {cost.expenses.length ? (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {cost.expenses.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <div className="flex min-w-48 flex-1 flex-col">
                  <span className="font-medium text-foreground">{e.description}</span>
                  <span className="text-xs text-muted-foreground">{e.payee} · {e.category} · {e.date}</span>
                </div>
                <StatusPill status={e.status} />
                <span className="w-24 text-right tabular-nums text-foreground">{fmtEUR(e.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyLine icon={<Receipt className="size-5" aria-hidden />} text="No expenses charged to this project yet." />
        )}
      </section>
      {canEdit && <ProjectExpenseSheet p={p} open={open} onOpenChange={setOpen} />}
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'danger' | 'success' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-lg font-semibold tabular-nums text-foreground', tone === 'danger' && 'text-destructive', tone === 'success' && 'text-success')}>{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  )
}

function ProjectExpenseSheet({ p, open, onOpenChange }: { p: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { company: c, mutate } = useHub()
  const f = useForm({ description: '', payee: '', category: 'Tools & software', amount: '' })
  const owner = c.employees.find((e) => e.accessRole === 'owner')
  const submit = () => {
    const ok = f.validate({
      description: required('Description'),
      payee: required('Payee'),
      amount: (v: string) => (!(Number(v) > 0) ? 'Enter an amount greater than zero' : undefined),
    })
    if (!ok) return
    const amount = Math.round(Number(f.values.amount) * 100) / 100
    const needsApproval = amount >= APPROVAL_THRESHOLD
    mutate((c2, ctx) => {
      const id = ctx.id('EXP')
      const wf = c2.workflows.find((w) => w.appliesTo === 'Expense')
      const approverIds = wf?.stages.flatMap((s) => s.approverIds) ?? (owner ? [owner.id] : [])
      const exp: Expense = {
        id,
        description: f.values.description,
        payee: f.values.payee,
        category: f.values.category as ExpenseCategory,
        amount,
        currency: 'EUR',
        date: TODAY,
        dept: p.ownerDept,
        projectId: p.id,
        allocations: [],
        approvalRequired: needsApproval,
        status: needsApproval ? 'Submitted' : 'Approved · unpaid',
        submittedBy: ctx.me.id,
        source: 'Manual entry',
        history: [{ at: ctx.now, by: ctx.me.id, text: needsApproval ? 'Submitted for approval' : `Auto-approved (under ${fmtEUR(APPROVAL_THRESHOLD)})` }],
      }
      if (needsApproval) {
        const rid = ctx.id('APR')
        buildRound(c2, { id: rid, itemType: 'Expense', itemId: id, itemTitle: exp.description, revision: 'r1', approverIds, submittedBy: ctx.me.id, now: ctx.now, summary: `${exp.payee} · ${fmtEUR(amount)}`, amount })
        exp.approvalId = rid
      }
      c2.expenses.unshift(exp)
      c2.projects.find((x) => x.id === p.id)?.history.unshift({ at: ctx.now, by: ctx.me.id, text: `Expense added: ${exp.description} (${fmtEUR(amount)})` })
      ctx.audit('expense.submit', id, fmtEUR(amount))
    })
    toast.success(needsApproval ? 'Expense submitted for approval' : 'Expense recorded')
    f.reset()
    onOpenChange(false)
  }
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Add project expense" description={`Charged to ${p.name}. ${fmtEUR(APPROVAL_THRESHOLD)} or more goes to approval first.`} onSubmit={submit} submitLabel="Add expense">
      <Field label="Description" required error={f.errors.description}>
        <TextInput value={f.values.description} onChange={(e) => f.set('description', e.target.value)} invalid={!!f.errors.description} placeholder="e.g. Usability test incentives" />
      </Field>
      <Field label="Payee" required error={f.errors.payee}>
        <TextInput value={f.values.payee} onChange={(e) => f.set('payee', e.target.value)} invalid={!!f.errors.payee} />
      </Field>
      <Field label="Amount (EUR)" required error={f.errors.amount}>
        <TextInput type="number" inputMode="decimal" min="0" step="0.01" value={f.values.amount} onChange={(e) => f.set('amount', e.target.value)} invalid={!!f.errors.amount} />
      </Field>
      <Field label="Category">
        <Select value={f.values.category} onChange={(e) => f.set('category', e.target.value)} options={categories.map((x) => ({ value: x, label: x }))} />
      </Field>
    </FormSheet>
  )
}

/* ——— Stages ——— */

function StagesTab({ p, canEdit }: { p: Project; canEdit: boolean }) {
  const edit = useProjectEditor(p.id)
  const [sheet, setSheet] = useState<{ index: number | null } | null>(null)

  const move = (i: number, dir: -1 | 1) => edit(`Stage "${p.stages[i].name}" moved ${dir < 0 ? 'up' : 'down'}`, (pr) => {
    const j = i + dir
    ;[pr.stages[i], pr.stages[j]] = [pr.stages[j], pr.stages[i]]
    normalizeStages(pr.stages)
  })
  const remove = (i: number) => {
    edit(`Stage "${p.stages[i].name}" removed`, (pr) => {
      pr.stages.splice(i, 1)
      normalizeStages(pr.stages)
    })
    toast.success('Stage removed')
  }
  const complete = (i: number) => {
    edit(`Stage "${p.stages[i].name}" marked done`, (pr) => {
      pr.stages[i].status = 'Done'
      normalizeStages(pr.stages)
      if (pr.status === 'Planning') pr.status = 'Active'
      if (pr.stages.every((s) => s.status === 'Done')) pr.status = 'Closing'
    })
    toast.success('Stage completed')
  }

  return (
    <div className="flex flex-col gap-3">
      <TabHeader text="Stages run in order. Completing the current stage moves the project to the next one.">
        {canEdit && (
          <Button size="sm" onClick={() => setSheet({ index: null })}>
            <Plus aria-hidden /> Add stage
          </Button>
        )}
      </TabHeader>
      {p.stages.length ? (
        <ol className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {p.stages.map((s, i) => {
            const locked = s.status === 'Done'
            const prevOpen = i > 0 && p.stages[i - 1].status !== 'Done'
            const nextOpen = i < p.stages.length - 1
            return (
              <li key={`${i}-${s.name}`} className={cn('flex flex-wrap items-center gap-3 px-4 py-3', s.status === 'Current' && 'bg-accent/40')}>
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                    s.status === 'Done' && 'border-success bg-success text-success-foreground',
                    s.status === 'Current' && 'border-primary bg-primary text-primary-foreground',
                    s.status === 'Upcoming' && 'border-border text-muted-foreground',
                  )}
                  aria-hidden
                >
                  {s.status === 'Done' ? <Check className="size-3.5" /> : i + 1}
                </span>
                <div className="flex min-w-48 flex-1 flex-col gap-0.5">
                  <span className="font-medium text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground">Done when: {s.needs || '—'}</span>
                </div>
                <PersonLink id={s.ownerId} />
                <StatusPill status={s.status} tone={s.status === 'Done' ? 'success' : s.status === 'Current' ? 'info' : 'muted'} />
                {canEdit && (
                  <div className="flex items-center gap-1">
                    {s.status === 'Current' && (
                      <Button size="sm" variant="outline" onClick={() => complete(i)}>
                        <Check aria-hidden /> Complete
                      </Button>
                    )}
                    {!locked && (
                      <>
                        <Button size="icon" variant="ghost" className="size-8" disabled={!prevOpen} onClick={() => move(i, -1)} aria-label={`Move ${s.name} up`}>
                          <ArrowUp aria-hidden />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8" disabled={!nextOpen} onClick={() => move(i, 1)} aria-label={`Move ${s.name} down`}>
                          <ArrowDown aria-hidden />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => setSheet({ index: i })} aria-label={`Edit ${s.name}`}>
                      <Pencil aria-hidden />
                    </Button>
                    {!locked && (
                      <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => remove(i)} aria-label={`Remove ${s.name}`}>
                        <Trash2 aria-hidden />
                      </Button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No stages yet. Add the first stage to plan this project.</p>
      )}
      {sheet && <StageSheet p={p} index={sheet.index} onClose={() => setSheet(null)} />}
    </div>
  )
}

function StageSheet({ p, index, onClose }: { p: Project; index: number | null; onClose: () => void }) {
  const edit = useProjectEditor(p.id)
  const existing = index !== null ? p.stages[index] : undefined
  const people = usePeopleOptions()
  const f = useForm({ name: existing?.name ?? '', needs: existing?.needs ?? '', ownerId: existing?.ownerId ?? p.pmId })
  const submit = () => {
    if (!f.validate({ name: required('Name'), ownerId: required('Owner') })) return
    const { name, needs, ownerId } = f.values
    if (existing && index !== null) {
      edit(`Stage "${name}" updated`, (pr) => Object.assign(pr.stages[index], { name, needs, ownerId }))
    } else {
      edit(`Stage "${name}" added`, (pr) => {
        pr.stages.push({ name, needs, ownerId, approverIds: [], status: 'Upcoming' })
        normalizeStages(pr.stages)
      })
    }
    toast.success(existing ? 'Stage updated' : 'Stage added')
    onClose()
  }
  return (
    <FormSheet open onOpenChange={(o) => !o && onClose()} title={existing ? `Edit stage` : 'Add stage'} onSubmit={submit} submitLabel={existing ? 'Save' : 'Add stage'}>
      <Field label="Stage name" required error={f.errors.name}>
        <TextInput value={f.values.name} onChange={(e) => f.set('name', e.target.value)} invalid={!!f.errors.name} placeholder="e.g. User testing" />
      </Field>
      <Field label="Done when" hint="The outcome that closes this stage">
        <TextInput value={f.values.needs} onChange={(e) => f.set('needs', e.target.value)} placeholder="e.g. 5 clients tested the beta" />
      </Field>
      <Field label="Owner" required error={f.errors.ownerId}>
        <Select options={people} value={f.values.ownerId} onChange={(e) => f.set('ownerId', e.target.value)} invalid={!!f.errors.ownerId} />
      </Field>
    </FormSheet>
  )
}

/* ——— Edit details ——— */

function EditProject({ p, open, onOpenChange }: { p: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const edit = useProjectEditor(p.id)
  const people = usePeopleOptions()
  const f = useForm({ name: p.name, purpose: p.purpose, pmId: p.pmId, sponsorId: p.sponsorId, target: p.target, status: p.status as string })
  const submit = () => {
    if (!f.validate({ name: required('Name'), purpose: required('Purpose'), pmId: required('Project manager'), target: required('Target date') })) return
    edit('Project details updated', (pr) => {
      Object.assign(pr, { name: f.values.name, purpose: f.values.purpose, pmId: f.values.pmId, sponsorId: f.values.sponsorId, target: f.values.target, status: f.values.status })
      if (!pr.members.some((m) => m.personId === f.values.pmId)) pr.members.unshift({ personId: f.values.pmId, role: 'Project manager' })
    })
    toast.success('Project updated')
    onOpenChange(false)
  }
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Edit project" onSubmit={submit} submitLabel="Save">
      <Field label="Name" required error={f.errors.name}>
        <TextInput value={f.values.name} onChange={(e) => f.set('name', e.target.value)} invalid={!!f.errors.name} />
      </Field>
      <Field label="Purpose" required error={f.errors.purpose}>
        <TextArea value={f.values.purpose} onChange={(e) => f.set('purpose', e.target.value)} invalid={!!f.errors.purpose} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Project manager" required error={f.errors.pmId}>
          <Select options={people} value={f.values.pmId} onChange={(e) => f.set('pmId', e.target.value)} />
        </Field>
        <Field label="Sponsor">
          <Select options={people} value={f.values.sponsorId} onChange={(e) => f.set('sponsorId', e.target.value)} />
        </Field>
        <Field label="Target date" required error={f.errors.target}>
          <TextInput type="date" value={f.values.target} onChange={(e) => f.set('target', e.target.value)} />
        </Field>
        <Field label="Status">
          <Select options={['Planning', 'Active', 'Closing', 'Closed'].map((s) => ({ value: s, label: s }))} value={f.values.status} onChange={(e) => f.set('status', e.target.value)} />
        </Field>
      </div>
    </FormSheet>
  )
}

