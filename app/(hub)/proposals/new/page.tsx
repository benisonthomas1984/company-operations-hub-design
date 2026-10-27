import { Page } from '@/components/hub/page'
import { ProposalEditorPage } from '@/components/company/proposal-editor'

export default function NewProposalPage() {
  return (
    <Page viewId="V10" title="New proposal" description="Write it out in full, run the AI analysis, and save as a draft as often as you like. Submitting sends it to approvers and locks it." crumbs={[{ label: 'Proposals', href: '/proposals' }]}>
      <ProposalEditorPage />
    </Page>
  )
}
