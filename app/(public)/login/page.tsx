'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AuthFrame } from '@/components/public/auth-frame'
import { Field, TextInput } from '@/components/hub/form'
import { Callout } from '@/components/hub/primitives'
import { accessRoleLabel, demoCompany } from '@/lib/fixtures'
import { useStore } from '@/lib/store'

const demoPeople = ['maya', 'ravi', 'noor', 'luca', 'ana', 'elena', 'nina', 'sam']
const demoNotes: Record<string, string> = {
  maya: 'Owner · full company management',
  ravi: 'CEO · board, finance reports',
  noor: 'CTO · reviewer, technical approvals',
  luca: 'Project manager · Launch Reader v2',
  ana: 'Developer · own work and private mail',
  elena: 'HR · announcements, complaint committee',
  nina: 'Finance · expenses and payments',
  sam: 'Support · limited employee access',
}

export default function LoginPage() {
  const store = useStore()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const people = demoCompany().employees.filter((e) => demoPeople.includes(e.id))

  const submit = () => {
    const err = store.login(email, password)
    if (err) return setError(err)
    router.replace('/dossier')
  }

  return (
    <AuthFrame
      title="Log in"
      description={
        <>
          New company?{' '}
          <Link href="/#pricing" className="text-foreground underline">
            Choose a package
          </Link>
        </>
      }
      aside={
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">Comet Works demo accounts</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">Signs in as a real demo account (password “demo”). Each person sees only what their role allows.</p>
          </div>
          <ul className="flex flex-col gap-1">
            {people.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full flex-col rounded-md px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => {
                    store.loginAs(p.id)
                    router.replace('/dossier')
                  }}
                >
                  <span className="text-sm font-medium text-foreground">
                    {p.fullName} <span className="font-normal text-muted-foreground">· {accessRoleLabel[p.accessRole]}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{demoNotes[p.id]}</span>
                </button>
              </li>
            ))}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            className="self-start text-muted-foreground"
            onClick={() => {
              store.resetDemo()
              toast.success('Demo data reset', { description: 'All prototype records restored to the original Comet Works seed.' })
            }}
          >
            <RotateCcw /> Reset demo data
          </Button>
        </div>
      }
    >
      <form
        noValidate
        className="flex max-w-sm flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {error && <Callout tone="danger" title={error} />}
        <Field label="Email">
          <TextInput type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <TextInput type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" className="self-start">
          Log in
        </Button>
      </form>
    </AuthFrame>
  )
}
