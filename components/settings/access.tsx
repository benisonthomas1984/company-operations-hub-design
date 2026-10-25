'use client'

import { toast } from 'sonner'
import { useHub } from '@/lib/store'
import { accessRoleLabel, type AccessRole } from '@/lib/fixtures'
import { empOf } from '@/lib/derive'
import { AdminGate } from './admin-gate'
import { Callout, DeptTag, Panel, PersonLink, StatusPill } from '@/components/hub/primitives'
import { Select } from '@/components/hub/form'

const roles = Object.keys(accessRoleLabel) as AccessRole[]

export function AccessSettings() {
  return (
    <AdminGate>
      <AccessInner />
    </AdminGate>
  )
}

function AccessInner() {
  const { company: c, me, mutate } = useHub()
  const people = c.employees.filter((e) => e.status === 'active' || e.status === 'invited')
  const owners = c.employees.filter((e) => e.accessRole === 'owner' && e.status === 'active').length

  const set = (id: string, patch: Partial<{ accessRole: AccessRole; financeRead: boolean; complaintHandler: boolean }>, label: string) => {
    mutate((co, { audit }) => {
      const e = co.employees.find((x) => x.id === id)
      if (!e) return
      Object.assign(e, patch)
      audit(label, e.id, e.fullName)
    })
    toast.success(label)
  }

  return (
    <div className="flex flex-col gap-4">
      <Callout tone="info" title="Permissions are checked on every screen">
        Changing a role takes effect immediately for navigation, records, search and the dossier. Private mail is never visible to administrators.
      </Callout>
      <Panel title="People and access" description={`${people.length} people · ${c.invitations.filter((i) => i.status === 'Pending').length} pending invitations`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">Access roles</caption>
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Person</th>
                <th className="px-4 py-2 font-medium">Department</th>
                <th className="px-4 py-2 font-medium">Access role</th>
                <th className="px-4 py-2 font-medium">Finance read</th>
                <th className="px-4 py-2 font-medium">Complaint committee</th>
              </tr>
            </thead>
            <tbody>
              {people.map((e) => {
                const lastOwner = e.accessRole === 'owner' && owners <= 1
                return (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-2">
                        <PersonLink id={e.id} showRole />
                        {e.status === 'invited' && <StatusPill status="Invited" />}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <DeptTag id={e.dept} />
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        aria-label={`Access role for ${e.fullName}`}
                        value={e.accessRole}
                        disabled={lastOwner || e.id === me.id}
                        onChange={(ev) => set(e.id, { accessRole: ev.target.value as AccessRole }, `Role → ${accessRoleLabel[ev.target.value as AccessRole]}`)}
                        options={roles.map((r) => ({ value: r, label: accessRoleLabel[r] }))}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input type="checkbox" aria-label={`Finance read for ${e.fullName}`} checked={!!e.financeRead || ['owner', 'finance'].includes(e.accessRole)} disabled={['owner', 'finance'].includes(e.accessRole)} onChange={(ev) => set(e.id, { financeRead: ev.target.checked }, ev.target.checked ? 'Granted finance read' : 'Removed finance read')} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="checkbox" aria-label={`Complaint committee for ${e.fullName}`} checked={!!e.complaintHandler} onChange={(ev) => set(e.id, { complaintHandler: ev.target.checked }, ev.target.checked ? 'Added to complaint committee' : 'Removed from complaint committee')} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Audit log" description="Every permission, approval and record change.">
        <ul className="flex max-h-96 flex-col divide-y divide-border overflow-y-auto">
          {c.audit.slice(0, 60).map((a) => (
            <li key={a.id} className="flex flex-wrap gap-x-3 px-4 py-2 text-xs">
              <span className="font-mono text-muted-foreground">{a.at}</span>
              <span className="text-foreground">{empOf(c, a.actor)?.fullName ?? a.actor}</span>
              <span className="text-foreground">{a.action}</span>
              <span className="font-mono text-muted-foreground">{a.target}</span>
              {a.detail && <span className="text-muted-foreground">{a.detail}</span>}
            </li>
          ))}
          {c.audit.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">No entries yet.</li>}
        </ul>
      </Panel>
    </div>
  )
}
