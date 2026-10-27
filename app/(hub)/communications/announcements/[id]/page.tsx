import { AnnouncementDetail } from '@/components/communications/announcements'

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AnnouncementDetail id={id} />
}
