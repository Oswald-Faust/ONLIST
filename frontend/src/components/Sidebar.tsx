'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useDashboardShell } from '@/components/dashboard-shell';
import {
  LayoutDashboard, Users, Calendar, FileText,
  LogOut, Hexagon, Settings, ChevronRight, X,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Vue d\'ensemble' },
  { href: '/dashboard/users', icon: Users, label: 'Utilisateurs' },
  { href: '/dashboard/events', icon: Calendar, label: 'Événements' },
  { href: '/dashboard/applications', icon: FileText, label: 'Candidatures' },
  { href: '/dashboard/settings', icon: Settings, label: 'Paramètres' },
];

export default function Sidebar() {
  const path = usePathname();
  const { user, logout } = useAuth();
  const { sidebarCollapsed, sidebarOpen, closeSidebar } = useDashboardShell();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/55 backdrop-blur-sm transition-opacity lg:hidden ${
          sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeSidebar}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r glass transition-all duration-300 ease-out lg:sticky lg:top-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'w-24' : 'w-72'}`}
        style={{ borderColor: 'rgba(201, 169, 97, 0.12)' }}
      >
      <div className={`border-b subtle-divider ${sidebarCollapsed ? 'p-4' : 'p-7'}`}>
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(180deg, rgba(201,169,97,0.18), rgba(201,169,97,0.08))', border: '1px solid rgba(201,169,97,0.22)' }}>
            <Hexagon size={20} style={{ color: 'var(--primary-light)' }} />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="font-bold tracking-[0.28em] text-[15px]" style={{ color: 'var(--text-primary)' }}>ONLIST</p>
              <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>Administration</p>
            </div>
          )}
          <button
            type="button"
            onClick={closeSidebar}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-2xl lg:hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid rgba(201, 169, 97, 0.14)', color: 'var(--text-secondary)' }}
            aria-label="Fermer la navigation"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <nav className={`flex-1 overflow-y-auto ${sidebarCollapsed ? 'space-y-3 p-3' : 'space-y-2 p-5'}`}>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === '/dashboard' ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={sidebarCollapsed ? label : undefined}
              onClick={closeSidebar}
              className={`group flex items-center rounded-2xl text-sm font-medium transition-all ${
                sidebarCollapsed ? 'justify-center px-0 py-4' : 'gap-3 px-4 py-3.5'
              } ${active ? 'text-white' : ''}`}
              style={active
                ? {
                    background: 'linear-gradient(180deg, rgba(201,169,97,0.22), rgba(168,144,96,0.14))',
                    color: 'var(--text-primary)',
                    border: '1px solid rgba(201,169,97,0.24)',
                    boxShadow: '0 12px 30px rgba(201,169,97,0.08)',
                  }
                : { color: 'var(--text-muted)' }}
            >
              <Icon size={18} style={{ color: active ? 'var(--primary-light)' : 'var(--text-muted)' }} />
              {!sidebarCollapsed && label}
              {!sidebarCollapsed && active && <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--primary-light)' }} />}
            </Link>
          );
        })}
      </nav>

      <div className={`border-t subtle-divider ${sidebarCollapsed ? 'p-3' : 'p-5'}`}>
        <div className={`rounded-3xl surface ${sidebarCollapsed ? 'p-3' : 'p-4'}`}>
          <div className={`mb-4 flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--gradient-primary)', color: '#16130d' }}>
            {user?.name?.charAt(0) ?? 'A'}
          </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
              </div>
            )}
          </div>
          <button onClick={logout}
            title={sidebarCollapsed ? 'Se déconnecter' : undefined}
            className={`text-sm transition-colors btn-danger-soft ${
              sidebarCollapsed
                ? 'flex w-full items-center justify-center rounded-2xl px-0 py-3'
                : 'flex w-full items-center gap-2 rounded-2xl px-4 py-3'
            }`}>
            <LogOut size={16} />
            {!sidebarCollapsed && 'Se déconnecter'}
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
