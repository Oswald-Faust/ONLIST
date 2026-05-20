'use client';

import { createContext, useContext } from 'react';

interface DashboardShellContextValue {
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
  toggleSidebarCollapse: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null);

export function DashboardShellProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: DashboardShellContextValue;
}) {
  return (
    <DashboardShellContext.Provider value={value}>
      {children}
    </DashboardShellContext.Provider>
  );
}

export function useDashboardShell() {
  const context = useContext(DashboardShellContext);

  if (!context) {
    throw new Error('useDashboardShell must be used within DashboardShellProvider');
  }

  return context;
}
