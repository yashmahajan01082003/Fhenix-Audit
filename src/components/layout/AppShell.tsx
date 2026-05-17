import Sidebar from './Sidebar';
import Header from './Header';
import { getAllDocs } from '@/lib/docs';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const docs = getAllDocs();

  return (
    <div className="flex min-h-screen relative" style={{ background: '#07080D' }}>
      {/* Layered ambient backgrounds */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.35]"
          style={{ maskImage: 'radial-gradient(ellipse 80% 80% at 50% 0%, black 40%, transparent 100%)' }} />
        {/* Subtle radial top-center glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(ellipse, rgba(10,217,220,0.08) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 flex w-full">
        <Sidebar docs={docs} />
        <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

