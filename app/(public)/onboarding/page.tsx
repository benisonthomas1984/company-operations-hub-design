'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Brand } from '@/components/shell/app-shell'
import { Field, Select, TextInput } from '@/components/hub/form'
import { Callout } from '@/components/hub/primitives'
import { OrgCanvas } from '@/components/org/org-canvas'
import { useStore } from '@/lib/store'
import { TODAY, deptColors, type AccessRole } from '@/lib/fixtures'
import { cn } from '@/lib/utils'

const steps = ['Company profile', 'Departments', 'Structure', 'Invite people', 'Review'] as const

export default function OnboardingPage() {
  const store = useStore()
  const router = useRouter()
  const { ready, company: c, me } = store

  useEffect(() => {
    if (!ready) return
    if (!c || !me) router.replace('/login')
    else if (c.onboarding.done) router.replace('/dossier')
  }, [ready, c, me, router])

  const [deptName, setDeptName] = useState('')
  const [inv, setInv] = useState({ name: '', email: '', designation: '', dept: '', role: 'member' as AccessRole })
  const [invErr, setInvErr] = useState('')

  if (!ready || !c || !me || c.onboarding.done) return null
  const step = c.onboarding.step
  const go = (n: number) => store.mutate((co) => void (co.onboarding.step = n))

  const finish = () => {
    store.mutate((co, { audit }) => {
      co.onboarding.done = true
      audit('Completed onboarding', co.id)
    })
    toast.success(`${c.name} is ready`)
    router.replace('/dossier')
  }

  const sendInvite = () => {
    setInvErr('')
    if (!inv.name.trim() || !/^\S+@\S+\.\S+$/.test(inv.email) || !inv.designation.trim() || !inv.dept) return setInvErr('Name, a valid email, designation and department are required.')
    if (c.employees.some((e) => e.email.toLowerCase() === inv.email.toLowerCase())) return setInvErr('Someone with this email is already in the company.')
    store.mutate((co, { id, audit, me: who }) => {
      const invId = id('inv')
      const empId = id('emp')
      const dept = co.departments.find((d) => d.id === inv.dept)
      co.employees.push({ id: empId, fullName: inv.name.trim(), designation: inv.designation.trim(), dept: inv.dept, email: inv.email.trim(), status: 'invited', location: '—', joined: '', accessRole: inv.role, invitationId: invId })
      const mgr = dept?.leadId && dept.leadId !== empId ? dept.leadId : who.id
      co.relationships.push({ id: `rel_${empId}`, from: empId, to: mgr, type: 'direct', primary: true })
      co.invitations.push({ id: invId, email: inv.email.trim(), name: inv.name.trim(), designation: inv.designation.trim(), dept: inv.dept, managerId: mgr, accessRole: inv.role, start: TODAY, status: 'Pending', createdBy: who.id, createdAt: TODAY, expiresAt: '2026-11-08', employeeId: empId, message: '', history: [{ at: TODAY, text: `Sent by ${who.fullName}` }] })
      audit('Sent invitation', invId, inv.email)
    })
    toast.success('Invitation sent (simulated)', { description: `${inv.email} can accept from the invitation link.` })
    setInv({ name: '', email: '', designation: '', dept: inv.dept, role: 'member' })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 md:px-6">
        <Brand />
        <span className="text-sm text-muted-foreground">Setting up {c.name}</span>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 lg:flex-row">
        <ol aria-label="Setup steps" className="flex shrink-0 gap-2 overflow-x-auto lg:w-56 lg:flex-col">
          {steps.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === step ? 'step' : undefined}
                className={cn('flex w-full items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm', i === step ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-muted')}
              >
                <span className={cn('flex size-5 items-center justify-center rounded-full border text-[11px]', i < step ? 'border-success bg-success text-primary-foreground' : 'border-border')}>
                  {i < step ? <Check className="size-3" /> : i + 1}
                </span>
                {s}
              </button>
            </li>
          ))}
        </ol>

        <section className="flex min-w-0 flex-1 flex-col gap-5 rounded-xl border border-border bg-card p-5">
          <h1 className="text-xl font-semibold text-foreground">{steps[step]}</h1>

          {step === 0 && (
            <div className="grid max-w-2xl gap-4 md:grid-cols-2">
              <Field label="Company name">
                <TextInput value={c.name} onChange={(e) => store.mutate((co) => void (co.name = e.target.value))} />
              </Field>
              <Field label="Industry">
                <TextInput value={c.industry} placeholder="e.g. Software" onChange={(e) => store.mutate((co) => void (co.industry = e.target.value))} />
              </Field>
              <Field label="Country">
                <TextInput value={c.country} placeholder="e.g. Germany" onChange={(e) => store.mutate((co) => void (co.country = e.target.value))} />
              </Field>
              <Field label="Your designation">
                <TextInput
                  value={me.designation}
                  onChange={(e) =>
                    store.mutate((co, { me: who }) => {
                      const self = co.employees.find((x) => x.id === who.id)
                      if (self) self.designation = e.target.value
                    })
                  }
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="flex max-w-2xl flex-col gap-4">
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {c.departments.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="flex-1 text-foreground">{d.name}</span>
                    <Select
                      aria-label={`Lead of ${d.name}`}
                      className="w-56"
                      placeholder="No lead yet"
                      value={d.leadId ?? ''}
                      options={c.employees.filter((e) => e.status !== 'vacancy').map((e) => ({ value: e.id, label: e.fullName }))}
                      onChange={(e) =>
                        store.mutate((co) => {
                          const x = co.departments.find((y) => y.id === d.id)
                          if (x) x.leadId = e.target.value || null
                        })
                      }
                    />
                    {c.departments.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove ${d.name}`}
                        className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
                        disabled={c.employees.some((e) => e.dept === d.id)}
                        title={c.employees.some((e) => e.dept === d.id) ? 'Move people out first' : undefined}
                        onClick={() => store.mutate((co) => void (co.departments = co.departments.filter((x) => x.id !== d.id)))}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!deptName.trim()) return
                  store.mutate((co, { id }) => {
                    co.departments.push({ id: id('dept'), name: deptName.trim(), leadId: null, color: deptColors[co.departments.length % deptColors.length], isDepartment: true })
                  })
                  setDeptName('')
                }}
              >
                <TextInput placeholder="New department name" value={deptName} onChange={(e) => setDeptName(e.target.value)} aria-label="New department name" />
                <Button type="submit" variant="outline">
                  <Plus /> Add
                </Button>
              </form>
            </div>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">Add open positions and set reporting lines. You can come back to the Organization page at any time.</p>
              <OrgCanvas compact />
            </>
          )}

          {step === 3 && (
            <div className="flex max-w-3xl flex-col gap-4">
              {invErr && <Callout tone="danger" title={invErr} />}
              <form
                noValidate
                className="grid gap-3 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  sendInvite()
                }}
              >
                <Field label="Full name">
                  <TextInput value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} />
                </Field>
                <Field label="Email">
                  <TextInput type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} />
                </Field>
                <Field label="Designation">
                  <TextInput value={inv.designation} onChange={(e) => setInv({ ...inv, designation: e.target.value })} />
                </Field>
                <Field label="Department">
                  <Select placeholder="Choose" value={inv.dept} options={c.departments.map((d) => ({ value: d.id, label: d.name }))} onChange={(e) => setInv({ ...inv, dept: e.target.value })} />
                </Field>
                <Field label="Access">
                  <Select
                    value={inv.role}
                    options={[
                      { value: 'member', label: 'Employee' },
                      { value: 'manager', label: 'Manager' },
                      { value: 'admin', label: 'Administrator' },
                      { value: 'finance', label: 'Finance manager' },
                      { value: 'hr', label: 'HR publisher' },
                    ]}
                    onChange={(e) => setInv({ ...inv, role: e.target.value as AccessRole })}
                  />
                </Field>
                <Button type="submit" className="self-end">
                  Send invitation
                </Button>
              </form>
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {c.invitations.length === 0 && <li className="px-3 py-4 text-sm text-muted-foreground">No invitations yet. You can skip this and invite from Employees later.</li>}
                {c.invitations.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                    <span className="flex-1 text-foreground">
                      {i.name} <span className="text-muted-foreground">· {i.email}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{i.status}</span>
                    <a href={`/invite/${i.id}`} target="_blank" rel="noreferrer" className="text-xs text-info hover:underline">
                      Open invitation link
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 4 && (
            <dl className="grid max-w-2xl gap-3 text-sm md:grid-cols-2">
              <div className="rounded-md border border-border p-3">
                <dt className="text-muted-foreground">Company</dt>
                <dd className="font-medium text-foreground">{c.name}</dd>
              </div>
              <div className="rounded-md border border-border p-3">
                <dt className="text-muted-foreground">Departments</dt>
                <dd className="font-medium text-foreground">{c.departments.length}</dd>
              </div>
              <div className="rounded-md border border-border p-3">
                <dt className="text-muted-foreground">People & open positions</dt>
                <dd className="font-medium text-foreground">
                  {c.employees.filter((e) => e.status !== 'vacancy').length} people · {c.employees.filter((e) => e.status === 'vacancy').length} open
                </dd>
              </div>
              <div className="rounded-md border border-border p-3">
                <dt className="text-muted-foreground">Pending invitations</dt>
                <dd className="font-medium text-foreground">{c.invitations.filter((i) => i.status === 'Pending').length}</dd>
              </div>
            </dl>
          )}

          <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <Button variant="ghost" disabled={step === 0} onClick={() => go(step - 1)}>
              Back
            </Button>
            <div className="flex gap-2">
              {step < steps.length - 1 && (
                <Button variant="ghost" onClick={finish}>
                  Skip setup
                </Button>
              )}
              {step < steps.length - 1 ? <Button onClick={() => go(step + 1)}>Continue</Button> : <Button onClick={finish}>Open workspace</Button>}
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}
