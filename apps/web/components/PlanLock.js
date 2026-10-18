'use client';
import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import { PLAN_FEATURES } from '@otrelink/core';
import { cx } from './ui';

/** Plan that unlocks a feature: "Business" for Business-only ones, else "Pro". */
export const planFor = (feature) => (PLAN_FEATURES[feature]?.business ? 'Business' : 'Pro');

/** Small "Pro" (or "Business") chip with a lock, shown on locked items. */
export function ProChip({ className, feature }) {
  return (
    <span className={cx('inline-flex items-center gap-1 h-5 px-2 rounded-full bg-ink text-white text-[10px] font-bold uppercase tracking-wide', className)}>
      <Lock size={10} strokeWidth={2.5} /> {planFor(feature)}
    </span>
  );
}

/** Full panel shown instead of a locked section (Agenda, Reviews, Responses…). */
export function LockedSection({ feature, plan }) {
  const label = PLAN_FEATURES[feature]?.label || 'This feature';
  const business = planFor(feature) === 'Business';
  return (
    <div className="rounded-3xl border border-line bg-panel p-8 sm:p-10 text-center">
      <span className="mx-auto mb-4 grid place-items-center size-12 rounded-2xl bg-accent-soft text-accent-ink"><Lock size={22} /></span>
      <h2 className="font-display text-2xl font-extrabold tracking-tight">{label} {business ? 'is part of the Business plan' : 'is a Pro feature'}</h2>
      <p className="text-muted mt-2 max-w-md mx-auto">
        You are on the <b>{plan?.label || 'Free'}</b> plan. {business
          ? <>Contact us about Business to use {label.toLowerCase()}, with limits made for your team.</>
          : <>Upgrade to use {label.toLowerCase()} and every other feature, with up to 10 pages.</>}
      </p>
      <Link href="/dashboard/plan" className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-accent text-white font-semibold hover:bg-accent-ink">
        <Sparkles size={16} /> See plans
      </Link>
    </div>
  );
}

/** One-line upgrade notice. */
export function UpgradeNote({ children, className }) {
  return (
    <div className={cx('flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-sm', className)} role="status">
      <span className="inline-flex items-center gap-2"><Lock size={15} /> {children}</span>
      <Link href="/dashboard/plan" className="font-semibold underline">See plans</Link>
    </div>
  );
}
