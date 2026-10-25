'use client'

import Link from 'next/link'
import { useHub } from '@/lib/store'
import { relLabel, type Employee } from '@/lib/fixtures'
import { empOf } from '@/lib/derive'
import { Avatar, DeptTag, StatusPill } from '@/components/hub/primitives'

/** Accessible list equivalent of the org canvas: same records, nested by direct manager. */
export function OrgList() {
  const { company: c } = useHub()
  const people = c.employees.filter((e) => e.status !== 'inactive')
  const mgr = (id: string) => c.relationships.find((r) => r.from === id && r.type === 'direct')?.to
  const roots = people.filter((e) => !mgr(e.id) || !people.some((p) => p.id === mgr(e.id)))

  const Node = ({ e, depth }: { e: Employee; depth: number }) => {
    const kids = people.filter((p) => mgr(p.id) === e.id)
    const other = c.relationships.filter((r) => r.from === e.id && r.type !== 'direct')
    return (
      <li className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
          <Avatar id={e.id} size="sm" />
          {e.status === 'vacancy' ? (
            <span className="text-sm text-muted-foreground">Vacancy · {e.designation}</span>
          ) : (
            <Link href={`/employees/${e.id}`} className="text-sm font-medium text-foreground hover:underline">
              {e.fullName}
            </Link>
          )}
          {e.status !== 'vacancy' && <span className="text-xs text-muted-foreground">{e.designation}</span>}
          <DeptTag id={e.dept} />
          {e.status === 'invited' && <StatusPill status="Invited" />}
          {other.map((r) => (
            <span key={r.id} className="text-xs text-muted-foreground">
              {relLabel[r.type]}: {empOf(c, r.to)?.fullName}
            </span>
          ))}
        </div>
        {kids.length > 0 && (
          <ul className="ml-4 flex flex-col gap-1 border-l border-border pl-3" aria-label={`Reports to ${e.fullName}`}>
            {kids.map((k) => (
              <Node key={k.id} e={k} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <ul className="flex flex-col gap-1 p-2" aria-label="Organization by direct manager">
      {roots.map((r) => (
        <Node key={r.id} e={r} depth={0} />
      ))}
    </ul>
  )
}
