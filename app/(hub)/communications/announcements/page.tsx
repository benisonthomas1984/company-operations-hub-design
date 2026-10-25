import { Page } from '@/components/hub/page'
import { Announcements } from '@/components/communications/announcements'

export default function AnnouncementsPage() {
  return (
    <Page viewId="V13" title="Announcements" description="Company-wide and targeted announcements with optional acknowledgment." features={['CO13']} sourceName="Announcement service">
      <Announcements />
    </Page>
  )
}
