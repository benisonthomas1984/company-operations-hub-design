'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { proposals, empById } from '@/lib/fixtures'
import { useStore } from '@/lib/store'
import { ApprovalProgress, Callout, IdChip, KV, Panel, PersonLink, SimLabel, StatusPill } from '@/components/hub/primitives'
import { cn } from '@/lib/utils'

export function Proposals() {
  const { approvals, spendAi } = useStore()
  const [sel, setSel] = useState('PRP-24')
  const p = proposals.find((x) => x.id === sel)!
  const round = approvals.find((r) => r.id === p.approvalId)

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Panel title="Proposals" action={<Button size="sm" variant="outline" onClick={() => toast('New proposal draft', { description: 'Drafts are private until submitted to the Board.' })}><Plus /> New</Button>}>
        <ul className="divide-y divide-border">
          {proposals.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => setSel(x.id)} aria-current={sel === x.id} className={cn('flex w-full flex-col gap-1 px-4 py-3 text-left', sel === x.id ? 'bg-accent' : 'hover:bg-muted/50')}>
                <span className="flex items-center gap-2">
                  <IdChip>{x.id}</IdChip>
                  <span className="text-xs text-muted-foreground">by {empById(x.authorId)?.name}</span>
                </span>
                <span className="text-sm font-medium text-foreground">{x.title}</span>
                <StatusPill status={x.status} className="self-start" />
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="flex flex-col gap-4">
        <Panel title={p.title} description={`${p.id} · revision ${p.revision} · updated ${p.updated}`} action={<StatusPill status={p.status} />}>
          <dl className="grid gap-4 p-4 md:grid-cols-2">
            <KV label="Author">
              <PersonLink id={p.authorId} showRole />
            </KV>
            <KV label="Budget requested">
              <span className="font-mono">{p.budget}</span>
            </KV>
            <KV label="Target geography">{p.geography}</KV>
            <KV label="Target industry">{p.industry}</KV>
          </dl>
        </Panel>
        {round ? (
          <Panel title="Board of Directors review" description={`${round.id} · ${round.workflowVersion} · round ${round.round}`} action={<ApprovalProgress decisions={round.stages.flatMap((s) => s.decisions)} />}>
            <div className="flex flex-col gap-3 p-4">
              <p className="text-sm text-foreground">Approval requires every board member. Converted to backlog only after full approval.</p>
              <Link href={`/approvals?id=${round.id}`} className="text-sm font-medium text-info hover:underline">
                Open approval {round.id}
              </Link>
            </div>
          </Panel>
        ) : (
          <Callout tone="muted" title="Not submitted">Drafts aren&apos;t visible to the Board. Submit to start round 1.</Callout>
        )}
        <Panel title="AI market brief" description="Drafts a brief from public sources. Always labeled; never auto-submitted." action={<SimLabel>AI draft</SimLabel>}>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">Generates competitor and demand notes for {p.geography.toLowerCase()} in {p.industry.toLowerCase()}. Uses 40 AI credits.</p>
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              onClick={() => {
                const res = spendAi(`brief-${p.id}-r${p.revision}`, 40)
                if (res === 'charged') toast.success('Brief drafted', { description: '40 credits used. Review before attaching.' })
                else if (res === 'duplicate') toast('Already generated for this revision', { description: 'No extra credits charged.' })
                else toast.error('AI credits exhausted', { description: 'Ask an admin to add credits. Core features keep working.' })
              }}
            >
              <Sparkles /> Draft brief
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
