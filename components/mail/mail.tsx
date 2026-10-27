'use client'

import { useState } from 'react'
import { Paperclip, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { Callout, Panel, SimLabel } from '@/components/hub/primitives'
import { TabBar, TextInput, useParam } from '@/components/hub/form'
import { StateBlock } from '@/components/hub/page'
import { cn } from '@/lib/utils'

export function Mail() {
  const { company: c, me, priv, setPriv } = useHub()
  const [folder, setFolder] = useParam('folder', 'Inbox')
  const [sel, setSel] = useParam('m')
  const [q, setQ] = useState('')
  const box = c.mailboxes[me.id] ?? []

  if (priv.mailDisconnected)
    return (
      <StateBlock
        title="Mailbox disconnected"
        body="Your company mailbox is not connected. Reconnecting gives you private, read-only access; nobody else can see it."
        action={<Button onClick={() => setPriv((p) => ({ ...p, mailDisconnected: false }))}>Reconnect mailbox</Button>}
      />
    )

  const isArchive = folder === 'Archive'
  const list = box
    .filter((m) => (isArchive ? m.archived : !m.archived && m.folder === folder))
    .filter((m) => !q.trim() || `${m.subject} ${m.from} ${m.body}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date))
  const current = box.find((m) => m.id === sel)

  return (
    <div className="flex flex-col gap-4">
      <Callout tone="info" title="Private and read-only">
        Only you can see this mailbox — not your manager, not administrators, not the AI dossier. Composing and sending are not available.
      </Callout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabBar
          label="Mail folders"
          value={folder}
          onChange={(v) => (setFolder(v), setSel(null))}
          tabs={['Inbox', 'Sent', 'Archive'].map((f) => ({ id: f, label: f, count: box.filter((m) => (f === 'Archive' ? m.archived : !m.archived && m.folder === f)).length }))}
        />
        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">Search mail</span>
            <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this mailbox" className="pl-8" />
          </label>
          <Button size="sm" variant="ghost" onClick={() => setPriv((p) => ({ ...p, mailDisconnected: true }))}>
            Disconnect
          </Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel>
          {list.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{q ? 'No messages match your search.' : `No messages in ${folder}.`}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {list.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setSel(m.id)} className={cn('flex w-full flex-col gap-0.5 px-4 py-3 text-left', sel === m.id ? 'bg-accent' : 'hover:bg-muted/50')}>
                    <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{m.folder === 'Sent' ? `To ${m.to}` : m.from}</span>
                      <span className="shrink-0 font-mono">{m.date}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      {m.attachments?.length ? <Paperclip className="size-3.5 text-muted-foreground" aria-label="Has attachments" /> : null}
                      {m.subject}
                    </span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">{m.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {current ? (
          <Panel title={current.subject} description={`${current.from} → ${current.to} · ${current.date}`} action={<SimLabel>Read-only</SimLabel>}>
            <div className="flex flex-col gap-4 p-4">
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{current.body}</p>
              {current.attachments?.map((a) => (
                <span key={a} className="flex items-center gap-2 self-start rounded-md border border-border px-2 py-1 text-xs text-foreground">
                  <Paperclip className="size-3.5" aria-hidden /> {a}
                </span>
              ))}
            </div>
          </Panel>
        ) : (
          <StateBlock title={sel ? 'Message unavailable' : 'Select a message'} body={sel ? 'This message is not in your mailbox.' : 'Choose a message to read it.'} />
        )}
      </div>
    </div>
  )
}
