'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { accessRoleLabel } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { managerOf } from '@/lib/derive'
import { Button } from '@/components/ui/button'
import { Avatar, DeptTag, PersonLink, StatusPill } from '@/components/hub/primitives'
import { Page, StateBlock } from '@/components/hub/page'
import { Select, useParam } from '@/components/hub/form'
import { AddEmployeeSheet } from '@/components/employees/add-employee'

export function Directory() {
  const { company: c, can } = useHub()
  const [invite, setInvite] = useParam('invite')
  const [position] = useParam('position')
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('')
  const [status, setStatus] = useState('')

  const rows = useMemo(
    () =>
      c.employees
        .filter((e) => e.status !== 'vacancy')
        .filter((e) => !status || e.status === status)
        .filter((e) => !dept || e.dept === dept)
        .filter((e) => !q || `${e.fullName} ${e.designation} ${e.email}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [c.employees, q, dept, status],
  )

  return (
    <Page
      title="Employees"
      description={`Work profiles for ${c.name}. Restricted personal fields appear only to authorized viewers.`}
      actions={
        can('org.edit') && (
          <Button size="sm" onClick={() => setInvite('1')}>
            <UserPlus aria-hidden /> Add employee
          </Button>
        )
      }
    >
      {can('org.edit') && <AddEmployeeSheet key={position || 'new'} open={invite === '1'} onOpenChange={(o) => setInvite(o ? '1' : null, o ? undefined : { position: null })} positionId={position} />}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="dir-q" className="sr-only">
            Search employees
          </label>
          <input
            id="dir-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, title or email"
            className="h-9 w-full rounded-md border border-input bg-card pr-3 pl-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Select aria-label="Department" className="sm:w-48" value={dept} onChange={(e) => setDept(e.target.value)} options={[{ value: '', label: 'All departments' }, ...c.departments.map((d) => ({ value: d.id, label: d.name }))]} />
        <Select
          aria-label="Status"
          className="sm:w-40"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'invited', label: 'Invited' },
            { value: 'inactive', label: 'Inactive' },
            { value: '', label: 'All statuses' },
          ]}
        />
      </div>

      {!rows.length ? (
        <StateBlock title="No matching employees" body="Try another search or filter." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">Employee directory</caption>
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Name</th>
                <th scope="col" className="px-4 py-2 font-medium">Department</th>
                <th scope="col" className="hidden px-4 py-2 font-medium md:table-cell">Manager</th>
                <th scope="col" className="hidden px-4 py-2 font-medium lg:table-cell">Location</th>
                <th scope="col" className="hidden px-4 py-2 font-medium lg:table-cell">Access</th>
                <th scope="col" className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((e) => {
                const mgr = managerOf(c, e.id)
                return (
                  <tr key={e.id} className="hover:bg-muted/50">
                    <td className="px-4 py-2.5">
                      <Link href={`/employees/${e.id}`} className="flex items-center gap-2.5">
                        <Avatar id={e.id} size="sm" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-foreground">{e.fullName}</span>
                          <span className="truncate text-xs text-muted-foreground">{e.designation}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <DeptTag id={e.dept} />
                    </td>
                    <td className="hidden px-4 py-2.5 md:table-cell">{mgr ? <PersonLink id={mgr} /> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="hidden px-4 py-2.5 text-muted-foreground lg:table-cell">{e.location}</td>
                    <td className="hidden px-4 py-2.5 text-muted-foreground lg:table-cell">{accessRoleLabel[e.accessRole]}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={e.status[0].toUpperCase() + e.status.slice(1)} tone={e.status === 'active' ? 'success' : e.status === 'invited' ? 'info' : 'muted'} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  )
}
