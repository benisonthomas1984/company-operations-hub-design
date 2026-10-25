'use client'

import { useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { departments, employees, relationships, empById, type DeptId } from '@/lib/fixtures'
import { useStore } from '@/lib/store'
import { DeptTag, PersonLink, StatusPill } from '@/components/hub/primitives'

export function Directory() {
  const { can } = useStore()
  const [q, setQ] = useState('')
  const [dept, setDept] = useState<DeptId | 'all'>('all')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'vacancy'>('all')

  const rows = employees.filter(
    (e) =>
      (dept === 'all' || e.dept === dept) &&
      (status === 'all' || e.status === status) &&
      (!q || `${e.fullName} ${e.designation} ${e.email}`.toLowerCase().includes(q.toLowerCase())),
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search aria-hidden className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, designation, email" aria-label="Search employees" className="h-8 w-full rounded-md border border-input bg-card pl-8 pr-2 text-sm outline-none focus:border-ring" />
        </div>
        <select aria-label="Department" value={dept} onChange={(e) => setDept(e.target.value as DeptId | 'all')} className="h-8 rounded-md border border-input bg-card px-2 text-sm">
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-8 rounded-md border border-input bg-card px-2 text-sm">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="vacancy">Vacancies</option>
        </select>
        <span className="text-xs text-muted-foreground">{rows.length} shown</span>
        {can('settings.manage') && (
          <Button size="sm" className="ml-auto" onClick={() => toast('Invitation flow', { description: 'Invite by email → accept → employee record created in Comet Works only.' })}>
            <UserPlus /> Invite employee
          </Button>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <caption className="sr-only">Employee directory</caption>
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Employee</th>
              <th className="px-4 py-2 font-medium">Department</th>
              <th className="px-4 py-2 font-medium">Manager</th>
              <th className="px-4 py-2 font-medium">Work email</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const mgr = relationships.find((r) => r.from === e.id && r.type === 'direct' && r.primary)
              return (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-2">{e.status === 'vacancy' ? <span className="text-muted-foreground">{e.designation} (open)</span> : <PersonLink id={e.id} showRole />}</td>
                  <td className="px-4 py-2">
                    <DeptTag id={e.dept} />
                  </td>
                  <td className="px-4 py-2 text-foreground">{mgr ? empById(mgr.to)?.fullName : '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{e.email || '—'}</td>
                  <td className="px-4 py-2">
                    <StatusPill status={e.status === 'active' ? 'Active' : e.status === 'inactive' ? 'Inactive' : 'Vacancy'} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
