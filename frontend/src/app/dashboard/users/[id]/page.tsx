'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/auth';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle, XCircle, Trash2,
  MapPin, Phone, Mail, Calendar, Users, Star, Zap,
  Building2, Globe, TrendingUp, Clock, Shield, LucideIcon,
  ExternalLink, RefreshCw, Share2,
} from 'lucide-react';

interface UserDetail {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  type: 'influencer' | 'business' | 'admin';
  status: 'pending' | 'validated' | 'rejected';
  createdAt: string;
  // Influencer
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  followersCount?: number;
  bio?: string;
  city?: string;
  country?: string;
  score?: number;
  reviewsCount?: number;
  plasma?: number;
  photos?: string[];
  // Business
  businessName?: string;
  businessType?: string;
  businessAddress?: string;
  businessCity?: string;
  businessDescription?: string;
  businessLogo?: string;
}

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  validated: { label: 'Validé', color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  rejected: { label: 'Rejeté', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  restaurant: '🍽️ Restaurant', bar: '🍸 Bar', club: '🎵 Club', spa: '💆 Spa',
  sport: '🏋️ Sport', wellness: '🧘 Bien-être', premium: '💎 Lieu Premium', other: '🏢 Autre',
};

function StatCard({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, link }: { icon: LucideIcon; label: string; value: string; link?: string }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-card-2)' }}>
        <Icon size={16} style={{ color: 'var(--text-secondary)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer"
          className="transition-colors"
          style={{ color: 'var(--primary-light)' }}>
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
      {children}
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetchUser = async () => {
    const res = await api(`/admin/users?limit=200`);
    const data = await res.json();
    const found = (data.users || []).find((u: UserDetail) => u._id === id);
    setUser(found || null);
    setLoading(false);
  };

  useEffect(() => { fetchUser(); }, [id]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateStatus = async (status: string) => {
    setActionLoading(status);
    try {
      await api(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      await fetchUser();
      showToast(`Statut mis à jour : ${status === 'validated' ? 'Validé ✓' : 'Rejeté'}`);
    } catch {
      showToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async () => {
    if (!confirm(`Supprimer définitivement ${user?.name} ? Cette action est irréversible.`)) return;
    setActionLoading('delete');
    await api(`/admin/users/${id}`, { method: 'DELETE' });
    router.push('/dashboard/users');
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} />
    </div>
  );

  if (!user) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <p style={{ color: 'var(--text-secondary)' }}>Utilisateur introuvable</p>
      <Link href="/dashboard/users" className="hover:underline text-sm" style={{ color: 'var(--primary-light)' }}>← Retour à la liste</Link>
    </div>
  );

  const statusCfg = STATUS_CONFIG[user.status];
  const isInfluencer = user.type === 'influencer';
  const avatarBg = isInfluencer
    ? 'var(--gradient-primary)'
    : 'linear-gradient(135deg, #a89060, #d4af77)';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl animate-fade-in flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 px-8 py-5 border-b flex items-center gap-4"
        style={{ borderColor: 'var(--border)', background: 'rgba(10,10,15,0.88)', backdropFilter: 'blur(18px)' }}>
        <Link href="/dashboard/users"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all surface"
          style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <Link href="/dashboard/users" className="transition-colors">Utilisateurs</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>{user.name}</span>
          </div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Fiche utilisateur</h1>
        </div>
        <button onClick={fetchUser} className="p-2 rounded-xl transition-all" style={{ color: 'var(--text-muted)' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Hero card */}
          <div className="rounded-3xl p-8 relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-10"
              style={{ background: isInfluencer ? '#c9a961' : '#a89060' }} />

            <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-bold flex-shrink-0"
                style={{ background: avatarBg, color: '#16130d' }}>
                {user.name?.charAt(0)}
              </div>

              {/* Info principale */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{user.name}</h2>
                  {/* Status badge */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
                    style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.color }} />
                    {statusCfg.label}
                  </span>
                  {/* Type badge */}
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold badge-${user.type}`}>
                    {isInfluencer ? '⭐ Influenceur' : user.type === 'business' ? '🏢 Établissement' : '🛡️ Admin'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {user.email && <span className="flex items-center gap-1.5"><Mail size={14} />{user.email}</span>}
                  {user.phone && <span className="flex items-center gap-1.5"><Phone size={14} />{user.phone}</span>}
                  {(user.city || user.businessCity) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} />{user.city || user.businessCity}{user.country ? `, ${user.country}` : ''}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />Inscrit le {new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                {user.bio && (
                  <p className="text-sm leading-relaxed max-w-xl" style={{ color: 'var(--text-secondary)' }}>{user.bio}</p>
                )}
                {user.businessDescription && (
                  <p className="text-sm leading-relaxed max-w-xl" style={{ color: 'var(--text-secondary)' }}>{user.businessDescription}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                {user.status !== 'validated' && (
                  <button onClick={() => updateStatus('validated')} disabled={!!actionLoading}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    {actionLoading === 'validated'
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <CheckCircle size={16} />}
                    Valider l&apos;accès
                  </button>
                )}
                {user.status !== 'rejected' && (
                  <button onClick={() => updateStatus('rejected')} disabled={!!actionLoading}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    {actionLoading === 'rejected'
                      ? <div className="w-4 h-4 border-2 border-red-300/30 border-t-red-400 rounded-full animate-spin" />
                      : <XCircle size={16} />}
                    Rejeter
                  </button>
                )}
                {user.status === 'validated' && (
                  <button onClick={() => updateStatus('pending')} disabled={!!actionLoading}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all"
                    style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                    <Clock size={16} /> Remettre en attente
                  </button>
                )}
                <button onClick={deleteUser} disabled={!!actionLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <Trash2 size={16} /> Supprimer
                </button>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isInfluencer ? (
              <>
                <StatCard icon={Users} label="Followers" value={user.followersCount || 0} color="#d4af77" />
                <StatCard icon={Star} label="Score" value={user.score || 0} color="#f0a500" />
                <StatCard icon={Zap} label="Plasma" value={user.plasma || 0} color="#3b82f6" />
                <StatCard icon={TrendingUp} label="Avis reçus" value={user.reviewsCount || 0} color="#10b981" />
              </>
            ) : (
              <>
                <StatCard icon={Building2} label="Type" value={BUSINESS_TYPE_LABELS[user.businessType || ''] || '—'} color="#f0a500" />
                <StatCard icon={MapPin} label="Ville" value={user.businessCity || user.city || '—'} color="#3b82f6" />
                <StatCard icon={Zap} label="Plasma" value={user.plasma || 0} color="#d4af77" />
                <StatCard icon={Star} label="Score" value={user.score || 0} color="#10b981" />
              </>
            )}
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Informations de contact */}
            <Section title="Contact & Identité">
              {user.email && <InfoRow icon={Mail} label="Email" value={user.email} link={`mailto:${user.email}`} />}
              {user.phone && <InfoRow icon={Phone} label="Téléphone" value={user.phone} link={`tel:${user.phone}`} />}
              {(user.city || user.businessCity) && (
                <InfoRow icon={MapPin} label="Ville" value={`${user.city || user.businessCity}${user.country ? `, ${user.country}` : ''}`} />
              )}
              {user.businessAddress && <InfoRow icon={Globe} label="Adresse" value={user.businessAddress} />}
              <InfoRow icon={Calendar} label="Date d'inscription" value={new Date(user.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
              <InfoRow icon={Shield} label="ID utilisateur" value={user._id} />
            </Section>

            {/* Réseaux sociaux (influenceur) */}
            {isInfluencer && (
              <Section title="Réseaux Sociaux">
                {user.instagram ? (
                  <InfoRow icon={Share2} label="Instagram" value={`@${user.instagram}`} link={`https://instagram.com/${user.instagram}`} />
                ) : (
                  <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>Aucun Instagram renseigné</p>
                )}
                {user.tiktok && (
                  <InfoRow icon={TrendingUp} label="TikTok" value={`@${user.tiktok}`} link={`https://tiktok.com/@${user.tiktok}`} />
                )}
                {user.youtube && (
                  <InfoRow icon={Globe} label="YouTube" value={`@${user.youtube}`} link={`https://youtube.com/@${user.youtube}`} />
                )}
                {!user.instagram && !user.tiktok && !user.youtube && (
                  <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>Aucun réseau social renseigné</p>
                )}
              </Section>
            )}

            {/* Établissement (business) */}
            {!isInfluencer && user.type === 'business' && (
              <Section title="Informations Établissement">
                {user.businessName && <InfoRow icon={Building2} label="Nom" value={user.businessName} />}
                {user.businessType && <InfoRow icon={Globe} label="Type" value={BUSINESS_TYPE_LABELS[user.businessType] || user.businessType} />}
                {user.businessAddress && <InfoRow icon={MapPin} label="Adresse" value={user.businessAddress} />}
                {user.businessCity && <InfoRow icon={MapPin} label="Ville" value={user.businessCity} />}
              </Section>
            )}

            {/* Bio (si présent) */}
            {(user.bio || user.businessDescription) && (
              <Section title={isInfluencer ? 'Biographie' : 'Description'}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {user.bio || user.businessDescription}
                </p>
              </Section>
            )}

            {/* Métriques */}
            <Section title="Métriques & Activité">
              <InfoRow icon={Zap} label="Plasma (monnaie)" value={(user.plasma || 0).toLocaleString()} />
              <InfoRow icon={Star} label="Score de réputation" value={(user.score || 0).toString()} />
              {isInfluencer && <InfoRow icon={Users} label="Nombre de followers" value={(user.followersCount || 0).toLocaleString()} />}
              {isInfluencer && <InfoRow icon={TrendingUp} label="Avis reçus" value={(user.reviewsCount || 0).toString()} />}
            </Section>
          </div>

          {/* Photos (si influenceur avec photos) */}
          {isInfluencer && user.photos && user.photos.length > 0 && (
            <Section title={`Photos (${user.photos.length})`}>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {user.photos.map((photo, i) => (
                  <a key={i} href={photo} target="_blank" rel="noopener noreferrer">
                    <img src={photo} alt={`Photo ${i + 1}`}
                      className="w-full aspect-square object-cover rounded-xl hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}
