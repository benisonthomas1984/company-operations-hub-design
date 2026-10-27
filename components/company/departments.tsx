'use client'

import Link from 'next/link'
import { useState } from 'react'
import { FolderKanban, Pencil, Plus, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import type { Department } from '@/lib/fixtures'
import { deptColorCls, fmtEUR } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { deptApprovers, deptCost, empOf, isOpen } from '@/lib/derive'
import { Avatar, PersonLink, StatusPill } from '@/components/hub/primitives'
import { ActivityTable } from '@/components/activities/activity-table'
import { CreateActivity } from '@/components/activities/activities-workspace'
import { Field, FormSheet, PeoplePicker, TabBar, TextArea, TextInput, useForm, useParam } from '@/components/hub/form'
import { StateBlock } from '@/components/hub/page'
import { Conversation, DecisionsPanel, EmptyLine, FilesPanel, HistoryList, MeetingsPanel, TabHeader } from '@/components/workspace/collab'
import { ExpenseSheet, useNames } from '@/components/workspace/expense-sheet'
import { buildRound } from '@/components/approvals/approvals'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export function Departments() {
  const { company: c } = useHub()
  const list = c.departments.filter((d) => d.isDepartment)
  const [sel, setSel] = useParam('dept', list[0]?.id ?? '')
  const d = list.find((x) => x.id === sel) ?? list[0]
  if (!d) return <StateBlock title="No departments yet" body="Add departments on the organization canvas." />

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Departments" className="flex flex-wrap gap-2">
        {list.map((x) => {
          const active = d.id === x.id
          const blocked = c.activities.filter((a) => a.dept === x.id && a.status === 'Blocked').length
          return (
            <button
              key={x.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSel(x.id)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
                active ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground hover:border-ring/60',
              )}
            >
              <span aria-hidden className={cn('size-2 rounded-full', deptColorCls[x.color].bg)} />
              {x.name}
              {blocked > 0 && <span className={cn('text-xs', active ? 'text-background/80' : 'text-destructive')}>{blocked} blocked</span>}
            </button>
          )
        })}
      </nav>
      <DepartmentWorkspace key={d.id} d={d} />
    </div>
  )
}

function deptProjects(c: ReturnType<typeof useHub>['company'], d: Department) {
  return c.projects.filter((p) => p.ownerDept === d.id || p.deptIds.includes(d.id))
}

