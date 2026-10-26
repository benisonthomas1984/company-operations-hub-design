'use client'

import { toast } from 'sonner'
import { TODAY, accessRoleLabel, type AccessRole } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { placed, positionLabel, setDirectManager } from '@/lib/org-ops'
import { Field, FormSheet, Select, TextInput, useForm } from '@/components/hub/form'

const roles = (Object.keys(accessRoleLabel) as AccessRole[]).filter((r) => r !== 'owner')

export function AddEmployeeSheet({ open, onOpenChange, positionId }: { open: boolean; onOpenChange: (o: boolean) => void; positionId?: string }) {
  const { company: c, mutate } = useHub()
  const vacancies = c.employees.filter((e) => e.status === 'vacancy')
  const initialVac = vacancies.find((v) => v.id === positionId)
  const owner = c.employees.find((e) => e.accessRole === 'owner')
  const f = useForm({
    name: '',
    email: '',
    position: initialVac?.id ?? '',
    designation: initialVac?.designation ?? '',
    dept: initialVac?.dept ?? c.departments[0]?.id ?? '',
    manager: owner?.id ?? '',
    role: 'member' as AccessRole,
    location: '',
  })
  const v = f.values
  const fillingVacancy = !!v.position

  const submit = () => {
    const ok = f.validate({
      name: (x) => (!String(x).trim() ? 'Full name is required' : undefined),
      email: (x) => {
        const s = String(x).trim()
        if (!s) return undefined
        if (!/^\S+@\S+\.\S+$/.test(s)) return 'Enter a valid email'
        if (c.employees.some((e) => e.email.toLowerCase() === s.toLowerCase())) return 'Someone with this email is already in the company'
      },
      designation: (x, all) => (!all.position && !String(x).trim() ? 'Designation is required' : undefined),
      dept: (x) => (!x ? 'Department is required' : undefined),
    })
    if (!ok) return
    const email = v.email.trim()
    const name = v.name.trim()
    mutate((co, { id, audit, me }) => {
      let emp = v.position ? co.employees.find((e) => e.id === v.position) : undefined
      if (!emp) {
        emp = { id: id('emp'), fullName: name, designation: v.designation.trim(), dept: v.dept, email: '', status: 'active', location: '—', joined: '', accessRole: v.role }
        co.employees.push(emp)
        if (v.manager) setDirectManager(co, emp.id, v.manager)
      } else if (!co.relationships.some((r) => r.from === emp!.id && r.type === 'direct') && v.manager) {
        setDirectManager(co, emp.id, v.manager)
      }
      emp.fullName = name
      emp.dept = v.dept
      emp.accessRole = v.role
      emp.location = v.location.trim() || '—'
      emp.joined = TODAY
      emp.email = email
      emp.status = email ? 'invited' : 'active'
      if (email) {
        const invId = id('inv')
        emp.invitationId = invId
        co.invitations.push({
          id: invId,
          email,
          name,
          designation: emp.designation,
          dept: emp.dept,
          managerId: co.relationships.find((r) => r.from === emp!.id && r.type === 'direct')?.to ?? me.id,
          accessRole: v.role,
          start: TODAY,
          status: 'Pending',
          createdBy: me.id,
          createdAt: TODAY,
          expiresAt: '2026-11-08',
          employeeId: emp.id,
          message: '',
          history: [{ at: TODAY, text: `Sent by ${me.fullName}` }],
        })
        audit('Sent invitation', invId, email)
      } else audit('Added employee', emp.id, name)
    })
    toast.success(email ? `Invitation sent to ${email} (simulated)` : `${name} added`, {
      description: email ? 'They appear as Invited until they accept.' : 'Add an email later from their profile to give them a login.',
    })
    f.reset()
    onOpenChange(false)
  }

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Add employee" description="Add someone to the company. Include an email to send them an invitation, or leave it empty to add the record only." onSubmit={submit} submitLabel={v.email.trim() ? 'Add and send invite' : 'Add employee'}>
      <Field label="Full name" required error={f.errors.name}>
        <TextInput {...f.bind('name')} autoFocus />
      </Field>
      <Field label="Work email" error={f.errors.email} hint="Optional. With an email they get an invitation to sign in.">
        <TextInput type="email" {...f.bind('email')} />
      </Field>
      {vacancies.length > 0 && (
        <Field label="Fill an open position" hint="Choosing one takes its title, department and reporting line from the org chart.">
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
      {!fillingVacancy && (
        <>
          <Field label="Designation" required error={f.errors.designation}>
            <TextInput placeholder="e.g. Support Specialist" {...f.bind('designation')} />
          </Field>
          <Field label="Reports to (position)">
            <Select options={placed(c).map((p) => ({ value: p.id, label: positionLabel(p) }))} {...f.bind('manager')} />
          </Field>
        </>
      )}
      <Field label="Department" required error={f.errors.dept}>
        <Select options={c.departments.map((d) => ({ value: d.id, label: d.name }))} {...f.bind('dept')} />
      </Field>
      <Field label="Access" hint="Predefined access levels. Ownership can only be transferred, not granted here.">
        <Select options={roles.map((r) => ({ value: r, label: accessRoleLabel[r] }))} {...f.bind('role')} />
      </Field>
      <Field label="Location">
        <TextInput placeholder="e.g. Lisbon" {...f.bind('location')} />
      </Field>
    </FormSheet>
  )
}
