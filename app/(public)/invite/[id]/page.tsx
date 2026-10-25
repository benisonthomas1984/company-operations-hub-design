'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { AuthFrame } from '@/components/public/auth-frame'
import { Field, TextInput, useForm } from '@/components/hub/form'
import { Callout, KV } from '@/components/hub/primitives'
import { TODAY, accessRoleLabel } from '@/lib/fixtures'
import { useStore } from '@/lib/store'

export default function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const store = useStore()
  const router = useRouter()
  const found = store.findInvite(id)
  const [error, setError] = useState('')
  const f = useForm({ fullName: found?.invite.name ?? '', password: '', phone: '', location: '' })

  if (!store.ready) return null
  if (!found) {
    return (
      <AuthFrame title="Invitation not found" description="This link is invalid. Ask the company administrator to send a new invitation.">
        <Link href="/login" className={buttonVariants({ variant: 'outline', className: 'self-start' })}>
          Go to login
        </Link>
      </AuthFrame>
    )
  }
  const { invite, company } = found
  const expired = invite.status === 'Expired' || invite.expiresAt < TODAY
  const blocked = invite.status !== 'Pending' || expired
  const manager = company.employees.find((e) => e.id === invite.managerId)
  const dept = company.departments.find((d) => d.id === invite.dept)

  return (
    <AuthFrame
      title={`Join ${company.name}`}
      description={`${company.employees.find((e) => e.id === invite.createdBy)?.fullName ?? 'An administrator'} invited ${invite.email}.`}
      aside={
        <dl className="grid gap-3 rounded-xl border border-border bg-card p-5">
          <KV label="Designation">{invite.designation}</KV>
          <KV label="Department">{dept?.name ?? '—'}</KV>
          <KV label="Reports to">{manager?.fullName ?? '—'}</KV>
          <KV label="Start date">{invite.start}</KV>
          <KV label="Access">{accessRoleLabel[invite.accessRole]}</KV>
          {invite.message && <KV label="Message">{invite.message}</KV>}
        </dl>
      }
    >
      {invite.status === 'Accepted' && <Callout tone="info" title="This invitation was already accepted. Log in with your account." />}
      {invite.status === 'Cancelled' && <Callout tone="danger" title="This invitation was cancelled by the company." />}
      {invite.status === 'Pending' && expired && <Callout tone="warning" title={`This invitation expired on ${invite.expiresAt}. Ask the company to resend it.`} />}
      {error && <Callout tone="danger" title={error} />}
      {blocked ? (
        <Link href="/login" className={buttonVariants({ variant: 'outline', className: 'self-start' })}>
          Go to login
        </Link>
      ) : (
        <form
          noValidate
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            const ok = f.validate({ fullName: (v) => (!String(v).trim() ? 'Name is required' : undefined), password: (v) => (String(v).length < 8 ? 'Use at least 8 characters' : undefined) })
            if (!ok) return
            const err = store.acceptInvite(invite.id, { companyId: company.id, ...f.values })
            if (err) return setError(err)
            router.replace('/dossier')
          }}
        >
          <Field label="Full name" error={f.errors.fullName} required>
            <TextInput {...f.bind('fullName')} autoComplete="name" />
          </Field>
          <Field label="Email">
            <TextInput value={invite.email} readOnly className="bg-muted" />
          </Field>
          <Field label="Create password" error={f.errors.password} hint="Prototype only — stays in this browser." required>
            <TextInput {...f.bind('password')} type="password" autoComplete="new-password" />
          </Field>
          <Field label="Phone (optional)">
            <TextInput {...f.bind('phone')} autoComplete="tel" />
          </Field>
          <Field label="Location (optional)">
            <TextInput {...f.bind('location')} />
          </Field>
          <Button type="submit" className="self-end md:col-span-2 md:justify-self-start">
            Accept and join
          </Button>
        </form>
      )}
    </AuthFrame>
  )
}
