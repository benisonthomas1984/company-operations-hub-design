'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { PERIOD, type Activity } from '@/lib/fixtures'
import { directReports, empOf, productivity } from '@/lib/derive'
import { Callout, Panel, PersonLink } from '@/components/hub/primitives'
import { Field, Select, TextArea, useParam } from '@/components/hub/form'
import { StateBlock } from '@/components/hub/page'

export function Productivity() {
  const { company: c, me, can } = useHub()
  const reports = directReports(c, me.id)
  const viewable = [me.id, ...reports, ...(can('settings') ? c.employees.filter((e) => e.status === 'active').map((e) => e.id) : [])]
  const unique = Array.from(new Set(viewable))
  const [person, setPerson] = useParam('person', me.id)
  const allowed = unique.includes(person)
  const target = empOf(c, person)

  return (
    <div className="flex flex-col gap-4">
      {unique.length > 1 && (
        <div className="max-w-xs">
          <Field label="Person">
            <Select value={person} onChange={(e) => setPerson(e.target.value)} options={unique.map((id) => ({ value: id, label: id === me.id ? `${empOf(c, id)?.fullName} (me)` : (empOf(c, id)?.fullName ?? id) }))} />
          </Field>
        </div>
      )}
      {!allowed || !target ? <StateBlock title="Not available" body="You can view your own record and your direct reports only." /> : <Evidence personId={person} self={person === me.id} />}
    </div>
  )
}

function Evidence({ personId, self }: { personId: string; self: boolean }) {
  const { company: c, me, mutate } = useHub()
  const p = productivity(c, personId)
  const [text, setText] = useState('')
  const [reply, setReply] = useState<Record<string, string>>({})
  const requests = c.productivityRequests.filter((r) => r.personId === personId)

  const rows: { label: string; list: Activity[]; hint: string }[] = [
    { label: 'Committed this period', list: p.commitments, hint: 'Due in the period, not cancelled' },
    { label: 'Accepted on or before due', list: p.onTime, hint: 'Against the current due date' },
    { label: 'Accepted late', list: p.late, hint: 'Accepted after due date' },
    { label: 'Awaiting review', list: p.submitted, hint: 'Submitted, not yet accepted' },
    { label: 'Due dates revised', list: p.revised, hint: 'Original date kept on record' },
    { label: 'Reopened at least once', list: p.reopened, hint: 'Rework after review' },
    { label: 'Cancelled', list: p.cancelled, hint: 'Excluded from commitments' },
  ]

  return (
    <>
      <Callout tone="muted" title={`Evidence for ${PERIOD.label}, not a score`}>
        Counts come directly from activity records. No ranking, rating or composite score is calculated. Open any count to see the records behind it.
      </Callout>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((r) => (
          <details key={r.label} className="group rounded-md border border-border bg-card p-3">
            <summary className="flex cursor-pointer list-none flex-col gap-1">
              <span className="font-mono text-2xl text-foreground">{r.list.length}</span>
              <span className="text-sm font-medium text-foreground">{r.label}</span>
              <span className="text-xs text-muted-foreground">{r.hint}</span>
            </summary>
            <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
              {r.list.length === 0 && <li className="text-xs text-muted-foreground">None</li>}
              {r.list.map((a) => (
                <li key={a.id}>
                  <Link href={`/activities?id=${a.id}`} className="text-xs text-info hover:underline">
                    {a.id} · {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
      <Panel title="Clarification requests" description={self ? 'Your manager may ask about specific records. Your response is kept with the evidence.' : 'Ask about a specific record instead of judging a number.'}>
        <div className="flex flex-col gap-3 p-4">
          {requests.length === 0 && <p className="text-sm text-muted-foreground">No requests.</p>}
          {requests.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
              <p className="text-foreground">{r.text}</p>
              <p className="text-xs text-muted-foreground">
                {r.at} · {r.status}
              </p>
              {r.response && (
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">Response: </span>
                  {r.response}
                </p>
              )}
              {self && r.status === 'Open' && (
                <div className="flex flex-col gap-2">
                  <TextArea aria-label="Your response" value={reply[r.id] ?? ''} onChange={(e) => setReply({ ...reply, [r.id]: e.target.value })} />
                  <Button
                    size="sm"
                    className="self-start"
                    disabled={!reply[r.id]?.trim()}
                    onClick={() => {
                      mutate((co, { me: who }) => {
                        const x = co.productivityRequests.find((y) => y.id === r.id)
                        if (x) Object.assign(x, { status: 'Responded', response: reply[r.id].trim(), responderId: who.id })
                      })
                      toast.success('Response saved')
                    }}
                  >
                    Respond
                  </Button>
                </div>
              )}
            </div>
          ))}
          {!self && (
            <div className="flex flex-col gap-2">
              <Field label={`Ask ${empOf(c, personId)?.fullName}`}>
                <TextArea value={text} onChange={(e) => setText(e.target.value)} />
              </Field>
              <Button
                size="sm"
                className="self-start"
                disabled={!text.trim()}
                onClick={() => {
                  mutate((co, { id, now }) => void co.productivityRequests.unshift({ id: id('PRQ'), personId, text: text.trim(), status: 'Open', at: now }))
                  setText('')
                  toast.success('Request sent in-app')
                }}
              >
                Send request
              </Button>
            </div>
          )}
          {!self && (
            <p className="text-xs text-muted-foreground">
              Viewing as <PersonLink id={me.id} />.
            </p>
          )}
        </div>
      </Panel>
    </>
  )
}
