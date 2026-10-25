import { Page } from '@/components/hub/page'
import { Mail } from '@/components/mail/mail'

export default function MailPage() {
  return (
    <Page viewId="V15" title="My Mail" description="Your connected work mailbox. Owner-only, with no administrative override." features={['CO15']} sourceName="Mail connector">
      <Mail />
    </Page>
  )
}
