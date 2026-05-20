'use client';
import { Bell, PanelLeft, PanelLeftClose, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useDashboardShell } from '@/components/dashboard-shell';

interface Props {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: Props) {
  const { user } = useAuth();
  const { sidebarCollapsed, toggleSidebarCollapse, openSidebar } = useDashboardShell();

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b flex-shrink-0"
      style={{ borderColor: 'rgba(201, 169, 97, 0.1)', background: 'rgba(10,10,15,0.88)', backdropFilter: 'blur(18px)' }}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-2xl transition-colors lg:hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(201, 169, 97, 0.14)', color: 'var(--text-secondary)' }}
          aria-label="Ouvrir la navigation"
        >
          <PanelLeft size={16} />
        </button>
        <button
          type="button"
          onClick={toggleSidebarCollapse}
          className="hidden h-10 w-10 items-center justify-center rounded-2xl transition-colors lg:flex"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(201, 169, 97, 0.14)', color: 'var(--text-secondary)' }}
          aria-label={sidebarCollapsed ? 'Déplier la sidebar' : 'Replier la sidebar'}
        >
          {sidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <div>
          <h1 className="text-[34px] leading-none panel-title" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          {subtitle && <p className="text-xs uppercase tracking-[0.18em] mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(201, 169, 97, 0.14)', color: 'var(--text-muted)' }}>
          <Search size={14} />
          <span>Recherche rapide</span>
        </div>
        <button className="relative w-10 h-10 rounded-2xl flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(201, 169, 97, 0.14)', color: 'var(--text-secondary)' }}>
          <Bell size={16} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: 'var(--primary-light)' }} />
        </button>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold"
          style={{ background: 'var(--gradient-primary)', color: '#16130d' }}>
          {user?.name?.charAt(0) ?? 'A'}
        </div>
      </div>
    </header>
  );
}
