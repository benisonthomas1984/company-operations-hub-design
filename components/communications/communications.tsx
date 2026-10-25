'use client'

import { useState } from 'react'
import { Hash, Send, Video } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { conversations, documents, empById, meetings, messages } from '@/lib/fixtures'
import { Avatar, IdChip, Panel, StatusPill } from '@/components/hub/primitives'
import { cn } from '@/lib/utils'

export function Communications() {
  const [ch, setCh] = useState('ch_prj07')
  const [draft, setDraft] = useState('')
  const c = conversations.find((x) => x.id === ch)!
  const msgs = messages.filter((m) => m.channel === ch)
  const docs = documents.filter((d) => d.context === c.context)
  const mtgs = meetings.filter((m) => m.context === c.context)

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_300px]">
      <Panel title="Conversations">
        <ul className="flex flex-col p-1.5">
          {conversations.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => setCh(x.id)} aria-current={ch === x.id} className={cn('flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm', ch === x.id ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted')}>
                <Hash className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{x.name.replace('#', '')}</span>
                {x.unread > 0 && <span className="ml-auto rounded-full bg-primary px-1.5 font-mono text-[10px] text-primary-foreground">{x.unread}</span>}
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={c.name} description={`${c.members} members · linked to ${c.context}`}>
        <ol className="flex min-h-72 flex-col gap-4 p-4">
          {msgs.map((m) => (
            <li key={m.id} className="flex gap-3">
              <Avatar id={m.authorId} />
              <div className="flex flex-col gap-0.5">
                <span className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-foreground">{empById(m.authorId)?.fullName}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{m.at}</span>
                </span>
                <p className="text-sm leading-relaxed text-foreground">{m.body}</p>
                {'decision' in m && m.decision && (
                  <span className="mt-1 flex items-center gap-1.5 self-start rounded-sm bg-info/10 px-1.5 py-0.5 text-xs text-info">Recorded as {m.decision}</span>
                )}
              </div>
            </li>
          ))}
          {!msgs.length && <li className="text-sm text-muted-foreground">No messages yet. Start the conversation.</li>}
        </ol>
        <form
          className="flex gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault()
            setDraft('')
            toast('Message sent (fixture)', { description: 'Not persisted in this design prototype.' })
          }}
        >
          <label htmlFor="msg" className="sr-only">
            Message {c.name}
          </label>
          <Input id="msg" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Message ${c.name}`} />
          <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send">
            <Send />
          </Button>
        </form>
      </Panel>

      <div className="flex flex-col gap-4">
        <Panel title="Meetings">
          <ul className="divide-y divide-border">
            {mtgs.map((m) => (
              <li key={m.id} className="flex flex-col gap-1 px-4 py-3">
                <span className="text-sm font-medium text-foreground">{m.title}</span>
                <span className="font-mono text-xs text-muted-foreground">{m.when}</span>
                {m.guests.length > 0 && <span className="text-xs text-muted-foreground">Guest: {m.guests.join(', ')}</span>}
                <a href={m.link} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1.5 text-xs font-medium text-info hover:underline">
                  <Video className="size-3.5" aria-hidden /> Join · {m.type.toLowerCase()}
                </a>
              </li>
            ))}
            {!mtgs.length && <li className="px-4 py-3 text-sm text-muted-foreground">No meetings linked.</li>}
          </ul>
        </Panel>
        <Panel title="Files">
          <ul className="divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-col gap-1 px-4 py-2.5">
                <span className="flex items-center gap-2">
                  <IdChip>{d.id}</IdChip>
                  <span className="truncate text-sm text-foreground">{d.name}</span>
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {d.version} · {d.size}
                  <StatusPill status={d.state} className="ml-auto" />
                </span>
              </li>
            ))}
            {!docs.length && <li className="px-4 py-3 text-sm text-muted-foreground">No files.</li>}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
