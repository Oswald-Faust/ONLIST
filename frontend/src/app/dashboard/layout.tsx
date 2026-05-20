'use client';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { DashboardShellProvider } from '@/components/dashboard-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center app-shell">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <DashboardShellProvider
      value={{
        sidebarCollapsed,
        sidebarOpen,
        toggleSidebarCollapse: () => setSidebarCollapsed((value) => !value),
        openSidebar: () => setSidebarOpen(true),
        closeSidebar: () => setSidebarOpen(false),
      }}
    >
      <div className="flex h-screen overflow-hidden app-shell">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </DashboardShellProvider>
  );
}
