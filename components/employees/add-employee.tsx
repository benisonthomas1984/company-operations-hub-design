'use client'

import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { TODAY, accessRoleLabel, fmtEUR, type AccessRole, type CompanyData } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { placed, positionLabel, setDirectManager } from '@/lib/org-ops'
import { Button } from '@/components/ui/button'
import { Field, FormSheet, Select, TextArea, TextInput, useForm } from '@/components/hub/form'

const roles = (Object.keys(accessRoleLabel) as AccessRole[]).filter((r) => r !== 'owner')

type Alloc = { projectId: string; role: string; allocation: string }

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border-t border-border pt-4 first:border-0 first:pt-0">
      <legend className="flex flex-col gap-0.5 pb-1">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {hint && <span className="text-xs leading-relaxed text-muted-foreground">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  )
}

function currentAllocations(c: CompanyData, personId?: string): Alloc[] {
  if (!personId) return []
  return c.projects.flatMap((p) => {
    const m = p.members.find((x) => x.personId === personId)
    return m ? [{ projectId: p.id, role: m.role, allocation: String(m.allocation ?? 100) }] : []
  })
}

/** Add a new employee, or edit an existing one when `employeeId` is given. Same fields as the profile shows. */
export function EmployeeFormSheet({ open, onOpenChange, positionId, employeeId }: { open: boolean; onOpenChange: (o: boolean) => void; positionId?: string; employeeId?: string }) {
  const { company: c, mutate } = useHub()
  const editing = employeeId ? c.employees.find((e) => e.id === employeeId) : undefined
  const vacancies = c.employees.filter((e) => e.status === 'vacancy')
  const initialVac = vacancies.find((v) => v.id === positionId)
  const owner = c.employees.find((e) => e.accessRole === 'owner')
  const currentManager = editing ? c.relationships.find((r) => r.from === editing.id && r.type === 'direct')?.to : undefined
  const openProjects = c.projects.filter((p) => p.status !== 'Closed')

  const f = useForm({
    name: editing?.fullName ?? '',
    email: editing?.email ?? '',
    position: initialVac?.id ?? '',
    designation: editing?.designation ?? initialVac?.designation ?? '',
    dept: editing?.dept ?? initialVac?.dept ?? c.departments[0]?.id ?? '',
    manager: currentManager ?? owner?.id ?? '',
    role: (editing?.accessRole ?? 'member') as AccessRole,
    location: editing && editing.location !== '—' ? editing.location : '',
    joined: editing?.joined || TODAY,
    status: (editing?.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
    salary: editing?.salary ? String(editing.salary) : '',
    phone: editing?.phone ?? '',
    dob: editing?.dob ?? '',
    emergency: editing?.emergency ?? '',
    responsibilities: '',
    allocs: currentAllocations(c, editing?.id),
  })
  const v = f.values
  const fillingVacancy = !editing && !!v.position
  const isOwner = editing?.accessRole === 'owner'
  const totalAlloc = v.allocs.reduce((s, a) => s + (Number(a.allocation) || 0), 0)
  const salaryNum = Number(v.salary) || 0
  const unusedProjects = openProjects.filter((p) => !v.allocs.some((a) => a.projectId === p.id))

  const setAlloc = (i: number, patch: Partial<Alloc>) => f.set('allocs', v.allocs.map((a, j) => (j === i ? { ...a, ...patch } : a)))
  const addAlloc = () => unusedProjects[0] && f.set('allocs', [...v.allocs, { projectId: unusedProjects[0].id, role: 'Contributor', allocation: '20' }])
  const removeAlloc = (i: number) => f.set('allocs', v.allocs.filter((_, j) => j !== i))

  const submit = () => {
    const ok = f.validate({
      name: (x) => (!String(x).trim() ? 'Full name is required' : undefined),
      email: (x) => {
        const s = String(x).trim()
        if (!s) return undefined
        if (!/^\S+@\S+\.\S+$/.test(s)) return 'Enter a valid email'
        if (c.employees.some((e) => e.id !== editing?.id && e.email.toLowerCase() === s.toLowerCase())) return 'Someone with this email is already in the company'
      },
      designation: (x, all) => (!all.position && !String(x).trim() ? 'Designation is required' : undefined),
      dept: (x) => (!x ? 'Department is required' : undefined),
      salary: (x) => (String(x).trim() && !(Number(x) > 0) ? 'Enter the annual salary as a number, e.g. 52000' : undefined),
      allocs: (x) => {
        const list = x as Alloc[]
        if (list.some((a) => !(Number(a.allocation) >= 0 && Number(a.allocation) <= 100))) return 'Each allocation must be between 0 and 100%'
        if (list.reduce((s, a) => s + (Number(a.allocation) || 0), 0) > 100) return 'Allocations add up to more than 100% of working time'
      },
    })
    if (!ok) return
    const email = v.email.trim()
    const name = v.name.trim()
    const prevEmail = editing?.email ?? ''
    const sendInvite = !!email && email !== prevEmail && (!editing || editing.status !== 'active' || !prevEmail)

    mutate((co, { id, audit, me, now }) => {
      let emp = editing ? co.employees.find((e) => e.id === editing.id) : v.position ? co.employees.find((e) => e.id === v.position) : undefined
      if (!emp) {
        emp = { id: id('emp'), fullName: name, designation: v.designation.trim(), dept: v.dept, email: '', status: 'active', location: '—', joined: '', accessRole: v.role }
        co.employees.push(emp)
      }
      const hadManager = co.relationships.some((r) => r.from === emp!.id && r.type === 'direct')
      if (v.manager && !fillingVacancy && (editing ? v.manager !== currentManager : !hadManager)) setDirectManager(co, emp.id, v.manager)

      emp.fullName = name
      if (!fillingVacancy) emp.designation = v.designation.trim()
      emp.dept = v.dept
      if (!isOwner) emp.accessRole = v.role
      emp.location = v.location.trim() || '—'
      emp.joined = v.joined || TODAY
      emp.email = email
      emp.salary = salaryNum || undefined
      emp.phone = v.phone.trim() || undefined
      emp.dob = v.dob || undefined
      emp.emergency = v.emergency.trim() || undefined
      if (editing) {
        if (emp.status === 'active' || emp.status === 'inactive') emp.status = v.status
      } else emp.status = email ? 'invited' : 'active'

      for (const p of co.projects) {
        const want = v.allocs.find((a) => a.projectId === p.id)
        const idx = p.members.findIndex((m) => m.personId === emp!.id)
        if (want) {
          const row = { personId: emp.id, role: want.role.trim() || 'Contributor', allocation: Number(want.allocation) || 0 }
          if (idx >= 0) p.members[idx] = row
          else {
            p.members.push(row)
            p.formerMembers = p.formerMembers.filter((m) => m.personId !== emp!.id)
          }
        } else if (idx >= 0) {
          const [gone] = p.members.splice(idx, 1)
          p.formerMembers.push({ personId: gone.personId, role: gone.role, until: TODAY, allocation: gone.allocation })
        }
      }

      v.responsibilities
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((text) => {
          const rid = id('RSP')
          co.responsibilities.push({ id: rid, employeeId: emp!.id, title: text, description: text, scope: '', assignerId: me.id, effective: emp!.joined, approvalRequired: false, status: 'Active', versions: [{ v: 1, text, at: now, by: me.id, note: 'Assigned' }] })
        })

      if (sendInvite) {
        const invId = id('inv')
        emp.invitationId = invId
        co.invitations.push({
          id: invId,
          email,
          name,
          designation: emp.designation,
          dept: emp.dept,
          managerId: co.relationships.find((r) => r.from === emp!.id && r.type === 'direct')?.to ?? me.id,
          accessRole: emp.accessRole,
          start: emp.joined,
          status: 'Pending',
          createdBy: me.id,
          createdAt: TODAY,
          expiresAt: '2026-11-08',
          employeeId: emp.id,
          message: '',
          history: [{ at: TODAY, text: `Sent by ${me.fullName}` }],
        })
        audit('Sent invitation', invId, email)
      }
      audit(editing ? 'Updated employee profile' : 'Added employee', emp.id, name)
    })
    toast.success(editing ? 'Profile updated' : sendInvite ? `Invitation sent to ${email} (simulated)` : `${name} added`, {
      description: !editing && sendInvite ? 'They appear as Invited until they accept.' : undefined,
    })
    if (!editing) f.reset()
    onOpenChange(false)
  }

  return (
    <FormSheet
      wide
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `Edit ${editing.fullName}` : 'Add employee'}
      description={editing ? 'Everything shown on the profile can be changed here.' : 'Fill in what you know now. Every field except name, role and department can be added later from Edit profile.'}
      onSubmit={submit}
      submitLabel={editing ? 'Save changes' : sendLabel(v.email)}
    >
      <Section title="Identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={f.errors.name}>
            <TextInput {...f.bind('name')} autoFocus />
          </Field>
          <Field label="Work email" error={f.errors.email} hint={editing ? undefined : 'Optional. With an email they get an invitation to sign in.'}>
            <TextInput type="email" {...f.bind('email')} />
          </Field>
        </div>
      </Section>

      <Section title="Role & reporting">
        {!editing && vacancies.length > 0 && (
          <Field label="Fill an open position" hint="Takes its title, department and reporting line from the org chart.">
            <Select
              placeholder="No — create a new position"
              options={vacancies.map((p) => ({ value: p.id, label: positionLabel(p) }))}
              value={v.position}
              onChange={(e) => {
                const p = vacancies.find((x) => x.id === e.target.value)
                f.setValues((s) => ({ ...s, position: e.target.value, designation: p?.designation ?? '', dept: p?.dept ?? s.dept }))
              }}
            />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {!fillingVacancy && (
            <Field label="Designation" required error={f.errors.designation}>
              <TextInput placeholder="e.g. Support Specialist" {...f.bind('designation')} />
            </Field>
          )}
          <Field label="Department" required error={f.errors.dept}>
            <Select options={c.departments.map((d) => ({ value: d.id, label: d.name }))} {...f.bind('dept')} />
          </Field>
          {!fillingVacancy && (
            <Field label="Reports to">
              <Select options={placed(c).filter((p) => p.id !== editing?.id).map((p) => ({ value: p.id, label: positionLabel(p) }))} {...f.bind('manager')} />
            </Field>
          )}
          <Field label="Access" hint={isOwner ? 'Ownership can only be transferred from Settings.' : undefined}>
            {isOwner ? (
              <TextInput value={accessRoleLabel.owner} disabled readOnly />
            ) : (
              <Select options={roles.map((r) => ({ value: r, label: accessRoleLabel[r] }))} {...f.bind('role')} />
            )}
          </Field>
          <Field label="Location">
            <TextInput placeholder="e.g. Lisbon" {...f.bind('location')} />
          </Field>
          <Field label="Start date">
            <TextInput type="date" {...f.bind('joined')} />
          </Field>
          {editing && (editing.status === 'active' || editing.status === 'inactive') && (
            <Field label="Status" hint="Inactive people keep their history but no longer get work.">
              <Select options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} {...f.bind('status')} />
            </Field>
          )}
        </div>
      </Section>

      <Section title="Compensation" hint="Visible only to this person, their manager and HR. The salary is what project and department costs are calculated from.">
        <Field label="Annual gross salary (EUR)" error={f.errors.salary} hint={salaryNum ? `${fmtEUR(Math.round(salaryNum / 12))} a month` : 'Leave empty if not known yet.'}>
          <TextInput inputMode="numeric" placeholder="e.g. 52000" {...f.bind('salary')} />
        </Field>
      </Section>

      <Section title="Project allocation" hint="Share of this person's working time on each project. Whatever is left over counts as department work.">
        {v.allocs.length === 0 && <p className="text-sm text-muted-foreground">Not on any project. All time counts as department work.</p>}
        {v.allocs.map((a, i) => (
          <div key={a.projectId} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_96px_auto]">
            <Field label={i === 0 ? 'Project' : ''}>
              <Select
                aria-label="Project"
                value={a.projectId}
                onChange={(e) => setAlloc(i, { projectId: e.target.value })}
                options={openProjects.filter((p) => p.id === a.projectId || !v.allocs.some((x) => x.projectId === p.id)).map((p) => ({ value: p.id, label: p.name }))}
              />
            </Field>
            <Field label={i === 0 ? 'Role on project' : ''}>
              <TextInput aria-label="Role on project" value={a.role} onChange={(e) => setAlloc(i, { role: e.target.value })} />
            </Field>
            <Field label={i === 0 ? 'Time %' : ''}>
              <TextInput aria-label="Time %" inputMode="numeric" value={a.allocation} onChange={(e) => setAlloc(i, { allocation: e.target.value })} />
            </Field>
            <Button type="button" size="icon" variant="ghost" onClick={() => removeAlloc(i)} aria-label={`Remove from ${openProjects.find((p) => p.id === a.projectId)?.name ?? 'project'}`}>
              <X aria-hidden />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" size="sm" variant="outline" onClick={addAlloc} disabled={unusedProjects.length === 0}>
            <Plus aria-hidden /> Add to project
          </Button>
          <span className={`text-xs ${totalAlloc > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
            <span className="font-mono">{totalAlloc}%</span> on projects · <span className="font-mono">{Math.max(0, 100 - totalAlloc)}%</span> department work
          </span>
        </div>
        {f.errors.allocs && <span className="text-xs text-destructive">{f.errors.allocs}</span>}
      </Section>

      <Section title={editing ? 'Add responsibilities' : 'Responsibilities'} hint={editing ? 'One per line. Existing responsibilities are edited on the Overview tab.' : 'Ongoing accountabilities, one per line.'}>
        <TextArea rows={3} placeholder={'Answer tier-1 tickets within 4 hours\nMaintain the help-centre articles'} {...f.bind('responsibilities')} aria-label="Responsibilities, one per line" />
      </Section>

      <Section title="Personal details" hint="Visible only to this person and HR.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <TextInput type="tel" {...f.bind('phone')} />
          </Field>
          <Field label="Date of birth">
            <TextInput type="date" {...f.bind('dob')} />
          </Field>
          <Field label="Emergency contact" className="sm:col-span-2">
            <TextInput placeholder="Name · relationship · phone" {...f.bind('emergency')} />
          </Field>
        </div>
      </Section>
    </FormSheet>
  )
}

const sendLabel = (email: string) => (email.trim() ? 'Add and send invite' : 'Add employee')

export function AddEmployeeSheet(props: { open: boolean; onOpenChange: (o: boolean) => void; positionId?: string }) {
  return <EmployeeFormSheet {...props} />
}
