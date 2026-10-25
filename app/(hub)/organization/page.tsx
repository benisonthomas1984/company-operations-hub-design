import { Page } from '@/components/hub/page'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OrgCanvas } from '@/components/org/org-canvas'
import { OrgList } from '@/components/org/org-list'

export default function OrganizationPage() {
  return (
    <Page
      viewId="V02"
      title="Organization"
      description="Department containers and typed relationships. Drag cards to arrange your layout — positions never change reporting lines. Ana reports to Noor and works with Luca as project manager."
      features={['CO03', 'CO04', 'CO05']}
      sourceName="Organization service"
      emptyTitle="No structure yet"
      emptyBody="Create a department or invite employees to start the organization canvas."
    >
      <Tabs defaultValue="canvas" className="flex flex-1 flex-col gap-3">
        <TabsList>
          <TabsTrigger value="canvas">Canvas</TabsTrigger>
          <TabsTrigger value="list">Accessible list</TabsTrigger>
        </TabsList>
        <TabsContent value="canvas" className="flex flex-1 flex-col">
          <OrgCanvas />
        </TabsContent>
        <TabsContent value="list">
          <OrgList />
        </TabsContent>
      </Tabs>
    </Page>
  )
}
