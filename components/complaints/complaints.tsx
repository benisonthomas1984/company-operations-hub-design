'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/lib/store'
import { ApprovalProgress, Callout, KV, Panel, StatusPill } from '@/components/hub/primitives'

export function Complaints() {
  const { perspective, can, approvals } = useStore()
  const [text, setText] = useState('')
  const caseRound = approvals.find((r) => r.restricted)

  const form = (
    <Panel title="Raise a complaint" description="Goes only to people with the complaint case role. Your manager is not notified.">
      <form
        className="flex flex-col gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          setText('')
          toast.success('Complaint submitted', { description: 'You’ll get in-app updates only. No email is sent.' })
        }}
      >
        <label htmlFor="complaint" className="text-xs font-medium text-muted-foreground">
          What happened?
        </label>
        <Textarea id="complaint" value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Describe the situation. You can add details later." />
        <Button type="submit" size="sm" className="self-start" disabled={!text.trim()}>
          Submit privately
        </Button>
      </form>
    </Panel>
  )

  if (can('complaints.case')) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="Case CMP-07" description="Restricted · assigned to you" action={<StatusPill status="Under review" />}>
          <div className="flex flex-col gap-4 p-4">
            <Callout tone="warning" title="Restricted case">
              Visible to case-role members only. Never appears in search, dossier, org canvas or AI answers. Conflicted members are excluded.
            </Callout>
            <dl className="grid grid-cols-2 gap-4">
              <KV label="Submitted by">Sam Carter</KV>
              <KV label="Received">2026-10-23 16:40</KV>
              <KV label="Category">Workplace conduct</KV>
              <KV label="Notifications">In-app only</KV>
            </dl>
            {caseRound && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">Committee decision</span>
                  <span className="text-xs text-muted-foreground">
                    {caseRound.id} · {caseRound.workflowVersion}
                  </span>
                </div>
                <ApprovalProgress decisions={caseRound.stages.flatMap((s) => s.decisions)} compact />
              </div>
            )}
            <Link href={caseRound ? `/approvals?id=${caseRound.id}` : '/approvals'} className="text-sm font-medium text-info hover:underline">
              Open committee approval
            </Link>
          </div>
        </Panel>
        {form}
      </div>
    )
  }

  if (perspective.id === 'sam') {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="My complaint CMP-07" action={<StatusPill status="Under review" />}>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm text-foreground">Received 23 Oct. A case reviewer has been assigned.</p>
            <p className="text-xs text-muted-foreground">Committee membership and deliberation are confidential. You&apos;ll be notified in-app when there is an outcome.</p>
          </div>
        </Panel>
        {form}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="size-4" aria-hidden /> Existing cases are only visible to their submitter and case reviewers.
      </p>
      <div className="max-w-xl">{form}</div>
    </div>
  )
}
