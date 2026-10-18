'use client';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { blockTypes, icon, allowsBlock, featureForBlock } from '@otrelink/core';
import { Modal, Input, CoreIcon } from '../ui';
import { ProChip } from '../PlanLock';

export default function AddBlockModal({ open, onClose, onAdd, title, plan }) {
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const map = new Map();
    for (const mod of blockTypes.list()) {
      if (term && !`${mod.label} ${mod.description}`.toLowerCase().includes(term)) continue;
      const cat = mod.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(mod);
    }
    return [...map.entries()];
  }, [q]);

  return (
    <Modal open={open} onClose={onClose} title={title || 'Add a block'} wide>
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search blocks" className="pl-9" autoFocus />
      </div>
      {groups.length === 0 && <p className="text-sm text-muted py-6 text-center">No block matches “{q}”.</p>}
      <div className="space-y-6">
        {groups.map(([cat, mods]) => (
          <div key={cat}>
            <h3 className="text-sm font-semibold text-muted mb-2">{cat}</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {mods.map((mod) => (plan && !allowsBlock(plan, mod.type) ? (
                <Link key={mod.type} href="/dashboard/plan"
                  className="flex items-start gap-3 text-left rounded-2xl border border-dashed border-line p-3 hover:border-ink/30 transition-colors">
                  <CoreIcon svg={icon(mod.icon, 20)} className="size-10 rounded-xl bg-soft text-muted shrink-0" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold text-sm text-muted">{mod.label} <ProChip feature={featureForBlock(mod.type)} /></span>
                    <span className="block text-xs text-muted mt-0.5">{mod.description}</span>
                  </span>
                </Link>
              ) : (
                <button
                  key={mod.type}
                  type="button"
                  onClick={() => { onAdd(mod.type); setQ(''); }}
                  className="flex items-start gap-3 text-left rounded-2xl border border-line p-3 hover:border-accent hover:bg-accent-soft/50 transition-colors cursor-pointer"
                >
                  <CoreIcon svg={icon(mod.icon, 20)} className="size-10 rounded-xl bg-soft text-ink shrink-0" />
                  <span>
                    <span className="block font-semibold text-sm">{mod.label}</span>
                    <span className="block text-xs text-muted mt-0.5">{mod.description}</span>
                  </span>
                </button>
              )))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
