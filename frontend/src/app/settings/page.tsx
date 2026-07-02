'use client';
import { Sidebar } from '@/components/Sidebar';

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your account and monitoring preferences</p>
        </div>

        <div className="card space-y-4">
          <p className="text-sm font-medium text-gray-200">Business Profile</p>
          {[
            { label: 'Business Name', value: 'Demo Business' },
            { label: 'Industry', value: 'E-commerce' },
            { label: 'AI Tool', value: 'Custom GPT-powered support widget' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2 border-b border-surface-border last:border-0">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-xs text-gray-300">{value}</span>
            </div>
          ))}
        </div>

        <div className="card space-y-4">
          <p className="text-sm font-medium text-gray-200">Monitoring Thresholds</p>
          {[
            { label: 'Alert on quality drop below', value: '70/100' },
            { label: 'Critical alert threshold', value: '60/100' },
            { label: 'Baseline recalculation', value: 'Weekly' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2 border-b border-surface-border last:border-0">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-xs text-teal">{value}</span>
            </div>
          ))}
        </div>

        <div className="card space-y-4">
          <p className="text-sm font-medium text-gray-200">Subscription</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Starter Plan</p>
              <p className="text-xs text-gray-500 mt-0.5">1,000 conversations/month · 1 AI tool</p>
            </div>
            <button className="btn-primary text-xs">Upgrade</button>
          </div>
        </div>
      </main>
    </div>
  );
}
