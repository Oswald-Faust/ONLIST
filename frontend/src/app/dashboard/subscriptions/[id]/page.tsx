'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import { api } from '@/lib/auth';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  CreditCard,
  ExternalLink,
  LucideIcon,
  MapPin,
  RefreshCw,
  Shield,
  Sparkles,
  Store,
  XCircle,
} from 'lucide-react';

interface SubscriptionHistoryItem {
  action: string;
  source: string;
  plan?: 'starter' | 'pro' | 'group';
  status?: 'inactive' | 'trialing' | 'active' | 'past_due' | 'cancelled' | 'grace';
  productId?: string;
  store?: string;
  expiresAt?: string | null;
  note?: string;
  actorName?: string;
  createdAt: string;
}

interface SubscriptionDetail {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'pending' | 'validated' | 'rejected';
  createdAt: string;
  businessName?: string;
  businessType?: string;
  businessCity?: string;
  businessAddress?: string;
  businessDescription?: string;
  businessLogo?: string;
  isFoundingPartner?: boolean;
  foundingPartnerGrantedAt?: string | null;
  subscriptionPlan?: 'starter' | 'pro' | 'group';
  subscriptionStatus?: 'inactive' | 'trialing' | 'active' | 'past_due' | 'cancelled' | 'grace';
  subscriptionProductId?: string;
  subscriptionStore?: string;
  subscriptionExpiresAt?: string | null;
  subscriptionUpdatedAt?: string | null;
  revenueCatCustomerId?: string;
  subscriptionHistory?: SubscriptionHistoryItem[];
}

interface StripeInfo {
  configured: boolean;
  testMode: boolean;
  customerId: string;
  subscriptionId: string | null;
  customerUrl: string;
  subscriptionUrl: string | null;
  status?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  amount?: number | null;
  currency?: string;
  interval?: string | null;
  priceId?: string | null;
  paymentMethod?: { brand: string; last4: string } | null;
  error?: string;
}

interface SubscriptionPayload {
  subscription: SubscriptionDetail;
  stripe?: StripeInfo | null;
  metrics: {
    activeEvents: number;
    pendingApplications: number;
  };
}

const PLAN_LABELS: Record<string, string> = {
  starter: 'APP STARTER',
  pro: 'APP PRO',
  group: 'APP GROUP',
};

const STATUS_LABELS: Record<string, string> = {
  inactive: 'Inactive',
  trialing: 'Essai',
  active: 'Active',
  past_due: 'Impayé',
  cancelled: 'Annulée',
  grace: 'Grâce',
};

const ACTION_LABELS: Record<string, string> = {
  created: 'Création du suivi abonnement',
  manual_update: 'Modification manuelle',
  revenuecat_sync: 'Synchronisation RevenueCat',
  stripe_sync: 'Synchronisation Stripe',
  stripe_checkout_completed: 'Paiement Stripe finalisé',
  stripe_created: 'Abonnement Stripe créé',
  stripe_updated: 'Abonnement Stripe mis à jour',
  stripe_payment_failed: 'Échec de paiement Stripe',
  stripe_subscription_deleted: 'Abonnement Stripe terminé',
  founding_partner_granted: 'Founding Partner accordé',
  founding_partner_revoked: 'Founding Partner retiré',
};

