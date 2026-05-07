'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Target,
  Sparkles,
  Download,
  Zap,
  LineChart,
  Calculator,
  Wallet,
  Settings,
  HelpCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

const PRIMARY: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/dashboard/assets', label: 'Assets', icon: Wallet },
  { href: '/dashboard/loans', label: 'Loans', icon: CreditCard },
  { href: '/dashboard/plans', label: 'Plans', icon: Target },
];

const ANALYTICS: NavItem[] = [
  { href: '/dashboard/analytics/cash-flow', label: 'Cash Flow', icon: LineChart },
  { href: '/dashboard/analytics/dti-simulator', label: 'DTI Simulator', icon: Calculator },
];

const SECONDARY: NavItem[] = [
  { href: '/dashboard/intelligence', label: 'Intelligence History', icon: Sparkles, disabled: true },
  { href: '/dashboard/imports', label: 'Imports', icon: Download, disabled: true },
  { href: '/dashboard/rules', label: 'Rules & Automation', icon: Zap, disabled: true },
];

const UTILITY: NavItem[] = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/help', label: 'Help', icon: HelpCircle, disabled: true },
];

function NavItem({ href, label, icon: Icon, disabled }: NavItem) {
  const pathname = usePathname();
  const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  if (disabled) {
    return (
      <div className="flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-medium text-gray-300 cursor-not-allowed select-none">
        <Icon size={18} className="flex-shrink-0" />
        <span>{label}</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-medium transition-colors ${
        isActive
          ? 'bg-gray-900 text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon size={18} className="flex-shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export function SidebarNav() {
  return (
    <nav className="flex-1 overflow-y-auto p-3 space-y-6 pt-5">
      <div className="space-y-0.5">
        {PRIMARY.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      <div className="space-y-0.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">
          Analytics
        </p>
        {ANALYTICS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      <div className="space-y-0.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">
          Intelligence
        </p>
        {SECONDARY.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      <div className="space-y-0.5">
        {UTILITY.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>
    </nav>
  );
}
