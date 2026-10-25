'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarPlus, FileText, Send } from 'lucide-react'
import { toast } from 'sonner'
import type { CompanyData } from '@/lib/fixtures'
import { TODAY } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { empOf } from '@/lib/derive'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'
import { Page, StateBlock } from '@/components/hub/page'
import { Field, FormSheet, TextArea, TextInput, required, useForm } from '@/components/hub/form'
import { cn } from '@/lib/utils'

function ctxLabel(c: CompanyData, ctx: string) {
  const [kind, id] = ctx.split(':')
  if (kind === 'project') return { label: c.projects.find((p) => p.id === id)?.name ?? id, kind: 'Project', href: `/projects/${id}` }
  if (kind === 'dept') return { label: c.departments.find((d) => d.id === id)?.name ?? id, kind: 'Department', href: `/departments?id=${id}` }
  if (kind === 'product') return { label: c.products.find((p) => p.id === id)?.name ?? id, kind: 'Product', href: `/products/${id}` }
  return { label: 'Company-wide', kind: 'Company', href: '/communications' }
}

export function Communications() {
  const { company: c, me, mutate } = useHub()
  const router = useRouter()
  const sp = useSearchParams()
  const [draft, setDraft] = useState('')
  const [meetOpen, setMeetOpen] = useState(false)
  const mf = useForm({ title: '', date: '', time: '10:00', agenda: '' })

  const contexts = useMemo(() => {
    const visibleProjects = c.projects.filter((p) => p.pmId === me.id || p.sponsorId === me.id || p.members.some((m) => m.personId === me.id) || ['owner', 'admin'].includes(me.accessRole))
    const keys = new Set<string>(['company:all', `dept:${me.dept}`, ...visibleProjects.map((p) => `project:${p.id}`)])
    return Array.from(keys)
  }, [c.projects, me])

  const requested = sp.get('ctx')
  const active = requested && contexts.includes(requested) ? requested : contexts[0]
  const denied = !!requested && !contexts.includes(requested)
  const meta = ctxLabel(c, active)
  const msgs = c.messages.filter((m) => m.ctx === active).sort((a, b) => a.at.localeCompare(b.at))
  const meetings = c.meetings.filter((m) => m.ctx === active).sort((a, b) => a.date.localeCompare(b.date))
  const files = c.files.filter((f) => f.ctx === active)
  const decisions = c.decisions.filter((d) => d.ctx === active)

  const post = () => {
    const body = draft.trim()
    if (!body) return
    mutate((c2, ctx) => {
      c2.messages.push({ id: ctx.id('MSG'), ctx: active, authorId: ctx.me.id, at: ctx.now, body })
    })
    setDraft('')
  }

  const schedule = () => {
    if (!mf.validate({ title: required('Title'), date: required('Date'), time: required('Time') })) return
    mutate((c2, ctx) => {
      const id = ctx.id('MTG')
      c2.meetings.push({
        id,
        ctx: active,
        title: mf.values.title,
        agenda: mf.values.agenda,
        date: mf.values.date,
        time: mf.values.time,
        tz: 'CET',
        duration: 30,
        attendeeIds: [ctx.me.id],
        external: [],
        url: `https://meet.example.com/${id.toLowerCase()}`,
        organizerId: ctx.me.id,
        status: 'Scheduled',
        history: [{ at: ctx.now, by: ctx.me.id, text: 'Scheduled' }],
      })
      ctx.audit('meeting.schedule', id, mf.values.title)
    })
    toast.success('Meeting scheduled')
    mf.reset()
    setMeetOpen(false)
  }

  return (
    <Page title="Communications" description="Conversations, meetings, files and decisions, each attached to the work they're about.">
      {denied && <StateBlock title="Conversation not available" body="You aren't a member of that conversation. Showing your conversations instead." />}
      <div className="grid min-h-0 gap-4 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Conversations" className="flex flex-col gap-1">
          {contexts.map((k) => {
            const m = ctxLabel(c, k)
            const count = c.messages.filter((x) => x.ctx === k).length
            return (
              <button
                key={k}
                type="button"
                onClick={() => router.replace(`/communications?ctx=${k}`)}
                aria-current={k === active ? 'page' : undefined}
                className={cn('flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm', k === active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60')}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{m.label}</span>
                  <span className="text-xs text-muted-foreground">{m.kind}</span>
                </span>
                {count > 0 && <span className="font-mono text-xs text-muted-foreground">{count}</span>}
              </button>
            )
          })}
        </nav>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {meta.kind !== 'Company' ? (
                <Link href={meta.href} className="hover:underline">
                  {meta.label}
                </Link>
              ) : (
                meta.label
              )}
            </h2>
            <Button size="sm" variant="outline" onClick={() => setMeetOpen(true)}>
              <CalendarPlus aria-hidden /> Schedule meeting
            </Button>
          </div>
          <Tabs defaultValue="thread">
            <TabsList>
              <TabsTrigger value="thread">Thread</TabsTrigger>
              <TabsTrigger value="meetings">Meetings · {meetings.length}</TabsTrigger>
              <TabsTrigger value="files">Files · {files.length}</TabsTrigger>
              <TabsTrigger value="decisions">Decisions · {decisions.length}</TabsTrigger>
            </TabsList>

            <TabsContent value="thread" className="flex flex-col gap-3 pt-2">
              <Panel>
                {msgs.length ? (
                  <ol className="flex flex-col gap-4">
                    {msgs.map((m) => (
                      <li key={m.id} className="flex gap-3">
                        <Avatar id={m.authorId} size="sm" />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{empOf(c, m.authorId)?.fullName ?? 'Former member'}</span> · {m.at}
                          </span>
                          <p className="text-sm leading-relaxed text-pretty text-foreground">{m.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
                )}
              </Panel>
              <form
                className="flex items-end gap-2 rounded-lg border border-border bg-card p-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  post()
                }}
              >
                <label htmlFor="msg" className="sr-only">
                  Message {meta.label}
                </label>
                <textarea
                  id="msg"
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                      e.preventDefault()
                      post()
                    }
                  }}
                  placeholder={`Message ${meta.label}`}
                  className="min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send">
                  <Send aria-hidden />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="meetings" className="pt-2">
              <Panel>
                {meetings.length ? (
                  <ul className="divide-y divide-border">
                    {meetings.map((m) => (
                      <li key={m.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">{m.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {m.date} {m.time} {m.tz} · {m.duration} min · organizer {empOf(c, m.organizerId)?.fullName}
                            {m.external.length > 0 && ` · ${m.external.length} external`}
                          </span>
                        </div>
                        <StatusPill status={m.date < TODAY && m.status === 'Scheduled' ? 'Held' : m.status} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No meetings for this conversation.</p>
                )}
              </Panel>
            </TabsContent>

            <TabsContent value="files" className="pt-2">
              <Panel>
                {files.length ? (
                  <ul className="divide-y divide-border">
                    {files.map((f) => (
                      <li key={f.id} className="flex items-center gap-3 py-2.5">
                        <FileText aria-hidden className="size-4 text-muted-foreground" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium text-foreground">{f.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {f.kind} · {f.size} · v{f.versions.length} · {f.source}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No files attached.</p>
                )}
              </Panel>
            </TabsContent>

            <TabsContent value="decisions" className="pt-2">
              <Panel>
                {decisions.length ? (
                  <ul className="divide-y divide-border">
                    {decisions.map((d) => (
                      <li key={d.id} className="flex flex-col gap-1 py-2.5">
                        <span className="font-medium text-foreground">{d.title}</span>
                        <span className="text-sm leading-relaxed text-muted-foreground">{d.text}</span>
                        <span className="text-xs text-muted-foreground">
                          Decided by <PersonLink id={d.deciderId} /> · {d.at}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No decisions recorded here.</p>
                )}
              </Panel>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <FormSheet open={meetOpen} onOpenChange={setMeetOpen} title="Schedule meeting" description={`For ${meta.label}.`} onSubmit={schedule} submitLabel="Schedule">
        <Field label="Title" required error={mf.errors.title}>
          <TextInput value={mf.values.title} onChange={(e) => mf.set('title', e.target.value)} invalid={!!mf.errors.title} />
        </Field>
        <Field label="Date" required error={mf.errors.date}>
          <TextInput type="date" min={TODAY} value={mf.values.date} onChange={(e) => mf.set('date', e.target.value)} invalid={!!mf.errors.date} />
        </Field>
        <Field label="Time (CET)" required error={mf.errors.time}>
          <TextInput type="time" value={mf.values.time} onChange={(e) => mf.set('time', e.target.value)} invalid={!!mf.errors.time} />
        </Field>
        <Field label="Agenda">
          <TextArea value={mf.values.agenda} onChange={(e) => mf.set('agenda', e.target.value)} />
        </Field>
      </FormSheet>
    </Page>
  )
}
