import { Page } from '@/components/hub/page'
import { ProposalEditorPage } from '@/components/company/proposal-editor'

export default async function EditProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Page viewId="V10" title="Edit proposal" description="Drafts stay editable until you submit. Submitted proposals are locked unless approvers request changes." crumbs={[{ label: 'Proposals', href: '/proposals' }]}>
      <ProposalEditorPage id={id} />
    </Page>
  )
}
