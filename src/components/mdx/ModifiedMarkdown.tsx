'use client';

import React, { useState, useRef, type ReactElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import {
  AlertCircle, CheckCircle2, Copy, Check,
  Folder, FileCode2, ArrowRight, ShieldAlert, Zap,
  AlertTriangle, XCircle, Info, BookOpen, Target, Code2
} from 'lucide-react';

/* ─────────────────────────────────────────────
   PRE-PROCESSOR
   Runs on raw markdown string BEFORE react-markdown.
   Converts Key Problems lists → a fenced ```key-problems block
   so the pre component can render them as cards safely.
───────────────────────────────────────────── */
function preprocessContent(content: string): string {
  // Match any numbered list that immediately follows a "Key Problems" or "Key Issues" heading line
  let processed = content.replace(
    /((?:#{1,4}\s+(?:Key\s+Problems?|Key\s+Issues?|Overview|Problems?)[^\n]*)\n)((?:\d+\.\s+\*\*[^\n]+\n?)+)/gim,
    (_match, heading: string, listBlock: string) => {
      const items = [...listBlock.matchAll(/\d+\.\s+\*\*(.+?):\*\*\s*(.+)/g)]
        .map(m => ({ label: m[1].trim(), text: m[2].trim() }));

      if (items.length === 0) {
        // fallback: grab any numbered item text
        const fallback = [...listBlock.matchAll(/\d+\.\s+(.+)/g)].map(m => ({
          label: '',
          text: m[1].trim().replace(/\*\*/g, '')
        }));
        if (fallback.length === 0) return heading + listBlock;
        return heading + '\n```key-problems\n' + JSON.stringify(fallback) + '\n```\n\n';
      }

      return heading + '\n```key-problems\n' + JSON.stringify(items) + '\n```\n\n';
    }
  );

  // Map file paths to code blocks
  let lastFile = "";
  const lines = processed.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const fileMatch = lines[i].match(/\*\*(?:Files?|Location|Path):\*\*\s*`?([^`]+)`?/i);
    if (fileMatch) {
      lastFile = fileMatch[1].trim();
    }
    
    const codeMatch = lines[i].match(/^```([a-z0-9\-]+)(.*)$/i);
    if (codeMatch && lastFile && codeMatch[1] !== 'key-problems') {
      lines[i] = `\`\`\`${codeMatch[1]}__FILE__${encodeURIComponent(lastFile)}`;
      lastFile = ""; // consume
    }
  }
  
  return lines.join('\n');
}

/* ─────────────────────────────────────────────
   AST HELPERS
───────────────────────────────────────────── */
function getNodeText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const entry = node as { type?: string; value?: string; tagName?: string; children?: unknown };
  if (entry.type === 'text') return entry.value || '';
  if (entry.tagName === 'strong' || entry.tagName === 'b') {
    return `**${(Array.isArray(entry.children) ? entry.children.map(getNodeText).join('') : '')}**`;
  }
  if (entry.tagName === 'code') {
    return '`' + (Array.isArray(entry.children) ? entry.children.map(getNodeText).join('') : '') + '`';
  }
  if (entry.tagName === 'br') return '\n';
  if (Array.isArray(entry.children)) return entry.children.map(getNodeText).join('');
  return '';
}

function childrenToText(children: React.ReactNode): string {
  if (
    typeof children === "string" ||
    typeof children === "number"
  ) {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(childrenToText).join("");
  }

  if (
    React.isValidElement<{
      children?: React.ReactNode;
    }>(children)
  ) {
    return childrenToText(children.props.children);
  }

  return "";
}
/* ─────────────────────────────────────────────
   KEY PROBLEMS CARD GRID
───────────────────────────────────────────── */
const CARD_THEMES = [
  { icon: ShieldAlert, bg: 'bg-red-500/8', border: 'border-red-500/25', label: 'text-red-400', dot: 'bg-red-500' },
  { icon: AlertTriangle, bg: 'bg-orange-500/8', border: 'border-orange-500/25', label: 'text-orange-400', dot: 'bg-orange-500' },
  { icon: XCircle, bg: 'bg-yellow-500/8', border: 'border-yellow-500/25', label: 'text-yellow-400', dot: 'bg-yellow-500' },
  { icon: Zap, bg: 'bg-blue-500/8', border: 'border-blue-500/25', label: 'text-blue-400', dot: 'bg-blue-400' },
  { icon: Target, bg: 'bg-purple-500/8', border: 'border-purple-500/25', label: 'text-purple-400', dot: 'bg-purple-400' },
  { icon: BookOpen, bg: 'bg-cyan-500/8', border: 'border-cyan-500/25', label: 'text-brand-cyan', dot: 'bg-brand-cyan' },
  { icon: Info, bg: 'bg-slate-500/8', border: 'border-slate-500/25', label: 'text-slate-400', dot: 'bg-slate-400' },
];

