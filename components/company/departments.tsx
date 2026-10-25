'use client'

import { useState } from 'react'
import { departments, employees, type DeptId } from '@/lib/fixtures'
import { useStore } from '@/lib/store'
import { Avatar, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'
import { ActivityTable } from '@/components/activities/activity-table'
import { cn } from '@/lib/utils'

export function Departments() {
  const { activities } = useStore()
  const list = departments.filter((d) => d.isDepartment)
  const [sel, setSel] = useState<DeptId>('dev')
  const d = list.find((x) => x.id === sel) ?? list[0]
  const people = employees.filter((e) => e.dept === d.id)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {list.map((x) => {
          const acts = activities.filter((a) => a.dept === x.id)
          const open = acts.filter((a) => ['In progress', 'Blocked', 'Reopened', 'Not started', 'Submitted'].includes(a.status)).length
          const blocked = acts.filter((a) => a.status === 'Blocked').length
          return (
            <button
              key={x.id}
              type="button"
              aria-pressed={sel === x.id}
              onClick={() => setSel(x.id)}
              className={cn('flex flex-col gap-2 rounded-lg border bg-card p-3 text-left', sel === x.id ? 'border-ring ring-1 ring-ring' : 'border-border hover:border-ring/60')}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden className={cn('h-4 w-1 rounded-full', x.bgClass)} />
                <span className="text-sm font-semibold text-foreground">{x.name}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {employees.filter((e) => e.dept === x.id && e.status === 'active').length} people · {open} open
                {blocked > 0 && <span className="text-destructive"> · {blocked} blocked</span>}
              </span>
            </button>
          )
        })}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Panel title={`${d.name} activities`} description="Includes project and department-only work.">
          <ActivityTable filter={(a) => a.dept === d.id} caption={`${d.name} activities`} />
        </Panel>
        <Panel title="People">
          <div className="border-b border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">Department lead</span>
            <div className="mt-1">
              <PersonLink id={d.leadId} showRole />
            </div>
          </div>
          <ul className="divide-y divide-border">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-4 py-2">
                {p.status === 'vacancy' ? (
                  <>
                    <Avatar id={p.id} size="sm" />
                    <span className="text-sm text-muted-foreground">{p.designation}</span>
                    <StatusPill status="Vacancy" tone="muted" className="ml-auto" />
                  </>
                ) : (
                  <PersonLink id={p.id} showRole />
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
