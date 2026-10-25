'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { audienceOf, canSeeAnnouncement, deptOf } from '@/lib/derive'
import { Callout, KV, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'
import { Field, FormSheet, TextArea, TextInput, required, useForm, useParam } from '@/components/hub/form'
import { StateBlock } from '@/components/hub/page'
import { cn } from '@/lib/utils'

export function Announcements() {
  const { company: c, me, can, mutate } = useHub()
  const [open, setOpen] = useState(false)
  const [focus] = useParam('id')
  const manage = can('announce')
  const list = c.announcements.filter((a) => canSeeAnnouncement(a, me, manage))
  const focused = focus ? c.announcements.find((a) => a.id === focus) : undefined

  const ack = (id: string) => {
    mutate((co, { now, me: who }) => {
      const a = co.announcements.find((x) => x.id === id)
      if (!a || a.acks.includes(who.id)) return
      a.acks.push(who.id)
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

  return (
    <div className="flex flex-col gap-4">
      {focus && (!focused || !canSeeAnnouncement(focused, me, manage)) && <StateBlock title="Announcement unavailable" body="It does not exist or was not sent to your audience." />}
      {manage && (
        <Button size="sm" className="self-start" onClick={() => setOpen(true)}>
          <Plus /> New announcement
        </Button>
      )}
      {list.length === 0 && <StateBlock title="No announcements yet" body={manage ? 'Publish the first announcement to the company or selected departments.' : 'Announcements sent to you will appear here.'} />}
      {list.map((a) => {
        const audience = audienceOf(c, a)
        const acked = a.acks.includes(me.id)
        const inAudience = audience.some((e) => e.id === me.id)
        return (
          <Panel key={a.id} title={a.title} description={`${a.id} · ${a.publishedAt ?? a.scheduledAt ?? ''}`} action={<StatusPill status={a.status} />} className={cn(focus === a.id && 'ring-2 ring-ring')}>
            <div className="flex flex-col gap-4 p-4">
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{a.body}</p>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KV label="From">
                  <PersonLink id={a.senderId} />
                </KV>
                <KV label="Audience">{a.audience.type === 'all' ? 'Everyone' : a.audience.deptIds.map((d) => deptOf(c, d)?.name ?? d).join(', ')}</KV>
                <KV label="Channels">{a.email ? 'In-app + email (company sender)' : 'In-app'}</KV>
                <KV label="Acknowledgment">{a.ackRequired ? `${a.acks.length} of ${audience.length}` : 'Not requested'}</KV>
              </dl>
              {a.attachments.length > 0 && <p className="text-xs text-muted-foreground">Attachments: {a.attachments.join(', ')}</p>}
              <div className="flex flex-wrap gap-2">
                {a.ackRequired && a.status === 'Published' && inAudience && (
                  <Button size="sm" variant={acked ? 'outline' : 'default'} disabled={acked} onClick={() => ack(a.id)}>
                    {acked ? 'Acknowledged' : 'Acknowledge'}
                  </Button>
                )}
                {manage && a.status !== 'Cancelled' && (
                  <Button size="sm" variant="ghost" onClick={() => cancel(a.id)}>
                    Cancel announcement
                  </Button>
                )}
              </div>
            </div>
          </Panel>
        )
      })}
      {manage && <NewAnnouncement open={open} onOpenChange={setOpen} />}
    </div>
  )
}

function NewAnnouncement({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { company: c, mutate } = useHub()
  const f = useForm({ title: '', body: '', depts: [] as string[], all: 'yes', ack: 'no', email: 'no', schedule: '' })
  const submit = () => {
    if (!f.validate({ title: required('Title'), body: required('Message'), depts: (v, all) => (all.all === 'no' && (v as string[]).length === 0 ? 'Choose at least one department' : undefined) })) return
    mutate((co, { id, now, me: who, audit }) => {
      const v = f.values
      const aid = id('ANN')
      co.announcements.unshift({
        id: aid,
        title: v.title.trim(),
        body: v.body.trim(),
        audience: { type: v.all === 'yes' ? 'all' : 'depts', deptIds: v.all === 'yes' ? [] : v.depts },
        attachments: [],
        senderId: who.id,
        ackRequired: v.ack === 'yes',
        status: v.schedule ? 'Scheduled' : 'Published',
        scheduledAt: v.schedule || undefined,
        publishedAt: v.schedule ? undefined : now,
        email: v.email === 'yes',
        acks: [],
        history: [{ at: now, by: who.id, text: v.schedule ? `Scheduled for ${v.schedule}` : 'Published' }],
      })
      audit('Published announcement', aid, v.title)
    })
    toast.success(f.values.schedule ? 'Announcement scheduled' : 'Announcement published', { description: f.values.email ? 'Email delivery is simulated in this prototype.' : undefined })
    f.reset()
    onOpenChange(false)
  }
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="New announcement" onSubmit={submit} submitLabel={f.values.schedule ? 'Schedule' : 'Publish'}>
      <Field label="Title" required error={f.errors.title}>
        <TextInput {...f.bind('title')} />
      </Field>
      <Field label="Message" required error={f.errors.body}>
        <TextArea rows={6} {...f.bind('body')} />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-1 text-xs font-medium text-foreground">Audience</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={f.values.all === 'yes'} onChange={() => f.set('all', 'yes')} /> Everyone in {c.name}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={f.values.all === 'no'} onChange={() => f.set('all', 'no')} /> Selected departments
        </label>
        {f.values.all === 'no' && (
          <div className="flex flex-wrap gap-3 pl-6">
            {c.departments.map((d) => (
              <label key={d.id} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={f.values.depts.includes(d.id)} onChange={(e) => f.set('depts', e.target.checked ? [...f.values.depts, d.id] : f.values.depts.filter((x) => x !== d.id))} />
                {d.name}
              </label>
            ))}
          </div>
        )}
        {f.errors.depts && <span className="text-xs text-destructive">{f.errors.depts}</span>}
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.values.ack === 'yes'} onChange={(e) => f.set('ack', e.target.checked ? 'yes' : 'no')} /> Request acknowledgment
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.values.email === 'yes'} onChange={(e) => f.set('email', e.target.checked ? 'yes' : 'no')} /> Also send by email from the company sender
      </label>
      <Field label="Schedule (optional)" hint="Leave empty to publish now.">
        <TextInput type="datetime-local" {...f.bind('schedule')} />
      </Field>
      <Callout tone="muted" title="Email is simulated">No external email is sent in the prototype.</Callout>
    </FormSheet>
  )
}
