'use client'

import { toast } from 'sonner'
import type { CompanyData, Expense, ExpenseCategory } from '@/lib/fixtures'
import { fmtEUR, TODAY } from '@/lib/fixtures'
import { useHub } from '@/lib/store'
import { empOf } from '@/lib/derive'
import { buildRound } from '@/components/approvals/approvals'
import { APPROVAL_THRESHOLD, categories } from '@/components/finance/finance'
import { Field, FormSheet, Select, TextInput, required, useForm } from '@/components/hub/form'

export type ExpenseTarget = {
  dept: string
  projectId?: string
  /** Shown in the sheet, e.g. "Launch Reader v2" or "Marketing department". */
  label: string
  approverIds: string[]
  /** Writes a history line on the owning record. */
  log: (c: CompanyData, at: string, by: string, text: string) => void
}

export function ExpenseSheet({ target, open, onOpenChange }: { target: ExpenseTarget; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { company: c, mutate } = useHub()
  const f = useForm({ description: '', payee: '', category: 'Tools & software', amount: '' })
  const approverNames = target.approverIds.map((id) => empOf(c, id)?.fullName ?? id).join(', ') || 'the owner'

  const submit = () => {
    const ok = f.validate({
      description: required('Description'),
      payee: required('Payee'),
      amount: (v: string) => (!(Number(v) > 0) ? 'Enter an amount greater than zero' : undefined),
    })
    if (!ok) return
    const amount = Math.round(Number(f.values.amount) * 100) / 100
    const needsApproval = amount >= APPROVAL_THRESHOLD
    mutate((c2, ctx) => {
      const id = ctx.id('EXP')
      const owner = c2.employees.find((e) => e.accessRole === 'owner')
      const approverIds = target.approverIds.length ? target.approverIds : owner ? [owner.id] : []
      const exp: Expense = {
        id,
        description: f.values.description,
        payee: f.values.payee,
        category: f.values.category as ExpenseCategory,
        amount,
        currency: 'EUR',
        date: TODAY,
        dept: target.dept,
        projectId: target.projectId,
        allocations: [],
        approvalRequired: needsApproval,
        status: needsApproval ? 'Submitted' : 'Approved · unpaid',
        submittedBy: ctx.me.id,
        source: 'Manual entry',
        history: [{ at: ctx.now, by: ctx.me.id, text: needsApproval ? 'Submitted for approval' : `Auto-approved (under ${fmtEUR(APPROVAL_THRESHOLD)})` }],
      }
      if (needsApproval) {
        const rid = ctx.id('APR')
        buildRound(c2, { id: rid, itemType: 'Expense', itemId: id, itemTitle: exp.description, revision: 'r1', approverIds, submittedBy: ctx.me.id, now: ctx.now, summary: `${target.label} · ${exp.payee} · ${fmtEUR(amount)}`, amount })
        exp.approvalId = rid
      }
      c2.expenses.unshift(exp)
      target.log(c2, ctx.now, ctx.me.id, `Expense added: ${exp.description} (${fmtEUR(amount)})${needsApproval ? ' — awaiting approval' : ''}`)
      ctx.audit('expense.submit', id, fmtEUR(amount))
    })
    toast.success(needsApproval ? `Sent to ${approverNames} for approval` : 'Expense recorded')
    f.reset()
    onOpenChange(false)
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add expense"
      description={`Charged to ${target.label}. ${fmtEUR(APPROVAL_THRESHOLD)} or more is approved by ${approverNames}.`}
      onSubmit={submit}
      submitLabel="Add expense"
    >
      <Field label="Description" required error={f.errors.description}>
        <TextInput value={f.values.description} onChange={(e) => f.set('description', e.target.value)} invalid={!!f.errors.description} placeholder="e.g. Usability test incentives" />
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
    </FormSheet>
  )
}

/** Names of a set of approvers, e.g. "Ana Ruiz, Sam Patel". */
export function useNames(ids: string[]) {
  const { company: c } = useHub()
  return ids.map((id) => empOf(c, id)?.fullName ?? id).join(', ')
}
