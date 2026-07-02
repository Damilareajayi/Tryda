'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, AlertTriangle, Lightbulb,
  FileBarChart, Plug, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-navy-800 border-r border-surface-border flex flex-col z-20">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          {/* Gem mark inline SVG */}
          <svg width="32" height="38" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <defs>
              <linearGradient id="sTop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ECDC4"/>
                <stop offset="100%" stopColor="#1A7A8A"/>
              </linearGradient>
              <linearGradient id="sBody" x1="0" y1="0" x2="0.3" y2="1">
                <stop offset="0%" stopColor="#2AAFBD"/>
                <stop offset="100%" stopColor="#0F4F6A"/>
              </linearGradient>
            </defs>
            <polygon points="100,28 140,58 60,58" fill="url(#sTop)"/>
            <polygon points="60,58 100,28 80,58" fill="#1A7A8A" opacity="0.85"/>
            <polygon points="100,28 140,58 120,58" fill="#4ECDC4" opacity="0.75"/>
            <polygon points="55,65 145,65 100,162" fill="url(#sBody)"/>
            <polygon points="55,65 100,162 78,65" fill="#145374" opacity="0.85"/>
            <polygon points="145,65 100,162 122,65" fill="#3DBDBD" opacity="0.6"/>
            <rect x="76" y="35" width="48" height="7" rx="2" fill="white" opacity="0.95"/>
            <rect x="84" y="35" width="9" height="23" rx="1.5" fill="white" opacity="0.95"/>
            <rect x="107" y="35" width="9" height="23" rx="1.5" fill="white" opacity="0.95"/>
          </svg>
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
            <span className="text-teal text-xs font-bold">D</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-300 font-medium truncate">Demo Business</p>
            <p className="text-xs text-gray-500 truncate">Starter Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
