'use client';
import Link from 'next/link';
import { Download, Lock } from 'lucide-react';
import { exportCSV, exportExcel } from '@/lib/export';
import { isPremiumTier } from '@/lib/utils';
import { SubscriptionTier } from '@/types';

export function ExportButtons<T extends object>({
  tier, filenameBase, sheetName, rows,
}: {
  tier: SubscriptionTier;
  filenameBase: string;
  sheetName: string;
  rows: T[];
}) {
  if (!isPremiumTier(tier)) {
    return (
      <Link
        href="/settings"
        className="btn-ghost text-xs border border-surface-border flex items-center gap-1.5 shrink-0"
        title="Upgrade to export data"
      >
        <Lock size={12} /> Export (Premium)
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={() => exportCSV(`${filenameBase}.csv`, rows)}
        disabled={rows.length === 0}
        className="btn-ghost text-xs border border-surface-border flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download size={12} /> CSV
      </button>
      <button
        type="button"
        onClick={() => exportExcel(`${filenameBase}.xlsx`, sheetName, rows)}
        disabled={rows.length === 0}
        className="btn-ghost text-xs border border-surface-border flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download size={12} /> Excel
      </button>
    </div>
  );
}
