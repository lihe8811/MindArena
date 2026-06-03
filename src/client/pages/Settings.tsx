import React, { useEffect, useState } from 'react';
import { Bell, LayoutPanelLeft, MoonStar, ShieldCheck, UserCircle2 } from 'lucide-react';
import type { UserSettings } from '@/shared/types';

interface SettingsProps {
  settings: UserSettings | null;
  isSubmitting?: boolean;
  onSave: (settings: UserSettings) => Promise<void>;
}

export function Settings({ settings, isSubmitting, onSave }: SettingsProps) {
  const [form, setForm] = useState<UserSettings | null>(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  if (!form) {
    return (
      <div className="rounded-3xl border border-outline-variant bg-surface-container p-10 text-center">
        <h2 className="text-2xl font-bold text-on-surface">Settings unavailable</h2>
        <p className="mt-3 text-secondary">Sign in to configure your profile, defaults, and interface preferences.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-on-surface">Settings</h2>
        <p className="mt-2 text-secondary">Manage your profile, debate defaults, notifications, and workspace behavior.</p>
      </header>

      <form
        className="space-y-6"
        onSubmit={async (event) => {
          event.preventDefault();
          await onSave(form);
        }}
      >
        <section className="rounded-3xl border border-outline-variant bg-surface-container p-6">
          <div className="flex items-center gap-3">
            <UserCircle2 className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-on-surface">Profile</h3>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-secondary">Display Name</span>
              <input
                value={form.displayName}
                onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-on-surface outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-secondary">Title</span>
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-on-surface outline-none focus:border-primary"
              />
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-outline-variant bg-surface-container p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-on-surface">Debate Defaults</h3>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold text-secondary mb-3">Default Stance</p>
              <div className="grid grid-cols-2 gap-3">
                {(['Proponent', 'Opponent'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setForm({ ...form, defaultStance: option })}
                    className={`rounded-2xl border px-4 py-4 text-sm font-bold ${
                      form.defaultStance === option
                        ? 'border-primary bg-primary/10 text-on-surface'
                        : 'border-outline-variant bg-surface-container-low text-secondary'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-secondary mb-3">Default Rigor</p>
              <input
                type="range"
                min="1"
                max="5"
                value={form.defaultRigor}
                onChange={(event) => setForm({ ...form, defaultRigor: Number(event.target.value) })}
                className="w-full accent-primary"
              />
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-secondary">Level {form.defaultRigor}</span>
                <span className="font-bold text-primary">
                  {['Warmup', 'Casual', 'Focused', 'Competitive', 'Tournament'][form.defaultRigor - 1]}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="rounded-3xl border border-outline-variant bg-surface-container p-6">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold text-on-surface">Notifications</h3>
            </div>
            <div className="mt-6 space-y-4">
              <ToggleRow
                label="Email Notifications"
                description="Receive updates for future debate reminders and platform notices."
                checked={form.emailNotifications}
                onChange={(checked) => setForm({ ...form, emailNotifications: checked })}
              />
              <ToggleRow
                label="Remember Session"
                description="Keep the current device signed in for longer sessions."
                checked={form.rememberSession}
                onChange={(checked) => setForm({ ...form, rememberSession: checked })}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-outline-variant bg-surface-container p-6">
            <div className="flex items-center gap-3">
              <LayoutPanelLeft className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold text-on-surface">Workspace</h3>
            </div>
            <div className="mt-6 space-y-4">
              <ToggleRow
                label="Compact Sidebar"
                description="Keep navigation visually lighter when moving between pages."
                checked={form.compactSidebar}
                onChange={(checked) => setForm({ ...form, compactSidebar: checked })}
              />
              <ToggleRow
                label="Auto Open Arena"
                description="Go directly to the live arena after creating a debate."
                checked={form.autoOpenArena}
                onChange={(checked) => setForm({ ...form, autoOpenArena: checked })}
              />
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-outline-variant bg-surface-container p-6">
          <div className="flex items-center gap-3">
            <MoonStar className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-on-surface">Appearance</h3>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            {(['system', 'light', 'dark'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => setForm({ ...form, theme })}
                className={`rounded-2xl border px-4 py-4 text-sm font-bold capitalize ${
                  form.theme === theme
                    ? 'border-primary bg-primary/10 text-on-surface'
                    : 'border-outline-variant bg-surface-container-low text-secondary'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-black text-on-primary disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-surface-container-low p-4">
      <div>
        <p className="text-sm font-bold text-on-surface">{label}</p>
        <p className="mt-1 text-sm text-secondary">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-outline-variant'}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );
}
