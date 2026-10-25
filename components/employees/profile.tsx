'use client'

import Link from 'next/link'
import { Check, Lock, Mail, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { empById, projects, relationships, relLabel } from '@/lib/fixtures'
import { useStore } from '@/lib/store'
import { Avatar, Callout, DeptTag, IdChip, KV, Panel, SimLabel, StatusPill } from '@/components/hub/primitives'
import { ActivityTable } from '@/components/activities/activity-table'

const comparison: Record<string, { duty: string; evidence: string | null; state: 'matched' | 'no-evidence' | 'unassigned' }[]> = {
  ana: [
    { duty: 'Integrations development', evidence: 'ACT-1042 Connect accounting API', state: 'matched' },
    { duty: 'API reliability', evidence: 'ACT-1019 Retry logic for ledger webhook', state: 'matched' },
    { duty: 'Code review', evidence: null, state: 'no-evidence' },
    { duty: 'Technical documentation (not assigned)', evidence: 'ACT-1008 Document API rate limits', state: 'unassigned' },
  ],
}

export function EmployeeProfile({ id }: { id: string }) {
  const { perspective, can } = useStore()
  const e = empById(id)
  if (!e || e.status === 'vacancy') {
    return <Callout tone="danger" title="Profile not available">This person doesn&apos;t exist in Comet Works or you don&apos;t have access.</Callout>
  }
  const isSelf = perspective.id === id
  const canPersonal = isSelf || can('personal.restricted')
  const rels = relationships.filter((r) => r.from === id)
  const reports = relationships.filter((r) => r.to === id && r.type === 'direct')
  const myProjects = projects.filter((p) => p.memberIds.includes(id) || p.pmId === id)
  const cmp = comparison[id]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 md:flex-row md:items-center">
        <Avatar id={id} size="lg" />
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{e.fullName}</h2>
            {e.status === 'inactive' && <StatusPill status="Inactive" />}
            {isSelf && <span className="rounded-sm bg-muted px-1.5 text-xs text-muted-foreground">You</span>}
          </div>
          <p className="text-sm text-muted-foreground">{e.designation}</p>
          <div className="flex flex-wrap items-center gap-3">
            <DeptTag id={e.dept} />
            <span className="font-mono text-xs text-muted-foreground">{e.email}</span>
            <span className="text-xs text-muted-foreground">{e.location}</span>
          </div>
        </div>
        {isSelf && (
          <Link href="/productivity" className="text-sm font-medium text-info hover:underline">
            My productivity evidence
          </Link>
        )}
      </div>

      <Tabs defaultValue="overview" className="flex flex-col gap-3">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="responsibilities">Responsibilities</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="projects">Projects ({myProjects.length})</TabsTrigger>
          {isSelf && <TabsTrigger value="mail">My Mail</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-2">
          <Panel title="Work profile">
            <dl className="grid grid-cols-2 gap-4 p-4">
              <KV label="Joined">{e.joined}</KV>
              <KV label="Location">{e.location}</KV>
              <KV label="Department">
                <DeptTag id={e.dept} />
              </KV>
              <KV label="Direct reports">{reports.length}</KV>
            </dl>
          </Panel>
          <Panel title="Restricted personal information" description="Visible only to the employee and explicitly authorized HR/admin roles.">
            {canPersonal ? (
              <dl className="grid grid-cols-2 gap-4 p-4">
                <KV label="Personal phone">+351 9•• ••• 214</KV>
                <KV label="Emergency contact">On file · 1 contact</KV>
                <KV label="Date of birth">On file</KV>
                <KV label="Tax ID">PT ••••••481</KV>
              </dl>
            ) : (
              <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Lock aria-hidden className="size-4" /> Restricted fields are not shown for your role.
              </p>
            )}
          </Panel>
          <Panel title="Relationships" className="lg:col-span-2">
            <ul className="divide-y divide-border">
              {rels.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                  <span className="w-40 text-muted-foreground">{relLabel[r.type]}</span>
                  <Link href={`/employees/${r.to}`} className="font-medium text-foreground hover:underline">
                    {empById(r.to)?.fullName}
                  </Link>
                  {r.primary && <span className="rounded-sm bg-muted px-1 text-[10px] text-muted-foreground">Primary</span>}
                  {r.context && <span className="text-xs text-muted-foreground">{r.context}</span>}
                </li>
              ))}
              {rels.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">Top of structure — no manager.</li>}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="responsibilities" className="grid gap-4 lg:grid-cols-2">
          <Panel title="Assigned responsibilities" description="Set by managers or HR. Versioned.">
            <ul className="divide-y divide-border">
              {e.responsibilities.map((r) => (
                <li key={r} className="px-4 py-2.5 text-sm text-foreground">
                  {r}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel
            title="Assigned vs observed work"
            description="AI suggestion from accepted activities this quarter. Not a performance judgement."
            action={<SimLabel>AI draft</SimLabel>}
          >
            {cmp ? (
              <div className="flex flex-col">
                <ul className="divide-y divide-border">
                  {cmp.map((c) => (
                    <li key={c.duty} className="flex flex-col gap-1 px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-foreground">{c.duty}</span>
                        <StatusPill status={c.state === 'matched' ? 'Evidence found' : c.state === 'no-evidence' ? 'No evidence in period' : 'Observed, not assigned'} tone={c.state === 'matched' ? 'success' : c.state === 'no-evidence' ? 'muted' : 'info'} />
                      </div>
                      {c.evidence && <span className="text-xs text-muted-foreground">{c.evidence}</span>}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
                  <Sparkles aria-hidden className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Suggestion · confidence medium · 4 sources</span>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => toast.success('Suggestion confirmed', { description: 'Saved to responsibility history with reviewer and time.' })}>
                    <Check /> Confirm
                  </Button>
                </div>
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">Not enough accepted activity evidence to compare yet.</p>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="activities">
          <Panel title="Activities" description="Same canonical records shown in projects, departments and the dossier.">
            <ActivityTable filter={(a) => a.ownerId === id} caption={`Activities owned by ${e.fullName}`} />
          </Panel>
        </TabsContent>

        <TabsContent value="projects">
          <Panel title="Projects">
            <ul className="divide-y divide-border">
              {myProjects.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <IdChip href={`/projects/${p.id}`}>{p.id}</IdChip>
                  <Link className="font-medium text-foreground hover:underline" href={`/projects/${p.id}`}>
                    {p.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">{p.pmId === id ? 'Project manager' : 'Member'}</span>
                  <StatusPill status={p.health} className="ml-auto" />
                </li>
              ))}
              {myProjects.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">Not on any project.</li>}
            </ul>
          </Panel>
        </TabsContent>

        {isSelf && (
          <TabsContent value="mail">
            <Callout tone="info" title="Your mailbox stays private" icon={<Mail className="size-4" />}>
              Only you can open your connected mailbox. Administrators, managers, finance and AI on behalf of others cannot.{' '}
              <Link href="/mail" className="font-medium underline">
                Open My Mail
              </Link>
            </Callout>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
