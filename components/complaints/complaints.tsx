'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { empOf } from '@/lib/derive'
import type { Complaint } from '@/lib/fixtures'
import { Callout, KV, Panel, StatusPill } from '@/components/hub/primitives'
import { Field, Select, TextArea, TextInput, useParam } from '@/components/hub/form'
import { StateBlock } from '@/components/hub/page'
import { cn } from '@/lib/utils'

const categories = ['Workplace conduct', 'Harassment', 'Safety', 'Pay or benefits', 'Process', 'Other']

export function Complaints() {
  const { company: c, me, can } = useHub()
  const caseRole = can('complaints.case')
  const mine = c.complaints.filter((x) => x.submitterId === me.id)

  return (
    <div className="flex flex-col gap-4">
      {caseRole && <CaseInbox />}
      <div className="grid gap-4 lg:grid-cols-2">
        <RaiseForm />
        <Panel title="My complaints" description="Only you and the complaint committee can see these.">
          {mine.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">You have not raised any complaints.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {mine.map((x) => (
                <li key={x.id} className="flex flex-col gap-1 px-4 py-3">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{x.summary}</span>
                    <StatusPill status={x.status} />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {x.category} · received {x.receivedAt}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function RaiseForm() {
  const { mutate } = useHub()
  const [v, setV] = useState({ category: '', summary: '', details: '' })
  const [err, setErr] = useState('')
  return (
    <Panel title="Raise a complaint" description="Goes only to the complaint committee. Your manager is not notified, and nothing is emailed.">
      <form
        noValidate
        className="flex flex-col gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!v.category || !v.summary.trim() || !v.details.trim()) return setErr('Category, summary and details are required.')
          mutate((co, { id, now, me: who }) => {
            co.complaints.unshift({ id: id('CMP'), submitterId: who.id, category: v.category, summary: v.summary.trim(), details: v.details.trim(), status: 'Received', receivedAt: now, notes: [] })
          })
          setV({ category: '', summary: '', details: '' })
          setErr('')
          toast.success('Complaint submitted privately', { description: 'You will see status updates here, in-app only.' })
        }}
      >
        {err && <Callout tone="danger" title={err} />}
        <Field label="Category" required>
          <Select placeholder="Choose" value={v.category} options={categories.map((x) => ({ value: x, label: x }))} onChange={(e) => setV({ ...v, category: e.target.value })} />
        </Field>
        <Field label="Summary" required>
          <TextInput value={v.summary} onChange={(e) => setV({ ...v, summary: e.target.value })} />
        </Field>
        <Field label="What happened?" required>
          <TextArea rows={5} value={v.details} onChange={(e) => setV({ ...v, details: e.target.value })} />
        </Field>
        <Button type="submit" className="self-start">
          Submit privately
        </Button>
      </form>
    </Panel>
  )
}

function CaseInbox() {
  const { company: c, me, mutate } = useHub()
  const [sel, setSel] = useParam('case')
  const cases = c.complaints.filter((x) => x.submitterId !== me.id)
  const current = cases.find((x) => x.id === sel)
  const [note, setNote] = useState('')

  const update = (fn: (x: Complaint) => void, text: string) => {
    mutate((co, { now, me: who, audit }) => {
      const x = co.complaints.find((y) => y.id === sel)
      if (!x) return
      fn(x)
      x.notes.push({ at: now, by: who.id, text })
      audit('Updated complaint case', x.id)
    })
    setNote('')
    toast.success('Case updated')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Panel title="Case inbox" description="Restricted: never in search, dossier, org canvas or AI answers.">
        {cases.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No open cases.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {cases.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => setSel(x.id)} className={cn('flex w-full flex-col gap-1 px-4 py-3 text-left', sel === x.id ? 'bg-accent' : 'hover:bg-muted/50')}>
                  <span className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                    {x.id} <StatusPill status={x.status} />
                  </span>
                  <span className="text-xs text-muted-foreground">{x.category}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {sel && !current ? (
        <StateBlock title="Case unavailable" body="This case does not exist or you are conflicted out." />
      ) : current ? (
        <Panel title={current.summary} description={`${current.id} · ${current.category}`} action={<StatusPill status={current.status} />}>
          <div className="flex flex-col gap-4 p-4">
            <dl className="grid grid-cols-2 gap-4">
              <KV label="Submitted by">{empOf(c, current.submitterId)?.fullName ?? 'Unknown'}</KV>
              <KV label="Received">{current.receivedAt}</KV>
            </dl>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{current.details}</p>
            <ol className="flex flex-col gap-1 border-l border-border pl-3">
              {current.notes.map((n, i) => (
                <li key={i} className="text-xs">
                  <span className="font-mono text-muted-foreground">{n.at}</span> {empOf(c, n.by)?.fullName}: {n.text}
                </li>
              ))}
            </ol>
            {current.status !== 'Resolved' && (
              <>
                <Field label="Case note">
                  <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={!note.trim()} onClick={() => update((x) => void (x.status = 'Under review'), note.trim())}>
                    Add note · mark under review
                  </Button>
                  <Button disabled={!note.trim()} onClick={() => update((x) => void (x.status = 'Resolved'), `Resolved: ${note.trim()}`)}>
                    Resolve case
                  </Button>
                </div>
              </>
            )}
          </div>
        </Panel>
      ) : (
        <StateBlock title="Select a case" body="Choose a case to review its details and notes." />
      )}
    </div>
  )
}
