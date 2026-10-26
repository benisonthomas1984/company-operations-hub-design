'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { audienceOf, canSeeAnnouncement, deptOf } from '@/lib/derive'
import type { CompanyData } from '@/lib/fixtures'
import { Callout, KV, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'
import { Field, Select, TabBar, TextInput, useForm, useParam } from '@/components/hub/form'
import { Page, StateBlock } from '@/components/hub/page'
import { RichBody, RichEditor, plainText } from '@/components/communications/rich-text'
import { cn } from '@/lib/utils'

type Ann = CompanyData['announcements'][number]

const fmtAt = (s?: string) => (s ? s.replace('T', ' ').slice(0, 16) : '—')
const audienceLabel = (c: CompanyData, a: Ann) => (a.audience.type === 'all' ? 'Everyone' : a.audience.deptIds.map((d) => deptOf(c, d)?.name ?? d).join(', '))

function reach(c: CompanyData, a: Ann) {
  const people = audienceOf(c, a)
  const seen = new Set((a.seen ?? []).map((s) => s.id))
  a.acks.forEach((id) => seen.add(id))
  const ids = new Set(people.map((p) => p.id))
  return {
    people,
    seen: people.filter((p) => seen.has(p.id)).length,
    acked: a.acks.filter((id) => ids.has(id)).length,
    total: people.length,
  }
}

function useAnnouncementActions() {
  const { mutate } = useHub()
  const ack = (id: string) => {
    mutate((co, { now, me: who }) => {
      const a = co.announcements.find((x) => x.id === id)
      if (!a || a.acks.includes(who.id)) return
      a.acks.push(who.id)
      a.ackAt = { ...(a.ackAt ?? {}), [who.id]: now }
      if (!(a.seen ?? []).some((s) => s.id === who.id)) a.seen = [...(a.seen ?? []), { id: who.id, at: now }]
      a.history.push({ at: now, by: who.id, text: 'Acknowledged' })
    })
    toast.success('Acknowledged')
  }
  const cancel = (id: string) => {
    mutate((co, { now, me: who, audit }) => {
      const a = co.announcements.find((x) => x.id === id)
      if (!a) return
      a.status = 'Cancelled'
      a.history.push({ at: now, by: who.id, text: 'Cancelled' })
      audit('Cancelled announcement', id)
    })
    toast('Announcement cancelled')
  }
  return { ack, cancel }
}

function Meter({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex min-w-32 flex-1 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">
          {value}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Announcements() {
  const { company: c, me, can } = useHub()
  const router = useRouter()
  const [legacy] = useParam('id')
  const manage = can('announce')
  const list = c.announcements.filter((a) => canSeeAnnouncement(a, me, manage) && (a.status === 'Published' || manage || a.senderId === me.id))

  useEffect(() => {
    if (legacy) router.replace(`/communications/announcements/${legacy}`)
  }, [legacy, router])

  return (
    <div className="flex flex-col gap-4">
      {manage && (
        <Link href="/communications/announcements/new" className={cn(buttonVariants({ size: 'sm' }), 'self-start')}>
          <Plus aria-hidden /> New announcement
        </Link>
      )}
      {list.length === 0 && <StateBlock title="No announcements yet" body={manage ? 'Publish the first announcement to the company or selected departments.' : 'Announcements sent to you will appear here.'} />}
      <ul className="flex flex-col gap-3">
        {list.map((a) => {
          const r = reach(c, a)
          const tracker = manage || a.senderId === me.id
          const needsAck = a.ackRequired && a.status === 'Published' && r.people.some((p) => p.id === me.id) && !a.acks.includes(me.id)
          return (
            <li key={a.id}>
              <Link href={`/communications/announcements/${a.id}`} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/30">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-pretty font-semibold text-foreground">{a.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {fmtAt(a.publishedAt ?? a.scheduledAt)} · {audienceLabel(c, a)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {needsAck && <StatusPill status="Needs your acknowledgment" tone="warning" />}
                    <StatusPill status={a.status} />
                  </div>
                </div>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{plainText(a.body, a.html)}</p>
                {tracker && a.status === 'Published' && (
                  <div className="flex flex-wrap gap-4">
                    <Meter label="Seen" value={r.seen} total={r.total} />
                    {a.ackRequired && <Meter label="Acknowledged" value={r.acked} total={r.total} />}
                  </div>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const crumbs = [{ label: 'Announcements', href: '/communications/announcements' }]

export function AnnouncementDetail({ id }: { id: string }) {
  const { company: c, me, can, mutate } = useHub()
  const { ack, cancel } = useAnnouncementActions()
  const manage = can('announce')
  const a = c.announcements.find((x) => x.id === id)
  const visible = !!a && canSeeAnnouncement(a, me, manage)
  const inAudience = !!a && audienceOf(c, a).some((p) => p.id === me.id)
  const alreadySeen = !!a && (a.seen ?? []).some((s) => s.id === me.id)

  useEffect(() => {
    if (!visible || !inAudience || alreadySeen || a?.status !== 'Published') return
    mutate((co, { now, me: who }) => {
      const x = co.announcements.find((y) => y.id === id)
      if (x && !(x.seen ?? []).some((s) => s.id === who.id)) x.seen = [...(x.seen ?? []), { id: who.id, at: now }]
    })
  }, [visible, inAudience, alreadySeen, a?.status, id, mutate])

  if (!a || !visible) {
    return (
      <Page title="Announcement unavailable" crumbs={crumbs}>
        <div className="p-4 md:p-6">
          <StateBlock title="Announcement unavailable" body="It does not exist or was not sent to your audience." />
        </div>
      </Page>
    )
  }

  const tracker = manage || a.senderId === me.id
  const acked = a.acks.includes(me.id)

  return (
    <Page
      title={a.title}
      crumbs={crumbs}
      description={`${a.id} · ${a.status === 'Scheduled' ? `Scheduled for ${fmtAt(a.scheduledAt)}` : `Published ${fmtAt(a.publishedAt)}`}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={a.status} />
          {manage && a.status !== 'Cancelled' && (
            <Button size="sm" variant="outline" onClick={() => cancel(a.id)}>
              Cancel announcement
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <article className="flex max-w-3xl flex-col gap-4 rounded-lg border border-border bg-card p-5">
          <RichBody body={a.body} html={a.html} />
          {a.attachments.length > 0 && <p className="text-xs text-muted-foreground">Attachments: {a.attachments.join(', ')}</p>}
          {a.ackRequired && a.status === 'Published' && inAudience && (
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <Button size="sm" variant={acked ? 'outline' : 'default'} disabled={acked} onClick={() => ack(a.id)}>
                {acked ? 'Acknowledged' : 'I have read and understood this'}
              </Button>
              {!acked && <span className="text-xs text-muted-foreground">The sender asked everyone to confirm they have read this.</span>}
            </div>
          )}
        </article>
        <Panel title="Details" className="max-w-3xl">
          <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <KV label="From">
              <PersonLink id={a.senderId} />
            </KV>
            <KV label="Audience">{audienceLabel(c, a)}</KV>
            <KV label="Channels">{a.email ? 'In-app + email' : 'In-app'}</KV>
            <KV label="Acknowledgment">{a.ackRequired ? 'Requested' : 'Not requested'}</KV>
          </dl>
        </Panel>
        {tracker && <Tracking a={a} />}
      </div>
    </Page>
  )
}

type Filter = 'all' | 'not-seen' | 'seen' | 'not-acked' | 'acked'

function Tracking({ a }: { a: Ann }) {
  const { company: c } = useHub()
  const [filter, setFilter] = useState<Filter>('all')
  const [dept, setDept] = useState('')
  const r = reach(c, a)
  const seenAt = useMemo(() => new Map((a.seen ?? []).map((s) => [s.id, s.at])), [a.seen])

  const rows = r.people.map((p) => {
    const acked = a.acks.includes(p.id)
    return { p, seen: seenAt.get(p.id) ?? (acked ? a.ackAt?.[p.id] ?? 'yes' : undefined), acked, ackAt: a.ackAt?.[p.id] }
  })
  const shown = rows
    .filter((x) => !dept || x.p.dept === dept)
    .filter((x) =>
      filter === 'all' ? true : filter === 'seen' ? !!x.seen : filter === 'not-seen' ? !x.seen : filter === 'acked' ? x.acked : !x.acked,
    )
  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'Everyone', count: r.total },
    { id: 'not-seen', label: 'Not seen', count: r.total - r.seen },
    { id: 'seen', label: 'Seen', count: r.seen },
    ...(a.ackRequired
      ? [
          { id: 'not-acked' as const, label: 'Not acknowledged', count: r.total - r.acked },
          { id: 'acked' as const, label: 'Acknowledged', count: r.acked },
        ]
      : []),
  ]
  const depts = [...new Set(r.people.map((p) => p.dept))]

  return (
    <Panel title="Who has seen it" description="Only you and people who can publish announcements see this. “Seen” means they opened the announcement in the hub." className="max-w-3xl">
      <div className="flex flex-col gap-4 p-4">
        {a.status !== 'Published' ? (
          <Callout tone="muted" title="Not published yet">Tracking starts once the announcement is published.</Callout>
        ) : (
          <>
            <div className="flex flex-wrap gap-6">
              <Meter label="Seen" value={r.seen} total={r.total} />
              {a.ackRequired && <Meter label="Acknowledged" value={r.acked} total={r.total} />}
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <TabBar label="Filter recipients" tabs={tabs} value={filter} onChange={(v) => setFilter(v as Filter)} />
              {depts.length > 1 && (
                <Select aria-label="Department" className="w-44" placeholder="All departments" options={depts.map((d) => ({ value: d, label: deptOf(c, d)?.name ?? d }))} value={dept} onChange={(e) => setDept(e.target.value)} />
              )}
            </div>
            {shown.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nobody in this group.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th scope="col" className="py-2 pr-3 font-medium">Person</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Department</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Seen</th>
                      {a.ackRequired && <th scope="col" className="py-2 font-medium">Acknowledged</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {shown.map((x) => (
                      <tr key={x.p.id}>
                        <td className="py-2 pr-3">
                          <PersonLink id={x.p.id} />
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{deptOf(c, x.p.dept)?.name}</td>
                        <td className="py-2 pr-3">{x.seen ? <span className="font-mono text-xs text-foreground">{x.seen === 'yes' ? 'Yes' : fmtAt(x.seen)}</span> : <span className="text-xs text-muted-foreground">Not yet</span>}</td>
                        {a.ackRequired && (
                          <td className="py-2">{x.acked ? <StatusPill status={x.ackAt ? fmtAt(x.ackAt) : 'Yes'} tone="success" /> : <StatusPill status="Pending" tone="warning" />}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  )
}

export function NewAnnouncementPage() {
  const { company: c, can, mutate } = useHub()
  const router = useRouter()
  const f = useForm({ title: '', body: '', depts: [] as string[], all: 'yes', ack: 'no', email: 'no', schedule: '' })
  const v = f.values
  const [tab, setTab] = useState('write')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !f.validate({
        title: (x) => (!String(x).trim() ? 'Title is required' : undefined),
        body: (x) => (!plainText(String(x), true) ? 'Message is required' : undefined),
        depts: (x, all) => (all.all === 'no' && (x as string[]).length === 0 ? 'Choose at least one department' : undefined),
      })
    )
      return
    let newId = ''
    mutate((co, { id, now, me: who, audit }) => {
      newId = id('ANN')
      co.announcements.unshift({
        id: newId,
        title: v.title.trim(),
        body: v.body.trim(),
        html: true,
        audience: { type: v.all === 'yes' ? 'all' : 'depts', deptIds: v.all === 'yes' ? [] : v.depts },
        attachments: [],
        senderId: who.id,
        ackRequired: v.ack === 'yes',
        status: v.schedule ? 'Scheduled' : 'Published',
        scheduledAt: v.schedule || undefined,
        publishedAt: v.schedule ? undefined : now,
        email: v.email === 'yes',
        acks: [],
        seen: [],
        history: [{ at: now, by: who.id, text: v.schedule ? `Scheduled for ${v.schedule}` : 'Published' }],
      })
      audit('Published announcement', newId, v.title)
    })
    toast.success(v.schedule ? 'Announcement scheduled' : 'Announcement published', { description: v.email === 'yes' ? 'Email delivery is simulated in this prototype.' : undefined })
    router.push(newId ? `/communications/announcements/${newId}` : '/communications/announcements')
  }

  const recipients = c.employees.filter((e) => (e.status === 'active' || e.status === 'invited') && (v.all === 'yes' || v.depts.includes(e.dept))).length

  return (
    <Page title="New announcement" crumbs={crumbs} forbidden={!can('announce')} forbiddenBody="Only people who can publish announcements can create one.">
      <form onSubmit={submit} className="grid gap-6 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Field label="Title" required error={f.errors.title}>
            <TextInput {...f.bind('title')} autoFocus />
          </Field>
          <TabBar label="Message view" tabs={[{ id: 'write', label: 'Write' }, { id: 'preview', label: 'Preview' }]} value={tab} onChange={setTab} />
          {tab === 'write' ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">
                Message<span className="text-destructive"> *</span>
              </span>
              <RichEditor value={v.body} onChange={(html) => f.set('body', html)} invalid={!!f.errors.body} />
              {f.errors.body ? (
                <span className="text-xs text-destructive">{f.errors.body}</span>
              ) : (
                <span className="text-xs leading-relaxed text-muted-foreground">Use the toolbar for headings, lists and links, or switch to HTML to paste your own markup. Scripts are removed.</span>
              )}
            </div>
          ) : (
            <div className="flex min-h-64 flex-col gap-3 rounded-lg border border-border bg-card p-5">
              <span className="font-semibold text-foreground">{v.title || 'Untitled announcement'}</span>
              {plainText(v.body, true) ? <RichBody body={v.body} html /> : <p className="text-sm text-muted-foreground">Nothing written yet.</p>}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Panel title="Audience">
            <fieldset className="flex flex-col gap-2 p-4">
              <legend className="sr-only">Audience</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={v.all === 'yes'} onChange={() => f.set('all', 'yes')} /> Everyone in {c.name}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={v.all === 'no'} onChange={() => f.set('all', 'no')} /> Selected departments
              </label>
              {v.all === 'no' && (
                <div className="flex flex-col gap-1.5 pl-6">
                  {c.departments.map((d) => (
                    <label key={d.id} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={v.depts.includes(d.id)} onChange={(e) => f.set('depts', e.target.checked ? [...v.depts, d.id] : v.depts.filter((x) => x !== d.id))} />
                      {d.name}
                    </label>
                  ))}
                </div>
              )}
              {f.errors.depts && <span className="text-xs text-destructive">{f.errors.depts}</span>}
              <span className="pt-1 text-xs text-muted-foreground">
                Reaches <span className="font-mono text-foreground">{recipients}</span> people
              </span>
            </fieldset>
          </Panel>
          <Panel title="Delivery">
            <div className="flex flex-col gap-3 p-4">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={v.ack === 'yes'} onChange={(e) => f.set('ack', e.target.checked ? 'yes' : 'no')} />
                <span>
                  Request acknowledgment
                  <span className="block text-xs text-muted-foreground">Each person confirms they read it. You can see who has and hasn&apos;t.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={v.email === 'yes'} onChange={(e) => f.set('email', e.target.checked ? 'yes' : 'no')} />
                <span>
                  Also send by email
                  <span className="block text-xs text-muted-foreground">Simulated in this prototype.</span>
                </span>
              </label>
              <Field label="Schedule (optional)" hint="Leave empty to publish now.">
                <TextInput type="datetime-local" {...f.bind('schedule')} />
              </Field>
            </div>
          </Panel>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {v.schedule ? 'Schedule' : 'Publish'}
            </Button>
            <Link href="/communications/announcements" className={buttonVariants({ variant: 'outline' })}>
              Cancel
            </Link>
          </div>
        </aside>
      </form>
    </Page>
  )
}
