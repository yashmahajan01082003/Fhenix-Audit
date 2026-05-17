'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight, ShieldAlert, Cpu, Layers, Activity, FileText,
  LayoutTemplate, Shield, ChevronRight, AlertTriangle,
  CheckCircle2, Info
} from 'lucide-react';
import { DocMetadata } from '@/lib/docs';
import PageTransition from '@/components/layout/PageTransition';
import HoverCard from '@/components/ui/HoverCard';
import { motion } from 'framer-motion';

/* ── Config ─────────────────────────────── */
const TYPE_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string; border: string; bg: string; glow: string }> = {
  executive: { label: 'Executive', icon: Shield, color: 'text-brand-cyan', border: 'border-brand-cyan/20', bg: 'bg-brand-cyan/10', glow: 'shadow-[0_0_20px_rgba(10,217,220,0.08)]' },
  'deep-dive': { label: 'Deep Dive', icon: Cpu, color: 'text-blue-400', border: 'border-blue-400/20', bg: 'bg-blue-400/10', glow: 'shadow-[0_0_20px_rgba(96,165,250,0.08)]' },
  security: { label: 'Security', icon: ShieldAlert, color: 'text-red-400', border: 'border-red-400/20', bg: 'bg-red-400/10', glow: 'shadow-[0_0_20px_rgba(248,113,113,0.08)]' },
  'ui-ux': { label: 'UI / UX', icon: LayoutTemplate, color: 'text-brand-purple', border: 'border-brand-purple/20', bg: 'bg-brand-purple/10', glow: 'shadow-[0_0_20px_rgba(139,92,246,0.08)]' },
  other: { label: 'Report', icon: FileText, color: 'text-slate-400', border: 'border-slate-400/20', bg: 'bg-slate-800/40', glow: '' },
};

const STATS = [
  { value: '7', label: 'Critical', sub: 'Issues', icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.15)]' },
  { value: '14', label: 'High', sub: 'Issues', icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', glow: '' },
  { value: '18', label: 'Medium', sub: 'Issues', icon: Info, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', glow: '' },
  { value: '39', label: 'Total', sub: 'Findings', icon: Layers, color: 'text-brand-cyan', bg: 'bg-brand-cyan/10', border: 'border-brand-cyan/20', glow: 'shadow-[0_0_30px_rgba(10,217,220,0.12)]' },
  { value: '35', label: 'Readiness', sub: '/ 100', icon: Activity, color: 'text-brand-purple', bg: 'bg-brand-purple/10', border: 'border-brand-purple/20', glow: '' },
  { value: '5', label: 'Modules', sub: 'Audited', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', glow: '' },
];

/* ── Helper: staggered fade-up ──────────── */
function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: 'easeOut' as const },
  };
}

