'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { fmtEUR, PERIOD, TODAY, type BusinessProduct, type Client, type Release, type SourceKind, type SourceLink, type SourceMode } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { connectorsOf, isInternal, productFinance, productInsight, productOf, scopeOf, sourceOf } from '@/lib/derive'
import { Callout, DeptTag, IdChip, KV, Panel, PersonLink, SourceChip, StatusPill } from '@/components/hub/primitives'
import { Field, FormSheet, PeoplePicker, Select, TabBar, TextArea, TextInput, required, useDeptOptions, useForm, useParam, usePeopleOptions } from '@/components/hub/form'
import { Page, StateBlock } from '@/components/hub/page'
import { ActivityTable } from '@/components/activities/activity-table'
import { CreateActivity } from '@/components/activities/activities-workspace'
import { SpreadsheetImport } from './spreadsheet-import'
import { cn } from '@/lib/utils'

const kindLabel: Record<SourceKind, string> = { clients: 'Clients', tickets: 'Support tickets', revenue: 'Revenue' }

export function ProductList() {
  const { company: c, can } = useHub()
  const [open, setOpen] = useState(false)
  const canEdit = can('manage')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {c.products.length} total · {c.products.filter(isInternal).length} internal
        </p>
        {canEdit && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus /> New product or service
          </Button>
        )}
      </div>
      {!c.products.length ? (
        <StateBlock title="No products or services yet" body="Add one here, or approved proposals can be linked to a product." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {c.products.map((b) => {
            const ins = productInsight(c, b.id)
            return (
              <Link key={b.id} href={`/products/${b.id}`} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 hover:border-ring">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{b.kind}</span>
                  {isInternal(b) && <StatusPill status="Internal" tone="info" />}
                  <StatusPill status={b.lifecycle} className="ml-auto" />
                </div>
                <h2 className="text-base font-semibold text-foreground">{b.name}</h2>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{b.description}</p>
                <dl className="mt-auto grid grid-cols-4 gap-2 border-t border-border pt-3 text-xs">
                  <Stat label="Projects" value={ins.activeProjects.length} />
                  <Stat label="People" value={ins.people.length} />
                  <Stat label="Open work" value={ins.openActivities.length} />
                  <Stat label={isInternal(b) ? 'Users' : 'Clients'} value={isInternal(b) ? b.activeUsers : b.clients.length} />
                </dl>
              </Link>
            )
          })}
        </div>
      )}
      <NewProduct open={open} onOpenChange={setOpen} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</dd>
    </div>
  )
}