function DepartmentWorkspace({ d }: { d: Department }) {
  const { company: c, me, can } = useHub()
  const [tab, setTab] = useState('activities')
  const [editOpen, setEditOpen] = useState(false)
  const ctxKey = `dept:${d.id}`
  const people = c.employees.filter((e) => e.dept === d.id && e.status !== 'inactive')
  const active = people.filter((e) => e.status === 'active')
  const acts = c.activities.filter((a) => a.dept === d.id)
  const open = acts.filter(isOpen).length
  const blocked = acts.filter((a) => a.status === 'Blocked').length
  const projects = deptProjects(c, d)
  const isMember = active.some((e) => e.id === me.id) || d.leadId === me.id
  const isLead = d.leadId === me.id
  const canManage = can('manage')
  const canSeeCost = canManage || can('finance.read') || isLead
  const attendees = Array.from(new Set([...(d.leadId ? [d.leadId] : []), ...active.map((e) => e.id)]))
  const appr = deptApprovers(c, d)
  const budgetNames = useNames(appr.budget)
  const workNames = useNames(appr.work)
  const cost = deptCost(c, d)
  const pb = d.pendingBudget

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-2xl flex-col gap-1">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <span aria-hidden className={cn('h-5 w-1.5 rounded-full', deptColorCls[d.color].bg)} />
              {d.name}
            </h2>
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{d.purpose ?? 'Includes project and department-only work.'}</p>
          </div>
          <div className="flex items-start gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Department lead</span>
              {d.leadId ? <PersonLink id={d.leadId} showRole /> : <span className="text-sm text-muted-foreground">Not assigned</span>}
            </div>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil aria-hidden /> Budget & approvers
              </Button>
            )}
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4 text-sm">
          <Fact label="People">{active.length}{people.length > active.length && <span className="text-muted-foreground"> + {people.length - active.length} open role{people.length - active.length > 1 ? 's' : ''}</span>}</Fact>
          <Fact label="Open activities">{open}</Fact>
          <Fact label="Blocked">{blocked > 0 ? <span className="text-destructive">{blocked}</span> : 0}</Fact>
          <Fact label="Projects">{projects.filter((p) => p.status !== 'Closed').length}</Fact>
          {canSeeCost && <Fact label={`Cost ${cost.year} to date`}>{fmtEUR(cost.toDate)}{d.budget !== undefined && <span className="font-normal text-muted-foreground"> of {fmtEUR(d.budget)}</span>}</Fact>}
          <Fact label="Budget approval"><span className="font-normal">{budgetNames || '—'}</span></Fact>
          <Fact label="Reviews department work"><span className="font-normal">{workNames || '—'}</span></Fact>
        </dl>
        {pb && (
          <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs leading-relaxed text-foreground">
            <span className="font-medium">Budget change awaiting approval:</span> {fmtEUR(d.budget ?? 0)} → {fmtEUR(pb.budget)}, requested by {empOf(c, pb.by)?.fullName ?? pb.by}: {'"'}{pb.reason}{'"'}.{' '}
            <Link href={`/approvals?id=${pb.approvalId}`} className="text-info hover:underline">Open approval</Link>
          </p>
        )}
      </header>

      <TabBar
        label="Department sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'activities', label: 'Activities', count: acts.length },
          { id: 'projects', label: 'Projects', count: projects.length },
          { id: 'conversation', label: 'Conversation', count: c.messages.filter((m) => m.ctx === ctxKey).length },
          { id: 'people', label: 'People', count: people.length },
          ...(canSeeCost ? [{ id: 'cost', label: 'Cost' }] : []),
          { id: 'decisions', label: 'Decisions', count: c.decisions.filter((x) => x.ctx === ctxKey).length },
          { id: 'files', label: 'Files', count: c.files.filter((f) => f.ctx === ctxKey).length },
          { id: 'meetings', label: 'Meetings', count: c.meetings.filter((m) => m.ctx === ctxKey && m.status === 'Scheduled').length },
          { id: 'history', label: 'History' },
        ]}
      />
      <div role="tabpanel" aria-label={tab}>
        {tab === 'activities' && <ActivitiesTab d={d} canAdd={isMember || canManage} />}
        {tab === 'projects' && <ProjectsTab d={d} showCost={canSeeCost} />}
        {tab === 'conversation' && <ConversationTab d={d} canPostDept={isMember || canManage} />}
        {tab === 'people' && (
          <ul className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-2 bg-card px-4 py-3">
                {p.status === 'vacancy' ? (
                  <>
                    <Avatar id={p.id} size="sm" />
                    <span className="text-sm text-muted-foreground">{p.designation}</span>
                    <StatusPill status="Vacancy" tone="muted" className="ml-auto" />
                  </>
                ) : (
                  <>
                    <PersonLink id={p.id} showRole />
                    {p.id === d.leadId && <StatusPill status="Lead" tone="muted" className="ml-auto" />}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {tab === 'cost' && canSeeCost && <CostTab d={d} canAdd={isMember || canManage} />}
        {tab === 'decisions' && <DecisionsPanel ctx={ctxKey} />}
        {tab === 'files' && <FilesPanel ctx={ctxKey} />}
        {tab === 'meetings' && <MeetingsPanel ctx={ctxKey} defaultAttendees={attendees} />}
        {tab === 'history' && <HistoryList items={d.history ?? []} />}
      </div>
      {canManage && <EditDepartment d={d} open={editOpen} onOpenChange={setEditOpen} />}
    </div>
  )
}

/* ——— Activities ——— */

const scopes = [
  { id: 'all', label: 'All' },
  { id: 'dept', label: 'Department work' },
  { id: 'project', label: 'Project work' },
] as const

function ActivitiesTab({ d, canAdd }: { d: Department; canAdd: boolean }) {
  const { company: c } = useHub()
  const [scope, setScope] = useState<(typeof scopes)[number]['id']>('all')
  const [open, setOpen] = useState(false)
  const all = c.activities.filter((a) => a.dept === d.id)
  const counts = { all: all.length, dept: all.filter((a) => !a.projectId).length, project: all.filter((a) => !!a.projectId).length }
  const filter = (a: (typeof all)[number]) => a.dept === d.id && (scope === 'all' || (scope === 'dept' ? !a.projectId : !!a.projectId))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Show activities" className="flex rounded-md border border-border bg-card p-0.5">
          {scopes.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={scope === s.id}
              onClick={() => setScope(s.id)}
              className={cn('rounded px-3 py-1 text-sm transition-colors', scope === s.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
            >
              {s.label} <span className="tabular-nums opacity-70">{counts[s.id]}</span>
            </button>
          ))}
        </div>
        {canAdd && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus aria-hidden /> New department activity
          </Button>
        )}
      </div>
      <div className="rounded-lg border border-border bg-card">
        <ActivityTable key={scope} filter={filter} caption={`${d.name} activities`} empty={scope === 'dept' ? 'No department-only work yet. Add routine work that is not part of a project.' : 'No activities yet.'} />
      </div>
      <CreateActivity open={open} onOpenChange={setOpen} preset={{ dept: d.id }} />
    </div>
  )
}