/* ── Component ──────────────────────────── */
export default function DashboardClient({ docs }: { docs: DocMetadata[] }) {
  const summary = docs.find(d => d.type === 'executive');

  return (
    <PageTransition>
      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-15%] left-[35%] w-[900px] h-[900px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(10,217,220,0.055) 0%, transparent 65%)' }} />
        <div className="absolute top-[40%] left-[-10%] w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.045) 0%, transparent 65%)' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto pb-32">

        {/* ── HERO ──────────────────────────── */}
        <section className="pt-16 pb-20 flex flex-col items-center text-center">

          <motion.div {...fadeUp(0.05)}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.05] border border-white/10 text-xs font-bold uppercase tracking-widest text-brand-cyan mb-10 backdrop-blur"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-cyan" />
            </span>
            Fhenix Learn · May 2026 Audit
          </motion.div>

          <motion.h1 {...fadeUp(0.12)}
            className="text-6xl md:text-8xl font-extrabold font-heading tracking-tighter leading-[1.05] text-white max-w-5xl"
          >
            Security&nbsp;&amp;<br />
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #0AD9DC 0%, #a5f3ff 45%, #3B82F6 100%)' }}>
              Quality Audit
            </span>
          </motion.h1>

          <motion.p {...fadeUp(0.2)}
            className="mt-6 text-lg text-slate-400 max-w-2xl font-light leading-8"
          >
            Enterprise-grade audit documentation for the Fhenix Learn FHE education platform —
            covering smart contract security, blockchain integration, UX, and data integrity.
          </motion.p>

          <motion.div {...fadeUp(0.28)} className="mt-10 flex items-center gap-4 flex-wrap justify-center">
            {summary && (
              <Link href={`/docs/${summary.slug}`}
                className="group flex items-center h-12 px-7 rounded-2xl font-bold text-black text-sm transition-all duration-300
                  shadow-[0_0_40px_rgba(10,217,220,0.3)] hover:shadow-[0_0_60px_rgba(10,217,220,0.55)]"
                style={{ background: 'linear-gradient(135deg,#0AD9DC,#3B82F6)' }}
              >
                Executive Summary
                <ArrowRight className="ml-2.5 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
            <Link href="#reports"
              className="flex items-center h-12 px-7 rounded-2xl font-semibold text-sm text-white
                bg-white/[0.05] border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Browse All Reports
            </Link>
          </motion.div>
        </section>

        {/* ── SEVERITY BAR ──────────────────── */}
        <motion.section {...fadeUp(0.35)}
          className="mb-16 p-6 rounded-3xl bg-white/[0.025] border border-white/[0.07] backdrop-blur"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Severity Distribution</span>
            <span className="text-xs font-mono text-slate-600">39 total findings</span>
          </div>
          <div className="flex rounded-xl overflow-hidden h-3 gap-px">
            {[
              { w: 'flex-[7]', bg: 'bg-red-500', label: 'Critical: 7' },
              { w: 'flex-[14]', bg: 'bg-orange-500', label: 'High: 14' },
              { w: 'flex-[18]', bg: 'bg-yellow-500', label: 'Medium: 18' },
              { w: 'flex-[4]', bg: 'bg-slate-600', label: 'Low: 4' },
            ].map(s => (
              <div key={s.label} className={`${s.w} ${s.bg}`} title={s.label} />
            ))}
          </div>
          <div className="flex items-center gap-6 mt-4 flex-wrap">
            {[['Critical', 'bg-red-500', '7'], ['High', 'bg-orange-500', '14'], ['Medium', 'bg-yellow-500', '18'], ['Low', 'bg-slate-600', '4']].map(([l, c, n]) => (
              <div key={l} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${c}`} />
                <span className="text-xs text-slate-400">{l}: <strong className="text-white font-mono">{n}</strong></span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── STATS ─────────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-20">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} {...fadeUp(0.38 + i * 0.06)}>
                <HoverCard className={`p-5 flex flex-col gap-4 h-full border ${s.border} ${s.glow}`}>
                  <div className={`w-9 h-9 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <div className={`text-3xl font-heading font-black tracking-tighter ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5 leading-tight">{s.label}</div>
                    <div className="text-[10px] text-slate-700 font-mono">{s.sub}</div>
                  </div>
                </HoverCard>
              </motion.div>
            );
          })}
        </section>

        {/* ── ALL REPORTS ───────────────────── */}
        <section id="reports" className="space-y-8">
          <motion.div {...fadeUp(0.7)}
            className="flex items-center gap-4 pb-5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h2 className="text-3xl font-heading font-bold text-white tracking-tight">All Audit Reports</h2>
            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-slate-400">
              {docs.length} documents
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc, idx) => {
              const tc = TYPE_CONFIG[doc.type] || TYPE_CONFIG.other;
              const Icon = tc.icon;
              return (
                <motion.div key={doc.slug} {...fadeUp(0.74 + idx * 0.04)}>
                  <Link href={`/docs/${doc.slug}`}>
                    <HoverCard className={`group h-full flex flex-col gap-5 p-6 border ${tc.border} ${tc.glow} transition-all duration-300`}>
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${tc.bg} border ${tc.border} ${tc.color}`}>
                          <Icon className="w-3 h-3" />
                          {tc.label}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-brand-cyan group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <h3 className="font-heading font-semibold text-base text-white group-hover:text-brand-cyan transition-colors leading-snug line-clamp-2 flex-1">
                        {doc.title}
                      </h3>
                      <div className="pt-4 flex items-center gap-2 text-[11px] font-mono text-slate-700 truncate"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        {doc.slug.toLowerCase()}.md
                      </div>
                    </HoverCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

      </div>
    </PageTransition>
  );
}
