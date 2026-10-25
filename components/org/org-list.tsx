import Link from 'next/link'
import { employees, relationships, relLabel, empById } from '@/lib/fixtures'
import { DeptTag, PersonLink, StatusPill } from '@/components/hub/primitives'

export function OrgList() {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <caption className="sr-only">Organization as an accessible list with typed relationships</caption>
        <thead className="border-b border-border text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Person</th>
            <th className="px-4 py-2 font-medium">Department</th>
            <th className="px-4 py-2 font-medium">Primary direct manager</th>
            <th className="px-4 py-2 font-medium">Other relationships</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => {
            const out = relationships.filter((r) => r.from === e.id)
            const primary = out.find((r) => r.type === 'direct' && r.primary)
            const others = out.filter((r) => r !== primary)
            return (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  {e.status === 'vacancy' ? (
                    <span className="flex items-center gap-2">
                      <StatusPill status="Vacancy" tone="muted" /> {e.designation}
                    </span>
                  ) : (
                    <PersonLink id={e.id} showRole />
                  )}
                </td>
                <td className="px-4 py-2">
                  <DeptTag id={e.dept} />
                </td>
                <td className="px-4 py-2 text-foreground">
                  {primary ? (
                    <Link className="hover:underline" href={`/employees/${primary.to}`}>
                      {empById(primary.to)?.fullName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">— (top of structure)</span>
                  )}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {others.length === 0
                    ? '—'
                    : others.map((r) => (
                        <span key={r.id} className="block">
                          {relLabel[r.type]}: <span className="text-foreground">{empById(r.to)?.fullName}</span>
                          {r.context && <span> · {r.context}</span>}
                        </span>
                      ))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