function NewProduct({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { me, mutate } = useHub()
  const people = usePeopleOptions()
  const depts = useDeptOptions()
  const f = useForm({ name: '', kind: 'Product', revenueModel: 'Revenue-generating', description: '', ownerId: me.id, dept: me.dept as string, lifecycle: 'Idea', targetCustomers: '', clientDefinition: '' })
  const internal = f.values.revenueModel === 'Internal'

  const submit = () => {
    if (!f.validate({ name: required('Name'), description: required('Description'), targetCustomers: required(internal ? 'Internal users' : 'Target customers') })) return
    mutate((co, { id, audit }) => {
      const v = f.values
      const pid = id('bps').toLowerCase().replace('-', '_')
      co.products.unshift({
        id: pid,
        name: v.name.trim(),
        kind: v.kind as BusinessProduct['kind'],
        description: v.description.trim(),
        ownerId: v.ownerId,
        dept: v.dept as BusinessProduct['dept'],
        lifecycle: v.lifecycle as BusinessProduct['lifecycle'],
        targetCustomers: v.targetCustomers.trim(),
        clientDefinition: v.clientDefinition.trim() || (internal ? 'Teams inside the company that use it' : 'An organisation with an active paid plan'),
        clientSource: 'Entered manually',
        clients: [],
        activeUsers: 0,
        billingSource: internal ? 'None — internal' : 'Not connected',
        costScope: 'Project and activity costs linked to this item',
        mappings: '',
        revenueModel: v.revenueModel as BusinessProduct['revenueModel'],
        sources: { clients: { mode: 'Manual' }, tickets: { mode: 'Manual' }, ...(internal ? {} : { revenue: { mode: 'Manual' as const } }) },
      })
      audit('Created product', pid, v.name)
    })
    toast.success(`${f.values.kind} created`, { description: 'Connect its data sources from the Data sources tab.' })
    f.reset()
    onOpenChange(false)
  }

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="New product or service" description="Internal products track the same work, people and tickets but never recognise revenue." onSubmit={submit} submitLabel="Create" wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" required error={f.errors.name} className="sm:col-span-2">
          <TextInput {...f.bind('name')} />
        </Field>
        <Field label="Type">
          <Select options={['Product', 'Service'].map((x) => ({ value: x, label: x }))} {...f.bind('kind')} />
        </Field>
        <Field label="Revenue model" hint={internal ? 'No revenue, billing or MRR will be tracked.' : 'Revenue is recognised from the connected source.'}>
          <Select options={[{ value: 'Revenue-generating', label: 'Revenue-generating (sold to clients)' }, { value: 'Internal', label: 'Internal (used inside the company)' }]} {...f.bind('revenueModel')} />
        </Field>
        <Field label="Description" required error={f.errors.description} className="sm:col-span-2">
          <TextArea {...f.bind('description')} />
        </Field>
        <Field label="Owner">
          <Select options={people} {...f.bind('ownerId')} />
        </Field>
        <Field label="Owning department">
          <Select options={depts} {...f.bind('dept')} />
        </Field>
        <Field label="Lifecycle">
          <Select options={['Idea', 'In development', 'Beta', 'Live', 'Sunset'].map((x) => ({ value: x, label: x }))} {...f.bind('lifecycle')} />
        </Field>
        <Field label={internal ? 'Internal users' : 'Target customers'} required error={f.errors.targetCustomers}>
          <TextInput placeholder={internal ? 'e.g. Finance and Ops teams' : 'e.g. SMEs with 10–200 staff'} {...f.bind('targetCustomers')} />
        </Field>
        <Field label={internal ? 'Who counts as a user' : 'Who counts as a client'} className="sm:col-span-2">
          <TextInput {...f.bind('clientDefinition')} />
        </Field>
      </div>
    </FormSheet>
  )
}

export function ProductDetailPage({ id }: { id: string }) {
  const { company: c } = useHub()
  const b = productOf(c, id)
  return (
    <Page title={b?.name ?? 'Product'} description={b?.description} crumbs={[{ label: 'Products & Services', href: '/products' }]}>
      <ProductDetail id={id} />
    </Page>
  )
}

export function ProductDetail({ id }: { id: string }) {
  const { company: c } = useHub()
  const [tab, setTab] = useParam('tab', 'overview')
  const b = productOf(c, id)
  if (!b) return <Callout tone="danger" title="Not found">This product or service isn&apos;t in {c.name}.</Callout>
  const ins = productInsight(c, id)
  const internal = isInternal(b)

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'projects', label: 'Projects', count: ins.projects.length },
    { id: 'activities', label: 'Activities', count: ins.openActivities.length },
    { id: 'people', label: 'People', count: ins.people.length },
    { id: 'delivery', label: 'Backlog & releases', count: ins.backlog.length + ins.releases.length },
    { id: 'clients', label: internal ? 'Users' : 'Clients', count: internal ? undefined : b.clients.length },
    { id: 'tickets', label: 'Support tickets', count: ins.openTickets.length },
    { id: 'sources', label: 'Data sources' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="uppercase tracking-wide">{b.kind}</span>
        <StatusPill status={b.lifecycle} />
        {internal ? <StatusPill status="Internal · no revenue" tone="info" /> : <StatusPill status="Revenue-generating" tone="success" />}
        <span>Owner</span>
        <PersonLink id={b.ownerId} />
        <DeptTag id={b.dept} />
      </div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Active projects" value={ins.activeProjects.length} note={`${ins.projects.length} total linked`} onClick={() => setTab('projects')} />
        <Metric label="People involved" value={ins.people.length} note={`across ${ins.depts.length} dept${ins.depts.length === 1 ? '' : 's'}`} onClick={() => setTab('people')} />
        <Metric label="Open activities" value={ins.openActivities.length} note={ins.overdue.length ? `${ins.overdue.length} overdue` : 'none overdue'} tone={ins.overdue.length ? 'danger' : undefined} onClick={() => setTab('activities')} />
        <Metric label="Backlog in queue" value={ins.queued.length} note={`${ins.releases.filter((r) => r.status !== 'Released').length} release(s) upcoming`} onClick={() => setTab('delivery')} />
        <Metric label="Open tickets" value={ins.openTickets.length} note={sourceOf(c, b, 'tickets').label} onClick={() => setTab('tickets')} />
        <Metric label={internal ? 'Active users' : 'Clients'} value={internal ? b.activeUsers : b.clients.length} note={sourceOf(c, b, 'clients').label} onClick={() => setTab('clients')} />
      </dl>
      <TabBar label="Product sections" tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'overview' && <Overview b={b} />}
      {tab === 'projects' && <ProjectsTab b={b} />}
      {tab === 'activities' && <ActivitiesTab b={b} />}
      {tab === 'people' && <PeopleTab b={b} />}
      {tab === 'delivery' && <DeliveryTab b={b} />}
      {tab === 'clients' && <ClientsTab b={b} />}
      {tab === 'tickets' && <TicketsTab b={b} />}
      {tab === 'sources' && <SourcesTab b={b} />}
    </div>
  )
}

