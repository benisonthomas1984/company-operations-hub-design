'use client'

import Link from 'next/link'
import { useHub } from '@/lib/store'
import type { Activity } from '@/lib/fixtures'
import { canSeeActivity, empOf, isOverdue, originOf } from '@/lib/derive'
import { IdChip, StatusPill } from '@/components/hub/primitives'
import { cn } from '@/lib/utils'

export function DueCell({ a }: { a: Activity }) {
  const late = isOverdue(a)
  return a.revisedDue ? (
    <span className="flex flex-col leading-tight">
      <span className={cn('font-mono text-xs', late ? 'text-destructive' : 'text-foreground')}>{a.revisedDue}</span>
      <span className="font-mono text-[11px] text-muted-foreground line-through" aria-label={`Original due ${a.originalDue}`}>
        {a.originalDue}
      </span>
    </span>
  ) : (
    <span className={cn('font-mono text-xs', late ? 'text-destructive' : 'text-foreground')}>
      {a.originalDue}
      {late && <span className="sr-only"> (overdue)</span>}
    </span>
  )
}

export function ActivityTable({ filter, onSelect, selectedId, caption, empty = 'No activities in this scope.' }: { filter?: (a: Activity) => boolean; onSelect?: (id: string) => void; selectedId?: string | null; caption: string; empty?: string }) {
  const { company: c, me } = useHub()
  const rows = c.activities.filter((a) => canSeeActivity(c, me, a) && (!filter || filter(a)))
  if (!rows.length) return <p className="p-4 text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Activity</th>
            <th className="px-4 py-2 font-medium">Owner</th>
            <th className="px-4 py-2 font-medium">Origin</th>
            <th className="px-4 py-2 font-medium">Due</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const o = originOf(c, a)
            return (
              <tr key={a.id} className={cn('border-b border-border last:border-0', selectedId === a.id ? 'bg-accent' : 'hover:bg-muted/50')}>
                <td className="px-4 py-2">
                  <div className="flex flex-col gap-0.5">
                    {onSelect ? (
                      <button type="button" onClick={() => onSelect(a.id)} className="text-left font-medium text-foreground hover:underline">
                        {a.title}
                      </button>
                    ) : (
                      <Link href={`/activities?id=${a.id}`} className="font-medium text-foreground hover:underline">
                        {a.title}
                      </Link>
                    )}
                    <IdChip>{a.id}</IdChip>
                  </div>
                </td>
                <td className="px-4 py-2 text-foreground">{empOf(c, a.ownerId)?.fullName ?? '—'}</td>
                <td className="px-4 py-2">
                  <Link href={o.href} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                    {o.label}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <DueCell a={a} />
                </td>
                <td className="px-4 py-2">
                  <StatusPill status={isOverdue(a) && a.status !== 'Blocked' ? `${a.status} · overdue` : a.status} tone={isOverdue(a) ? 'danger' : undefined} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
