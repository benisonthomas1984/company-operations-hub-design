'use client'

import Link from 'next/link'
import { useStore } from '@/lib/store'
import type { Activity } from '@/lib/fixtures'
import { empById } from '@/lib/fixtures'
import { IdChip, StatusPill } from '@/components/hub/primitives'
import { cn } from '@/lib/utils'

export function DueCell({ a }: { a: Activity }) {
  return a.revisedDue ? (
    <span className="flex flex-col leading-tight">
      <span className="font-mono text-xs text-foreground">{a.revisedDue}</span>
      <span className="font-mono text-[11px] text-muted-foreground line-through" aria-label={`Original due ${a.originalDue}`}>
        {a.originalDue}
      </span>
    </span>
  ) : (
    <span className="font-mono text-xs text-foreground">{a.originalDue}</span>
  )
}

export function ActivityTable({ filter, onSelect, selectedId, caption }: { filter?: (a: Activity) => boolean; onSelect?: (id: string) => void; selectedId?: string | null; caption: string }) {
  const { activities } = useStore()
  const rows = filter ? activities.filter(filter) : activities
  if (!rows.length) return <p className="p-4 text-sm text-muted-foreground">No activities in this scope.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Activity</th>
            <th className="px-4 py-2 font-medium">Owner</th>
            <th className="px-4 py-2 font-medium">Project</th>
            <th className="px-4 py-2 font-medium">Due</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
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
                  <span className="flex items-center gap-1.5">
                    <IdChip>{a.id}</IdChip>
                    <span className="text-[11px] text-muted-foreground">rev {a.revision}</span>
                  </span>
                </div>
              </td>
              <td className="px-4 py-2 text-foreground">{empById(a.ownerId)?.fullName}</td>
              <td className="px-4 py-2">{a.projectId ? <IdChip href={`/projects/${a.projectId}`}>{a.projectId}</IdChip> : <span className="text-xs text-muted-foreground">Department work</span>}</td>
              <td className="px-4 py-2">
                <DueCell a={a} />
              </td>
              <td className="px-4 py-2">
                <StatusPill status={a.status === 'Submitted' ? 'Submitted · awaiting acceptance' : a.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