function badgeClass(status?: string) {
  if (status === 'active') return 'badge-validated';
  if (status === 'grace') return 'badge-business';
  return 'badge-pending';
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: LucideIcon; tone: string }) {
  return (
    <div className="rounded-[1.75rem] p-6 glass">
      <div className="mb-4 flex items-center justify-between">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${tone}18`, border: `1px solid ${tone}24` }}>
          <Icon size={22} style={{ color: tone }} />
        </div>
      </div>
      <p className="text-4xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
  );
}

export default function SubscriptionDetailPage() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<SubscriptionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [form, setForm] = useState({
    subscriptionPlan: 'starter',
    subscriptionStatus: 'inactive',
    subscriptionExpiresAt: '',
    subscriptionProductId: '',
    subscriptionStore: '',
    note: '',
  });

  const subscription = data?.subscription || null;

  const load = async () => {
    setLoading(true);
    try {
      const res = await api(`/admin/subscriptions/${id}`);
      const json = await res.json();
      setData(json);
      const current = json.subscription as SubscriptionDetail;
      setForm({
        subscriptionPlan: current.subscriptionPlan || 'starter',
        subscriptionStatus: current.subscriptionStatus || 'inactive',
        subscriptionExpiresAt: current.subscriptionExpiresAt ? new Date(current.subscriptionExpiresAt).toISOString().slice(0, 10) : '',
        subscriptionProductId: current.subscriptionProductId || '',
        subscriptionStore: current.subscriptionStore || '',
        note: '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const saveSubscription = async () => {
    setActionLoading('save');
    try {
      await api(`/admin/users/${id}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          subscriptionExpiresAt: form.subscriptionExpiresAt || null,
        }),
      });
      await load();
      setToast({ msg: 'Abonnement mis à jour', type: 'success' });
    } catch {
      setToast({ msg: 'Erreur lors de la mise à jour', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFoundingPartner = async () => {
    if (!subscription) return;
    setActionLoading('founding');
    try {
      await api(`/admin/users/${id}/founding-partner`, {
        method: 'PATCH',
        body: JSON.stringify({ isFoundingPartner: !subscription.isFoundingPartner }),
      });
      await load();
      setToast({ msg: subscription.isFoundingPartner ? 'Founding Partner retiré' : 'Founding Partner accordé', type: 'success' });
    } catch {
      setToast({ msg: 'Erreur lors de la mise à jour', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const history = useMemo(() => subscription?.subscriptionHistory || [], [subscription]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p style={{ color: 'var(--text-secondary)' }}>Abonnement introuvable</p>
        <Link href="/dashboard/subscriptions" className="hover:underline text-sm" style={{ color: 'var(--primary-light)' }}>
          Retour aux abonnements
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl animate-fade-in flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <Header
        title="Détail abonnement"
        subtitle={`${subscription.businessName || subscription.name} · ${PLAN_LABELS[subscription.subscriptionPlan || 'starter']}`}
      />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/subscriptions" className="w-10 h-10 rounded-xl flex items-center justify-center transition-all surface" style={{ color: 'var(--text-secondary)' }}>
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <Link href="/dashboard/subscriptions">Abonnements</Link> / {subscription.businessName || subscription.name}
              </div>
              <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{subscription.businessName || subscription.name}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/users/${subscription._id}`} className="px-4 py-3 rounded-2xl text-sm font-semibold surface" style={{ color: 'var(--text-primary)' }}>
              Voir la fiche utilisateur
            </Link>
            <button onClick={load} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all surface" style={{ color: 'var(--text-secondary)' }}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="rounded-[2rem] p-7 glass">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold badge-business">
                <Building2 size={14} />
                {PLAN_LABELS[subscription.subscriptionPlan || 'starter']}
              </span>
              <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${badgeClass(subscription.subscriptionStatus)}`}>
                {STATUS_LABELS[subscription.subscriptionStatus || 'inactive']}
              </span>
              {subscription.isFoundingPartner ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background: 'rgba(123,162,214,0.14)', border: '1px solid rgba(123,162,214,0.24)', color: '#7ba2d6' }}>
                  <Sparkles size={14} />
                  Founding Partner
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl p-4 surface">
                <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>Contact</p>
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{subscription.email || '—'}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{subscription.phone || 'Pas de téléphone'}</p>
              </div>
              <div className="rounded-2xl p-4 surface">
                <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>Localisation</p>
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{subscription.businessCity || '—'}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{subscription.businessAddress || 'Adresse non renseignée'}</p>
              </div>
              <div className="rounded-2xl p-4 surface">
                <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>Store</p>
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{subscription.subscriptionStore || 'manuel'}</p>
                <p className="text-sm mt-1 break-all" style={{ color: 'var(--text-secondary)' }}>{subscription.subscriptionProductId || 'Aucun product ID'}</p>
              </div>
              <div className="rounded-2xl p-4 surface">
                <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>Échéance</p>
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {subscription.subscriptionExpiresAt ? new Date(subscription.subscriptionExpiresAt).toLocaleDateString('fr-FR') : 'Aucune date'}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Mise à jour {subscription.subscriptionUpdatedAt ? new Date(subscription.subscriptionUpdatedAt).toLocaleString('fr-FR') : 'jamais'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <MetricCard label="Events actifs" value={data?.metrics.activeEvents || 0} icon={Calendar} tone="#d4af77" />
            <MetricCard label="Candidatures en attente" value={data?.metrics.pendingApplications || 0} icon={Shield} tone="#7ba2d6" />
          </div>
        </div>

        {/* Panneau Stripe (lecture seule) */}
        <div className="rounded-[2rem] p-7 glass">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,91,255,0.14)', border: '1px solid rgba(99,91,255,0.28)' }}>
                <CreditCard size={20} style={{ color: '#8b85ff' }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Abonnement Stripe</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {data?.stripe?.testMode ? 'Mode test' : 'Mode live'} · données en temps réel
                </p>
              </div>
            </div>
            {data?.stripe?.customerUrl ? (
              <a
                href={data.stripe.customerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(99,91,255,0.14)', border: '1px solid rgba(99,91,255,0.28)', color: '#8b85ff' }}
              >
                Voir dans Stripe
                <ExternalLink size={15} />
              </a>
            ) : null}
          </div>

          {!data?.stripe ? (
            <div className="rounded-2xl p-6 surface" style={{ color: 'var(--text-muted)' }}>
              Aucun client Stripe rattaché à ce compte (paiement non encore effectué, ou abonnement géré manuellement).
            </div>
          ) : data.stripe.error ? (
            <div className="rounded-2xl p-4 surface" style={{ color: '#f59e0b' }}>
              Client Stripe rattaché mais lecture impossible : {data.stripe.error}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl p-4 surface">
                <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>Statut Stripe</p>
                <p className="text-base font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{data.stripe.status || '—'}</p>
                {data.stripe.cancelAtPeriodEnd ? (
                  <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>Annulation en fin de période</p>
                ) : null}
              </div>
              <div className="rounded-2xl p-4 surface">
                <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>Montant</p>
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {data.stripe.amount != null ? `${data.stripe.amount} ${data.stripe.currency}` : '—'}
                  {data.stripe.interval ? <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}> /{data.stripe.interval === 'month' ? 'mois' : data.stripe.interval}</span> : null}
                </p>
              </div>
              <div className="rounded-2xl p-4 surface">
                <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>Prochaine facture</p>
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {data.stripe.currentPeriodEnd ? new Date(data.stripe.currentPeriodEnd).toLocaleDateString('fr-FR') : '—'}
                </p>
              </div>
              <div className="rounded-2xl p-4 surface">
                <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>Moyen de paiement</p>
                <p className="text-base font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                  {data.stripe.paymentMethod ? `${data.stripe.paymentMethod.brand} ···· ${data.stripe.paymentMethod.last4}` : '—'}
                </p>
              </div>
              <div className="rounded-2xl p-4 surface sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>Customer ID</p>
                <p className="text-sm font-mono break-all" style={{ color: 'var(--text-secondary)' }}>{data.stripe.customerId}</p>
              </div>
              <div className="rounded-2xl p-4 surface sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>Subscription ID</p>
                <p className="text-sm font-mono break-all" style={{ color: 'var(--text-secondary)' }}>{data.stripe.subscriptionId || '—'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
          <div className="rounded-[2rem] p-6 glass space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Gestion manuelle</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Attribuer, modifier ou forcer un état abonnement.</p>
              </div>
              {subscription.revenueCatCustomerId ? (
                <span className="text-xs px-3 py-1.5 rounded-full surface" style={{ color: 'var(--text-muted)' }}>
                  RC {subscription.revenueCatCustomerId}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-[0.16em] mb-2 block" style={{ color: 'var(--text-muted)' }}>Pack</label>
                <select value={form.subscriptionPlan} onChange={(e) => setForm((prev) => ({ ...prev, subscriptionPlan: e.target.value }))} className="w-full rounded-2xl px-4 py-3 input-shell bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }}>
                  <option value="starter">APP STARTER</option>
                  <option value="pro">APP PRO</option>
                  <option value="group">APP GROUP</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.16em] mb-2 block" style={{ color: 'var(--text-muted)' }}>Statut</label>
                <select value={form.subscriptionStatus} onChange={(e) => setForm((prev) => ({ ...prev, subscriptionStatus: e.target.value }))} className="w-full rounded-2xl px-4 py-3 input-shell bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }}>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.16em] mb-2 block" style={{ color: 'var(--text-muted)' }}>Expiration</label>
                <input type="date" value={form.subscriptionExpiresAt} onChange={(e) => setForm((prev) => ({ ...prev, subscriptionExpiresAt: e.target.value }))} className="w-full rounded-2xl px-4 py-3 input-shell bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.16em] mb-2 block" style={{ color: 'var(--text-muted)' }}>Store</label>
                <input value={form.subscriptionStore} onChange={(e) => setForm((prev) => ({ ...prev, subscriptionStore: e.target.value }))} placeholder="apple / google / manuel" className="w-full rounded-2xl px-4 py-3 input-shell bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.16em] mb-2 block" style={{ color: 'var(--text-muted)' }}>Product ID</label>
              <input value={form.subscriptionProductId} onChange={(e) => setForm((prev) => ({ ...prev, subscriptionProductId: e.target.value }))} placeholder="onlist_business_pro_monthly" className="w-full rounded-2xl px-4 py-3 input-shell bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.16em] mb-2 block" style={{ color: 'var(--text-muted)' }}>Note d’historique</label>
              <textarea value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Ex: Pack offert pendant le lancement" className="w-full min-h-[96px] rounded-2xl px-4 py-3 input-shell bg-transparent text-sm outline-none resize-none" style={{ color: 'var(--text-primary)' }} />
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={saveSubscription} disabled={!!actionLoading} className="px-5 py-3 rounded-2xl text-sm font-semibold btn-primary disabled:opacity-50">
                {actionLoading === 'save' ? 'Enregistrement...' : 'Enregistrer les changements'}
              </button>
              <button onClick={toggleFoundingPartner} disabled={!!actionLoading} className="px-5 py-3 rounded-2xl text-sm font-semibold transition-all" style={{ background: 'rgba(201,169,97,0.12)', border: '1px solid rgba(201,169,97,0.24)', color: 'var(--primary-light)' }}>
                {actionLoading === 'founding' ? 'Mise à jour...' : subscription.isFoundingPartner ? 'Retirer Founding Partner' : 'Donner Founding Partner'}
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] p-6 glass">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Historique abonnement</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Timeline des changements manuels, sync RevenueCat et avantages Founding Partner.</p>
              </div>
              <a href={`mailto:${subscription.email || ''}`} className="w-10 h-10 rounded-xl flex items-center justify-center surface" style={{ color: 'var(--text-secondary)' }}>
                <ExternalLink size={16} />
              </a>
            </div>

            {history.length === 0 ? (
              <div className="rounded-2xl p-6 surface" style={{ color: 'var(--text-muted)' }}>
                Aucun historique enregistré pour ce compte.
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((entry, index) => (
                  <div key={`${entry.createdAt}-${index}`} className="rounded-2xl p-4 surface">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass(entry.status)}`}>
                          {STATUS_LABELS[entry.status || 'inactive']}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {ACTION_LABELS[entry.action] || entry.action}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(entry.createdAt).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <CreditCard size={14} />
                        {PLAN_LABELS[entry.plan || 'starter']}
                      </div>
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <Store size={14} />
                        {entry.store || 'manuel'}
                      </div>
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <Calendar size={14} />
                        Expiration {entry.expiresAt ? new Date(entry.expiresAt).toLocaleDateString('fr-FR') : 'non définie'}
                      </div>
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <MapPin size={14} />
                        Source {entry.source}{entry.actorName ? ` · ${entry.actorName}` : ''}
                      </div>
                    </div>
                    {entry.productId ? (
                      <p className="text-xs mt-3 break-all" style={{ color: 'var(--text-muted)' }}>
                        Product ID: {entry.productId}
                      </p>
                    ) : null}
                    {entry.note ? (
                      <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>{entry.note}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
