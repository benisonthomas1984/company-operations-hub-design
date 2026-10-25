import { Page } from '@/components/hub/page'
import { EmployeeProfile } from '@/components/employees/profile'
import { empById } from '@/lib/fixtures'

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const e = empById(id)
  return (
    <Page
      viewId="V03"
      title={e?.fullName ?? 'Employee profile'}
      description="Work profile, typed relationships, responsibilities and activities."
      features={['CO02', 'CO04', 'CO09']}
      sourceName="People service"
    >
      <EmployeeProfile id={id} />
    </Page>
  )
}
