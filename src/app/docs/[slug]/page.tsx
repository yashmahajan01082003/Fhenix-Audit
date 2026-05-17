import { getDocBySlug, getAllDocs } from '@/lib/docs';
import ModifiedMarkdown from '@/components/mdx/ModifiedMarkdown';
import PageTransition from '@/components/layout/PageTransition';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, FileText, Tag } from 'lucide-react';

export async function generateStaticParams() {
  const docs = getAllDocs();
  return docs.map((doc) => ({ slug: doc.slug }));
}

const TYPE_CONFIG: Record<string, { label: string; color: string; border: string; bg: string }> = {
  executive:  { label: 'Executive Summary', color: 'text-brand-cyan',   border: 'border-brand-cyan/30',   bg: 'bg-brand-cyan/10' },
  'deep-dive':{ label: 'Deep Dive',         color: 'text-blue-400',     border: 'border-blue-400/30',     bg: 'bg-blue-400/10' },
  security:   { label: 'Security Audit',    color: 'text-red-400',      border: 'border-red-400/30',      bg: 'bg-red-400/10' },
  'ui-ux':    { label: 'UI / UX Review',    color: 'text-brand-purple', border: 'border-brand-purple/30', bg: 'bg-brand-purple/10' },
  other:      { label: 'Report',            color: 'text-slate-400',    border: 'border-slate-400/30',    bg: 'bg-slate-400/10' },
};

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  const tc = TYPE_CONFIG[doc.type] || TYPE_CONFIG.other;

  return (
    <PageTransition>
      {/* Ambient glow */}
      <div className="fixed top-0 right-0 w-[600px] h-[400px] bg-brand-cyan/5 blur-[120px] rounded-full pointer-events-none -z-0 opacity-60" />

      <article className="relative z-10 max-w-4xl mx-auto py-10 px-4 sm:px-0 pb-32">

        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          All Reports
        </Link>

        {/* Doc header */}
        <div className="mb-12 p-8 rounded-3xl relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Colored accent blob */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20"
            style={{ background: doc.type === 'security' ? '#ef4444' : doc.type === 'executive' ? '#0AD9DC' : '#8B5CF6' }}
          />

          {/* Type badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest mb-6 ${tc.bg} ${tc.border} ${tc.color}`}>
            <Tag className="w-3 h-3" />
            {tc.label}
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold font-heading text-white tracking-tight leading-tight mb-6 relative z-10">
            {doc.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 relative z-10">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              May 17, 2026
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {Math.ceil(doc.content.length / 3000)} min read
            </span>
            <span className="font-mono text-slate-600">{doc.slug}</span>
          </div>
        </div>

        {/* Content */}
        <ModifiedMarkdown content={doc.content} />

        {/* Footer nav */}
        <div className="mt-24 pt-8 flex justify-between items-center text-sm pb-10"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Portal
          </Link>
          <span className="text-slate-700 font-mono text-xs">{doc.type} · fhenix audit</span>
        </div>
      </article>
    </PageTransition>
  );
}
