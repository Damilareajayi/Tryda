'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, AlertTriangle, Lightbulb,
  FileBarChart, Plug, Settings,
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
  const { user } = useAuth();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchBusiness().then(setBusiness).catch(() => {});
  }, [user]);

  const displayName = business?.name || user?.email || 'Your Business';
  const planLabel = business ? PLAN_LABELS[business.subscriptionTier] : '—';

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-navy-800 border-r border-surface-border flex flex-col z-20">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <Logo size={30} />
          <div>
            <span className="font-bold text-lg text-white tracking-tight leading-none">Tryda</span>
            <p className="text-[10px] text-teal/80 tracking-wide mt-0.5">AI Reliability Monitor</p>
          </div>
        </div>
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
          <div className="w-6 h-6 rounded-full bg-teal/20 flex items-center justify-center">
            <span className="text-teal text-xs font-bold">{displayName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-300 font-medium truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{planLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
