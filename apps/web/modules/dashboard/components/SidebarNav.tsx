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

/**
 * Represents a single navigation link in the sidebar.
 */
type NavItem = Readonly<{
  /** The destination URL. */
  href: string;
  /** The display text for the link. */
  label: string;
  /** The Lucide icon component to display. */
  icon: LucideIcon;
  /** Whether the link is currently disabled. */
  disabled?: boolean;
}>;

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
  { href: '/dashboard/transactions/import', label: 'Imports', icon: Download },
  { href: '/dashboard/rules', label: 'Rules & Automation', icon: Zap, disabled: true },
];

const UTILITY: NavItem[] = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/help', label: 'Help', icon: HelpCircle, disabled: true },
];

/**
 * Renders an individual navigation link with active state detection.
 * 
 * @param props - Navigation item properties.
 * @returns A JSX element for the navigation item.
 */
function NavItem({ href, label, icon: Icon, disabled }: NavItem) {
  /*
   * PSEUDOCODE:
   * 1. Get the current pathname from the router.
   * 2. Determine if the current item is "active" based on URL matching.
   * 3. Handle 'Overview' specifically as the root dashboard path.
   * 4. If disabled, render a non-interactive, dimmed state.
   * 5. Otherwise, render a Link with appropriate active/hover styles.
   */
  const pathname = usePathname();
  // SPECIAL CASE: The Overview link matches exactly, others match by prefix.
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

/**
 * The main sidebar navigation component for the StashFlow dashboard.
 * Organizes navigation into logical groups: Primary, Analytics, Intelligence, and Utility.
 * 
 * @returns A JSX element containing the navigation menu.
 */
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
