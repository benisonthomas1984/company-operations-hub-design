'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Expense, ExpenseCategory } from '@/lib/fixtures'
import { fmtEUR, PERIOD, TODAY } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { countable, empOf, pendingExpense, productFinance } from '@/lib/derive'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeptTag, IdChip, Panel, StatusPill } from '@/components/hub/primitives'
import { Page, StateBlock } from '@/components/hub/page'
import { buildRound } from '@/components/approvals/approvals'
import { Field, FormSheet, Select, TextInput, required, useDeptOptions, useForm } from '@/components/hub/form'

export const categories: ExpenseCategory[] = ['Hosting', 'Tools & software', 'Contractor', 'Employee cost', 'Travel', 'Marketing', 'Other']
export const APPROVAL_THRESHOLD = 500

function Money({ v, strong }: { v: number; strong?: boolean }) {
  return <span className={strong ? 'font-mono font-semibold text-foreground' : 'font-mono text-foreground'}>{fmtEUR(v)}</span>
}

function Contribution() {
  const { company: c } = useHub()
  const rows = c.products.map((p) => ({ p, f: productFinance(c, p.id) }))
  const total = rows.reduce((s, r) => s + r.f.operatingProfit, 0)
  if (!rows.length) return <StateBlock title="No products yet" body="Add products and services to attribute revenue and expense." />
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {PERIOD.label}. Only approved or paid expenses count. Contribution = recognized revenue − delivery cost − attributable operating expense; it is not company profit.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">Product contribution</caption>
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Product / service</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Recognized</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Delivery cost</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Operating</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Contribution</th>
              <th scope="col" className="hidden px-4 py-2 text-right font-medium md:table-cell">Pending</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ p, f }) => (
              <tr key={p.id}>
                <td className="px-4 py-2.5">
                  <Link href={`/products/${p.id}`} className="font-medium text-info hover:underline">
                    {p.name}
                  </Link>
                  {!f.hasRevenue && <span className="ml-2 text-xs text-muted-foreground">no revenue recorded</span>}
                </td>
                <td className="px-4 py-2.5 text-right"><Money v={f.recognized} /></td>
                <td className="px-4 py-2.5 text-right"><Money v={f.costOfDelivery} /></td>
                <td className="px-4 py-2.5 text-right"><Money v={f.opex} /></td>
                <td className="px-4 py-2.5 text-right"><Money v={f.operatingProfit} strong /></td>
                <td className="hidden px-4 py-2.5 text-right text-muted-foreground md:table-cell">{f.pending.length || '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border">
            <tr>
              <th scope="row" colSpan={4} className="px-4 py-2.5 text-left font-medium text-foreground">
                Total contribution
              </th>
              <td className="px-4 py-2.5 text-right"><Money v={total} strong /></td>
              <td className="hidden md:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function ExpenseList() {
  const { company: c, can, mutate } = useHub()
  const rows = [...c.expenses].sort((a, b) => b.date.localeCompare(a.date))
  const countableTotal = rows.filter(countable).reduce((s, e) => s + e.amount, 0)
  const pendingTotal = rows.filter(pendingExpense).reduce((s, e) => s + e.amount, 0)

  const markPaid = (e: Expense) =>
    mutate((c2, ctx) => {
      const x = c2.expenses.find((y) => y.id === e.id)!
      x.status = 'Paid'
      x.payment = { at: ctx.now, by: ctx.me.id, method: 'Bank transfer' }
      x.history.unshift({ at: ctx.now, by: ctx.me.id, text: 'Marked paid' })
      ctx.audit('expense.paid', x.id, fmtEUR(x.amount))
    })

  if (!rows.length) return <StateBlock title="No expenses yet" body="Submitted expenses appear here with their approval state." />
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
        <span>Counted (approved or paid): <Money v={countableTotal} strong /></span>
        <span>Pending approval: <Money v={pendingTotal} /></span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">Expenses</caption>
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Expense</th>
              <th scope="col" className="hidden px-4 py-2 font-medium md:table-cell">Department</th>
              <th scope="col" className="hidden px-4 py-2 font-medium lg:table-cell">Allocation</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Amount</th>
              <th scope="col" className="px-4 py-2 font-medium">Status</th>
              <th scope="col" className="px-4 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((e) => (
              <tr key={e.id} className="align-top">
                <td className="px-4 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <IdChip>{e.id}</IdChip>
                      <span className="font-medium text-foreground">{e.description}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {e.payee} · {e.category} · {e.date} · by {empOf(c, e.submittedBy)?.fullName ?? 'Unknown'}
                    </span>
                  </div>
                </td>
                <td className="hidden px-4 py-2.5 md:table-cell"><DeptTag id={e.dept} /></td>
                <td className="hidden px-4 py-2.5 text-xs text-muted-foreground lg:table-cell">
                  {e.allocations.length
                    ? e.allocations.map((a) => `${c.products.find((p) => p.id === a.productId)?.name ?? a.productId} ${fmtEUR(a.amount)}`).join(' · ')
                    : 'Unallocated'}
                </td>
                <td className="px-4 py-2.5 text-right"><Money v={e.amount} /></td>
                <td className="px-4 py-2.5">
                  {e.approvalId ? (
                    <Link href={`/approvals?id=${e.approvalId}`} className="hover:underline">
                      <StatusPill status={e.status} />
                    </Link>
                  ) : (
                    <StatusPill status={e.status} />
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {can('finance.manage') && e.status === 'Approved · unpaid' && (
                    <Button size="sm" variant="outline" onClick={() => markPaid(e)}>
                      Mark paid
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NewExpense({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { company: c, mutate } = useHub()
  const depts = useDeptOptions()
  const f = useForm({ description: '', payee: '', category: 'Tools & software', amount: '', dept: '', productId: '', kind: 'Operating' })
  const owner = c.employees.find((e) => e.accessRole === 'owner')

  const submit = () => {
    const ok = f.validate({
      description: required('Description'),
      payee: required('Payee'),
      dept: required('Department'),
      amount: (v: string) => (!(Number(v) > 0) ? 'Enter an amount greater than zero' : undefined),
    })
    if (!ok) return
    const amount = Math.round(Number(f.values.amount) * 100) / 100
    const needsApproval = amount >= APPROVAL_THRESHOLD
    mutate((c2, ctx) => {
      const id = ctx.id('EXP')
      const wf = c2.workflows.find((w) => w.appliesTo === 'Expense')
      const approverIds = wf?.stages.flatMap((s) => s.approverIds) ?? (owner ? [owner.id] : [])
      const exp: Expense = {
        id,
        description: f.values.description,
        payee: f.values.payee,
        category: f.values.category as ExpenseCategory,
        amount,
        currency: 'EUR',
        date: TODAY,
        dept: f.values.dept,
        allocations: f.values.productId ? [{ productId: f.values.productId, amount, kind: f.values.kind as 'Delivery' | 'Operating' }] : [],
        approvalRequired: needsApproval,
        status: needsApproval ? 'Submitted' : 'Approved · unpaid',
        submittedBy: ctx.me.id,
        source: 'Manual entry',
        history: [{ at: ctx.now, by: ctx.me.id, text: needsApproval ? 'Submitted for approval' : `Auto-approved (under ${fmtEUR(APPROVAL_THRESHOLD)})` }],
      }
      if (needsApproval) {
        const rid = ctx.id('APR')
        buildRound(c2, { id: rid, itemType: 'Expense', itemId: id, itemTitle: exp.description, revision: 'r1', approverIds, submittedBy: ctx.me.id, now: ctx.now, summary: `${exp.payee} · ${fmtEUR(amount)}`, amount })
        exp.approvalId = rid
      }
      c2.expenses.unshift(exp)
      ctx.audit('expense.submit', id, fmtEUR(amount))
    })
    toast.success(needsApproval ? 'Expense submitted for approval' : 'Expense recorded')
    f.reset()
    onOpenChange(false)
  }

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Submit expense" description={`Expenses of ${fmtEUR(APPROVAL_THRESHOLD)} or more go to the expense approval workflow.`} onSubmit={submit} submitLabel="Submit">
      <Field label="Description" required error={f.errors.description}>
        <TextInput value={f.values.description} onChange={(e) => f.set('description', e.target.value)} invalid={!!f.errors.description} />
      </Field>
      <Field label="Payee" required error={f.errors.payee}>
        <TextInput value={f.values.payee} onChange={(e) => f.set('payee', e.target.value)} invalid={!!f.errors.payee} />
      </Field>
      <Field label="Amount (EUR)" required error={f.errors.amount}>
        <TextInput type="number" inputMode="decimal" min="0" step="0.01" value={f.values.amount} onChange={(e) => f.set('amount', e.target.value)} invalid={!!f.errors.amount} />
      </Field>
      <Field label="Category">
        <Select value={f.values.category} onChange={(e) => f.set('category', e.target.value)} options={categories.map((x) => ({ value: x, label: x }))} />
      </Field>
      <Field label="Department" required error={f.errors.dept}>
        <Select options={depts} placeholder="Select department" value={f.values.dept} onChange={(e) => f.set('dept', e.target.value)} invalid={!!f.errors.dept} />
      </Field>
      <Field label="Attribute to product" hint="Optional. Allocated expense reduces that product's contribution once approved.">
        <Select value={f.values.productId} onChange={(e) => f.set('productId', e.target.value)} options={[{ value: '', label: 'None' }, ...c.products.map((p) => ({ value: p.id, label: p.name }))]} />
      </Field>
      {f.values.productId && (
        <Field label="Cost type">
          <Select value={f.values.kind} onChange={(e) => f.set('kind', e.target.value)} options={[{ value: 'Operating', label: 'Operating' }, { value: 'Delivery', label: 'Delivery' }]} />
        </Field>
      )}
    </FormSheet>
  )
}

export function Finance() {
  const { can } = useHub()
  const router = useRouter()
  const sp = useSearchParams()
  const tab = sp.get('tab') === 'expenses' ? 'expenses' : 'contribution'
  const [open, setOpen] = useState(false)
  const allowed = can('finance.read')

  return (
    <Page
      title="Finance"
      description="Company expense, allocations and product contribution."
      forbidden={!allowed}
      forbiddenBody="Finance is limited to owners, administrators and finance readers."
      actions={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus aria-hidden /> Submit expense
        </Button>
      }
    >
      <Tabs value={tab} onValueChange={(v) => router.replace(v === 'expenses' ? '/finance?tab=expenses' : '/finance')}>
        <TabsList>
          <TabsTrigger value="contribution">Contribution</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>
        <TabsContent value="contribution" className="pt-2">
          <Panel>
            <Contribution />
          </Panel>
        </TabsContent>
        <TabsContent value="expenses" className="pt-2">
          <ExpenseList />
        </TabsContent>
      </Tabs>
      <NewExpense open={open} onOpenChange={setOpen} />
    </Page>
  )
}
