'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, CornerDownRight, FileText, Gavel, Link2, MessageSquare, Pencil, Plus, Send, Trash2, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Project } from '@/lib/fixtures'
import { fmtEUR, TODAY } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { countable, empOf, productOf, projectHealth, projectOf } from '@/lib/derive'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, PersonLink, StatusPill } from '@/components/hub/primitives'
import { Page, StateBlock } from '@/components/hub/page'
import { ActivityTable } from '@/components/activities/activity-table'
import { CreateActivity } from '@/components/activities/activities-workspace'
import { Field, FormSheet, PeoplePicker, Select, TabBar, TextArea, TextInput, required, useForm, usePeopleOptions } from '@/components/hub/form'

type Stage = Project['stages'][number]
const healthTone = { 'On track': 'success', 'At risk': 'warning', Blocked: 'danger' } as const

/** Keeps stage order meaningful: done stages stay done, the first open stage is current. */
function normalizeStages(stages: Stage[]) {
  let current = false
  stages.forEach((s) => {
    if (s.status === 'Done') return
    s.status = current ? 'Upcoming' : 'Current'
    current = true
  })
}

function useProjectEditor(projectId: string) {
  const { mutate } = useHub()
  return (summary: string, fn: (p: Project) => void) =>
    mutate((c2, ctx) => {
      const pr = c2.projects.find((x) => x.id === projectId)
      if (!pr) return
      fn(pr)
      pr.history.unshift({ at: ctx.now, by: ctx.me.id, text: summary })
      ctx.audit('project.update', pr.id, summary)
    })
}

export function ProjectDetail({ id }: { id: string }) {
  const { company: c, me, can } = useHub()
  const p = projectOf(c, id)
  const [tab, setTab] = useState('conversation')
  const [editOpen, setEditOpen] = useState(false)

  if (!p) return <Page title="Project not found"><StateBlock title="Not found" body={`This project isn't in ${c.name}.`} /></Page>
  const memberIds = [p.pmId, p.sponsorId, ...p.members.map((m) => m.personId)]
  if (!(can('manage') || memberIds.includes(me.id))) return <Page title="Project" forbidden>{null}</Page>

  const canEdit = can('manage') || p.pmId === me.id
  const ctxKey = `project:${p.id}`
  const count = {
    conversation: c.messages.filter((m) => m.ctx === ctxKey).length,
    activities: c.activities.filter((a) => a.projectId === p.id).length,
    people: p.members.length,
    stages: p.stages.length,
    decisions: c.decisions.filter((d) => d.ctx === ctxKey).length,
    files: c.files.filter((f) => f.ctx === ctxKey).length,
    meetings: c.meetings.filter((m) => m.ctx === ctxKey && m.status === 'Scheduled').length,
  }

  return (
    <Page
      title={p.name}
      description={p.purpose}
      crumbs={[{ label: 'Projects', href: '/projects' }]}
      actions={
        canEdit && (
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil aria-hidden /> Edit details
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <ProjectSummary p={p} />
        <TabBar
          label="Project sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'conversation', label: 'Conversation', count: count.conversation },
            { id: 'activities', label: 'Activities', count: count.activities },
            { id: 'people', label: 'People', count: count.people },
            { id: 'stages', label: 'Stages', count: count.stages },
            { id: 'decisions', label: 'Decisions', count: count.decisions },
            { id: 'files', label: 'Files', count: count.files },
            { id: 'meetings', label: 'Meetings', count: count.meetings },
            { id: 'history', label: 'History' },
          ]}
        />
        <div role="tabpanel" aria-label={tab}>
          {tab === 'conversation' && <Conversation p={p} canPost={memberIds.includes(me.id) || can('manage')} />}
          {tab === 'activities' && <ActivitiesTab p={p} />}
          {tab === 'people' && <PeopleTab p={p} canEdit={canEdit} />}
          {tab === 'stages' && <StagesTab p={p} canEdit={canEdit} />}
          {tab === 'decisions' && <DecisionsTab p={p} />}
          {tab === 'files' && <FilesTab p={p} />}
          {tab === 'meetings' && <MeetingsTab p={p} />}
          {tab === 'history' && <HistoryTab p={p} />}
        </div>
      </div>
      {canEdit && <EditProject p={p} open={editOpen} onOpenChange={setEditOpen} />}
    </Page>
  )
}

