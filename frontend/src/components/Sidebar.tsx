'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, AlertTriangle, Lightbulb,
  FileBarChart, Plug, Settings, LogOut,
  Menu, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { useAuth } from '@/lib/auth-context';
import { fetchBusiness } from '@/lib/api';
import { BusinessProfile, SubscriptionTier } from '@/types';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/drift-events', label: 'Drift Events', icon: AlertTriangle },
  { href: '/recommendations', label: 'Recommendations', icon: Lightbulb },
  { href: '/report', label: 'Report', icon: FileBarChart },
];

const secondary = [
  { href: '/connect', label: 'Connect AI Tool', icon: Plug },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const PLAN_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free Plan',
  individual: 'Individual Plan',
  enterprise_team: 'Enterprise — Team',
  enterprise_business: 'Enterprise — Business',
};

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchBusiness().then(setBusiness).catch(() => {});
  }, [user]);

  // Close sidebar on path change
  useEffect(() => {
    setIsOpen(false);
  }, [path]);

  const displayName = business?.name || user?.email || 'Your Business';
  const planLabel = business ? PLAN_LABELS[business.subscriptionTier] : '—';

  async function handleSignOut() {
    await signOut();
    router.push('/signin');
  }

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-navy-900 border-b border-surface-border flex items-center justify-between px-4 z-30">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size={24} />
          <span className="font-bold text-md text-white tracking-tight">Tryda</span>
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-navy-800 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 lg:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar aside element */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-56 bg-navy-800 border-r border-surface-border flex flex-col z-40 transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo and close button */}
        <div className="px-4 py-4 border-b border-surface-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={30} />
            <div>
              <span className="font-bold text-lg text-white tracking-tight leading-none">Tryda</span>
              <p className="text-[10px] text-teal/80 tracking-wide mt-0.5">AI Reliability Monitor</p>
            </div>
          </Link>
          {/* Close button inside sidebar drawer on mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-white hover:bg-navy-700"
          >
            <X size={18} />
          </button>
        </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="section-label px-3">Monitor</p>
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn('nav-link', path === href && 'active')}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}

        <div className="pt-4">
          <p className="section-label px-3">Setup</p>
          {secondary.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn('nav-link', path === href && 'active')}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-surface-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-teal/20 flex items-center justify-center shrink-0">
            <span className="text-teal text-xs font-bold">{displayName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-300 font-medium truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{planLabel}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-100 hover:bg-surface-hover transition-colors duration-150"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
