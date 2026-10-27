'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useHub } from '@/lib/store'
import { cn } from '@/lib/utils'
import { deptColorCls } from '@/lib/fixtures'

export const inputCls =
  'h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-[invalid=true]:border-destructive'

export function Field({ label, error, hint, children, className, required }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : hint ? <span className="text-xs leading-relaxed text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { invalid, className, ...rest } = props
  return <input aria-invalid={invalid || undefined} className={cn(inputCls, className)} {...rest} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  const { invalid, className, ...rest } = props
  return <textarea aria-invalid={invalid || undefined} className={cn(inputCls, 'h-auto min-h-20 py-2 leading-relaxed', className)} {...rest} />
}

export function Select({ options, invalid, className, placeholder, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; invalid?: boolean; placeholder?: string }) {
  return (
    <select aria-invalid={invalid || undefined} className={cn(inputCls, 'px-2', className)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function usePeopleOptions(filter?: (id: string) => boolean) {
  const { company } = useHub()
  return company.employees.filter((e) => e.status === 'active' && (!filter || filter(e.id))).map((e) => ({ value: e.id, label: `${e.fullName} — ${e.designation}` }))
}
export function useDeptOptions() {
  const { company } = useHub()
  return company.departments.map((d) => ({ value: d.id, label: d.name }))
}
export function useProductOptions() {
  const { company } = useHub()
  return company.products.map((p) => ({ value: p.id, label: `${p.name} (${p.kind})` }))
}
export function useProjectOptions() {
  const { company } = useHub()
  return company.projects.map((p) => ({ value: p.id, label: p.name }))
}

export function PeoplePicker({ value, onChange, label, error, filter, allowPending = false }: { value: string[]; onChange: (v: string[]) => void; label: string; error?: string; filter?: (id: string) => boolean; allowPending?: boolean }) {
  const { company } = useHub()
  const [q, setQ] = useState('')
  const people = company.employees.filter((e) => (e.status === 'active' || (allowPending && e.status === 'invited')) && (!filter || filter(e.id)))
  const shown = people.filter((p) => !q || p.fullName.toLowerCase().includes(q.toLowerCase()) || p.designation.toLowerCase().includes(q.toLowerCase()))
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="pb-1.5 text-xs font-medium text-foreground">
        {label} <span className="font-normal text-muted-foreground">({value.length} selected)</span>
      </legend>
      <TextInput placeholder="Filter people" value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Filter ${label}`} />
      <div className="flex max-h-44 flex-col overflow-y-auto rounded-md border border-border">
        {shown.map((p) => {
          const d = company.departments.find((x) => x.id === p.dept)
          return (
            <label key={p.id} className="flex cursor-pointer items-center gap-2 border-b border-border px-2.5 py-1.5 text-sm last:border-0 hover:bg-muted">
              <input type="checkbox" checked={value.includes(p.id)} onChange={(e) => onChange(e.target.checked ? [...value, p.id] : value.filter((x) => x !== p.id))} />
              <span aria-hidden className={cn('size-2 rounded-[2px]', d ? deptColorCls[d.color].bg : 'bg-muted')} />
              <span className="flex-1 truncate">{p.fullName}</span>
              <span className="truncate text-xs text-muted-foreground">{p.designation}</span>
            </label>
          )
        })}
        {!shown.length && <p className="p-3 text-xs text-muted-foreground">No matching active people.</p>}
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </fieldset>
  )
}

export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = 'Save',
  secondary,
  wide,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  onSubmit: () => void
  submitLabel?: string
  secondary?: React.ReactNode
  wide?: boolean
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn('w-full gap-0 p-0', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <form
          className="flex h-full flex-col"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">{children}</div>
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {secondary}
            <Button type="submit">{submitLabel}</Button>
          </footer>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/** Minimal form-state helper: values, field errors, validation that preserves input on error. */
export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const set = <K extends keyof T>(k: K, v: T[K]) => {
    setValues((p) => ({ ...p, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const validate = (rules: Partial<Record<keyof T, (v: T[keyof T], all: T) => string | undefined>>) => {
    const next: Partial<Record<keyof T, string>> = {}
    for (const k in rules) {
      const msg = rules[k]?.(values[k], values)
      if (msg) next[k] = msg
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }
  const bind = <K extends keyof T>(k: K) => ({
    value: values[k] as unknown as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as T[K]),
    invalid: !!errors[k],
  })
  return { values, setValues, set, errors, setErrors, validate, bind, reset: () => (setValues(initial), setErrors({})) }
}

export const required = (label: string) => (v: unknown) => (v === undefined || v === null || String(v).trim() === '' || (Array.isArray(v) && v.length === 0) ? `${label} is required` : undefined)

/** URL-synced tab/selection so deep links and refresh restore the exact view. */
export function useParam(name: string, fallback = '') {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const value = sp.get(name) ?? fallback
  const set = (v: string | null, extra?: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString())
    if (v === null || v === '') next.delete(name)
    else next.set(name, v)
    if (extra) Object.entries(extra).forEach(([k, val]) => (val === null ? next.delete(k) : next.set(k, val)))
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }
  return [value, set] as const
}

export function TabBar({ tabs, value, onChange, label }: { tabs: { id: string; label: string; count?: number }[]; value: string; onChange: (id: string) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm',
            value === t.id ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded-full bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}
