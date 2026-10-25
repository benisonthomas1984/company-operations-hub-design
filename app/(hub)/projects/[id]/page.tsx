import { ProjectDetail } from '@/components/projects/projects'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProjectDetail id={id} />
}