function Metric({ label, value, note, tone, onClick }: { label: string; value: number; note: string; tone?: 'danger'; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col gap-0.5 bg-card p-3 text-left hover:bg-muted">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xl text-foreground">{value.toLocaleString()}</dd>
      <dd className={cn('truncate text-xs', tone === 'danger' ? 'text-destructive' : 'text-muted-foreground')}>{note}</dd>
    </button>
  )
}

function Overview({ b }: { b: BusinessProduct }) {
  const { company: c, can } = useHub()
  const ins = productInsight(c, b.id)
  const fin = productFinance(c, b.id)
  const internal = isInternal(b)
  const next = ins.releases.filter((r) => r.status !== 'Released').sort((x, y) => x.target.localeCompare(y.target))[0]
  const highTickets = ins.openTickets.filter((t) => t.priority === 'High' || t.priority === 'Urgent')
  const blocked = ins.openActivities.filter((a) => a.status === 'Blocked')

  const provenance = [
    { what: 'Projects', from: 'Projects that list this product', count: `${ins.projects.length}` },
    { what: 'Activities', from: 'Product-scoped activities, plus activities in its projects and backlog', count: `${ins.activities.length}` },
    { what: 'People', from: 'Product owner, project PMs & members, activity owners & reviewers, backlog & release owners', count: `${ins.people.length}` },
    { what: internal ? 'Users' : 'Clients', from: sourceOf(c, b, 'clients').label, count: internal ? b.activeUsers.toLocaleString() : `${b.clients.length}` },
    { what: 'Support tickets', from: sourceOf(c, b, 'tickets').label, count: `${ins.tickets.length}` },
    ...(internal ? [] : [{ what: 'Revenue', from: sourceOf(c, b, 'revenue').label, count: can('finance.read') ? fmtEUR(fin.recognized) : '—' }]),
    { what: 'Costs', from: 'Approved expenses + people cost of linked projects and activities', count: can('finance.read') ? fmtEUR(fin.totalExpense) : '—' },
  ]

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        {(blocked.length > 0 || ins.overdue.length > 0 || highTickets.length > 0) && (
          <Callout tone="warning" title="Needs attention">
            {[blocked.length && `${blocked.length} blocked activit${blocked.length === 1 ? 'y' : 'ies'}`, ins.overdue.length && `${ins.overdue.length} overdue`, highTickets.length && `${highTickets.length} high-priority ticket(s)`].filter(Boolean).join(' · ')}
          </Callout>
        )}
        <Panel title="Where this data comes from" description="Every number on this page is gathered from these records — nothing is typed in twice.">
          <table className="w-full text-sm">
            <caption className="sr-only">Data provenance for {b.name}</caption>
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="px-4 py-2 font-medium">Data</th>
                <th scope="col" className="px-4 py-2 font-medium">Source</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {provenance.map((r) => (
                <tr key={r.what}>
                  <th scope="row" className="px-4 py-2.5 text-left font-medium text-foreground">{r.what}</th>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.from}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Departments involved">
          <ul className="flex flex-wrap gap-2 p-4">
            {ins.depts.map((d) => {
              const n = ins.activities.filter((a) => a.dept === d).length
              return (
                <li key={d} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                  <DeptTag id={d} /> <span className="text-muted-foreground">{n} activit{n === 1 ? 'y' : 'ies'}</span>
                </li>
              )
            })}
            {!ins.depts.length && <li className="text-sm text-muted-foreground">No departments yet.</li>}
          </ul>
        </Panel>
      </div>
      <div className="flex flex-col gap-4">
        <Panel title="Overview">
          <dl className="grid gap-4 p-4">
            <KV label="Owner"><PersonLink id={b.ownerId} showRole /></KV>
            <KV label={internal ? 'Internal users' : 'Target customers'}>{b.targetCustomers}</KV>
            <KV label={internal ? 'Who counts as a user' : 'Who counts as a client'}>{b.clientDefinition}</KV>
            <KV label="Next release">{next ? `${next.name} · ${next.target}` : '—'}</KV>
          </dl>
        </Panel>
        <Panel title={internal ? `Cost · ${PERIOD.label}` : `Profit · ${PERIOD.label}`}>
          {!can('finance.read') ? (
            <p className="p-4 text-sm text-muted-foreground">Financial figures require finance access.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-4 p-4">
              {internal ? (
                <p className="col-span-2 text-xs text-muted-foreground">Internal product — no revenue is recognised. Showing what it costs to run.</p>
              ) : (
                <KV label="Revenue recognized"><span className="font-mono">{fmtEUR(fin.recognized)}</span></KV>
              )}
              <KV label="Cost of delivery"><span className="font-mono">{fmtEUR(fin.costOfDelivery)}</span></KV>
              <KV label="Operating cost"><span className="font-mono">{fmtEUR(fin.opex)}</span></KV>
              <KV label={internal ? 'Total cost' : 'Operating profit'}>
                <span className="font-mono font-semibold">{fmtEUR(internal ? fin.totalExpense : fin.operatingProfit)}</span>
              </KV>
              {fin.pending.length > 0 && <p className="col-span-2 text-xs text-muted-foreground">{fin.pending.length} pending expense(s) excluded until approved.</p>}
              <Link href={`/finance?product=${b.id}`} className="col-span-2 text-xs font-medium text-info hover:underline">Open in Finance</Link>
            </dl>
          )}
        </Panel>
      </div>
    </div>
  )
}

function ProjectsTab({ b }: { b: BusinessProduct }) {
  const { company: c } = useHub()
  const ins = productInsight(c, b.id)
  return (
    <Panel title="Projects for this product" description="Projects link to products when created or edited. Approved proposals become projects automatically.">
      <ul className="divide-y divide-border">
        {ins.projects.map((p) => {
          const acts = c.activities.filter((a) => a.projectId === p.id)
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
              <IdChip href={`/projects/${p.id}`}>{p.id}</IdChip>
              <Link href={`/projects/${p.id}`} className="font-medium text-foreground hover:underline">{p.name}</Link>
              <span className="text-xs text-muted-foreground">PM</span>
              <PersonLink id={p.pmId} />
              <span className="text-xs text-muted-foreground">{p.members.length} members · {acts.filter((a) => !['Accepted', 'Cancelled'].includes(a.status)).length} open activities · target {p.target}</span>
              <span className="ml-auto flex items-center gap-1">{p.deptIds.map((d) => <DeptTag key={d} id={d} />)}</span>
              <StatusPill status={p.status} />
            </li>
          )
        })}
        {!ins.projects.length && <li className="px-4 py-3 text-sm text-muted-foreground">No projects linked yet. Link this product when creating a project.</li>}
      </ul>
    </Panel>
  )
}

