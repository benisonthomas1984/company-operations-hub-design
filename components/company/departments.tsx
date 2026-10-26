'use client'

import { useState } from 'react'
import type { Department } from '@/lib/fixtures'
import { deptColorCls, fmtEUR } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { isOpen } from '@/lib/derive'
import { Avatar, PersonLink, StatusPill } from '@/components/hub/primitives'
import { ActivityTable } from '@/components/activities/activity-table'
import { TabBar, useParam } from '@/components/hub/form'
import { StateBlock } from '@/components/hub/page'
import { Conversation, DecisionsPanel, FilesPanel, HistoryList, MeetingsPanel } from '@/components/workspace/collab'
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

function DepartmentWorkspace({ d }: { d: Department }) {
  const { company: c, me, can } = useHub()
  const [tab, setTab] = useState('activities')
  const ctxKey = `dept:${d.id}`
  const people = c.employees.filter((e) => e.dept === d.id && e.status !== 'inactive')
  const active = people.filter((e) => e.status === 'active')
  const acts = c.activities.filter((a) => a.dept === d.id)
  const open = acts.filter(isOpen).length
  const blocked = acts.filter((a) => a.status === 'Blocked').length
  const projects = c.projects.filter((p) => p.ownerDept === d.id && p.status !== 'Closed')
  const isMember = active.some((e) => e.id === me.id) || d.leadId === me.id
  const attendees = Array.from(new Set([...(d.leadId ? [d.leadId] : []), ...active.map((e) => e.id)]))

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
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Department lead</span>
            {d.leadId ? <PersonLink id={d.leadId} showRole /> : <span className="text-sm text-muted-foreground">Not assigned</span>}
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4 text-sm">
          <Fact label="People">{active.length}{people.length > active.length && <span className="text-muted-foreground"> + {people.length - active.length} open role{people.length - active.length > 1 ? 's' : ''}</span>}</Fact>
          <Fact label="Open activities">{open}</Fact>
          <Fact label="Blocked">{blocked > 0 ? <span className="text-destructive">{blocked}</span> : 0}</Fact>
          <Fact label="Active projects">{projects.length}</Fact>
          {d.budget !== undefined && <Fact label="Budget">{fmtEUR(d.budget)}</Fact>}
        </dl>
      </header>

      <TabBar
        label="Department sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'activities', label: 'Activities', count: acts.length },
          { id: 'people', label: 'People', count: people.length },
          { id: 'conversation', label: 'Conversation', count: c.messages.filter((m) => m.ctx === ctxKey).length },
          { id: 'decisions', label: 'Decisions', count: c.decisions.filter((x) => x.ctx === ctxKey).length },
          { id: 'files', label: 'Files', count: c.files.filter((f) => f.ctx === ctxKey).length },
          { id: 'meetings', label: 'Meetings', count: c.meetings.filter((m) => m.ctx === ctxKey && m.status === 'Scheduled').length },
          { id: 'history', label: 'History' },
        ]}
      />
      <div role="tabpanel" aria-label={tab}>
        {tab === 'activities' && (
          <div className="rounded-lg border border-border bg-card">
            <ActivityTable filter={(a) => a.dept === d.id} caption={`${d.name} activities`} />
          </div>
        )}
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
        {tab === 'conversation' && <Conversation ctx={ctxKey} name={d.name} canPost={isMember || can('manage')} readOnlyHint="Only department members can post." />}
        {tab === 'decisions' && <DecisionsPanel ctx={ctxKey} />}
        {tab === 'files' && <FilesPanel ctx={ctxKey} />}
        {tab === 'meetings' && <MeetingsPanel ctx={ctxKey} defaultAttendees={attendees} />}
        {tab === 'history' && <HistoryList items={d.history ?? []} />}
      </div>
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
