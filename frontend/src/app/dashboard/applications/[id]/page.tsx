'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/auth';
import Header from '@/components/Header';
import { ArrowLeft, Star, Check, X, User } from 'lucide-react';

interface ScoreDetails {
  punctuality?: number;
  style?: number;
  attitude?: number;
  content?: number;
}

interface Application {
  _id: string;
  status: string;
  message?: string;
  appliedAt: string;
  respondedAt?: string;
  isInvitation?: boolean;
  user?: {
    _id: string;
    name?: string;
    photos?: string[];
    bio?: string;
    instagram?: string;
    tiktok?: string;
    followersCount?: number;
    score?: number;
    reviewsCount?: number;
    city?: string;
    scoreDetails?: ScoreDetails;
  };
  event?: {
    _id: string;
    title?: string;
    date?: string;
    venue?: string;
    city?: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'badge-pending',
  accepted: 'badge-validated',
  approved: 'badge-validated',
  rejected: 'badge-rejected',
  invited: 'badge-influencer',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Approuvée',
  approved: 'Approuvée',
  rejected: 'Refusée',
  invited: 'Invitée',
};

function ScoreSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--primary)' }}>{value}/10</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: 'var(--primary)' }}
      />
      <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--primary)' }}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.79a8.2 8.2 0 004.79 1.53V6.88a4.85 4.85 0 01-1.02-.19z" />
    </svg>
  );
}