function ActivitiesTab({ b }: { b: BusinessProduct }) {
  const { company: c } = useHub()
  const [open, setOpen] = useState(false)
  const ins = productInsight(c, b.id)
  const ids = new Set(ins.activities.map((a) => a.id))
  const counts = { product: 0, project: 0, department: 0 }
  ins.activities.forEach((a) => counts[scopeOf(a)]++)
  return (
    <Panel
      title="Activities across departments and projects"
      description={`${counts.product} defined for this product directly · ${counts.project} from its projects · ${counts.department} from backlog items`}
      action={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Product activity
        </Button>
      }
    >
      <ActivityTable caption={`Activities for ${b.name}`} filter={(a) => ids.has(a.id)} empty="No activities planned for this product yet." />
      <CreateActivity open={open} onOpenChange={setOpen} preset={{ productId: b.id, dept: b.dept }} />
    </Panel>
  )
}

function PeopleTab({ b }: { b: BusinessProduct }) {
  const { company: c } = useHub()
  const ins = productInsight(c, b.id)
  return (
    <Panel title="People involved" description="Anyone who owns, delivers or reviews work for this product.">
      <ul className="divide-y divide-border">
        {ins.people.map((p) => (
          <li key={p.personId} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
            <PersonLink id={p.personId} showRole />
            <span className="ml-auto flex flex-wrap justify-end gap-1">
              {p.roles.map((r) => (
                <span key={r} className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{r}</span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function DeliveryTab({ b }: { b: BusinessProduct }) {
  const { company: c } = useHub()
  const [open, setOpen] = useState(false)
  const ins = productInsight(c, b.id)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Backlog" action={<Link href={`/backlog?product=${b.id}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}><Plus /> Backlog item</Link>}>
        <ul className="divide-y divide-border">
          {ins.backlog.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
              <IdChip href={`/backlog?id=${x.id}`}>{x.id}</IdChip>
              <span className="font-medium text-foreground">{x.title}</span>
              <span className="text-xs text-muted-foreground">{x.committedTarget ?? x.proposedTarget}</span>
              <StatusPill status={x.status} className="ml-auto" />
            </li>
          ))}
          {!ins.backlog.length && <li className="px-4 py-3 text-sm text-muted-foreground">No backlog items.</li>}
        </ul>
      </Panel>
      <Panel title="Releases" action={<Button size="sm" onClick={() => setOpen(true)}><Plus /> Release</Button>}>
        <ul className="divide-y divide-border">
          {ins.releases.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 px-4 py-2.5 text-sm">
              <span className="flex flex-wrap items-center gap-2">
                <IdChip>{r.id}</IdChip>
                <span className="font-medium text-foreground">{r.name}</span>
                <span className="text-xs text-muted-foreground">target {r.target} · {r.backlogIds.length} items</span>
                <StatusPill status={r.status} className="ml-auto" />
              </span>
              {r.notes && <span className="text-xs leading-relaxed text-muted-foreground">{r.notes}</span>}
            </li>
          ))}
          {!ins.releases.length && <li className="px-4 py-3 text-sm text-muted-foreground">No releases planned.</li>}
        </ul>
      </Panel>
      <NewRelease b={b} open={open} onOpenChange={setOpen} />
    </div>
  )
}

function NewRelease({ b, open, onOpenChange }: { b: BusinessProduct; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { company: c, me, mutate } = useHub()
  const people = usePeopleOptions()
  const items = c.backlog.filter((x) => x.productId === b.id && !['Done', 'Rejected'].includes(x.status))
  const [picked, setPicked] = useState<string[]>([])
  const [approvers, setApprovers] = useState<string[]>([b.ownerId])
  const f = useForm({ name: '', target: '', ownerId: b.ownerId || me.id, testing: '', notes: '' })

  const submit = () => {
    if (!f.validate({ name: required('Version name'), target: (v) => (!v ? 'Target date is required' : String(v) < TODAY ? 'Target cannot be in the past' : undefined), testing: required('Testing plan') })) return
    if (!approvers.length) return toast.error('Choose at least one release approver')
    mutate((co, { id, now, audit, me: who }) => {
      const v = f.values
      const rid = id('REL')
      const rel: Release = { id: rid, productId: b.id, name: v.name.trim(), target: v.target, backlogIds: picked, ownerId: v.ownerId, testing: v.testing.trim(), testEvidence: '', notes: v.notes.trim(), approverIds: approvers, status: 'Planned', history: [{ at: now, by: who.id, text: `Planned with ${picked.length} backlog item(s)` }] }
      co.releases.unshift(rel)
      audit('Planned release', rid, `${b.name} ${v.name}`)
    })
    toast.success('Release planned')
    f.reset()
    setPicked([])
    onOpenChange(false)
  }

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={`New release · ${b.name}`} description="Bundle backlog items into a version. Approvers sign off before it ships." onSubmit={submit} submitLabel="Plan release" wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Version name" required error={f.errors.name}>
          <TextInput placeholder="e.g. v2.1" {...f.bind('name')} />
        </Field>
        <Field label="Target date" required error={f.errors.target}>
          <TextInput type="date" {...f.bind('target')} />
        </Field>
        <Field label="Release owner">
          <Select options={people} {...f.bind('ownerId')} />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-xs font-medium text-foreground">Backlog items in this release</legend>
        {items.map((x) => (
          <label key={x.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={picked.includes(x.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, x.id] : p.filter((y) => y !== x.id)))} />
            <span className="font-mono text-xs text-muted-foreground">{x.id}</span> {x.title}
          </label>
        ))}
        {!items.length && <p className="text-sm text-muted-foreground">No open backlog items for this product.</p>}
      </fieldset>
      <Field label="Testing plan" required error={f.errors.testing}>
        <TextArea placeholder="Regression suite, acceptance checks, load tests…" {...f.bind('testing')} />
      </Field>
      <Field label="Release notes">
        <TextArea {...f.bind('notes')} />
      </Field>
      <PeoplePicker label="Release approvers" value={approvers} onChange={setApprovers} />
    </FormSheet>
  )
}

function SourceBar({ b, kind }: { b: BusinessProduct; kind: SourceKind }) {
  const { company: c, mutate } = useHub()
  const s = sourceOf(c, b, kind)
  const sync = () => {
    mutate((co, { now }) => {
      const p = co.products.find((x) => x.id === b.id)
      if (p) p.sources = { ...p.sources, [kind]: { ...s.link, lastSync: now } }
    })
    toast.success(`Synced from ${s.connector?.name ?? 'MCP'}`, { description: 'Simulated in prototype — no external call made.' })
  }
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
      <span>Source</span>
      <SourceChip label={s.label} freshness={s.link.lastSync ? `synced ${s.link.lastSync}` : undefined} state={s.link.mode === 'MCP' ? (s.connector?.status === 'Connected' ? 'ok' : 'down') : 'sim'} />
      {s.link.mapping && <span>· {s.link.mapping}</span>}
      {s.link.mode === 'MCP' && (
        <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={sync}>
          <RefreshCw /> Sync now
        </Button>
      )}
    </div>
  )
}

function ClientsTab({ b }: { b: BusinessProduct }) {
  const { can, mutate } = useHub()
  const internal = isInternal(b)
  const f = useForm({ name: '', plan: '', seats: '', since: TODAY, mrr: '' })

  const addClients = (list: Client[], via: SourceMode, fileName?: string) =>
    mutate((co, { now, audit, me }) => {
      const p = co.products.find((x) => x.id === b.id)
      if (!p) return
      p.clients.push(...list)
      if (via === 'Excel upload') p.sources = { ...p.sources, clients: { mode: 'Excel upload', mapping: fileName, lastSync: now, lastSyncBy: me.id } }
      audit(`Added ${list.length} client(s)`, b.id, via)
    })

  const add = () => {
    if (!f.validate({ name: required('Client name') })) return
    const v = f.values
    addClients([{ name: v.name.trim(), plan: v.plan.trim() || '—', seats: Number(v.seats) || 0, since: v.since, mrr: internal ? 0 : Number(v.mrr) || 0 }], 'Manual')
    toast.success('Client added')
    f.reset()
  }

  if (internal)
    return (
      <Panel title="Internal users">
        <p className="p-4 text-sm leading-relaxed text-muted-foreground">
          {b.name} is internal — it has users, not paying clients. {b.activeUsers.toLocaleString()} active users · {b.clientDefinition}
        </p>
      </Panel>
    )

  return (
    <Panel
      title="Clients"
      description={b.clientDefinition}
      action={
        <SpreadsheetImport
          templateName={`${b.name}-clients`}
          headers={['Name', 'Plan', 'Seats', 'Since', 'MRR']}
          sample={['Acme GmbH', 'Pro', '25', '2026-01-15', '490']}
          onRecords={(rows, file) => {
            const ok = rows.filter((r) => r.Name).map((r) => ({ name: r.Name, plan: r.Plan || '—', seats: Number(r.Seats) || 0, since: r.Since || TODAY, mrr: Number(r.MRR) || 0 }))
            if (ok.length) addClients(ok, 'Excel upload', file)
            return ok.length
          }}
        />
      }
    >
      <SourceBar b={b} kind="clients" />
      <ul className="divide-y divide-border">
        {b.clients.map((cl, i) => (
          <li key={`${cl.name}-${i}`} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
            <span className="font-medium text-foreground">{cl.name}</span>
            <span className="text-xs text-muted-foreground">{cl.plan} · {cl.seats} seats · since {cl.since}</span>
            {can('finance.read') && <span className="ml-auto font-mono text-xs">{fmtEUR(cl.mrr)}/mo</span>}
          </li>
        ))}
        {!b.clients.length && <li className="px-4 py-3 text-sm text-muted-foreground">No clients yet — add one, import a sheet, or connect a CRM in Data sources.</li>}
      </ul>
      <form
        noValidate
        onSubmit={(e) => (e.preventDefault(), add())}
        className="grid gap-2 border-t border-border p-4 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] sm:items-end"
      >
        <Field label="Client name" error={f.errors.name}><TextInput {...f.bind('name')} /></Field>
        <Field label="Plan"><TextInput {...f.bind('plan')} /></Field>
        <Field label="Seats"><TextInput type="number" min={0} {...f.bind('seats')} /></Field>
        <Field label="Since"><TextInput type="date" {...f.bind('since')} /></Field>
        <Field label="MRR (€)"><TextInput type="number" min={0} {...f.bind('mrr')} /></Field>
        <Button type="submit" size="sm" variant="outline"><Plus /> Add</Button>
      </form>
    </Panel>
  )
}

function TicketsTab({ b }: { b: BusinessProduct }) {
  const { company: c, mutate } = useHub()
  const ins = productInsight(c, b.id)
  const f = useForm({ subject: '', priority: 'Medium', body: '' })

  const addTickets = (list: { subject: string; priority: string; status: string; body: string }[], via: string, fileName?: string) =>
    mutate((co, { id, now, audit, me }) => {
      co.supportTickets = [...list.map((t) => ({ id: id('SUP'), subject: t.subject, product: b.id, status: t.status || 'Open', priority: t.priority || 'Medium', updated: now, body: t.body, source: via })), ...(co.supportTickets ?? [])]
      const p = co.products.find((x) => x.id === b.id)
      if (p && via === 'Excel upload') p.sources = { ...p.sources, tickets: { mode: 'Excel upload', mapping: fileName, lastSync: now, lastSyncBy: me.id } }
      audit(`Added ${list.length} ticket(s)`, b.id, via)
    })

  const add = () => {
    if (!f.validate({ subject: required('Subject') })) return
    addTickets([{ subject: f.values.subject.trim(), priority: f.values.priority, status: 'Open', body: f.values.body.trim() }], 'Manual')
    toast.success('Ticket logged')
    f.reset()
  }

  return (
    <Panel
      title="Support tickets"
      action={
        <SpreadsheetImport
          templateName={`${b.name}-tickets`}
          headers={['Subject', 'Priority', 'Status', 'Description']}
          sample={['Export fails on large files', 'High', 'Open', 'Customer reports timeout above 8 MB']}
          onRecords={(rows, file) => {
            const ok = rows.filter((r) => r.Subject).map((r) => ({ subject: r.Subject, priority: r.Priority, status: r.Status, body: r.Description }))
            if (ok.length) addTickets(ok, 'Excel upload', file)
            return ok.length
          }}
        />
      }
    >
      <SourceBar b={b} kind="tickets" />
      <ul className="divide-y divide-border">
        {ins.tickets.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
            <IdChip>{t.id}</IdChip>
            <span className="text-foreground">{t.subject}</span>
            <span className="text-xs text-muted-foreground">{t.priority} · {t.updated}{t.source ? ` · ${t.source}` : ''}</span>
            <StatusPill status={t.status} className="ml-auto" />
          </li>
        ))}
        {!ins.tickets.length && <li className="px-4 py-3 text-sm text-muted-foreground">No tickets for this item.</li>}
      </ul>
      <form noValidate onSubmit={(e) => (e.preventDefault(), add())} className="grid gap-2 border-t border-border p-4 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end">
        <Field label="Subject" error={f.errors.subject}><TextInput {...f.bind('subject')} /></Field>
        <Field label="Priority"><Select options={['Low', 'Medium', 'High', 'Urgent'].map((x) => ({ value: x, label: x }))} {...f.bind('priority')} /></Field>
        <Field label="Description"><TextInput {...f.bind('body')} /></Field>
        <Button type="submit" size="sm" variant="outline"><Plus /> Log ticket</Button>
      </form>
    </Panel>
  )
}

