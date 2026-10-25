'use client'

import { deptColorCls } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { isOpen } from '@/lib/derive'
import { Avatar, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'
import { ActivityTable } from '@/components/activities/activity-table'
import { useParam } from '@/components/hub/form'
import { StateBlock } from '@/components/hub/page'
import { cn } from '@/lib/utils'

export function Departments() {
  const { company: c } = useHub()
  const list = c.departments.filter((d) => d.isDepartment)
  const [sel, setSel] = useParam('dept', list[0]?.id ?? '')
  const d = list.find((x) => x.id === sel) ?? list[0]
  if (!d) return <StateBlock title="No departments yet" body="Add departments on the organization canvas." />
  const people = c.employees.filter((e) => e.dept === d.id && e.status !== 'inactive')

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {list.map((x) => {
          const acts = c.activities.filter((a) => a.dept === x.id)
          const open = acts.filter(isOpen).length
          const blocked = acts.filter((a) => a.status === 'Blocked').length
          return (
            <button
              key={x.id}
              type="button"
              aria-pressed={d.id === x.id}
              onClick={() => setSel(x.id)}
              className={cn('flex flex-col gap-2 rounded-lg border bg-card p-3 text-left', d.id === x.id ? 'border-ring ring-1 ring-ring' : 'border-border hover:border-ring/60')}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden className={cn('h-4 w-1 rounded-full', deptColorCls[x.color].bg)} />
                <span className="text-sm font-semibold text-foreground">{x.name}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {c.employees.filter((e) => e.dept === x.id && e.status === 'active').length} people · {open} open
                {blocked > 0 && <span className="text-destructive"> · {blocked} blocked</span>}
              </span>
            </button>
          )
        })}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Panel title={`${d.name} activities`} description={d.purpose ?? 'Includes project and department-only work.'}>
          <ActivityTable filter={(a) => a.dept === d.id} caption={`${d.name} activities`} />
        </Panel>
        <Panel title="People">
          <div className="border-b border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">Department lead</span>
            <div className="mt-1">{d.leadId ? <PersonLink id={d.leadId} showRole /> : <span className="text-sm text-muted-foreground">Not assigned</span>}</div>
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
