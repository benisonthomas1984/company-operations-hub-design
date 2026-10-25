'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { announcements } from '@/lib/fixtures'
import { useStore } from '@/lib/store'
import { KV, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'

export function Announcements() {
  const { can } = useStore()
  const [acked, setAcked] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {can('announcements.publish') && (
        <Button size="sm" className="self-start" onClick={() => toast('New announcement draft', { description: 'Choose audience and channels. External email sends via the company sender only.' })}>
          <Plus /> New announcement
        </Button>
      )}
      {announcements.map((a) => (
        <Panel key={a.id} title={a.title} description={`${a.id} · ${a.date}`} action={<StatusPill status={a.status} />}>
          <div className="flex flex-col gap-4 p-4">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KV label="From">
                <PersonLink id={a.authorId} />
              </KV>
              <KV label="Audience">{a.audience}</KV>
              <KV label="Channels">{a.channels.join(' · ')}</KV>
              <KV label="Acknowledgment">{a.ack}</KV>
            </dl>
            {a.id === 'ANN-33' && (
              <Button
                size="sm"
                variant={acked ? 'outline' : 'default'}
                className="self-start"
                disabled={acked}
                onClick={() => {
                  setAcked(true)
                  toast.success('Acknowledged')
                }}
              >
                {acked ? 'Acknowledged' : 'Acknowledge'}
              </Button>
            )}
          </div>
        </Panel>
      ))}
    </div>
  )
}
