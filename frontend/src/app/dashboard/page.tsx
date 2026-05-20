'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/auth';
import Header from '@/components/Header';
import { Users, Clock, Calendar, FileText, TrendingUp, UserCheck, Building2, ArrowUpRight, LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  pendingUsers: number;
  totalEvents: number;
  totalApplications: number;
  influencers: number;
  businesses: number;
}

interface RecentUser {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  type: 'influencer' | 'business' | 'admin';
}

function StatCard({ label, value, icon: Icon, color, sub, href }: {
  label: string; value: number; icon: LucideIcon; color: string; sub?: string; href?: string;
}) {
  const content = (
    <div className="rounded-[1.75rem] p-6 glass transition-all group cursor-pointer animate-fade-in hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}24` }}>
          <Icon size={22} style={{ color }} />
        </div>
        <ArrowUpRight size={16} style={{ color: 'var(--text-muted)' }} />
      </div>
      <p className="text-4xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{value.toLocaleString()}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {sub && <p className="text-xs mt-1 uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

  useEffect(() => {
    Promise.all([
      api('/admin/stats').then(r => r.json()),
      api('/admin/users?limit=5&status=pending').then(r => r.json()),
    ]).then(([s, u]) => {
      setStats(s);
      setRecentUsers(u.users || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Vue d'ensemble" subtitle={`${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`} />

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard label="Utilisateurs" value={stats?.totalUsers ?? 0} icon={Users} color="#d4af77" href="/dashboard/users" />
          <StatCard label="En attente" value={stats?.pendingUsers ?? 0} icon={Clock} color="#d7a74c" sub="À valider" href="/dashboard/users?status=pending" />
          <StatCard label="Influenceurs" value={stats?.influencers ?? 0} icon={TrendingUp} color="#52b788" sub="Validés" />
          <StatCard label="Établissements" value={stats?.businesses ?? 0} icon={Building2} color="#c9a961" sub="Validés" />
          <StatCard label="Événements" value={stats?.totalEvents ?? 0} icon={Calendar} color="#7ba2d6" href="/dashboard/events" />
          <StatCard label="Candidatures" value={stats?.totalApplications ?? 0} icon={FileText} color="#b78686" href="/dashboard/applications" />
        </div>

        <div className="rounded-[2rem] glass p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="panel-title text-4xl leading-none" style={{ color: 'var(--text-primary)' }}>Inscriptions en attente</h2>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Comptes à valider pour accorder l&apos;accès à la plateforme</p>
            </div>
            <Link href="/dashboard/users?status=pending"
              className="px-4 py-2.5 rounded-2xl text-sm transition-colors btn-secondary">
              Voir tout
            </Link>
          </div>

          {recentUsers.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-18 h-18 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(82,183,136,0.08)', border: '1px solid rgba(82,183,136,0.18)' }}>
                <UserCheck size={36} className="text-green-400" />
              </div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Tout est à jour</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Aucune validation en attente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentUsers.map(u => (
                <div key={u._id} className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                  style={{ background: 'var(--bg-card-2)', border: '1px solid rgba(201,169,97,0.12)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: u.type === 'influencer' ? 'var(--gradient-primary)' : 'linear-gradient(135deg, #a89060, #d4af77)', color: '#16130d' }}>
                    {u.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email || u.phone}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium badge-${u.type}`}>
                    {u.type === 'influencer' ? 'Influenceur' : 'Établissement'}
                  </span>
                  <Link href={`/dashboard/users/${u._id}`}
                    className="px-3 py-2 rounded-xl text-xs font-semibold transition-all btn-primary">
                    Voir détails
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