const KeyProblemsGrid = ({ rawJson }: { rawJson: string }) => {
  let items: { label: string; text: string }[] = [];
  try { items = JSON.parse(rawJson); } catch { return null; }
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
      {items.map((item, i) => {
        const t = CARD_THEMES[i % CARD_THEMES.length];
        const Icon = t.icon;
        return (
          <div key={i}
            className={`flex items-start gap-4 p-5 rounded-2xl ${t.bg} border ${t.border} shadow-lg hover:scale-[1.015] transition-transform duration-300 cursor-default group`}
          >
            <div className={`w-9 h-9 shrink-0 rounded-xl ${t.bg} border ${t.border} flex items-center justify-center mt-0.5`}>
              <Icon className={`w-5 h-5 ${t.label}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${t.dot} shadow-[0_0_6px_currentColor] shrink-0`} />
                <span className={`text-[9px] font-bold uppercase tracking-widest ${t.label}`}>
                  {item.label || `Issue #${i + 1}`}
                </span>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed m-0">{item.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────
   macOS TERMINAL
───────────────────────────────────────────── */
const MacTerminal = ({ children, codeClass, filePath }: { children: React.ReactNode; codeClass?: string; filePath?: string }) => {
  const [copied, setCopied] = useState(false);
  const language = codeClass ? codeClass.replace(/language-/, '') : '';
  const textContent = childrenToText(children);

  // Key Problems special block
  if (language === 'key-problems') {
    return <KeyProblemsGrid rawJson={textContent.trim()} />;
  }

  // Architecture flow diagram
  if (textContent.includes('->') || textContent.includes('→')) {
    const blocks = textContent.split(/->|→/).map(s => s.trim()).filter(Boolean);
    return (
      <div className="flex flex-wrap items-center gap-3 my-8 p-6 rounded-3xl bg-white/[0.02] border border-white/[0.07] overflow-x-auto no-scrollbar">
        {blocks.map((block, i) => (
          <React.Fragment key={i}>
            <div className="px-4 py-2.5 bg-black/50 border border-white/10 rounded-2xl font-mono text-sm text-white hover:bg-brand-cyan/10 hover:border-brand-cyan/40 hover:text-brand-cyan transition-all duration-300 cursor-default whitespace-nowrap">
              {block}
            </div>
            {i !== blocks.length - 1 && <ArrowRight className="w-4 h-4 text-brand-cyan shrink-0" />}
          </React.Fragment>
        ))}
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const repoUrl = "https://github.com/laurenmxv/Fhenix-Learn";
  const fileUrl = filePath ? `${repoUrl}/tree/main/${filePath}` : repoUrl;

  return (
    <div className="relative group my-10 rounded-2xl overflow-hidden shadow-[0_20px_60px_-5px_rgba(0,0,0,0.8)]"
      style={{ background: 'linear-gradient(180deg,#1C1C1E 0%,#1C1C1E 44px,#0A0A0A 44px)' }}
    >
      {/* Title bar */}
      <div className="flex items-center h-11 px-4 relative" style={{ background: '#1C1C1E', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex space-x-2 shrink-0">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
        </div>
        
        {filePath ? (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/5 max-w-[60%] sm:max-w-[70%]">
            <span className="text-[11px] font-mono text-slate-400 tracking-wider shrink-0 hidden sm:block">{language || 'code'}</span>
            <span className="text-slate-600 hidden sm:block">|</span>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] font-mono text-brand-cyan hover:text-white truncate transition-colors group/link">
              <Folder className="w-3 h-3 shrink-0" />
              <span className="truncate">{filePath}</span>
            </a>
          </div>
        ) : (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/5 border border-white/5 text-[11px] font-mono text-slate-400 tracking-wider">
            {language || 'code'}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {filePath && (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[11px] font-mono text-slate-400 hover:text-white transition-all">
              <Code2 className="w-3 h-3" />
              <span className="hidden sm:inline">Source</span>
            </a>
          )}
          <button onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-mono text-slate-400 hover:text-white transition-all"
          >
            {copied ? <><Check className="w-3 h-3 text-green-400" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>
      </div>
      {/* Code body */}
      <pre className="p-6 overflow-x-auto text-[13px] leading-7 font-mono text-slate-300 m-0 bg-[#0A0A0A]">
        {children}
      </pre>
    </div>
  );
};

/* ─────────────────────────────────────────────
   macOS BREADCRUMB
───────────────────────────────────────────── */
const MacBreadcrumb = ({ rawText }: { rawText: string }) => {
  const clean = rawText.replace(/\*\*(Files?|Location|Path):\*\*\s*/i, '').replace(/`/g, '').trim();
  const paths = clean.split(',').map(s => s.trim()).filter(Boolean);
  const repoUrl = "https://github.com/laurenmxv/Fhenix-Learn";
  return (
    <div className="my-6 flex flex-col gap-3">
      {paths.map((path, pi) => {
        const parts = path.split(/[/\\]/);
        const fileUrl = `${repoUrl}/tree/main/${path}`;
        return (
          <div key={pi} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-2xl w-full shadow-lg">
             <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mr-2">Target File</span>
                {parts.map((seg, i) => (
                  <React.Fragment key={i}>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/40 border border-white/[0.05] rounded-xl shadow-inner">
                      {i < parts.length - 1
                        ? <Folder className="w-3.5 h-3.5 text-brand-purple shrink-0" />
                        : <FileCode2 className="w-3.5 h-3.5 text-brand-cyan shrink-0" />}
                      <span className="text-[13px] font-mono text-slate-200 leading-none">{seg}</span>
                    </div>
                    {i < parts.length - 1 && <span className="text-slate-600 text-sm">/</span>}
                  </React.Fragment>
                ))}
             </div>
             
             <a href={fileUrl} target="_blank" rel="noopener noreferrer" 
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/20 text-brand-cyan text-xs font-bold uppercase tracking-wider transition-all group shrink-0">
                <Code2 className="w-4 h-4" />
                <span>View Source</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
             </a>
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────
   METADATA GRID (Severity / File / Problem / Impact / Fix)
───────────────────────────────────────────── */
const MetadataGrid = ({ rawText }: { rawText: string }) => {
  const get = (key: string) => {
    const r = new RegExp(`\\*\\*${key}[s]?:\\*\\*\\s*(.*?)(?=\\n\\*\\*|\\n\\n|$)`, 'is');
    const m = rawText.match(r);
    return m ? m[1].replace(/`/g, '').replace(/\*\*/g, '').trim() : null;
  };

  const severity = get('Severity');
  const file = get('File') || get('Files');
  const problem = get('Problem');
  const impact = get('Impact');
  const evidence = get('Evidence');
  const fix = get('Fix');
  const isCritical = severity?.toUpperCase().includes('CRITICAL');

  // Don't render empty grids
  if (!severity && !file && !problem && !impact && !fix) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4 mb-10">
      {severity && (
        <div className={`col-span-1 relative overflow-hidden p-4 rounded-2xl border flex flex-col gap-1.5 shadow-lg
          ${isCritical ? 'bg-red-500/5 border-red-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
          <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl ${isCritical ? 'bg-red-500/30' : 'bg-orange-500/30'}`} />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Severity</span>
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isCritical ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]'}`} />
            <span className="font-heading font-black text-xl text-white">{severity}</span>
          </div>
        </div>
      )}
      {file && (
        <div className="col-span-1 p-4 rounded-2xl bg-brand-cyan/[0.03] border border-brand-cyan/15 flex flex-col gap-1.5 shadow-lg">
          <span className="text-[9px] font-bold uppercase tracking-widest text-brand-cyan/50">Target File</span>
          <code className="text-[12px] text-brand-cyan font-mono truncate">{file}</code>
        </div>
      )}
      {problem && (
        <div className="col-span-1 md:col-span-2 p-5 rounded-2xl bg-white/[0.02] border border-red-500/15 flex gap-4">
          <div className="w-8 h-8 shrink-0 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center justify-center mt-0.5">
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-red-400 block mb-1.5">Root Problem</span>
            <p className="text-slate-200 text-sm leading-relaxed m-0">{problem}</p>
          </div>
        </div>
      )}
      {evidence && (
        <div className="col-span-1 md:col-span-2 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex gap-4">
          <div className="w-8 h-8 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mt-0.5">
            <Info className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Evidence</span>
            <p className="text-slate-300 text-sm leading-relaxed m-0">{evidence}</p>
          </div>
        </div>
      )}
      {impact && (
        <div className="col-span-1 md:col-span-2 p-5 rounded-2xl bg-orange-500/[0.03] border border-orange-500/15 flex gap-4">
          <div className="w-8 h-8 shrink-0 rounded-xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center mt-0.5">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-orange-400 block mb-1.5">Impact</span>
            <p className="text-slate-300 text-sm leading-relaxed m-0">{impact}</p>
          </div>
        </div>
      )}
      {fix && (
        <div className="col-span-1 md:col-span-2 p-5 rounded-2xl bg-brand-cyan/[0.04] border border-brand-cyan/20 flex gap-4">
          <div className="w-8 h-8 shrink-0 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center mt-0.5">
            <CheckCircle2 className="w-4 h-4 text-brand-cyan" />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-brand-cyan block mb-1.5">Recommended Fix</span>
            <p className="text-white text-sm leading-relaxed m-0 font-medium">{fix}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   SECURITY CARD HEADER (h4 with 🔴/🟡)
───────────────────────────────────────────── */
const SecurityCardHeader = ({ children, severity }: { children: React.ReactNode; severity: string }) => {
  const isCritical = severity.includes('🔴');
  const isHigh = severity.includes('🟡');
  const c = isCritical
    ? { border: 'border-red-500/40', bg: 'from-red-500/6', bar: 'bg-red-500', icon: <ShieldAlert className="w-6 h-6 text-red-500" /> }
    : isHigh
      ? { border: 'border-orange-500/40', bg: 'from-orange-500/6', bar: 'bg-orange-500', icon: <Zap className="w-6 h-6 text-orange-400" /> }
      : { border: 'border-yellow-500/40', bg: 'from-yellow-500/6', bar: 'bg-yellow-500', icon: <AlertCircle className="w-6 h-6 text-yellow-400" /> };

  return (
    <div className={`mt-14 mb-0 p-5 pl-7 rounded-t-3xl bg-gradient-to-b ${c.bg} to-transparent border ${c.border} border-b-0 relative overflow-hidden`}>
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${c.bar} rounded-l-3xl`} />
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{c.icon}</div>
        <h4 className="text-lg md:text-xl font-bold font-heading text-white m-0 tracking-tight leading-snug">{children}</h4>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function ModifiedMarkdown({
  content,
}: {
  content: string;
}) {
  // Preprocess + remove first H1 safely before render
  const processed = preprocessContent(content)
    .replace(/^# .+$/m, "")
    .trim();

  return (
    <div className="max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          /* ── Headings ── */
          h1: ({ ...props }) => (
            <h1
              className="text-4xl md:text-5xl font-extrabold font-heading text-white mb-10 tracking-tighter leading-tight"
              {...props}
            />
          ),

          h2: ({ ...props }) => (
            <h2
              className="text-2xl md:text-3xl font-bold font-heading text-white mt-20 mb-6 tracking-tight
              flex items-center gap-3 pb-5 border-b border-white/[0.07]"
            >
              <span className="w-[3px] h-7 rounded-full bg-gradient-to-b from-brand-cyan to-brand-blue shrink-0" />
              {props.children}
            </h2>
          ),

          h3: ({ ...props }) => (
            <h3
              className="text-xl md:text-2xl font-semibold font-heading text-white mt-14 mb-4 tracking-tight"
              {...props}
            />
          ),

          h4: ({ node, ...props }) => {
            const text = getNodeText(node);

            if (
              text.includes("🔴") ||
              text.includes("🟡") ||
              text.includes("🟢")
            ) {
              return (
                <SecurityCardHeader severity={text}>
                  {props.children}
                </SecurityCardHeader>
              );
            }

            return (
              <h4
                className="text-lg font-semibold font-heading text-white mt-10 mb-3"
                {...props}
              />
            );
          },

          /* ── Paragraphs ── */
          p: ({ node, ...props }) => {
            const raw = getNodeText(node);

            if (raw.includes("**Severity:**")) {
              return <MetadataGrid rawText={raw} />;
            }

            if (/\*\*(Files?|Location|Path):\*\*/.test(raw)) {
              return <MacBreadcrumb rawText={raw} />;
            }

            // Skip empty paragraphs
            const text = raw
              .replace(/\s+/g, "")
              .replace(/\*\*/g, "");

            if (!text) return null;

            return (
              <p
                className="mb-5 text-slate-300 text-base leading-8 font-light"
                {...props}
              />
            );
          },

          /* ── Ordered list ── */
          ol: ({ children }: { children?: React.ReactNode }) => (
            <ol className="space-y-3 my-6 pl-0 list-none">
              {React.Children.map(children, (child, idx) => {
                const childContent =
                  React.isValidElement<{
                    children?: React.ReactNode;
                  }>(child)
                    ? child.props.children
                    : child;

                const childText = childrenToText(childContent).trim();

                if (!childText) return null;

                return (
                  <li className="flex items-start gap-3" key={idx}>
                    <span className="shrink-0 w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold font-mono text-brand-cyan mt-0.5">
                      {idx + 1}
                    </span>

                    <span className="flex-1 text-slate-300 text-base leading-7 pt-0.5">
                      {childContent}
                    </span>
                  </li>
                );
              })}
            </ol>
          ),

          /* ── Unordered list ── */
          ul: ({ ...props }) => (
            <ul
              className="space-y-2.5 my-6 pl-0 list-none"
              {...props}
            />
          ),

          /* ── List item ── */
          li: ({
            ordered,
            children,
          }: {
            ordered?: boolean;
            children?: React.ReactNode;
          }) => {
            if (ordered) return <li>{children}</li>;

            const text = childrenToText(children).trim();

            if (!text) return null;

            return (
              <li className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-cyan shrink-0 shadow-[0_0_6px_rgba(10,217,220,0.6)]" />

                <span className="flex-1 text-slate-300 text-base leading-7">
                  {children}
                </span>
              </li>
            );
          },

          /* ── Code blocks ── */
          pre: ({
            node,
            ...props
          }: {
            node?: { children?: unknown[] };
            children?: React.ReactNode;
          }) => {
            const rawNode = Array.isArray(node?.children)
              ? node.children[0]
              : undefined;

            const rawClass =
              rawNode &&
                typeof rawNode === "object" &&
                rawNode !== null
                ? (
                  rawNode as {
                    properties?: { className?: string[] };
                  }
                ).properties?.className?.[0]
                : undefined;
                
            let codeClass = rawClass;
            let filePath;
            
            if (rawClass && rawClass.includes('__FILE__')) {
              const parts = rawClass.split('__FILE__');
              codeClass = parts[0];
              try {
                filePath = decodeURIComponent(parts[1]);
              } catch (e) {}
            }

            return (
              <MacTerminal codeClass={codeClass} filePath={filePath}>
                {props.children}
              </MacTerminal>
            );
          },

          /* ── Inline code ── */
          code: ({
            inline,
            ...props
          }: {
            inline?: boolean;
            children?: React.ReactNode;
          }) => {
            if (inline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-brand-cyan/10 text-brand-cyan text-[13px] font-mono border border-brand-cyan/10 before:content-none after:content-none"
                  {...props}
                />
              );
            }

            return <code {...props} />;
          },

          /* ── Blockquote ── */
          blockquote: ({ ...props }) => (
            <blockquote
              className="my-6 pl-5 border-l-2 border-brand-cyan/30 text-slate-400 italic text-base"
              {...props}
            />
          ),

          /* ── Strong ── */
          strong: ({ ...props }) => (
            <strong
              className="text-white font-semibold"
              {...props}
            />
          ),

          /* ── Links ── */
          a: ({ ...props }) => (
            <a
              className="text-brand-cyan hover:text-white underline underline-offset-2 transition-colors"
              {...props}
            />
          ),

          /* ── Tables ── */
          table: ({ ...props }) => (
            <div className="my-10 w-full overflow-x-auto rounded-2xl border border-white/[0.08] shadow-xl bg-black/40 backdrop-blur-xl">
              <table
                className="w-full text-left border-collapse text-sm"
                {...props}
              />
            </div>
          ),

          thead: ({ ...props }) => (
            <thead className="bg-white/[0.04]" {...props} />
          ),

          th: ({ ...props }) => (
            <th
              className="px-5 py-4 border-b border-white/[0.08] text-[10px] uppercase tracking-widest text-brand-cyan font-bold"
              {...props}
            />
          ),

          td: ({ ...props }) => (
            <td
              className="px-5 py-4 border-b border-white/[0.04] text-slate-300 font-light leading-relaxed"
              {...props}
            />
          ),

          tr: ({ ...props }) => (
            <tr
              className="hover:bg-white/[0.02] transition-colors"
              {...props}
            />
          ),

          /* ── HR ── */
          hr: () => (
            <div className="my-14 flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className="w-1 h-1 rounded-full bg-white/20" />

              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
