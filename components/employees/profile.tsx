'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Lock, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { accessRoleLabel, relLabel, TODAY } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { directReports, empOf, productivity } from '@/lib/derive'
import { Button } from '@/components/ui/button'
import { Avatar, Callout, DeptTag, KV, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'
import { Page, StateBlock } from '@/components/hub/page'
import { ActivityTable } from '@/components/activities/activity-table'
import { TextInput } from '@/components/hub/form'

export function EmployeeProfile({ id }: { id: string }) {
  const { company: c, me, can, mutate } = useHub()
  const e = empOf(c, id)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  if (!e || e.status === 'vacancy')
    return (
      <Page title="Employee not found" crumbs={[{ label: 'Employees', href: '/employees' }]}>
        <StateBlock title="Not found" body={`This person isn't in ${c.name}.`} />
      </Page>
    )

  const reports = directReports(c, e.id)
  const isSelf = me.id === e.id
  const isManagerOf = c.relationships.some((r) => r.from === e.id && r.to === me.id)
  const seePersonal = isSelf || can('org.edit')
  const outgoing = c.relationships.filter((r) => r.from === e.id)
  const resp = c.responsibilities.filter((r) => r.employeeId === e.id && r.status === 'Active')
  const prjs = c.projects.filter((p) => p.pmId === e.id || p.sponsorId === e.id || p.members.some((m) => m.personId === e.id))
  const prod = productivity(c, e.id)
  const canAssign = isManagerOf || can('org.edit')

  const addResp = (ev: React.FormEvent) => {
    ev.preventDefault()
    const text = draft.trim()
    if (!text) return
    mutate((c2, ctx) => {
      const rid = ctx.id('RSP')
      c2.responsibilities.push({
        id: rid,
        employeeId: e.id,
        title: text,
        description: text,
        scope: '',
        assignerId: ctx.me.id,
        effective: TODAY,
        approvalRequired: false,
        status: 'Active',
        versions: [{ v: 1, text, at: ctx.now, by: ctx.me.id, note: 'Assigned' }],
      })
      ctx.audit('responsibility.assign', rid, `${text} → ${e.fullName}`)
    })
    toast.success('Responsibility added')
    setDraft('')
  }

  const removeResp = (rid: string) => {
    mutate((c2, ctx) => {
      const r = c2.responsibilities.find((x) => x.id === rid)
      if (!r) return
      r.status = 'Removed'
      ctx.audit('responsibility.remove', rid, `${r.title} — ${e.fullName}`)
    })
    toast.success('Responsibility removed')
  }

  return (
    <Page
      title={
        <span className="flex items-center gap-3">
          <Avatar id={e.id} size="lg" />
          <span className="flex flex-col">
            {e.fullName}
            <span className="text-sm font-normal text-muted-foreground">{e.designation}</span>
          </span>
        </span>
      }
      crumbs={[{ label: 'Employees', href: '/employees' }]}
      actions={
        <Link href={`/activities?owner=${e.id}`} className="text-sm font-medium text-info hover:underline">
          View activities
        </Link>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            title="Responsibilities"
            description="Ongoing accountabilities, separate from time-bound activities."
            action={
              canAssign &&
              !adding && (
                <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                  <Plus aria-hidden /> Add
                </Button>
              )
            }
          >
            {resp.length ? (
              <ul className="flex flex-col">
                {resp.map((r) => (
                  <li key={r.id} className="group flex items-start gap-3 rounded-md px-1 py-1.5 hover:bg-muted/60">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="flex-1 text-sm leading-relaxed text-foreground" title={`Since ${r.effective} · assigned by ${empOf(c, r.assignerId)?.fullName ?? 'Unknown'}`}>
                      {r.title}
                    </span>
                    {canAssign && (
                      <button
                        type="button"
                        onClick={() => removeResp(r.id)}
                        className="rounded p-1 text-muted-foreground opacity-0 hover:bg-background hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                        aria-label={`Remove responsibility: ${r.title}`}
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              !adding && <p className="text-sm text-muted-foreground">No responsibilities yet.</p>
            )}
            {adding && (
              <form onSubmit={addResp} className="mt-2 flex items-center gap-2">
                <TextInput
                  autoFocus
                  value={draft}
                  onChange={(ev) => setDraft(ev.target.value)}
                  onKeyDown={(ev) => ev.key === 'Escape' && setAdding(false)}
                  placeholder="e.g. Review integration pull requests within two days"
                  aria-label="New responsibility"
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={!draft.trim()}>
                  Add
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setAdding(false); setDraft('') }}>
                  Done
                </Button>
              </form>
            )}
          </Panel>

          <Panel title="Activities">
            <ActivityTable filter={(a) => a.ownerId === e.id} caption={`Activities owned by ${e.fullName}`} empty="No activities you can see for this person." />
          </Panel>

          <Panel title="Projects">
            {prjs.length ? (
              <ul className="flex flex-col gap-2">
                {prjs.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/projects/${p.id}`} className="text-info hover:underline">
                      {p.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">{p.pmId === e.id ? 'Project manager' : p.sponsorId === e.id ? 'Sponsor' : p.members.find((m) => m.personId === e.id)?.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Not on any project.</p>
            )}
          </Panel>
        </div>

        <aside className="flex flex-col gap-4">
          <Panel title="Work profile">
            <div className="flex flex-col gap-3">
              <KV label="Status"><StatusPill status={e.status} /></KV>
              <KV label="Department"><DeptTag id={e.dept} /></KV>
              <KV label="Email"><a href={`mailto:${e.email}`} className="text-info hover:underline">{e.email}</a></KV>
              <KV label="Location">{e.location}</KV>
              <KV label="Joined">{e.joined}</KV>
              <KV label="Access">{accessRoleLabel[e.accessRole]}</KV>
            </div>
          </Panel>
          <Panel title="Reporting lines">
            <div className="flex flex-col gap-3">
              {outgoing.length ? (
                outgoing.map((r) => (
                  <KV key={r.id} label={relLabel[r.type]}>
                    <PersonLink id={r.to} showRole />
                  </KV>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Top of the organization.</p>
              )}
              {reports.length > 0 && (
                <KV label={`Direct reports · ${reports.length}`}>
                  <span className="flex flex-col gap-1">
                    {reports.map((r) => (
                      <PersonLink key={r} id={r} />
                    ))}
                  </span>
                </KV>
              )}
            </div>
          </Panel>
          {(isSelf || isManagerOf || can('manage')) && (
            <Panel title={`Delivery · this period`}>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <span>
                  <span className="font-mono text-foreground">{prod.accepted.length}</span> of {prod.commitments.length} commitments accepted
                </span>
                <span>
                  <span className="font-mono text-foreground">{prod.onTime.length}</span> on time · {prod.late.length} late · {prod.revised.length} revised
                </span>
                <Link href={`/productivity?person=${e.id}`} className="text-info hover:underline">
                  Open productivity
                </Link>
              </div>
            </Panel>
          )}
          <Panel title="Personal details">
            {seePersonal ? (
              <div className="flex flex-col gap-3">
                <KV label="Phone">{e.phone ?? '—'}</KV>
                <KV label="Date of birth">{e.dob ?? '—'}</KV>
                <KV label="Emergency contact">{e.emergency ?? '—'}</KV>
              </div>
            ) : (
              <Callout tone="muted" title="Restricted" icon={<Lock className="size-4" />}>
                Visible only to this person and HR.
              </Callout>
            )}
          </Panel>
        </aside>
      </div>
    </Page>
  )
}
