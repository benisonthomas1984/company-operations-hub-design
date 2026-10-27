'use client'

import { useRef, useState } from 'react'
import { CornerDownRight, Download, ExternalLink, FileText, Gavel, Link2, Mail, MessageSquare, Plus, Send, Trash2, Upload, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import type { CompanyData } from '@/lib/fixtures'
import { TODAY } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { contextInfo, empOf } from '@/lib/derive'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/hub/primitives'
import { Field, FormSheet, PeoplePicker, Select, TextArea, TextInput, required, useForm, usePeopleOptions } from '@/components/hub/form'

/** Writes a line to the owning project's or department's history. */
export function logToContext(c2: CompanyData, key: string, at: string, by: string, text: string) {
  const [type, id] = key.split(':')
  if (type === 'project') c2.projects.find((x) => x.id === id)?.history.unshift({ at, by, text })
  if (type === 'department') {
    const d = c2.departments.find((x) => x.id === id)
    if (d) (d.history ??= []).unshift({ at, by, text })
  }
}

export function TabHeader({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{text}</p>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function EmptyLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  )
}

/* ——— Conversation ——— */

export function Conversation({ ctx: key, name, canPost, readOnlyHint = 'Only members can post.' }: { ctx: string; name: string; canPost: boolean; readOnlyHint?: string }) {
  const { company: c, mutate } = useHub()
  const all = c.messages.filter((m) => m.ctx === key)
  const threads = all.filter((m) => !m.parentId).sort((a, b) => a.at.localeCompare(b.at))
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [decisionFrom, setDecisionFrom] = useState<string | null>(null)

  const post = (body: string, parentId?: string) => {
    const text = body.trim()
    if (!text) return
    mutate((c2, ctx) => {
      c2.messages.push({ id: ctx.id('MSG'), ctx: key, authorId: ctx.me.id, at: ctx.now, body: text, ...(parentId ? { parentId } : {}) })
    })
  }

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card">
      {threads.length ? (
        <ul className="flex flex-col divide-y divide-border">
          {threads.map((m) => {
            const replies = all.filter((r) => r.parentId === m.id).sort((a, b) => a.at.localeCompare(b.at))
            return (
              <li key={m.id} className="flex flex-col gap-2 px-4 py-3">
                <MessageRow m={m} onReply={canPost ? () => setReplyTo(m.id) : undefined} onDecision={() => setDecisionFrom(m.id)} />
                {(replies.length > 0 || replyTo === m.id) && (
                  <div className="ml-11 flex flex-col gap-2 border-l-2 border-border pl-4">
                    {replies.map((r) => (
                      <MessageRow key={r.id} m={r} compact />
                    ))}
                    {replyTo === m.id && (
                      <Composer
                        autoFocus
                        placeholder="Reply in thread…"
                        onCancel={() => setReplyTo(null)}
                        onSend={(text) => {
                          post(text, m.id)
                          setReplyTo(null)
                        }}
                      />
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <MessageSquare className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
        </div>
      )}
      {canPost ? (
        <div className="sticky bottom-0 rounded-b-lg border-t border-border bg-card p-3">
          <Composer value={draft} onChange={setDraft} placeholder={`Message ${name}`} onSend={(t) => { post(t); setDraft('') }} />
        </div>
      ) : (
        <p className="border-t border-border p-3 text-xs text-muted-foreground">{readOnlyHint}</p>
      )}
      <DecisionSheet ctx={key} open={!!decisionFrom} onOpenChange={(o) => !o && setDecisionFrom(null)} fromMessage={all.find((m) => m.id === decisionFrom)?.body} />
    </div>
  )
}

function MessageRow({ m, compact, onReply, onDecision }: { m: { authorId: string; at: string; body: string }; compact?: boolean; onReply?: () => void; onDecision?: () => void }) {
  const { company: c } = useHub()
  const [date, time] = m.at.split(' ')
  return (
    <div className="group flex gap-3">
      <Avatar id={m.authorId} size={compact ? 'sm' : 'md'} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">{empOf(c, m.authorId)?.fullName ?? 'Unknown'}</span>
          <time className="text-xs text-muted-foreground" dateTime={m.at.replace(' ', 'T')}>
            {date === TODAY ? 'Today' : date} {time}
          </time>
          {(onReply || onDecision) && (
            <span className="ml-auto flex gap-1 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
              {onReply && (
                <button type="button" onClick={onReply} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                  <CornerDownRight className="size-3" aria-hidden /> Reply
                </button>
              )}
              {onDecision && (
                <button type="button" onClick={onDecision} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Gavel className="size-3" aria-hidden /> Record decision
                </button>
              )}
            </span>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{m.body}</p>
      </div>
    </div>
  )
}

function Composer({ value, onChange, onSend, onCancel, placeholder, autoFocus }: { value?: string; onChange?: (v: string) => void; onSend: (text: string) => void; onCancel?: () => void; placeholder: string; autoFocus?: boolean }) {
  const [local, setLocal] = useState('')
  const text = value ?? local
  const setText = onChange ?? setLocal
  const send = () => {
    if (!text.trim()) return
    onSend(text)
    setLocal('')
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
      className="flex items-end gap-2"
    >
      <TextArea
        autoFocus={autoFocus}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && onCancel) onCancel()
          if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing || e.keyCode === 229) return
          e.preventDefault()
          send()
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-10 flex-1 resize-none"
      />
      {onCancel && (
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      )}
      <Button type="submit" size="sm" disabled={!text.trim()} aria-label="Send">
        <Send aria-hidden />
      </Button>
    </form>
  )
}

/* ——— Decisions ——— */

export function DecisionsPanel({ ctx: key }: { ctx: string }) {
  const { company: c } = useHub()
  const [open, setOpen] = useState(false)
  const decisions = c.decisions.filter((d) => d.ctx === key)
  return (
    <div className="flex flex-col gap-3">
      <TabHeader text="A record of what was decided, by whom, and why.">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus aria-hidden /> Record decision
        </Button>
      </TabHeader>
      {decisions.length ? (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {decisions.map((d) => (
            <li key={d.id} className="flex flex-col gap-1 px-4 py-3">
              <span className="font-medium text-foreground">{d.title}</span>
              <span className="text-sm leading-relaxed text-foreground">{d.text}</span>
              {d.rationale && <span className="text-sm leading-relaxed text-muted-foreground">Why: {d.rationale}</span>}
              <span className="text-xs text-muted-foreground">
                Decided by {empOf(c, d.deciderId)?.fullName ?? 'Unknown'} · {d.at}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyLine icon={<Gavel className="size-5" aria-hidden />} text="No decisions recorded yet." />
      )}
      <DecisionSheet ctx={key} open={open} onOpenChange={setOpen} />
    </div>
  )
}

function DecisionSheet({ ctx: key, open, onOpenChange, fromMessage }: { ctx: string; open: boolean; onOpenChange: (o: boolean) => void; fromMessage?: string }) {
  const { me, mutate } = useHub()
  const people = usePeopleOptions()
  const f = useForm({ title: '', text: '', rationale: '', deciderId: me.id })
  const [seed, setSeed] = useState<string | undefined>(undefined)
  if (open && fromMessage && seed !== fromMessage) {
    setSeed(fromMessage)
    f.set('text', fromMessage)
  }
  const submit = () => {
    if (!f.validate({ title: required('Title'), text: required('Decision'), deciderId: required('Decided by') })) return
    mutate((c2, ctx) => {
      const did = ctx.id('DEC')
      c2.decisions.unshift({ id: did, ctx: key, title: f.values.title, text: f.values.text, rationale: f.values.rationale, deciderId: f.values.deciderId, at: TODAY, related: '', createdBy: ctx.me.id })
      logToContext(c2, key, ctx.now, ctx.me.id, `Decision recorded: ${f.values.title}`)
      ctx.audit('decision.record', did, f.values.title)
    })
    toast.success('Decision recorded')
    f.reset()
    setSeed(undefined)
    onOpenChange(false)
  }
  return (
    <FormSheet open={open} onOpenChange={(o) => { if (!o) { f.reset(); setSeed(undefined) } onOpenChange(o) }} title="Record decision" onSubmit={submit} submitLabel="Record">
      <Field label="Title" required error={f.errors.title}>
        <TextInput value={f.values.title} onChange={(e) => f.set('title', e.target.value)} invalid={!!f.errors.title} placeholder="e.g. Launch in two waves" />
      </Field>
      <Field label="Decision" required error={f.errors.text}>
        <TextArea value={f.values.text} onChange={(e) => f.set('text', e.target.value)} invalid={!!f.errors.text} />
      </Field>
      <Field label="Why">
        <TextArea value={f.values.rationale} onChange={(e) => f.set('rationale', e.target.value)} />
      </Field>
      <Field label="Decided by" required error={f.errors.deciderId}>
        <Select options={people} value={f.values.deciderId} onChange={(e) => f.set('deciderId', e.target.value)} />
      </Field>
    </FormSheet>
  )
}

/* ——— Files ——— */

const MAX_FILE_BYTES = 2 * 1024 * 1024
/** Uploaded files live in the browser store in this prototype, so total upload size is capped. */
const MAX_TOTAL_CHARS = 4_000_000

const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)
const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })

export function FilesPanel({ ctx: key }: { ctx: string }) {
  const { company: c, me, can, mutate } = useHub()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const f = useForm({ name: '', url: '' })
  const files = c.files.filter((x) => x.ctx === key)

  const addLink = () => {
    if (!f.validate({ name: required('Name'), url: (v) => (/^https?:\/\/\S+$/.test(String(v)) ? undefined : 'Enter a full link starting with https://') })) return
    mutate((c2, ctx) => {
      const fid = ctx.id('FILE')
      c2.files.unshift({ id: fid, ctx: key, name: f.values.name, kind: 'Link', size: 'Link', versions: [{ v: 1, at: TODAY, by: ctx.me.id, note: 'Added' }], source: 'Link', url: f.values.url })
      logToContext(c2, key, ctx.now, ctx.me.id, `Link added: ${f.values.name}`)
      ctx.audit('file.add', fid, f.values.name)
    })
    toast.success('Link added')
    f.reset()
    setOpen(false)
  }

  const upload = async (list: FileList | null) => {
    if (!list?.length) return
    const picked = Array.from(list)
    const tooBig = picked.filter((x) => x.size > MAX_FILE_BYTES)
    if (tooBig.length) toast.error(`${tooBig.map((x) => x.name).join(', ')} ${tooBig.length > 1 ? 'are' : 'is'} over ${fmtSize(MAX_FILE_BYTES)} — share large files as a link.`)
    const ok = picked.filter((x) => x.size <= MAX_FILE_BYTES)
    if (!ok.length) return
    setBusy(true)
    try {
      const read = await Promise.all(ok.map(async (file) => ({ file, dataUrl: await readAsDataUrl(file) })))
      const used = c.files.reduce((s, x) => s + (x.dataUrl?.length ?? 0), 0)
      const adding = read.reduce((s, r) => s + r.dataUrl.length, 0)
      if (used + adding > MAX_TOTAL_CHARS) {
        toast.error('Prototype storage is full. Remove an uploaded file or share this one as a link.')
        return
      }
      mutate((c2, ctx) => {
        read.forEach(({ file, dataUrl }) => {
          const fid = ctx.id('FILE')
          const ext = file.name.includes('.') ? file.name.split('.').pop()!.toUpperCase() : 'File'
          c2.files.unshift({ id: fid, ctx: key, name: file.name, kind: ext, size: fmtSize(file.size), mime: file.type, dataUrl, versions: [{ v: 1, at: TODAY, by: ctx.me.id, note: 'Uploaded' }], source: 'Upload' })
          logToContext(c2, key, ctx.now, ctx.me.id, `File uploaded: ${file.name}`)
          ctx.audit('file.upload', fid, file.name)
        })
      })
      toast.success(read.length > 1 ? `${read.length} files uploaded` : `${read[0].file.name} uploaded`)
    } catch {
      toast.error('Could not read that file. Try again.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const remove = (fid: string, name: string) => {
    mutate((c2, ctx) => {
      c2.files = c2.files.filter((x) => x.id !== fid)
      logToContext(c2, key, ctx.now, ctx.me.id, `File removed: ${name}`)
      ctx.audit('file.remove', fid, name)
    })
    toast.success(`${name} removed`)
  }

  return (
    <div className="flex flex-col gap-3">
      <TabHeader text={`Documents and links. Uploads up to ${fmtSize(MAX_FILE_BYTES)} each.`}>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Link2 aria-hidden /> Add link
        </Button>
        <Button size="sm" onClick={() => input.current?.click()} disabled={busy}>
          <Upload aria-hidden /> {busy ? 'Uploading…' : 'Upload files'}
        </Button>
        <input ref={input} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => upload(e.target.files)} />
      </TabHeader>
      {files.length ? (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {files.map((x) => {
            const last = x.versions[0]
            const canRemove = can('manage') || last?.by === me.id
            return (
              <li key={x.id} className="group flex items-center gap-3 px-4 py-2.5">
                {x.url ? <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                <div className="flex min-w-0 flex-1 flex-col">
                  {x.url ? (
                    <a href={x.url} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-info hover:underline">{x.name}</a>
                  ) : x.dataUrl ? (
                    <a href={x.dataUrl} download={x.name} className="truncate text-sm font-medium text-info hover:underline">{x.name}</a>
                  ) : (
                    <span className="truncate text-sm font-medium text-foreground">{x.name}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {x.kind}{x.size !== 'Link' ? ` · ${x.size}` : ''} · v{last?.v ?? 1} · {last ? `${empOf(c, last.by)?.fullName ?? 'Unknown'}, ${last.at}` : ''}
                  </span>
                </div>
                {x.url && (
                  <a href={x.url} target="_blank" rel="noreferrer" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Open ${x.name}`}>
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                )}
                {x.dataUrl && (
                  <a href={x.dataUrl} download={x.name} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Download ${x.name}`}>
                    <Download className="size-4" aria-hidden />
                  </a>
                )}
                {canRemove && (
                  <button type="button" onClick={() => remove(x.id, x.name)} className="rounded p-1.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100" aria-label={`Remove ${x.name}`}>
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground hover:bg-muted/50"
        >
          <Upload className="size-5" aria-hidden />
          <span className="text-sm">No files yet. Click to upload, or add a link.</span>
        </button>
      )}
      <FormSheet open={open} onOpenChange={setOpen} title="Add link" description="Share a Google Drive, Figma or any other document by link." onSubmit={addLink} submitLabel="Add">
        <Field label="Name" required error={f.errors.name}>
          <TextInput value={f.values.name} onChange={(e) => f.set('name', e.target.value)} invalid={!!f.errors.name} placeholder="e.g. Launch brief" />
        </Field>
        <Field label="Link" required error={f.errors.url}>
          <TextInput type="url" value={f.values.url} onChange={(e) => f.set('url', e.target.value)} invalid={!!f.errors.url} placeholder="https://" />
        </Field>
      </FormSheet>
    </div>
  )
}

/* ——— Meetings ——— */

const meetRe = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(\?.*)?$/i

export function MeetingsPanel({ ctx: key, defaultAttendees }: { ctx: string; defaultAttendees: string[] }) {
  const { company: c, me, can, mutate } = useHub()
  const [open, setOpen] = useState(false)
  const initial = { title: '', agenda: '', date: TODAY, time: '10:00', duration: '30', attendeeIds: defaultAttendees, external: '', url: '', email: true }
  const f = useForm(initial)
  const meetings = c.meetings.filter((m) => m.ctx === key && m.status === 'Scheduled').sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))

  const submit = () => {
    const ok = f.validate({
      title: required('Title'),
      date: required('Date'),
      time: required('Time'),
      attendeeIds: required('Attendees'),
      url: (v) => (meetRe.test(String(v).trim()) ? undefined : 'Paste a Google Meet link, e.g. https://meet.google.com/abc-defg-hij'),
      external: (v) => (String(v).split(',').map((s) => s.trim()).filter(Boolean).every((s) => /^\S+@\S+\.\S+$/.test(s)) ? undefined : 'Separate guest emails with commas'),
    })
    if (!ok) return
    const external = f.values.external.split(',').map((s) => s.trim()).filter(Boolean)
    const url = f.values.url.trim()
    const where = contextInfo(c, key).label
    let invited = 0
    mutate((c2, ctx) => {
      const mid = ctx.id('MTG')
      const v = f.values
      c2.meetings.push({ id: mid, ctx: key, title: v.title, agenda: v.agenda, date: v.date, time: v.time, tz: 'Europe/Lisbon', duration: Number(v.duration) || 30, attendeeIds: v.attendeeIds, external, url, organizerId: ctx.me.id, status: 'Scheduled', invitesSent: v.email, history: [{ at: ctx.now, by: ctx.me.id, text: v.email ? 'Scheduled · invitations emailed' : 'Scheduled' }] })
      if (v.email) {
        const subject = `Invitation: ${v.title} — ${v.date} ${v.time}`
        const body = [`${ctx.me.fullName} invited you to "${v.title}" (${where}).`, '', `When: ${v.date} at ${v.time} (Europe/Lisbon) · ${Number(v.duration) || 30} min`, `Join with Google Meet: ${url}`, ...(v.agenda ? ['', 'Agenda:', v.agenda] : [])].join('\n')
        const from = `${ctx.me.fullName} <${ctx.me.email}>`
        const recipients = v.attendeeIds.map((id) => c2.employees.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e?.email && e.id !== ctx.me.id)
        recipients.forEach((e) => {
          ;(c2.mailboxes[e.id] ??= []).unshift({ id: ctx.id('MAIL'), folder: 'Inbox', from, to: e.email, subject, body, date: ctx.now })
        })
        const toList = [...recipients.map((e) => `${e.fullName} <${e.email}>`), ...external]
        if (toList.length) (c2.mailboxes[ctx.me.id] ??= []).unshift({ id: ctx.id('MAIL'), folder: 'Sent', from: ctx.me.email, to: toList.join(', '), subject, body, date: ctx.now })
        invited = toList.length
      }
      logToContext(c2, key, ctx.now, ctx.me.id, `Meeting scheduled: ${v.title}`)
      ctx.audit('meeting.schedule', mid, v.title)
    })
    toast.success(f.values.email ? `Meeting scheduled · invitation emailed to ${invited} ${invited === 1 ? 'person' : 'people'}` : 'Meeting scheduled')
    f.reset()
    setOpen(false)
  }

  const cancel = (mid: string, title: string) => {
    mutate((c2, ctx) => {
      const m = c2.meetings.find((x) => x.id === mid)
      if (!m) return
      m.status = 'Cancelled'
      m.history.unshift({ at: ctx.now, by: ctx.me.id, text: 'Cancelled' })
      logToContext(c2, key, ctx.now, ctx.me.id, `Meeting cancelled: ${title}`)
      ctx.audit('meeting.cancel', mid, title)
    })
    toast.success('Meeting cancelled')
  }

  return (
    <div className="flex flex-col gap-3">
      <TabHeader text="Upcoming Google Meet meetings. Attendees get the invitation by email.">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus aria-hidden /> Schedule meeting
        </Button>
      </TabHeader>
      {meetings.length ? (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {meetings.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex w-20 shrink-0 flex-col text-xs">
                <span className="font-medium text-foreground">{m.date === TODAY ? 'Today' : m.date.slice(5)}</span>
                <span className="text-muted-foreground">{m.time} · {m.duration}m</span>
              </div>
              <div className="flex min-w-48 flex-1 flex-col">
                <span className="text-sm font-medium text-foreground">{m.title}</span>
                {m.agenda && <span className="text-xs text-muted-foreground">{m.agenda}</span>}
                <span className="text-xs text-muted-foreground">
                  Organised by {empOf(c, m.organizerId)?.fullName ?? 'Unknown'}
                  {m.external.length > 0 && ` · ${m.external.length} guest${m.external.length > 1 ? 's' : ''}`}
                </span>
              </div>
              {m.invitesSent && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="size-3.5" aria-hidden /> Invites sent
                </span>
              )}
              <span className="flex -space-x-1.5" aria-label={`${m.attendeeIds.length} attendees`}>
                {m.attendeeIds.slice(0, 5).map((a) => (
                  <Avatar key={a} id={a} size="sm" className="ring-2 ring-card" />
                ))}
              </span>
              <a href={m.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-medium text-info hover:underline">
                <Video className="size-4" aria-hidden /> Join
              </a>
              {(m.organizerId === me.id || can('manage')) && (
                <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => cancel(m.id, m.title)} aria-label={`Cancel ${m.title}`}>
                  <X aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyLine icon={<Video className="size-5" aria-hidden />} text="No meetings scheduled." />
      )}
      <FormSheet open={open} onOpenChange={(o) => { if (!o) f.reset(); setOpen(o) }} title="Schedule meeting" description="Uses Google Meet. Create a meeting link, paste it here, and we email the invitation." onSubmit={submit} submitLabel={f.values.email ? 'Schedule & send invites' : 'Schedule'}>
        <Field label="Title" required error={f.errors.title}>
          <TextInput value={f.values.title} onChange={(e) => f.set('title', e.target.value)} invalid={!!f.errors.title} />
        </Field>
        <Field label="Agenda">
          <TextArea value={f.values.agenda} onChange={(e) => f.set('agenda', e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date" required error={f.errors.date}>
            <TextInput type="date" value={f.values.date} onChange={(e) => f.set('date', e.target.value)} />
          </Field>
          <Field label="Time" required error={f.errors.time}>
            <TextInput type="time" value={f.values.time} onChange={(e) => f.set('time', e.target.value)} />
          </Field>
          <Field label="Minutes">
            <TextInput type="number" min={15} step={15} value={f.values.duration} onChange={(e) => f.set('duration', e.target.value)} />
          </Field>
        </div>
        <Field label="Google Meet link" required error={f.errors.url} hint="Open Google Meet, choose “Create a meeting for later”, and paste the link.">
          <div className="flex gap-2">
            <TextInput type="url" value={f.values.url} onChange={(e) => f.set('url', e.target.value)} invalid={!!f.errors.url} placeholder="https://meet.google.com/abc-defg-hij" className="flex-1" />
            <a
              href="https://meet.google.com/new"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Video className="size-4" aria-hidden /> Create link
            </a>
          </div>
        </Field>
        <PeoplePicker label="Attendees" value={f.values.attendeeIds} onChange={(v) => f.set('attendeeIds', v)} error={f.errors.attendeeIds} />
        <Field label="External guests" hint="Comma-separated email addresses" error={f.errors.external}>
          <TextInput value={f.values.external} onChange={(e) => f.set('external', e.target.value)} placeholder="client@example.com" invalid={!!f.errors.external} />
        </Field>
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input type="checkbox" checked={f.values.email} onChange={(e) => f.set('email', e.target.checked)} className="mt-0.5 size-4 accent-primary" />
          <span className="flex flex-col">
            Email the invitation to every attendee
            <span className="text-xs text-muted-foreground">Includes date, time, agenda and the Meet link.</span>
          </span>
        </label>
      </FormSheet>
    </div>
  )
}

export function HistoryList({ items }: { items: { at: string; by: string; text: string }[] }) {
  const { company: c } = useHub()
  if (!items.length) return <EmptyLine icon={<FileText className="size-5" aria-hidden />} text="Nothing recorded yet." />
  return (
    <ol className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
      {items.map((x, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <Avatar id={x.by} size="sm" />
          <span className="flex-1 text-foreground">
            <span className="font-medium">{empOf(c, x.by)?.fullName ?? 'System'}</span> — {x.text}
          </span>
          <time className="text-xs text-muted-foreground">{x.at}</time>
        </li>
      ))}
    </ol>
  )
}
