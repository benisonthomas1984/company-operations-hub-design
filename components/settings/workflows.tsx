'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { empOf } from '@/lib/derive'
import { AdminGate } from './admin-gate'
import { Callout, Panel, PersonLink } from '@/components/hub/primitives'
import { PeoplePicker } from '@/components/hub/form'

export function Workflows() {
  return (
    <AdminGate>
      <WorkflowsInner />
    </AdminGate>
  )
}

function WorkflowsInner() {
  const { company: c, mutate } = useHub()
  const [editing, setEditing] = useState<{ kind: 'wf' | 'cm'; id: string; ids: string[] } | null>(null)

  const save = () => {
    if (!editing) return
    if (editing.ids.length === 0) return toast.error('At least one approver is required')
    mutate((co, { now, me, audit }) => {
      const target = editing.kind === 'wf' ? co.workflows.find((w) => w.id === editing.id) : co.committees.find((x) => x.id === editing.id)
      if (!target) return
      if ('stages' in target) target.stages[0].approverIds = editing.ids
      else target.memberIds = editing.ids
      target.version++
      target.history.unshift({ at: now, by: me.id, text: `v${target.version}: ${editing.ids.map((i) => empOf(co, i)?.fullName).join(', ')}` })
      audit('Updated approval configuration', target.id, `v${target.version}`)
    })
    toast.success('Saved as a new version', { description: 'Rounds already in progress keep the version they started with.' })
    setEditing(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <Callout tone="info" title="Every listed approver must approve">
        Changes create a new version. Open rounds keep their original version, so history stays truthful.
      </Callout>
      <div className="grid gap-4 lg:grid-cols-2">
        {c.workflows.map((w) => (
          <Panel key={w.id} title={w.name} description={`Applies to ${w.appliesTo} · v${w.version}`} action={<Button size="sm" variant="outline" onClick={() => setEditing({ kind: 'wf', id: w.id, ids: w.stages[0]?.approverIds ?? [] })}>Edit approvers</Button>}>
            <div className="flex flex-col gap-3 p-4">
              {w.stages.map((s, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {s.name} · {s.mode}
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {s.approverIds.map((id) => (
                      <PersonLink key={id} id={id} />
                    ))}
                  </div>
                </div>
              ))}
              {editing?.kind === 'wf' && editing.id === w.id && <Editor editing={editing} setEditing={setEditing} save={save} />}
              <History items={w.history} />
            </div>
          </Panel>
        ))}
        {c.committees.map((m) => (
          <Panel key={m.id} title={m.name} description={`Committee · ${m.mode} · v${m.version}`} action={<Button size="sm" variant="outline" onClick={() => setEditing({ kind: 'cm', id: m.id, ids: m.memberIds })}>Edit members</Button>}>
            <div className="flex flex-col gap-3 p-4">
              <p className="text-xs text-muted-foreground">{m.appliesTo}</p>
              <div className="flex flex-wrap gap-3">
                {m.memberIds.map((id) => (
                  <PersonLink key={id} id={id} />
                ))}
              </div>
              {editing?.kind === 'cm' && editing.id === m.id && <Editor editing={editing} setEditing={setEditing} save={save} />}
              <History items={m.history} />
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}

function Editor({ editing, setEditing, save }: { editing: { kind: 'wf' | 'cm'; id: string; ids: string[] }; setEditing: (e: typeof editing | null) => void; save: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <PeoplePicker label="Approvers" value={editing.ids} onChange={(ids) => setEditing({ ...editing, ids })} />
      <div className="flex gap-2">
        <Button size="sm" onClick={save}>
          Save new version
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function History({ items }: { items: { at: string; by: string; text: string }[] }) {
  if (!items.length) return null
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer">Version history</summary>
      <ul className="mt-1 flex flex-col gap-0.5">
        {items.map((h, i) => (
          <li key={i}>
            <span className="font-mono">{h.at}</span> {h.text}
          </li>
        ))}
      </ul>
    </details>
  )
}
