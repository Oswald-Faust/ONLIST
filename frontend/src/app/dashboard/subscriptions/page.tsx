'use client';
import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { api } from '@/lib/auth';
import { Building2, CheckCircle2, CreditCard, Filter, Search, Shield, Sparkles, TrendingUp } from 'lucide-react';

interface SubscriptionUser {
  _id: string;
  name: string;
  email?: string;
  businessName?: string;
  businessCity?: string;
  subscriptionPlan?: 'starter' | 'pro' | 'group';
  subscriptionStatus?: 'inactive' | 'trialing' | 'active' | 'past_due' | 'cancelled' | 'grace';
  subscriptionProductId?: string;
  subscriptionStore?: string;
  subscriptionExpiresAt?: string | null;
  subscriptionUpdatedAt?: string | null;
  isFoundingPartner?: boolean;
  status?: string;
}

interface SubscriptionMetrics {
  mrr: number;
  activeCount: number;
  trialingCount: number;
  pastDueCount: number;
  cancelledCount: number;
  inactiveCount: number;
  graceCount: number;
  foundingPartners: number;
  stripeCount: number;
  byPlan: { starter: number; pro: number; group: number };
}

const PLAN_LABELS = {
  starter: 'APP STARTER',
  pro: 'APP PRO',
  group: 'APP GROUP',
} as const;

const STATUS_LABELS = {
  inactive: 'Inactive',
  trialing: 'Essai',
  active: 'Active',
  past_due: 'Impayé',
  cancelled: 'Annulée',
  grace: 'Grâce',
} as const;

export default function SubscriptionsPage() {
  const [items, setItems] = useState<SubscriptionUser[]>([]);
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [foundingPartner, setFoundingPartner] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (plan) params.set('plan', plan);
        if (status) params.set('status', status);
        if (search) params.set('search', search);
        if (foundingPartner) params.set('foundingPartner', foundingPartner);
        const res = await api(`/admin/subscriptions?${params}`);
        const data = await res.json();
        setItems(data.subscriptions || []);
        if (data.metrics) setMetrics(data.metrics);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [plan, status, search, foundingPartner]);

  const mrrLabel = useMemo(() => `${(metrics?.mrr || 0).toLocaleString('fr-FR')} €`, [metrics]);
  const activeTotal = (metrics?.activeCount || 0) + (metrics?.trialingCount || 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Abonnements" subtitle={`${items.length} comptes business consultés`} />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* MRR */}
          <div className="rounded-[1.75rem] p-6 glass">
            <div className="mb-4 flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#10b98118', border: '1px solid #10b98124' }}>
                <TrendingUp size={22} style={{ color: '#10b981' }} />
              </div>
              <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>Stripe</span>
            </div>
            <p className="text-4xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{mrrLabel}</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Revenu mensuel récurrent (MRR)</p>
          </div>

          {/* Actifs */}
          <div className="rounded-[1.75rem] p-6 glass">
            <div className="mb-4 flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#d4af7718', border: '1px solid #d4af7724' }}>
                <CreditCard size={22} style={{ color: '#d4af77' }} />
              </div>
              <CheckCircle2 size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-4xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{activeTotal}</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Abonnements actifs{metrics?.trialingCount ? ` · ${metrics.trialingCount} en essai` : ''}
            </p>
          </div>

          {/* Répartition par pack */}
          <div className="rounded-[1.75rem] p-6 glass">
            <div className="mb-4 flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#c9a96118', border: '1px solid #c9a96124' }}>
                <Building2 size={22} style={{ color: 'var(--primary)' }} />
              </div>
            </div>
            <div className="flex items-end gap-4">
              {([['Starter', metrics?.byPlan.starter || 0], ['Pro', metrics?.byPlan.pro || 0], ['Group', metrics?.byPlan.group || 0]] as const).map(([label, value]) => (
                <div key={label}>
                  <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>
            <p className="text-sm font-medium mt-3" style={{ color: 'var(--text-secondary)' }}>Répartition par pack</p>
          </div>

          {/* Founding Partners */}
          <div className="rounded-[1.75rem] p-6 glass">
            <div className="mb-4 flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#7ba2d618', border: '1px solid #7ba2d624' }}>
                <Shield size={22} style={{ color: '#7ba2d6' }} />
              </div>
              <Sparkles size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-4xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{metrics?.foundingPartners || 0}</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Founding Partners</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl flex-1 min-w-64 input-shell">
            <Search size={16} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un établissement, un email, une ville..."
              className="bg-transparent text-sm outline-none w-full"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl surface">
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className="bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }}>
              <option value="">Tous les packs</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="group">Group</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl surface">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }}>
              <option value="">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="trialing">Essai</option>
              <option value="grace">Grâce</option>
              <option value="inactive">Inactif</option>
              <option value="past_due">Impayé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl surface">
            <select value={foundingPartner} onChange={(e) => setFoundingPartner(e.target.value)} className="bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }}>
              <option value="">Tous les comptes</option>
              <option value="true">Founding Partner</option>
              <option value="false">Non Founding Partner</option>
            </select>
          </div>
        </div>

        <div className="rounded-[2rem] glass overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b subtle-divider">
                {['Établissement', 'Pack', 'Statut', 'Ville', 'Expiration', 'Store', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="border-b subtle-divider">
                    {Array(7).fill(0).map((__, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 rounded-lg bg-white/5 animate-pulse" style={{ width: j === 0 ? '160px' : '90px' }} /></td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Aucun abonnement trouvé</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="border-b" style={{ borderColor: 'rgba(201,169,97,0.08)' }}>
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{item.businessName || item.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.email || '—'}</p>
                        {item.isFoundingPartner ? <p className="text-[11px] mt-1" style={{ color: 'var(--primary-light)' }}>Founding Partner</p> : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{PLAN_LABELS[item.subscriptionPlan || 'starter']}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.subscriptionStatus === 'active' ? 'badge-validated' : item.subscriptionStatus === 'grace' ? 'badge-business' : 'badge-pending'}`}>
                        {STATUS_LABELS[item.subscriptionStatus || 'inactive']}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.businessCity || '—'}</td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.subscriptionExpiresAt ? new Date(item.subscriptionExpiresAt).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>{item.subscriptionStore || 'manuel'}</td>
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/subscriptions/${item._id}`} className="px-3 py-2 rounded-xl text-xs font-semibold transition-all btn-primary">
                        Gérer
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
