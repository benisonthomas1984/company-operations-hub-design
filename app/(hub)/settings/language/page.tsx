import { Page } from '@/components/hub/page'
import { LanguageSettings } from '@/components/settings/language'

export default function LanguagePage() {
  return (
    <Page viewId="V20" title="Language" description="System languages and the Spanish wording your company sees." features={['CO20']} sourceName="Platform">
      <LanguageSettings />
    </Page>
  )
}