/* ——— Projects ——— */

function ProjectsTab({ d, showCost }: { d: Department; showCost: boolean }) {
  const { company: c } = useHub()
  const rows = deptCost(c, d).projects
  if (!rows.length) return <EmptyLine icon={<FolderKanban className="size-5" aria-hidden />} text={`${d.name} has no projects. Department-only work lives under Activities.`} />

  return (
    <div className="flex flex-col gap-3">
      <TabHeader text="Projects this department owns or contributes people to. Project cost is tracked on each project, not in department cost." />
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
        {rows.map(({ project: p, owned, cost }) => {
          const acts = c.activities.filter((a) => a.projectId === p.id && a.status !== 'Cancelled')
          const done = acts.filter((a) => a.status === 'Accepted').length
          const pct = acts.length ? Math.round((done / acts.length) * 100) : 0
          const fromDept = p.members.filter((m) => empOf(c, m.personId)?.dept === d.id).length
          return (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="grid gap-3 px-4 py-3 hover:bg-muted/50 md:grid-cols-[1fr_140px_160px_150px] md:items-center">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium text-foreground">{p.name}</span>
                    <StatusPill status={owned ? 'Owner' : 'Contributor'} tone={owned ? 'info' : 'muted'} />
                  </span>
                  <span className="text-xs text-muted-foreground">PM {empOf(c, p.pmId)?.fullName ?? p.pmId} · {fromDept} from {d.name} · target {p.target}</span>
                </div>
                <StatusPill status={p.status} />
                <div className="flex items-center gap-2">
                  <Progress value={pct} className="h-1.5" aria-label={`${pct}% accepted`} />
                  <span className="shrink-0 text-xs text-muted-foreground">{done}/{acts.length}</span>
                </div>
                <span className="text-sm tabular-nums text-foreground md:text-right">
                  {showCost ? <>{fmtEUR(cost.toDate)}{p.budget !== undefined && <span className="text-muted-foreground"> / {fmtEUR(p.budget)}</span>}</> : null}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ——— Conversation: department channel + its project channels ——— */

function ConversationTab({ d, canPostDept }: { d: Department; canPostDept: boolean }) {
  const { company: c, me, can } = useHub()
  const projects = deptProjects(c, d).filter((p) => p.status !== 'Closed')
  const [ctx, setCtx] = useState(`dept:${d.id}`)
  const p = projects.find((x) => `project:${x.id}` === ctx)
  const isProjectMember = p ? [p.pmId, p.sponsorId, ...p.members.map((m) => m.personId)].includes(me.id) : false
  const channels = [{ key: `dept:${d.id}`, label: `${d.name} (department)` }, ...projects.map((x) => ({ key: `project:${x.id}`, label: x.name }))]

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start">
      <nav aria-label="Channels" className="flex shrink-0 gap-1 overflow-x-auto md:w-56 md:flex-col">
        {channels.map((ch) => {
          const n = c.messages.filter((m) => m.ctx === ch.key).length
          return (
            <button
              key={ch.key}
              type="button"
              aria-current={ctx === ch.key ? 'true' : undefined}
              onClick={() => setCtx(ch.key)}
              className={cn('flex items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-left text-sm', ctx === ch.key ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
            >
              <span className="truncate">{ch.key.startsWith('project:') ? `# ${ch.label}` : ch.label}</span>
              <span className="text-xs tabular-nums">{n}</span>
            </button>
          )
        })}
      </nav>
      <div className="min-w-0 flex-1">
        {p ? (
          <Conversation key={ctx} ctx={ctx} name={p.name} canPost={isProjectMember || can('manage')} readOnlyHint="Only project members can post in a project channel." />
        ) : (
          <Conversation key={ctx} ctx={ctx} name={d.name} canPost={canPostDept} readOnlyHint="Only department members can post." />
        )}
      </div>
    </div>
  )
}

/* ——— Cost ——— */

function CostTab({ d, canAdd }: { d: Department; canAdd: boolean }) {
  const { company: c, can } = useHub()
  const [open, setOpen] = useState(false)
  const cost = deptCost(c, d)
  const showSalary = can('finance.read') || can('org.edit')
  const budget = d.budget
  const used = budget ? Math.min(100, Math.round((cost.toDate / budget) * 100)) : 0
  const over = budget !== undefined && cost.projected > budget

  return (
    <div className="flex flex-col gap-4">
      <TabHeader text={`Department cost (${cost.year}) = each person's salary × the share of their time not on projects + approved department expenses. Project time is costed on the project, so nothing is counted twice.`}>
        {canAdd && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus aria-hidden /> Add expense
          </Button>
        )}
      </TabHeader>

      <section aria-label="Cost summary" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Annual budget" value={budget !== undefined ? fmtEUR(budget) : 'Not set'} />
          <Stat label="Cost to date" value={fmtEUR(cost.toDate)} sub={`${fmtEUR(cost.peopleToDate)} people · ${fmtEUR(cost.expensesTotal)} expenses`} />
          <Stat label="Projected year end" value={fmtEUR(cost.projected)} tone={over ? 'danger' : undefined} />
          <Stat label="People time on projects" value={fmtEUR(cost.onProjectsToDate)} sub="Charged to projects" />
        </dl>
        {budget !== undefined && (
          <div className="flex items-center gap-3">
            <Progress value={used} className={cn('h-2', over && '[&>*]:bg-destructive')} aria-label={`${used}% of budget used`} />
            <span className="shrink-0 text-xs text-muted-foreground">{used}% used</span>
          </div>
        )}
        {cost.missingSalary.length > 0 && (
          <p className="text-xs text-muted-foreground">No salary on file for {cost.missingSalary.map((id) => empOf(c, id)?.fullName ?? id).join(', ')} — counted as €0.</p>
        )}
      </section>

      <section aria-labelledby="dept-people-cost" className="flex flex-col gap-2">
        <h3 id="dept-people-cost" className="text-sm font-semibold text-foreground">People cost</h3>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Person</th>
                {showSalary && <th scope="col" className="px-4 py-2 text-right font-medium">Annual salary</th>}
                <th scope="col" className="px-4 py-2 text-right font-medium">On projects</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Department time</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Dept. cost to date</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Projected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cost.people.map((l) => (
                <tr key={l.personId}>
                  <td className="px-4 py-2"><PersonLink id={l.personId} /></td>
                  {showSalary && <td className="px-4 py-2 text-right tabular-nums">{l.salary ? fmtEUR(l.salary) : '—'}</td>}
                  <td className="px-4 py-2 text-right tabular-nums">{l.projectAlloc}%</td>
                  <td className="px-4 py-2 text-right tabular-nums">{l.deptShare}%</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtEUR(l.deptToDate)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtEUR(l.deptProjected)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border font-medium">
              <tr>
                <td className="px-4 py-2" colSpan={showSalary ? 4 : 3}>Total department people cost</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtEUR(cost.peopleToDate)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtEUR(cost.peopleProjected)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section aria-labelledby="dept-expenses" className="flex flex-col gap-2">
        <h3 id="dept-expenses" className="text-sm font-semibold text-foreground">Department expenses</h3>
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
          <EmptyLine icon={<Receipt className="size-5" aria-hidden />} text="No department-only expenses this year. Project expenses are shown on each project." />
        )}
      </section>

      {canAdd && (
        <ExpenseSheet
          open={open}
          onOpenChange={setOpen}
          target={{
            dept: d.id,
            label: `${d.name} department`,
            approverIds: deptApprovers(c, d).budget,
            log: (c2, at, by, text) => {
              const dd = c2.departments.find((x) => x.id === d.id)
              if (!dd) return
              dd.history ??= []
              dd.history.unshift({ at, by, text })
            },
          }}
        />
      )}
    </div>
  )
}

/* ——— Budget & approvers ——— */

function EditDepartment({ d, open, onOpenChange }: { d: Department; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { company: c, me, mutate } = useHub()
  const current = deptApprovers(c, d)
  const f = useForm({ budget: d.budget !== undefined ? String(d.budget) : '', budgetApprovers: current.budget, workApprovers: current.work, reason: '' })
  const v = f.values
  const newBudget = v.budget.trim() === '' ? undefined : Math.round(Number(v.budget))
  const budgetChanged = newBudget !== undefined && newBudget !== d.budget
  const needsApproval = budgetChanged && !current.budget.every((id) => id === me.id)

  const submit = () => {
    const ok = f.validate({
      budget: (b) => (String(b).trim() !== '' && !(Number(b) >= 0) ? 'Enter a valid amount' : undefined),
      budgetApprovers: (x) => (!(x as string[]).length ? 'Pick at least one budget approver' : undefined),
      workApprovers: (x) => (!(x as string[]).length ? 'Pick at least one reviewer' : undefined),
      reason: (r) => (needsApproval && !String(r).trim() ? 'Explain why so approvers can decide' : undefined),
    })
    if (!ok) return
    if (needsApproval && d.pendingBudget) {
      toast.error('A budget change is already awaiting approval.')
      return
    }
    mutate((c2, ctx) => {
      const dd = c2.departments.find((x) => x.id === d.id)
      if (!dd) return
      dd.history ??= []
      dd.approvers = { budget: v.budgetApprovers, work: v.workApprovers }
      dd.history.unshift({ at: ctx.now, by: ctx.me.id, text: 'Approvers updated' })
      if (!budgetChanged || newBudget === undefined) return
      if (!needsApproval) {
        dd.budget = newBudget
        dd.history.unshift({ at: ctx.now, by: ctx.me.id, text: `Budget set to ${fmtEUR(newBudget)} (own approval)` })
        return
      }
      const rid = ctx.id('APR')
      const summary = `${dd.name} budget ${fmtEUR(dd.budget ?? 0)} → ${fmtEUR(newBudget)}`
      buildRound(c2, { id: rid, itemType: 'Department budget', itemId: dd.id, itemTitle: summary, revision: 'r1', approverIds: current.budget, submittedBy: ctx.me.id, now: ctx.now, summary: `${summary}. Reason: ${v.reason.trim()}`, amount: newBudget })
      dd.pendingBudget = { approvalId: rid, budget: newBudget, reason: v.reason.trim(), by: ctx.me.id, at: ctx.now }
      dd.history.unshift({ at: ctx.now, by: ctx.me.id, text: `Requested approval (${rid}): ${summary}` })
      ctx.audit('department.budget.request', dd.id, summary)
    })
    toast.success(needsApproval ? 'Saved. Budget change sent for approval' : 'Department updated')
    onOpenChange(false)
  }

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={`${d.name}: budget & approvers`} onSubmit={submit} submitLabel={needsApproval ? 'Save & request approval' : 'Save'}>
      <Field label="Annual budget (EUR)" error={f.errors.budget} hint="Covers department people time and department-only expenses">
        <TextInput type="number" inputMode="numeric" min="0" step="1000" value={v.budget} onChange={(e) => f.set('budget', e.target.value)} invalid={!!f.errors.budget} />
      </Field>
      {needsApproval && (
        <Field label="Reason for change" required error={f.errors.reason} hint={`Approved by ${current.budget.map((id) => empOf(c, id)?.fullName ?? id).join(', ')}`}>
          <TextArea value={v.reason} onChange={(e) => f.set('reason', e.target.value)} invalid={!!f.errors.reason} />
        </Field>
      )}
      <PeoplePicker label="Budget approvers" value={v.budgetApprovers} onChange={(x) => f.set('budgetApprovers', x)} error={f.errors.budgetApprovers} />
      <PeoplePicker label="Department work reviewers" value={v.workApprovers} onChange={(x) => f.set('workApprovers', x)} error={f.errors.workApprovers} />
      <p className="text-xs leading-relaxed text-muted-foreground">Budget approvers sign off budget changes and department expenses of {fmtEUR(500)} or more. Work reviewers are the default reviewers for department-only activities.</p>
    </FormSheet>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'danger' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-lg font-semibold tabular-nums text-foreground', tone === 'danger' && 'text-destructive')}>{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums text-foreground">{children}</dd>
    </div>
  )
}
