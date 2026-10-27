'use client'

// DEV ONLY — remove this component (and its usage in app-shell.tsx and `loadSampleData` in lib/store.tsx) before production.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DatabaseZap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useStore } from '@/lib/store'

export function SampleDataButton() {
  const { loadSampleData } = useStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const load = () => {
    loadSampleData()
    setOpen(false)
    router.push('/dossier')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-8 gap-1.5 border-dashed text-xs" />}>
        <DatabaseZap aria-hidden className="size-3.5" />
        <span className="hidden sm:inline">Load sample data</span>
        <span className="sr-only sm:hidden">Load sample data</span>
        <span className="rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground">DEV</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fill this workspace with sample data?</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Replaces everything in this company with the full sample dataset: company name, founder and owner, employees, org chart, departments, projects, activities, approvals, finance, mail and more. You&apos;ll be signed in as the sample owner, and your current email and password keep working.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={load}>Load sample data</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