function ApplicationDetailContent() {
  const params = useParams();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [scores, setScores] = useState({ punctuality: 7, style: 7, attitude: 7, content: 7 });
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    api(`/admin/applications/${params.id}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `Erreur ${res.status}`);
        setApp(data.application);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleStatus = async (status: 'accepted' | 'rejected') => {
    if (!app) return;
    setActionLoading(true);
    try {
      const res = await api(`/applications/${app._id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setApp(prev => prev ? { ...prev, status } : prev);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async () => {
    if (!app) return;
    setReviewLoading(true);
    try {
      const res = await api(`/applications/${app._id}/review`, {
        method: 'POST',
        body: JSON.stringify({ scores, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setReviewSuccess(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <X size={40} style={{ color: '#e8594a' }} />
        <p style={{ color: '#e8594a' }}>{error || 'Candidature introuvable'}</p>
        <button onClick={() => router.back()} className="text-sm underline" style={{ color: 'var(--text-muted)' }}>
          Retour
        </button>
      </div>
    );
  }

  const influencer = app.user;
  const mainPhoto = influencer?.photos?.[0];
  const avgScore = ((scores.punctuality + scores.style + scores.attitude + scores.content) / 4).toFixed(1);

  const scoreRows: { key: keyof ScoreDetails; label: string }[] = [
    { key: 'punctuality', label: 'Ponctualité' },
    { key: 'style', label: 'Présentation' },
    { key: 'attitude', label: 'Jovialité' },
    { key: 'content', label: 'Contenu' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Détail candidature"
        subtitle={influencer?.name || 'Influenceur'}
      />

      <div className="flex-1 overflow-y-auto p-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={16} />
          Retour aux candidatures
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Colonne gauche : profil influenceur ── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Carte profil */}
            <div className="rounded-[2rem] glass p-6 space-y-5">
              <div className="flex flex-col items-center text-center gap-3">
                {mainPhoto ? (
                  <img
                    src={mainPhoto}
                    alt={influencer?.name}
                    className="w-24 h-24 rounded-full object-cover border-2"
                    style={{ borderColor: 'var(--primary)' }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <User size={36} style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {influencer?.name || '—'}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {influencer?.city || '—'}
                  </p>
                </div>
                {influencer?.score !== undefined && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(201,169,97,0.12)', color: 'var(--primary)' }}>
                    <Star size={13} fill="currentColor" />
                    <span className="text-sm font-semibold">{influencer.score.toFixed(1)}</span>
                    {!!influencer.reviewsCount && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        ({influencer.reviewsCount} avis)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {influencer?.bio && (
                <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {influencer.bio}
                </p>
              )}

              <div className="space-y-2.5">
                {influencer?.instagram && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <InstagramIcon />
                    <span>@{influencer.instagram.replace('@', '')}</span>
                  </div>
                )}
                {influencer?.tiktok && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <TikTokIcon />
                    <span>@{influencer.tiktok.replace('@', '')}</span>
                  </div>
                )}
                {influencer?.followersCount !== undefined && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: 'var(--primary)' }}>◎</span>
                    <span>{influencer.followersCount.toLocaleString('fr-FR')} followers</span>
                  </div>
                )}
              </div>

              {/* Scores historiques de l'influenceur */}
              {influencer?.scoreDetails && !!influencer.reviewsCount && (
                <div className="pt-4 border-t space-y-3" style={{ borderColor: 'rgba(201,169,97,0.12)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Scores moyens
                  </p>
                  {scoreRows.map(({ key, label }) => {
                    const val = influencer.scoreDetails?.[key] ?? 0;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xs w-24 shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${(val / 10) * 100}%`, backgroundColor: 'var(--primary)' }}
                          />
                        </div>
                        <span className="text-xs font-bold w-5 text-right tabular-nums" style={{ color: 'var(--primary)' }}>
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Galerie photos supplémentaires */}
            {influencer?.photos && influencer.photos.length > 1 && (
              <div className="rounded-[2rem] glass p-5">
                <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                  Photos ({influencer.photos.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {influencer.photos.slice(0, 6).map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt=""
                      className="w-full aspect-square rounded-xl object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Colonne droite : candidature + actions ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Infos de la candidature */}
            <div className="rounded-[2rem] glass p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Candidature
                </h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] || 'badge-pending'}`}>
                  {STATUS_LABELS[app.status] || app.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Événement</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{app.event?.title || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Lieu</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{app.event?.venue || app.event?.city || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Date de candidature</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {app.appliedAt
                      ? new Date(app.appliedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Type</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {app.isInvitation ? 'Invitation' : 'Candidature spontanée'}
                  </p>
                </div>
              </div>

              {app.message && (
                <div
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,169,97,0.1)' }}
                >
                  <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Message</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{app.message}</p>
                </div>
              )}

              {/* Boutons d'action */}
              {app.status === 'pending' && (
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => handleStatus('accepted')}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ backgroundColor: 'rgba(52,199,89,0.12)', color: '#34C759', border: '1px solid rgba(52,199,89,0.28)' }}
                  >
                    <Check size={16} />
                    Accepter
                  </button>
                  <button
                    onClick={() => handleStatus('rejected')}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ backgroundColor: 'rgba(232,89,74,0.1)', color: '#e8594a', border: '1px solid rgba(232,89,74,0.22)' }}
                  >
                    <X size={16} />
                    Refuser
                  </button>
                </div>
              )}

              {app.status === 'accepted' && (
                <button
                  onClick={() => handleStatus('rejected')}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(232,89,74,0.1)', color: '#e8594a', border: '1px solid rgba(232,89,74,0.22)' }}
                >
                  <X size={14} />
                  Annuler l'acceptation
                </button>
              )}
            </div>

            {/* Section notation (disponible uniquement si candidature acceptée) */}
            {(app.status === 'accepted' || app.status === 'approved') && (
              <div className="rounded-[2rem] glass p-6 space-y-5">
                <div>
                  <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Évaluation de l'influenceur
                  </h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Notez la participation de{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {influencer?.name?.split(' ')[0] || "l'influenceur"}
                    </span>{' '}
                    à l'événement
                  </p>
                </div>

                {reviewSuccess ? (
                  <div
                    className="flex items-center gap-3 p-4 rounded-xl"
                    style={{ backgroundColor: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.25)' }}
                  >
                    <Check size={18} color="#34C759" />
                    <p className="text-sm font-medium" style={{ color: '#34C759' }}>
                      Évaluation enregistrée avec succès
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <ScoreSlider
                      label="Ponctualité"
                      value={scores.punctuality}
                      onChange={v => setScores(s => ({ ...s, punctuality: v }))}
                    />
                    <ScoreSlider
                      label="Présentation"
                      value={scores.style}
                      onChange={v => setScores(s => ({ ...s, style: v }))}
                    />
                    <ScoreSlider
                      label="Jovialité"
                      value={scores.attitude}
                      onChange={v => setScores(s => ({ ...s, attitude: v }))}
                    />
                    <ScoreSlider
                      label="Contenu produit"
                      value={scores.content}
                      onChange={v => setScores(s => ({ ...s, content: v }))}
                    />

                    <div>
                      <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                        Commentaire (optionnel)
                      </p>
                      <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Partagez votre retour sur cette collaboration..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(201,169,97,0.15)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Note moyenne :{' '}
                        <span className="font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
                          {avgScore}/10
                        </span>
                      </p>
                      <button
                        onClick={handleReview}
                        disabled={reviewLoading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
                        style={{ background: 'var(--primary)', color: '#0a0a0a' }}
                      >
                        <Star size={14} fill="currentColor" />
                        {reviewLoading ? 'Enregistrement...' : "Enregistrer l'évaluation"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }}
          />
        </div>
      }
    >
      <ApplicationDetailContent />
    </Suspense>
  );
}
