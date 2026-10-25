'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthFrame } from '@/components/public/auth-frame'
import { Field, TextInput, useForm, required } from '@/components/hub/form'
import { Callout } from '@/components/hub/primitives'
import { fmtEUR, packages } from '@/lib/fixtures'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

function Signup() {
  const sp = useSearchParams()
  const router = useRouter()
  const store = useStore()
  const [packageId, setPackageId] = useState(sp.get('package') ?? store.signup?.packageId ?? 'pkg_business')
  const [interval, setInterval] = useState<'month' | 'year'>(store.signup?.interval ?? 'month')
  const [step, setStep] = useState<'account' | 'checkout'>('account')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [accountError, setAccountError] = useState('')
  const pkg = packages.find((p) => p.id === packageId) ?? packages[2]
  const price = interval === 'year' ? pkg.price * 10 : pkg.price
  const f = useForm({ fullName: '', email: '', password: '', companyName: '', card: '4242 4242 4242 4242', terms: '' })

  const toCheckout = () => {
    setAccountError('')
    const ok = f.validate({
      fullName: required('Full name'),
      email: (v) => (!/^\S+@\S+\.\S+$/.test(String(v)) ? 'Enter a valid email address' : store.accounts.some((a) => a.email.toLowerCase() === String(v).toLowerCase()) ? 'An account with this email already exists — log in instead' : undefined),
      password: (v) => (String(v).length < 8 ? 'Use at least 8 characters' : undefined),
      companyName: required('Company name'),
    })
    if (ok) setStep('checkout')
  }

  const pay = () => {
    setPayError('')
    if (!f.values.terms) return setPayError('Accept the terms to continue.')
    if (f.values.card.replace(/\s/g, '').startsWith('4000')) return setPayError('Payment declined by the (simulated) payment provider. Try another card — nothing was charged.')
    setPaying(true)
    setTimeout(() => {
      store.setSignupDraft({ packageId, interval })
      const err = store.signupOwner(f.values)
      setPaying(false)
      if (err) {
        setStep('account')
        setAccountError(err)
        return
      }
      router.replace('/onboarding')
    }, 900)
  }

  return (
    <AuthFrame
      title={step === 'account' ? 'Create your company account' : 'Confirm and pay'}
      description={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-foreground underline">
            Log in
          </Link>
        </>
      }
      aside={
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Selected package</h2>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Package</legend>
            {packages.map((p) => (
              <label key={p.id} className={cn('flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm', p.id === packageId ? 'border-primary bg-accent' : 'border-border')}>
                <input type="radio" name="pkg" checked={p.id === packageId} onChange={() => setPackageId(p.id)} />
                <span className="flex-1">
                  <span className="block font-medium text-foreground">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.employees} employees · {p.aiCredits.toLocaleString('en')} credits
                  </span>
                </span>
                <span className="font-mono text-xs text-foreground">{fmtEUR(p.price)}</span>
              </label>
            ))}
          </fieldset>
          <div role="radiogroup" aria-label="Billing interval" className="grid grid-cols-2 gap-1 rounded-md border border-border p-1">
            {(['month', 'year'] as const).map((i) => (
              <button key={i} type="button" role="radio" aria-checked={interval === i} onClick={() => setInterval(i)} className={cn('rounded px-2 py-1.5 text-xs', interval === i ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                {i === 'month' ? 'Monthly' : 'Annual (2 months free)'}
              </button>
            ))}
          </div>
          <dl className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Due today</dt>
              <dd className="font-semibold text-foreground">{fmtEUR(price)}</dd>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <dt>Renews</dt>
              <dd>every {interval}</dd>
            </div>
          </dl>
        </div>
      }
    >
      {step === 'account' ? (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            toCheckout()
          }}
        >
          {accountError && <Callout tone="danger" title={accountError} />}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Your full name" error={f.errors.fullName} required>
              <TextInput {...f.bind('fullName')} autoComplete="name" />
            </Field>
            <Field label="Work email" error={f.errors.email} required>
              <TextInput {...f.bind('email')} type="email" autoComplete="email" />
            </Field>
            <Field label="Password" error={f.errors.password} hint="Prototype only — stored in this browser, never sent anywhere." required>
              <TextInput {...f.bind('password')} type="password" autoComplete="new-password" />
            </Field>
            <Field label="Company name" error={f.errors.companyName} required>
              <TextInput {...f.bind('companyName')} autoComplete="organization" />
            </Field>
          </div>
          <Button type="submit" className="self-start">
            Continue to payment
          </Button>
        </form>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            pay()
          }}
        >
          <Callout tone="info" title="Simulated checkout">
            No real payment is taken. Use any card; a card starting with 4000 simulates a decline.
          </Callout>
          {payError && <Callout tone="danger" title={payError} />}
          <Field label="Card number">
            <TextInput {...f.bind('card')} inputMode="numeric" autoComplete="cc-number" />
          </Field>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input type="checkbox" checked={!!f.values.terms} onChange={(e) => f.set('terms', e.target.checked ? 'yes' : '')} className="mt-1" />
            I agree to the subscription terms for {f.values.companyName || 'my company'}.
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep('account')} disabled={paying}>
              Back
            </Button>
            <Button type="submit" disabled={paying}>
              {paying ? <Loader2 className="animate-spin" /> : <CreditCard />}
              {paying ? 'Confirming payment…' : `Pay ${fmtEUR(price)} and create workspace`}
            </Button>
          </div>
        </form>
      )}
    </AuthFrame>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <Signup />
    </Suspense>
  )
}
