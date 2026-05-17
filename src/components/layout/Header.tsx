'use client';

import { Code2, Shield, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  
  // Build breadcrumb segments from pathname
  const segments = pathname.split('/').filter(Boolean);

  return (
    <header className="sticky top-0 z-30 h-[60px] flex items-center shrink-0 px-6 gap-6"
      style={{
        background: 'rgba(7,8,13,0.85)',
        backdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Breadcrumb */}
      <div className="flex-1 flex items-center gap-2 text-sm font-mono min-w-0">
        <Link href="/" className="text-slate-500 hover:text-white transition-colors shrink-0">
          ~ 
        </Link>
        {segments.map((seg, i) => (
          <span key={i} className="flex items-center gap-2 min-w-0">
            <span className="text-slate-700">/</span>
            <span className={`truncate ${i === segments.length - 1 ? 'text-white' : 'text-slate-500'}`}>
              {seg.replace(/-/g, ' ').replace(/_/g, ' ')}
            </span>
          </span>
        ))}
        {isHome && <span className="text-slate-400">audit portal</span>}
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Status pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 shadow-[0_0_12px_rgba(34,197,94,0.1)]">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">Audit Complete</span>
        </div>

        <div className="w-px h-5 bg-white/10" />

        <Link 
          href="https://github.com/laurenmxv/Fhenix-Learn" 
          target="_blank" 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/[0.07] text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/15 transition-all text-sm"
        >
          <Code2 className="w-4 h-4" />
          <span className="hidden sm:block text-xs font-medium">Source</span>
          <ExternalLink className="w-3 h-3 opacity-50" />
        </Link>

        <Link 
          href="#" 
          className="flex items-center gap-2 h-8 px-4 rounded-xl bg-brand-cyan text-black text-xs font-bold hover:bg-white hover:shadow-[0_0_25px_rgba(10,217,220,0.4)] transition-all shadow-[0_0_15px_rgba(10,217,220,0.2)]"
        >
          <Shield className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Remediate</span>
        </Link>
      </div>
    </header>
  );
}
