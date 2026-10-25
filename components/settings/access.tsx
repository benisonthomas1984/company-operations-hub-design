'use client'

import { Check, Minus } from 'lucide-react'
import { auditLog } from '@/lib/fixtures'
import { perspectives, type Capability } from '@/lib/store'
import { AdminGate } from './admin-gate'
import { IdChip, Panel, PersonLink } from '@/components/hub/primitives'

const caps: { id: Capability; label: string }[] = [
  { id: 'finance.read', label: 'Finance read' },
  { id: 'finance.manage', label: 'Finance manage' },
  { id: 'settings.manage', label: 'Settings' },
  { id: 'org.edit', label: 'Org edit' },
  { id: 'board.member', label: 'Board' },
  { id: 'project.lead', label: 'Project lead' },
  { id: 'complaints.case', label: 'Complaint case' },
  { id: 'announcements.publish', label: 'Announce' },
]

export function AccessSettings() {
  return (
    <AdminGate>
      <div className="flex flex-col gap-4">
        <Panel title="Permission matrix" description="Grants are explicit. Mailbox content is owner-only and not grantable to anyone.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Person
                  </th>
                  {caps.map((c) => (
                    <th key={c.id} scope="col" className="px-2 py-2 text-center font-medium">
                      {c.label}
                    </th>
                  ))}
                  <th scope="col" className="px-2 py-2 text-center font-medium">
                    Others&apos; mail
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {perspectives.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className="px-4 py-2.5 text-left font-normal">
                      <span className="flex flex-col">
                        <span className="text-foreground">{p.label}</span>
                        <span className="text-xs text-muted-foreground">{p.role}</span>
                      </span>
                    </th>
                    {caps.map((c) => (
                      <td key={c.id} className="px-2 py-2.5 text-center">
                        {p.caps.includes(c.id) ? <Check className="mx-auto size-4 text-success" aria-label="Granted" /> : <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="Not granted" />}
                      </td>
                    ))}
                    <td className="px-2 py-2.5 text-center">
                      <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="Never" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Audit log" description="Append-only. Sensitive targets are described, not exposed.">
          <ul className="divide-y divide-border">
            {auditLog.map((a) => (
              <li key={a.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[110px_140px_1fr] sm:gap-4">
                <span className="flex flex-col gap-1">
                  <IdChip>{a.id}</IdChip>
                  <span className="font-mono text-[11px] text-muted-foreground">{a.at}</span>
                </span>
                <PersonLink id={a.actor} />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{a.action}</span>
                  <span className="text-sm text-foreground">{a.target}</span>
                  <span className="text-xs text-muted-foreground">{a.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AdminGate>
  )
}
