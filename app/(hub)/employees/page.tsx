import { Page } from '@/components/hub/page'
import { Directory } from '@/components/employees/directory'

export default function EmployeesPage() {
  return (
    <Page
      viewId="V03"
      title="Employees"
      description="Work profiles for Comet Works. Restricted personal fields appear only on profiles for authorized viewers."
      features={['CO02', 'CO04', 'CO14']}
      sourceName="People service"
      emptyTitle="No employees yet"
      emptyBody="Invite your first employee. Each invitation creates a record scoped to Comet Works only."
    >
      <Directory />
    </Page>
  )
}
