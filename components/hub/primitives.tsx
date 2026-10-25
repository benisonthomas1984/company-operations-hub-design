import Link from 'next/link'
import { AlertTriangle, CheckCircle2, CircleDashed, Clock, Info, Lock, MinusCircle, PauseCircle, Unplug, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deptById, empById, type Decision, type DeptId } from '@/lib/fixtures'

export function Avatar({ id, size = 'md', className }: { id: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const e = empById(id)
  const d = e ? deptById(e.dept) : null
  const initials = e ? (e.status === 'vacancy' ? '—' : e.fullName.split(' ').map((p) => p[0]).join('').slice(0, 2)) : '?'
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium text-primary-foreground',
        d?.bgClass ?? 'bg-muted-foreground',
        e?.status === 'vacancy' && 'border border-dashed border-muted-foreground bg-transparent text-muted-foreground',
        e?.status === 'inactive' && 'opacity-50',
        size === 'sm' && 'size-6 text-[10px]',
        size === 'md' && 'size-8 text-xs',
        size === 'lg' && 'size-14 text-lg',
        className,
      )}
    >
      {initials}
    </span>
  )
}

export function PersonLink({ id, showRole = false }: { id: string; showRole?: boolean }) {
  const e = empById(id)
  if (!e) return <span className="text-muted-foreground">Unknown</span>
  return (
    <Link href={`/employees/${e.id}`} className="inline-flex items-center gap-2 rounded-sm hover:underline">
      <Avatar id={id} size="sm" />
      <span className="flex flex-col leading-tight">
        <span className="text-sm text-foreground">
          {e.fullName}
          {e.status === 'inactive' && <span className="ml-1 text-xs text-muted-foreground">(inactive)</span>}
        </span>
        {showRole && <span className="text-xs text-muted-foreground">{e.designation}</span>}
      </span>
    </Link>
  )
}

export function DeptTag({ id, className }: { id: DeptId; className?: string }) {
  const d = deptById(id)
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-foreground', className)}>
      <span aria-hidden className={cn('size-2 rounded-[2px]', d.bgClass)} />
      {d.name}
    </span>
  )
}

export function IdChip({ children, href }: { children: React.ReactNode; href?: string }) {
  const cls = 'inline-flex items-center rounded-sm border border-border bg-muted px-1.5 py-px font-mono text-[11px] text-muted-foreground'
  return href ? (
    <Link href={href} className={cn(cls, 'hover:border-ring hover:text-foreground')}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  )
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

const toneCls: Record<Tone, string> = {
  neutral: 'border-border bg-card text-foreground',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
  info: 'border-info/30 bg-info/10 text-info',
  muted: 'border-border bg-muted text-muted-foreground',
}

export function statusTone(status: string): Tone {
  const s = status.toLowerCase()
  if (/(approved|accepted|settled|published|connected|on track|indexed|active$|solved|resolved|live)/.test(s)) return 'success'
  if (/(blocked|rejected|refused|denied|disconnected|unavailable|error)/.test(s)) return 'danger'
  if (/(changes|pending|stale|at risk|reopened|submitted|duplicate|unpaid|scheduled|partial|provisional|awaiting|review)/.test(s)) return 'warning'
  if (/(progress|draft|planning|beta|closing|open)/.test(s)) return 'info'
  if (/(cancelled|superseded|inactive|phase two|later|not started)/.test(s)) return 'muted'
  return 'neutral'
}

export function StatusPill({ status, tone, className }: { status: string; tone?: Tone; className?: string }) {
  const t = tone ?? statusTone(status)
  const Icon = t === 'success' ? CheckCircle2 : t === 'danger' ? XCircle : t === 'warning' ? Clock : t === 'info' ? CircleDashed : t === 'muted' ? MinusCircle : Info
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', toneCls[t], className)}>
      <Icon aria-hidden className="size-3" />
      {status}
    </span>
  )
}

export const decisionMeta: Record<Decision, { label: string; tone: Tone; Icon: typeof CheckCircle2 }> = {
  approved: { label: 'Approved', tone: 'success', Icon: CheckCircle2 },
  pending: { label: 'Pending', tone: 'warning', Icon: Clock },
  changes: { label: 'Changes requested', tone: 'warning', Icon: AlertTriangle },
  rejected: { label: 'Rejected', tone: 'danger', Icon: XCircle },
  inactive: { label: 'Inactive — needs replacement', tone: 'danger', Icon: PauseCircle },
  blocked: { label: 'Waiting on earlier stage', tone: 'muted', Icon: Lock },
}

export function ApprovalProgress({ decisions, compact = false }: { decisions: { personId: string; decision: Decision }[]; compact?: boolean }) {
  const approved = decisions.filter((d) => d.decision === 'approved').length
  const total = decisions.length
  return (
    <div className="flex items-center gap-2" aria-label={`${approved} of ${total} required approvals`}>
      <div className="flex gap-0.5" aria-hidden>
        {decisions.map((d) => (
          <span
            key={d.personId}
            className={cn(
              'h-2 w-4 rounded-[2px]',
              d.decision === 'approved' && 'bg-success',
              d.decision === 'pending' && 'bg-warning/40 ring-1 ring-warning',
              d.decision === 'changes' && 'bg-warning',
              d.decision === 'rejected' && 'bg-destructive',
              d.decision === 'inactive' && 'bg-destructive/40 ring-1 ring-destructive',
              d.decision === 'blocked' && 'bg-muted ring-1 ring-border',
            )}
          />
        ))}
      </div>
      <span className="font-mono text-xs text-foreground">
        {approved}/{total}
      </span>
      {!compact && <span className="text-xs text-muted-foreground">ALL required</span>}
    </div>
  )
}

export function Callout({
  tone = 'info',
  title,
  children,
  icon,
  className,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success' | 'muted'
  title: string
  children?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  const Icon = tone === 'danger' ? Lock : tone === 'warning' ? AlertTriangle : tone === 'success' ? CheckCircle2 : tone === 'muted' ? Unplug : Info
  return (
    <div role={tone === 'danger' ? 'alert' : 'note'} className={cn('flex gap-3 rounded-md border p-3 text-sm', toneCls[tone], className)}>
      <span className="mt-0.5 shrink-0">{icon ?? <Icon aria-hidden className="size-4" />}</span>
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">{title}</p>
        {children && <div className="leading-relaxed text-foreground/80">{children}</div>}
      </div>
    </div>
  )
}

export function Panel({ title, action, children, className, description }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; description?: string }) {
  return (
    <section className={cn('flex flex-col rounded-lg border border-border bg-card', className)}>
      {title && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  )
}

export function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  )
}

export function SourceChip({ label, freshness, state = 'ok' }: { label: string; freshness?: string; state?: 'ok' | 'stale' | 'down' | 'sim' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[11px]',
        state === 'ok' && 'border-border bg-card text-muted-foreground',
        state === 'stale' && 'border-warning/40 bg-warning/10 text-warning',
        state === 'down' && 'border-destructive/30 bg-destructive/10 text-destructive',
        state === 'sim' && 'border-dashed border-muted-foreground/50 text-muted-foreground',
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', state === 'ok' ? 'bg-success' : state === 'stale' ? 'bg-warning' : state === 'down' ? 'bg-destructive' : 'bg-muted-foreground')} />
      <span className="font-medium">{label}</span>
      {freshness && <span>· {freshness}</span>}
    </span>
  )
}

export function SimLabel({ children = 'Simulated in prototype' }: { children?: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-sm border border-dashed border-muted-foreground/50 px-1.5 py-px text-[10px] uppercase tracking-wide text-muted-foreground">{children}</span>
}
