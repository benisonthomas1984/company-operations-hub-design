'use client'

import { useState } from 'react'
import { Paperclip, ShieldCheck } from 'lucide-react'
import { anaMail } from '@/lib/fixtures'
import { useStore } from '@/lib/store'
import { Callout, Panel, SourceChip } from '@/components/hub/primitives'
import { cn } from '@/lib/utils'

export function Mail() {
  const { perspective } = useStore()
  const [folder, setFolder] = useState<'Inbox' | 'Sent'>('Inbox')
  const [sel, setSel] = useState('msg_a91')

  if (perspective.id !== 'ana') {
    return (
      <div className="flex flex-col gap-4">
        <Callout tone="muted" title="Mailboxes are owner-only">
          Only the mailbox owner can read its contents. Administrators, finance and HR cannot open another person&apos;s mail — there is no override. Attempts are audited.
        </Callout>
        <Panel title="Your mailbox">
          <p className="p-4 text-sm text-muted-foreground">No mailbox connected for {perspective.label}. Switch to Ana Ribeiro to see a connected example.</p>
        </Panel>
      </div>
    )
  }

  const list = anaMail.filter((m) => m.folder === folder)
  const m = anaMail.find((x) => x.id === sel) ?? list[0]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-success" aria-hidden />
        Private to you. Synced read-only from ana@cometworks.example.
        <SourceChip label="Mail connector" freshness="2 min ago" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Panel>
          <div className="flex gap-1 border-b border-border p-2" role="tablist">
            {(['Inbox', 'Sent'] as const).map((f) => (
              <button key={f} type="button" role="tab" aria-selected={folder === f} onClick={() => setFolder(f)} className={cn('rounded px-2.5 py-1 text-xs', folder === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                {f}
              </button>
            ))}
          </div>
          <ul className="divide-y divide-border">
            {list.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => setSel(x.id)} aria-current={m?.id === x.id} className={cn('flex w-full flex-col gap-0.5 px-4 py-3 text-left', m?.id === x.id ? 'bg-accent' : 'hover:bg-muted/50')}>
                  <span className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-foreground">{(folder === 'Inbox' ? x.from : x.to).split(' <')[0]}</span>
                    <span className="shrink-0 font-mono text-muted-foreground">{x.date.slice(5)}</span>
                  </span>
                  <span className="flex items-center gap-1 truncate text-sm text-foreground">
                    {x.attachments && <Paperclip className="size-3 shrink-0" aria-label="Has attachments" />}
                    {x.subject}
                  </span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">{x.preview}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        {m && (
          <Panel title={m.subject}>
            <div className="flex flex-col gap-4 p-4">
              <dl className="grid gap-1 text-xs">
                <div className="flex gap-2">
                  <dt className="w-10 text-muted-foreground">From</dt>
                  <dd className="text-foreground">{m.from}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-10 text-muted-foreground">To</dt>
                  <dd className="text-foreground">{m.to}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-10 text-muted-foreground">Date</dt>
                  <dd className="font-mono text-foreground">{m.date}</dd>
                </div>
              </dl>
              <p className="text-sm leading-relaxed text-foreground">{m.preview}</p>
              {m.attachments && (
                <ul className="flex flex-wrap gap-2">
                  {m.attachments.map((a) => (
                    <li key={a} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground">
                      <Paperclip className="size-3" aria-hidden /> {a}
                    </li>
                  ))}
                </ul>
              )}
              <p className="border-t border-border pt-3 text-xs text-muted-foreground">Mail content never appears in search, dossiers or AI answers for anyone but you.</p>
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}
