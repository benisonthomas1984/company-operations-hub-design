'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { notifications } from '@/lib/fixtures'
import { useStore } from '@/lib/store'
import { Panel } from '@/components/hub/primitives'
import { cn } from '@/lib/utils'

export function Notifications() {
  const { perspective } = useStore()
  const [read, setRead] = useState<Set<string>>(new Set())
  const list = notifications.filter((n) => n.for.includes('*') || n.for.includes(perspective.id))
  const unread = list.filter((n) => !read.has(n.id)).length

  return (
    <Panel
      title={`Inbox · ${unread} unread`}
      description="Restricted items never include sensitive content in the preview."
      action={
        <Button size="sm" variant="outline" disabled={!unread} onClick={() => setRead(new Set(list.map((n) => n.id)))}>
          Mark all read
        </Button>
      }
    >
      <ul className="divide-y divide-border">
        {list.map((n) => {
          const isRead = read.has(n.id)
          return (
            <li key={n.id}>
              <Link href={n.href} onClick={() => setRead((s) => new Set(s).add(n.id))} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50">
                <span aria-hidden className={cn('mt-1.5 size-2 shrink-0 rounded-full', isRead ? 'bg-transparent' : 'bg-primary')} />
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className={cn('text-sm', isRead ? 'text-muted-foreground' : 'font-medium text-foreground')}>
                    {n.title}
                    {!isRead && <span className="sr-only"> (unread)</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">{n.body}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{n.at}</span>
              </Link>
            </li>
          )
        })}
        {!list.length && <li className="px-4 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</li>}
      </ul>
    </Panel>
  )
}
