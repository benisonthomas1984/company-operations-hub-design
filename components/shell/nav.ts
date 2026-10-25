import {
  Bell,
  BookOpenCheck,
  Boxes,
  Building2,
  CheckSquare,
  FolderKanban,
  Gauge,
  Lightbulb,
  ListChecks,
  Mail,
  Megaphone,
  MessagesSquare,
  Network,
  PlugZap,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  Wallet,
  Workflow,
} from 'lucide-react'
import type { Capability } from '@/lib/store'

export type NavItem = {
  href: string
  label: string
  viewId: string
  icon: typeof Bell
  requires?: Capability
  lockedWithout?: Capability
  group: 'work' | 'company' | 'personal' | 'admin'
}

export const navItems: NavItem[] = [
  { href: '/', label: 'Intelligence Dossier', viewId: 'V01', icon: Sparkles, group: 'work' },
  { href: '/organization', label: 'Organization', viewId: 'V02', icon: Network, group: 'work' },
  { href: '/employees', label: 'Employees', viewId: 'V03', icon: Users, group: 'work' },
  { href: '/activities', label: 'Activities', viewId: 'V04', icon: ListChecks, group: 'work' },
  { href: '/projects', label: 'Projects', viewId: 'V05', icon: FolderKanban, group: 'work' },
  { href: '/approvals', label: 'My Approvals', viewId: 'V07', icon: CheckSquare, group: 'work' },
  { href: '/departments', label: 'Departments', viewId: 'V09', icon: Building2, group: 'company' },
  { href: '/proposals', label: 'Proposals', viewId: 'V10', icon: Lightbulb, group: 'company' },
  { href: '/products', label: 'Products & Services', viewId: 'V11', icon: Boxes, group: 'company' },
  { href: '/backlog', label: 'Backlog & Releases', viewId: 'V12', icon: BookOpenCheck, group: 'company' },
  { href: '/communications', label: 'Communications', viewId: 'V14', icon: MessagesSquare, group: 'company' },
  { href: '/communications/announcements', label: 'Announcements', viewId: 'V13', icon: Megaphone, group: 'company' },
  { href: '/finance', label: 'Finance', viewId: 'V16', icon: Wallet, lockedWithout: 'finance.read', group: 'company' },
  { href: '/productivity', label: 'My Productivity', viewId: 'V17', icon: Gauge, group: 'personal' },
  { href: '/mail', label: 'My Mail', viewId: 'V15', icon: Mail, group: 'personal' },
  { href: '/complaints', label: 'Complaints', viewId: 'V08', icon: ShieldAlert, group: 'personal' },
  { href: '/notifications', label: 'Notifications', viewId: 'V20', icon: Bell, group: 'personal' },
  { href: '/settings', label: 'Access & Settings', viewId: 'V18', icon: Settings, requires: 'settings.manage', group: 'admin' },
  { href: '/settings/workflows', label: 'Workflows & Committees', viewId: 'V06', icon: Workflow, requires: 'settings.manage', group: 'admin' },
  { href: '/settings/integrations', label: 'Subscription & Integrations', viewId: 'V19', icon: PlugZap, requires: 'settings.manage', group: 'admin' },
]

export const groupLabels: Record<NavItem['group'], string> = {
  work: 'Work',
  company: 'Company',
  personal: 'Personal',
  admin: 'Administration',
}
