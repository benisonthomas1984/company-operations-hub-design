import { Page } from '@/components/hub/page'
import { ProjectDetail } from '@/components/projects/projects'
import { projects } from '@/lib/fixtures'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = projects.find((x) => x.id === id)
  return (
    <Page viewId="V05" title={p ? `${p.id} · ${p.name}` : 'Project'} description={p?.stage} features={['CO06', 'CO07', 'CO11', 'CO12']} sourceName="Project service">
      <ProjectDetail id={id} />
    </Page>
  )
}