function SourcesTab({ b }: { b: BusinessProduct }) {
  const { company: c, can, mutate } = useHub()
  const connectors = connectorsOf(c).filter((x) => x.status === 'Connected')
  const kinds: SourceKind[] = isInternal(b) ? ['clients', 'tickets'] : ['clients', 'tickets', 'revenue']
  const [draft, setDraft] = useState<Partial<Record<SourceKind, SourceLink>>>(() => Object.fromEntries(kinds.map((k) => [k, sourceOf(c, b, k).link])))
  const canEdit = can('manage')

  const save = () => {
    for (const k of kinds) if (draft[k]?.mode === 'MCP' && !draft[k]?.connectorId) return toast.error(`Choose an MCP connector for ${kindLabel[k].toLowerCase()}`)
    mutate((co, { audit }) => {
      const p = co.products.find((x) => x.id === b.id)
      if (p) p.sources = { ...p.sources, ...draft }
      audit('Updated data sources', b.id, kinds.map((k) => `${k}: ${draft[k]?.mode}`).join(', '))
    })
    toast.success('Data sources saved')
  }

  return (
    <Panel title="Data sources" description="Choose where each kind of data for this product comes from. MCP connectors are added in Settings → Integrations." action={<Link href="/settings/integrations" className="text-xs font-medium text-info hover:underline">Manage MCP connectors</Link>}>
      <div className="flex flex-col divide-y divide-border">
        {kinds.map((k) => {
          const d = draft[k] ?? { mode: 'Manual' as const }
          const options = connectors.filter((x) => x.dataTypes.includes(k) || x.provider === 'Custom MCP')
          const set = (patch: Partial<SourceLink>) => setDraft((p) => ({ ...p, [k]: { ...d, ...patch } }))
          return (
            <div key={k} className="grid gap-3 p-4 md:grid-cols-[160px_1fr_1fr_1.5fr] md:items-end">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{kindLabel[k]}</span>
                <span className="text-xs text-muted-foreground">{k === 'revenue' ? 'Drives revenue recognised' : k === 'clients' ? 'Client list & MRR' : 'Help desk tickets'}</span>
              </div>
              <Field label="Mode">
                <Select disabled={!canEdit} options={(['MCP', 'Excel upload', 'Manual'] as SourceMode[]).map((m) => ({ value: m, label: m === 'MCP' ? 'MCP connector' : m }))} value={d.mode} onChange={(e) => set({ mode: e.target.value as SourceMode, connectorId: e.target.value === 'MCP' ? d.connectorId ?? options[0]?.id : undefined })} />
              </Field>
              <Field label="Connector">
                <Select disabled={!canEdit || d.mode !== 'MCP'} placeholder={options.length ? 'Choose' : 'No connector for this data'} options={options.map((x) => ({ value: x.id, label: x.name }))} value={d.connectorId ?? ''} onChange={(e) => set({ connectorId: e.target.value })} />
              </Field>
              <Field label="Mapping / filter" hint={d.mode === 'MCP' ? 'How records are matched to this product' : undefined}>
                <TextInput disabled={!canEdit || d.mode !== 'MCP'} placeholder="e.g. Deals · Product = Reader" value={d.mapping ?? ''} onChange={(e) => set({ mapping: e.target.value })} />
              </Field>
            </div>
          )
        })}
        {isInternal(b) && <p className="p-4 text-xs text-muted-foreground">Revenue is not tracked for internal products.</p>}
      </div>
      {canEdit && (
        <div className="flex justify-end border-t border-border p-4">
          <Button size="sm" onClick={save}>Save data sources</Button>
        </div>
      )}
    </Panel>
  )
}
