import {
  Bell,
  BookOpenCheck,
  Boxes,
  Building2,
  CheckSquare,
  CreditCard,
  FolderKanban,
  Lightbulb,
  ListChecks,
  Mail,
  Megaphone,
  Network,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  Wallet,
  Workflow,
} from 'lucide-react'
import type { Cap } from '@/lib/store'

export type NavItem = {
  href: string
  label: string
  icon: typeof Bell
  requires?: Cap
  group: 'work' | 'company' | 'personal' | 'admin'
}

export const navItems: NavItem[] = [
  { href: '/dossier', label: 'Intelligence Dossier', icon: Sparkles, group: 'work' },
  { href: '/organization', label: 'Organization', icon: Network, group: 'work' },
  { href: '/employees', label: 'Employees', icon: Users, group: 'work' },
  { href: '/activities', label: 'Activities', icon: ListChecks, group: 'work' },
  { href: '/projects', label: 'Projects', icon: FolderKanban, group: 'work' },
  { href: '/approvals', label: 'My Approvals', icon: CheckSquare, group: 'work' },
  { href: '/departments', label: 'Departments', icon: Building2, group: 'company' },
  { href: '/proposals', label: 'Proposals', icon: Lightbulb, group: 'company' },
  { href: '/products', label: 'Products & Services', icon: Boxes, group: 'company' },
  { href: '/backlog', label: 'Backlog & Releases', icon: BookOpenCheck, group: 'company' },
  { href: '/communications/announcements', label: 'Announcements', icon: Megaphone, group: 'company' },
  { href: '/finance', label: 'Finance', icon: Wallet, requires: 'finance.read', group: 'company' },
  { href: '/mail', label: 'My Mail', icon: Mail, group: 'personal' },
  { href: '/complaints', label: 'Complaints', icon: ShieldAlert, group: 'personal' },
  { href: '/notifications', label: 'Notifications', icon: Bell, group: 'personal' },
  { href: '/settings', label: 'Access & Roles', icon: Settings, requires: 'settings', group: 'admin' },
  { href: '/settings/workflows', label: 'Workflows & Committees', icon: Workflow, requires: 'settings', group: 'admin' },
  { href: '/settings/subscription', label: 'Subscription & Credits', icon: CreditCard, requires: 'settings', group: 'admin' },
]

export const groupLabels: Record<NavItem['group'], string> = {
  work: 'Work',
  company: 'Company',
  personal: 'Personal',
  admin: 'Administration',
}
