'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { noticesFor } from '@/lib/derive'
import { Panel } from '@/components/hub/primitives'
import { StateBlock } from '@/components/hub/page'
import { cn } from '@/lib/utils'

export function Notifications() {
  const { company: c, me, can, priv, setPriv } = useHub()
  const notices = noticesFor(c, me, can('complaints.case'))
  const read = new Set(priv.readNotifications)
  const unread = notices.filter((n) => !read.has(n.id)).length
  const markRead = (id: string) => setPriv((p) => ({ ...p, readNotifications: Array.from(new Set([...p.readNotifications, id])) }))

  if (!notices.length) return <StateBlock title="You are all caught up" body="Approvals, reviews and announcements that need you will appear here. Notifications are in-app only." />

  return (
    <Panel
      title={`${unread} unread`}
      description="Generated from live records. In-app only — nothing is emailed."
      action={
        unread > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setPriv((p) => ({ ...p, readNotifications: Array.from(new Set([...p.readNotifications, ...notices.map((n) => n.id)])) }))}>
            Mark all read
          </Button>
        )
      }
    >
      <ul className="flex flex-col divide-y divide-border">
        {notices.map((n) => (
          <li key={n.id}>
            <Link href={n.href} onClick={() => markRead(n.id)} className={cn('flex items-start gap-3 px-4 py-3 hover:bg-muted/50', !read.has(n.id) && 'bg-accent/40')}>
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', read.has(n.id) ? 'bg-transparent' : 'bg-primary')} aria-hidden />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  {!read.has(n.id) && <span className="sr-only">Unread: </span>}
                  {n.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {n.body}
                  {n.at && <span className="font-mono"> · {n.at}</span>}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
