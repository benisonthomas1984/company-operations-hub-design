import { Page } from '@/components/hub/page'
import { Departments } from '@/components/company/departments'

export default function DepartmentsPage() {
  return (
    <Page viewId="V09" title="Departments" description="Department workload, people and vacancies. Executive Office is a structural group, not a department." features={['CO03', 'CO06']} sourceName="Org service">
      <Departments />
    </Page>
  )
}
