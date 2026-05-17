'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  FileText, ShieldAlert, Cpu, Sparkles, LayoutTemplate,
  ChevronDown, Shield, Search, X
} from 'lucide-react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import { DocMetadata } from '@/lib/docs';
import { useState, useMemo } from 'react';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } }
};

const itemAnim: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } }
};

const collapseAnim: Variants = {
  hidden: { opacity: 0, height: 0, overflow: 'hidden' },
  show: { opacity: 1, height: 'auto', overflow: 'hidden', transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }
};

type GroupKey = 'executive' | 'security' | 'uiUx' | 'deepDives' | 'other';

const GROUP_META: Record<GroupKey, { label: string; Icon: LucideIcon; color: string; glow: string }> = {
  executive: { label: 'Executive', Icon: Shield, color: 'text-brand-cyan', glow: 'bg-brand-cyan' },
  security: { label: 'Security', Icon: ShieldAlert, color: 'text-red-400', glow: 'bg-red-400' },
  uiUx: { label: 'UI / UX', Icon: LayoutTemplate, color: 'text-brand-purple', glow: 'bg-brand-purple' },
  deepDives: { label: 'Deep Dives', Icon: Cpu, color: 'text-blue-400', glow: 'bg-blue-400' },
  other: { label: 'Other Reports', Icon: FileText, color: 'text-slate-400', glow: 'bg-slate-400' },
};

export default function Sidebar({ docs }: { docs: DocMetadata[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<GroupKey>>(new Set());

  const groups = useMemo(() => ({
    executive: docs.filter(d => d.type === 'executive'),
    deepDives: docs.filter(d => d.type === 'deep-dive'),
    security: docs.filter(d => d.type === 'security'),
    uiUx: docs.filter(d => d.type === 'ui-ux'),
    other: docs.filter(d => d.type === 'other'),
  }), [docs]);

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return Object.fromEntries(
      Object.entries(groups).map(([k, items]) => [
        k, items.filter((d: DocMetadata) => d.title.toLowerCase().includes(q))
      ])
    ) as typeof groups;
  }, [groups, query]);

  const toggleCollapse = (key: GroupKey) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const GroupSection = ({ groupKey }: { groupKey: GroupKey }) => {
    const items = filteredGroups[groupKey];
    if (!items || items.length === 0) return null;
    const { label, Icon, color, glow } = GROUP_META[groupKey];
    const isCollapsed = collapsed.has(groupKey);

    return (
      <div className="mb-2">
        <button
          onClick={() => toggleCollapse(groupKey)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center ${color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">
              {label}
            </span>
            <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">
              {items.length}
            </span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`} />
        </button>

        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              key="content"
              variants={collapseAnim}
              initial="hidden"
              animate="show"
              exit="hidden"
            >
              <div className="flex flex-col gap-0.5 px-2 pb-2">
                {items.map((doc: DocMetadata) => {
                  const isActive = pathname === `/docs/${doc.slug}`;
                  return (
                    <motion.div variants={itemAnim} key={doc.slug}>
                      <Link
                        href={`/docs/${doc.slug}`}
                        className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-all duration-200 relative overflow-hidden group ${isActive
                            ? 'text-white font-medium'
                            : 'text-slate-500 hover:text-slate-100'
                          }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-pill"
                            className="absolute inset-0 bg-white/[0.07] rounded-xl border border-white/10"
                            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                          />
                        )}
                        {!isActive && (
                          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-white/[0.03] transition-opacity duration-200" />
                        )}
                        <span className={`relative z-10 w-1.5 h-1.5 rounded-full shrink-0 transition-all ${isActive ? `${glow} shadow-[0_0_8px_currentColor]` : 'bg-slate-700 group-hover:bg-slate-500'}`} />
                        <span className="relative z-10 truncate leading-snug">{doc.title}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-72 hidden lg:flex flex-col font-sans"
      style={{ background: 'linear-gradient(180deg, rgba(9,10,15,0.96) 0%, rgba(9,10,15,0.92) 100%)', backdropFilter: 'blur(40px)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <Link href="/" className="h-[60px] shrink-0 flex items-center px-6 group relative">
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="flex items-center text-[22px] font-black tracking-tight font-mono group-hover:scale-[1.02] transition-transform duration-300">
          <span className="text-slate-700 mr-2.5">(</span>
          <span className="text-white tracking-widest">fhenix</span>
          <span className="text-brand-cyan translate-y-[2px] ml-0.5">*</span>
          <span className="text-slate-700 ml-2.5">)</span>
        </div>
      </Link>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            type="text"
            placeholder="Search reports..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-sm bg-white/[0.04] border border-white/[0.07] rounded-xl text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-brand-cyan/40 focus:bg-white/[0.06] transition-all font-sans"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-slate-500 hover:text-white transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* Nav Items */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-thin"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
      >
        {(Object.keys(GROUP_META) as GroupKey[]).map(key => (
          <GroupSection key={key} groupKey={key} />
        ))}
      </motion.div>

      {/* Footer */}
      <div className="px-4 py-3 shrink-0 relative">
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">System Online</span>
          </div>
          <span className="text-[10px] font-mono text-slate-700">{docs.length} reports</span>
        </div>
      </div>
    </aside>
  );
}