function ProjectSummary({ p }: { p: Project }) {
  const { company: c } = useHub()
  const acts = c.activities.filter((a) => a.projectId === p.id && a.status !== 'Cancelled')
  const accepted = acts.filter((a) => a.status === 'Accepted').length
  const pct = acts.length ? Math.round((accepted / acts.length) * 100) : 0
  const h = projectHealth(c, p)
  const spend = c.expenses.filter((e) => e.projectId === p.id && countable(e)).reduce((s, e) => s + e.amount, 0)

  return (
    <section aria-label="Project summary" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <span className="flex items-center gap-2">
          <StatusPill status={p.status} />
          <StatusPill status={h.value} tone={healthTone[h.value as keyof typeof healthTone] ?? 'muted'} />
        </span>
        <Fact label="Project manager"><PersonLink id={p.pmId} /></Fact>
        <Fact label="Sponsor"><PersonLink id={p.sponsorId} /></Fact>
        <Fact label="Target">{p.target}</Fact>
        {p.budget !== undefined && <Fact label="Spend">{fmtEUR(spend)} of {fmtEUR(p.budget)}</Fact>}
        {p.productIds.length > 0 && (
          <Fact label="Products">
            {p.productIds.map((pid, i) => (
              <span key={pid}>
                {i > 0 && ', '}
                <Link href={`/products/${pid}`} className="text-info hover:underline">{productOf(c, pid)?.name ?? pid}</Link>
              </span>
            ))}
          </Fact>
        )}
        <div className="flex min-w-40 flex-1 items-center gap-2">
          <Progress value={pct} className="h-1.5" aria-label={`${pct}% of activities accepted`} />
          <span className="shrink-0 text-xs text-muted-foreground">{accepted}/{acts.length} done</span>
        </div>
      </div>
      {p.stages.length > 0 && (
        <ol aria-label="Stages" className="flex gap-1">
          {p.stages.map((s, i) => (
            <li key={i} className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className={cn('h-1.5 rounded-full', s.status === 'Done' ? 'bg-success' : s.status === 'Current' ? 'bg-primary' : 'bg-muted')} />
              <span className={cn('truncate text-xs', s.status === 'Current' ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {s.status === 'Done' && <Check className="mr-0.5 inline size-3 text-success" aria-hidden />}
                {s.name}
                <span className="sr-only"> — {s.status}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      {h.value !== 'On track' && h.reasons.length > 0 && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Why {h.value.toLowerCase()}:</span> {h.reasons.slice(0, 3).join(' · ')}
        </p>
      )}
    </section>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </span>
  )
}

/* ——— Conversation ——— */

function Conversation({ p, canPost }: { p: Project; canPost: boolean }) {
  const { company: c, mutate } = useHub()
  const ctxKey = `project:${p.id}`
  const all = c.messages.filter((m) => m.ctx === ctxKey)
  const threads = all.filter((m) => !m.parentId).sort((a, b) => a.at.localeCompare(b.at))
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [decisionFrom, setDecisionFrom] = useState<string | null>(null)

  const post = (body: string, parentId?: string) => {
    const text = body.trim()
    if (!text) return
    mutate((c2, ctx) => {
      c2.messages.push({ id: ctx.id('MSG'), ctx: ctxKey, authorId: ctx.me.id, at: ctx.now, body: text, ...(parentId ? { parentId } : {}) })
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
          <p className="text-sm text-muted-foreground">No messages yet. Start the conversation for this project.</p>
        </div>
      )}
      {canPost ? (
        <div className="sticky bottom-0 rounded-b-lg border-t border-border bg-card p-3">
          <Composer value={draft} onChange={setDraft} placeholder={`Message ${p.name}`} onSend={(t) => { post(t); setDraft('') }} />
        </div>
      ) : (
        <p className="border-t border-border p-3 text-xs text-muted-foreground">Only project members can post.</p>
      )}
      <DecisionSheet p={p} open={!!decisionFrom} onOpenChange={(o) => !o && setDecisionFrom(null)} fromMessage={all.find((m) => m.id === decisionFrom)?.body} />
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

/* ——— Activities ——— */

function ActivitiesTab({ p }: { p: Project }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <TabHeader text="Every piece of work in this project. Accepted activities count towards progress.">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus aria-hidden /> New activity
        </Button>
      </TabHeader>
      <ActivityTable filter={(a) => a.projectId === p.id} caption={`Activities in ${p.name}`} empty="No activities yet." />
      <CreateActivity open={open} onOpenChange={setOpen} preset={{ projectId: p.id, dept: p.ownerDept }} />
    </div>
  )
}

/* ——— People ——— */

function PeopleTab({ p, canEdit }: { p: Project; canEdit: boolean }) {
  const { company: c } = useHub()
  const edit = useProjectEditor(p.id)
  const memberIds = new Set(p.members.map((m) => m.personId))
  const options = usePeopleOptions((pid) => !memberIds.has(pid))
  const [person, setPerson] = useState('')
  const [role, setRole] = useState('')

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!person) return
    const name = empOf(c, person)?.fullName ?? person
    edit(`${name} added as ${role.trim() || 'Member'}`, (pr) => {
      pr.members.push({ personId: person, role: role.trim() || 'Member' })
      pr.formerMembers = pr.formerMembers.filter((f) => f.personId !== person)
    })
    toast.success(`${name} added to the project`)
    setPerson('')
    setRole('')
  }

  const remove = (pid: string) => {
    const name = empOf(c, pid)?.fullName ?? pid
    edit(`${name} removed`, (pr) => {
      const m = pr.members.find((x) => x.personId === pid)
      pr.members = pr.members.filter((x) => x.personId !== pid)
      if (m) pr.formerMembers.push({ ...m, until: TODAY })
    })
    toast.success(`${name} removed from the project`)
  }

  const setRoleFor = (pid: string, next: string) => edit(`Role for ${empOf(c, pid)?.fullName ?? pid} changed to ${next}`, (pr) => {
    const m = pr.members.find((x) => x.personId === pid)
    if (m) m.role = next
  })

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <form onSubmit={add} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center">
          <Select options={options} value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Choose a person…" aria-label="Person to add" className="sm:w-64" />
          <TextInput value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role on this project (e.g. Designer)" aria-label="Role" className="flex-1" />
          <Button type="submit" size="sm" disabled={!person}>
            <Plus aria-hidden /> Add to project
          </Button>
        </form>
      )}
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
        {p.members.map((m) => (
          <li key={m.personId} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <div className="min-w-48 flex-1">
              <PersonLink id={m.personId} showRole />
            </div>
            {m.personId === p.pmId && <StatusPill status="Project manager" tone="info" />}
            {m.personId === p.sponsorId && <StatusPill status="Sponsor" tone="muted" />}
            {canEdit ? (
              <RoleInput value={m.role} onSave={(v) => setRoleFor(m.personId, v)} />
            ) : (
              <span className="text-sm text-muted-foreground">{m.role}</span>
            )}
            {canEdit && m.personId !== p.pmId && (
              <Button size="icon" variant="ghost" className="size-8" onClick={() => remove(m.personId)} aria-label={`Remove ${empOf(c, m.personId)?.fullName}`}>
                <X aria-hidden />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {p.formerMembers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Former members: {p.formerMembers.map((m) => `${empOf(c, m.personId)?.fullName ?? m.personId} (${m.role}, until ${m.until})`).join(', ')}
        </p>
      )}
    </div>
  )
}

function RoleInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value)
  const commit = () => {
    const next = v.trim()
    if (next && next !== value) onSave(next)
    else setV(value)
  }
  return (
    <TextInput
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
      aria-label="Project role"
      className="h-8 w-52 border-transparent bg-transparent hover:border-border focus:border-border"
    />
  )
}

/* ——— Stages ——— */

function StagesTab({ p, canEdit }: { p: Project; canEdit: boolean }) {
  const edit = useProjectEditor(p.id)
  const [sheet, setSheet] = useState<{ index: number | null } | null>(null)

  const move = (i: number, dir: -1 | 1) => edit(`Stage "${p.stages[i].name}" moved ${dir < 0 ? 'up' : 'down'}`, (pr) => {
    const j = i + dir
    ;[pr.stages[i], pr.stages[j]] = [pr.stages[j], pr.stages[i]]
    normalizeStages(pr.stages)
  })
  const remove = (i: number) => {
    edit(`Stage "${p.stages[i].name}" removed`, (pr) => {
      pr.stages.splice(i, 1)
      normalizeStages(pr.stages)
    })
    toast.success('Stage removed')
  }
  const complete = (i: number) => {
    edit(`Stage "${p.stages[i].name}" marked done`, (pr) => {
      pr.stages[i].status = 'Done'
      normalizeStages(pr.stages)
      if (pr.status === 'Planning') pr.status = 'Active'
      if (pr.stages.every((s) => s.status === 'Done')) pr.status = 'Closing'
    })
    toast.success('Stage completed')
  }

  return (
    <div className="flex flex-col gap-3">
      <TabHeader text="Stages run in order. Completing the current stage moves the project to the next one.">
        {canEdit && (
          <Button size="sm" onClick={() => setSheet({ index: null })}>
            <Plus aria-hidden /> Add stage
          </Button>
        )}
      </TabHeader>
      {p.stages.length ? (
        <ol className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {p.stages.map((s, i) => {
            const locked = s.status === 'Done'
            const prevOpen = i > 0 && p.stages[i - 1].status !== 'Done'
            const nextOpen = i < p.stages.length - 1
            return (
              <li key={`${i}-${s.name}`} className={cn('flex flex-wrap items-center gap-3 px-4 py-3', s.status === 'Current' && 'bg-accent/40')}>
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                    s.status === 'Done' && 'border-success bg-success text-success-foreground',
                    s.status === 'Current' && 'border-primary bg-primary text-primary-foreground',
                    s.status === 'Upcoming' && 'border-border text-muted-foreground',
                  )}
                  aria-hidden
                >
                  {s.status === 'Done' ? <Check className="size-3.5" /> : i + 1}
                </span>
                <div className="flex min-w-48 flex-1 flex-col gap-0.5">
                  <span className="font-medium text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground">Done when: {s.needs || '—'}</span>
                </div>
                <PersonLink id={s.ownerId} />
                <StatusPill status={s.status} tone={s.status === 'Done' ? 'success' : s.status === 'Current' ? 'info' : 'muted'} />
                {canEdit && (
                  <div className="flex items-center gap-1">
                    {s.status === 'Current' && (
                      <Button size="sm" variant="outline" onClick={() => complete(i)}>
                        <Check aria-hidden /> Complete
                      </Button>
                    )}
                    {!locked && (
                      <>
                        <Button size="icon" variant="ghost" className="size-8" disabled={!prevOpen} onClick={() => move(i, -1)} aria-label={`Move ${s.name} up`}>
                          <ArrowUp aria-hidden />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8" disabled={!nextOpen} onClick={() => move(i, 1)} aria-label={`Move ${s.name} down`}>
                          <ArrowDown aria-hidden />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => setSheet({ index: i })} aria-label={`Edit ${s.name}`}>
                      <Pencil aria-hidden />
                    </Button>
                    {!locked && (
                      <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => remove(i)} aria-label={`Remove ${s.name}`}>
                        <Trash2 aria-hidden />
                      </Button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No stages yet. Add the first stage to plan this project.</p>
      )}
      {sheet && <StageSheet p={p} index={sheet.index} onClose={() => setSheet(null)} />}
    </div>
  )
}

function StageSheet({ p, index, onClose }: { p: Project; index: number | null; onClose: () => void }) {
  const edit = useProjectEditor(p.id)
  const existing = index !== null ? p.stages[index] : undefined
  const people = usePeopleOptions()
  const f = useForm({ name: existing?.name ?? '', needs: existing?.needs ?? '', ownerId: existing?.ownerId ?? p.pmId })
  const submit = () => {
    if (!f.validate({ name: required('Name'), ownerId: required('Owner') })) return
    const { name, needs, ownerId } = f.values
    if (existing && index !== null) {
      edit(`Stage "${name}" updated`, (pr) => Object.assign(pr.stages[index], { name, needs, ownerId }))
    } else {
      edit(`Stage "${name}" added`, (pr) => {
        pr.stages.push({ name, needs, ownerId, approverIds: [], status: 'Upcoming' })
        normalizeStages(pr.stages)
      })
    }
    toast.success(existing ? 'Stage updated' : 'Stage added')
    onClose()
  }
  return (
    <FormSheet open onOpenChange={(o) => !o && onClose()} title={existing ? `Edit stage` : 'Add stage'} onSubmit={submit} submitLabel={existing ? 'Save' : 'Add stage'}>
      <Field label="Stage name" required error={f.errors.name}>
        <TextInput value={f.values.name} onChange={(e) => f.set('name', e.target.value)} invalid={!!f.errors.name} placeholder="e.g. User testing" />
      </Field>
      <Field label="Done when" hint="The outcome that closes this stage">
        <TextInput value={f.values.needs} onChange={(e) => f.set('needs', e.target.value)} placeholder="e.g. 5 clients tested the beta" />
      </Field>
      <Field label="Owner" required error={f.errors.ownerId}>
        <Select options={people} value={f.values.ownerId} onChange={(e) => f.set('ownerId', e.target.value)} invalid={!!f.errors.ownerId} />
      </Field>
    </FormSheet>
  )
}

/* ——— Decisions ——— */

function DecisionsTab({ p }: { p: Project }) {
  const { company: c } = useHub()
  const [open, setOpen] = useState(false)
  const decisions = c.decisions.filter((d) => d.ctx === `project:${p.id}`)
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
      <DecisionSheet p={p} open={open} onOpenChange={setOpen} />
    </div>
  )
}

function DecisionSheet({ p, open, onOpenChange, fromMessage }: { p: Project; open: boolean; onOpenChange: (o: boolean) => void; fromMessage?: string }) {
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
      c2.decisions.unshift({ id: did, ctx: `project:${p.id}`, title: f.values.title, text: f.values.text, rationale: f.values.rationale, deciderId: f.values.deciderId, at: TODAY, related: '', createdBy: ctx.me.id })
      c2.projects.find((x) => x.id === p.id)?.history.unshift({ at: ctx.now, by: ctx.me.id, text: `Decision recorded: ${f.values.title}` })
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

function FilesTab({ p }: { p: Project }) {
  const { company: c, mutate } = useHub()
  const [open, setOpen] = useState(false)
  const f = useForm({ name: '', url: '' })
  const files = c.files.filter((x) => x.ctx === `project:${p.id}`)
  const submit = () => {
    if (!f.validate({ name: required('Name'), url: (v) => (/^https?:\/\/\S+$/.test(String(v)) ? undefined : 'Enter a full link starting with https://') })) return
    mutate((c2, ctx) => {
      const fid = ctx.id('FILE')
      c2.files.unshift({ id: fid, ctx: `project:${p.id}`, name: f.values.name, kind: 'Link', size: 'Link', versions: [{ v: 1, at: TODAY, by: ctx.me.id, note: 'Added' }], source: 'Link', url: f.values.url })
      c2.projects.find((x) => x.id === p.id)?.history.unshift({ at: ctx.now, by: ctx.me.id, text: `File added: ${f.values.name}` })
      ctx.audit('file.add', fid, f.values.name)
    })
    toast.success('File added')
    f.reset()
    setOpen(false)
  }
  return (
    <div className="flex flex-col gap-3">
      <TabHeader text="Documents and links shared in this project.">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus aria-hidden /> Add link
        </Button>
      </TabHeader>
      {files.length ? (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {files.map((x) => {
            const last = x.versions[0]
            return (
              <li key={x.id} className="flex items-center gap-3 px-4 py-2.5">
                {x.url ? <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                <div className="flex min-w-0 flex-1 flex-col">
                  {x.url ? (
                    <a href={x.url} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-info hover:underline">{x.name}</a>
                  ) : (
                    <span className="truncate text-sm font-medium text-foreground">{x.name}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {x.kind} · v{last?.v ?? 1} · {last ? `${empOf(c, last.by)?.fullName ?? 'Unknown'}, ${last.at}` : ''}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyLine icon={<FileText className="size-5" aria-hidden />} text="No files yet." />
      )}
      <FormSheet open={open} onOpenChange={setOpen} title="Add link" onSubmit={submit} submitLabel="Add">
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

function MeetingsTab({ p }: { p: Project }) {
  const { company: c, mutate } = useHub()
  const [open, setOpen] = useState(false)
  const members = p.members.map((m) => m.personId)
  const f = useForm({ title: '', agenda: '', date: TODAY, time: '10:00', duration: '30', attendeeIds: members as string[] })
  const meetings = c.meetings.filter((m) => m.ctx === `project:${p.id}` && m.status === 'Scheduled').sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  const submit = () => {
    if (!f.validate({ title: required('Title'), date: required('Date'), time: required('Time'), attendeeIds: required('Attendees') })) return
    mutate((c2, ctx) => {
      const mid = ctx.id('MTG')
      c2.meetings.push({ id: mid, ctx: `project:${p.id}`, title: f.values.title, agenda: f.values.agenda, date: f.values.date, time: f.values.time, tz: 'Europe/Lisbon', duration: Number(f.values.duration) || 30, attendeeIds: f.values.attendeeIds, external: [], url: `https://meet.example/${mid.toLowerCase()}`, organizerId: ctx.me.id, status: 'Scheduled', history: [{ at: ctx.now, by: ctx.me.id, text: 'Scheduled' }] })
      c2.projects.find((x) => x.id === p.id)?.history.unshift({ at: ctx.now, by: ctx.me.id, text: `Meeting scheduled: ${f.values.title}` })
      ctx.audit('meeting.schedule', mid, f.values.title)
    })
    toast.success('Meeting scheduled')
    f.reset()
    setOpen(false)
  }
  return (
    <div className="flex flex-col gap-3">
      <TabHeader text="Upcoming meetings for this project.">
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
              </div>
              <span className="flex -space-x-1.5" aria-label={`${m.attendeeIds.length} attendees`}>
                {m.attendeeIds.slice(0, 5).map((a) => (
                  <Avatar key={a} id={a} size="sm" className="ring-2 ring-card" />
                ))}
              </span>
              <a href={m.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-medium text-info hover:underline">
                <Video className="size-4" aria-hidden /> Join
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyLine icon={<Video className="size-5" aria-hidden />} text="No meetings scheduled." />
      )}
      <FormSheet open={open} onOpenChange={setOpen} title="Schedule meeting" onSubmit={submit} submitLabel="Schedule">
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
        <PeoplePicker label="Attendees" value={f.values.attendeeIds} onChange={(v) => f.set('attendeeIds', v)} error={f.errors.attendeeIds} />
      </FormSheet>
    </div>
  )
}

/* ——— History ——— */

function HistoryTab({ p }: { p: Project }) {
  const { company: c } = useHub()
  return (
    <ol className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
      {p.history.map((x, i) => (
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

/* ——— Edit details ——— */

function EditProject({ p, open, onOpenChange }: { p: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const edit = useProjectEditor(p.id)
  const people = usePeopleOptions()
  const f = useForm({ name: p.name, purpose: p.purpose, pmId: p.pmId, sponsorId: p.sponsorId, target: p.target, status: p.status as string })
  const submit = () => {
    if (!f.validate({ name: required('Name'), purpose: required('Purpose'), pmId: required('Project manager'), target: required('Target date') })) return
    edit('Project details updated', (pr) => {
      Object.assign(pr, { name: f.values.name, purpose: f.values.purpose, pmId: f.values.pmId, sponsorId: f.values.sponsorId, target: f.values.target, status: f.values.status })
      if (!pr.members.some((m) => m.personId === f.values.pmId)) pr.members.unshift({ personId: f.values.pmId, role: 'Project manager' })
    })
    toast.success('Project updated')
    onOpenChange(false)
  }
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Edit project" onSubmit={submit} submitLabel="Save">
      <Field label="Name" required error={f.errors.name}>
        <TextInput value={f.values.name} onChange={(e) => f.set('name', e.target.value)} invalid={!!f.errors.name} />
      </Field>
      <Field label="Purpose" required error={f.errors.purpose}>
        <TextArea value={f.values.purpose} onChange={(e) => f.set('purpose', e.target.value)} invalid={!!f.errors.purpose} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Project manager" required error={f.errors.pmId}>
          <Select options={people} value={f.values.pmId} onChange={(e) => f.set('pmId', e.target.value)} />
        </Field>
        <Field label="Sponsor">
          <Select options={people} value={f.values.sponsorId} onChange={(e) => f.set('sponsorId', e.target.value)} />
        </Field>
        <Field label="Target date" required error={f.errors.target}>
          <TextInput type="date" value={f.values.target} onChange={(e) => f.set('target', e.target.value)} />
        </Field>
        <Field label="Status">
          <Select options={['Planning', 'Active', 'Closing', 'Closed'].map((s) => ({ value: s, label: s }))} value={f.values.status} onChange={(e) => f.set('status', e.target.value)} />
        </Field>
      </div>
    </FormSheet>
  )
}

function TabHeader({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{text}</p>
      {children}
    </div>
  )
}

function EmptyLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  )
}
