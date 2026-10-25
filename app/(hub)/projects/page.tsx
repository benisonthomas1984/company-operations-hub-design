import { Page } from '@/components/hub/page'
import { ProjectList } from '@/components/projects/projects'

export default function ProjectsPage() {
  return (
    <Page
      viewId="V05"
      title="Projects"
      description="Cross-department delivery. Progress counts accepted activities only — submitted work is not done until reviewed."
      features={['CO06', 'CO07', 'CO11']}
      sourceName="Project service"
      emptyTitle="No projects yet"
      emptyBody="Projects are created from approved backlog items or by project leads."
    >
      <ProjectList />
    </Page>
  )
}
