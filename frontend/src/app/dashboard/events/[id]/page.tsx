'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/auth';
import Header from '@/components/Header';
import {
  Calendar, MapPin, Clock, Users, Edit3, Trash2, ArrowLeft,
  Eye, EyeOff, Zap, Tag, CheckCircle2, AtSign, Shirt, User,
  Repeat2, TrendingUp, Users2, Sparkles, ChevronRight, Ticket,
} from 'lucide-react';

interface Event {
  _id: string;
  title: string;
  description?: string;
  venue?: string;
  address?: string;
  city: string;
  country?: string;
  category?: string;
  moment?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  dresscode?: string;
  images?: string[];
  maxParticipants?: number;
  acceptedCount?: number;
  minFollowers?: number;
  genderRequirement?: string;
  deliverables?: string[];
  offerItems?: string[];
  accountsToMention?: string[];
  tags?: string[];
  rules?: string;
  ageRequirement?: number;
  guestsRequired?: number;
  repeats?: string;
  isActive?: boolean;
  isFull?: boolean;
  isLive?: boolean;
  isSponsored?: boolean;
  creator?: { name?: string; businessName?: string };
  createdAt: string;
}

interface EventApplication {
  _id: string;
  status: 'pending' | 'accepted' | 'rejected';
  isInvitation?: boolean;
  appliedAt?: string;
  respondedAt?: string;
  message?: string;
  user?: {
    _id?: string;
    name?: string;
    city?: string;
    instagram?: string;
    tiktok?: string;
    followersCount?: number;
    score?: number;
    photos?: string[];
    bio?: string;
  };
}

const CAT_COLORS: Record<string, string> = {
  'restaurant-gastronomique': '#C9A961',
  'restaurant-tendance': '#D8B679',
  'bar-cocktail': '#B98956',
  rooftop: '#E0B96A',
  'club-prive': '#C18A63',
  'hotel-luxe': '#D6C08A',
  'beach-club': '#CFA86A',
  'spa-bien-etre': '#9CBF9A',
  'beauty-lifestyle': '#D4A6A6',
  'fitness-sport': '#8AA7D4',
  'brunch-cafe': '#D0A56D',
  degustation: '#C8B083',
  'lancement-produit': '#C39A6B',
  'experience-vip': '#E0C17B',
  'voyage-sejour': '#98B7A9',
  autre: '#9CA3AF',
  restaurant: '#C9A961', bar: '#A78BFA', club: '#F472B6', spa: '#34D399',
  sport: '#60A5FA', wellness: '#86EFAC', premium: '#FCD34D', other: '#9CA3AF',
};

const CATEGORY_LABELS: Record<string, string> = {
  'restaurant-gastronomique': 'Restaurant gastronomique',
  'restaurant-tendance': 'Restaurant tendance',
  'bar-cocktail': 'Bar à cocktails',
  rooftop: 'Rooftop',
  'club-prive': 'Club privé',
  'hotel-luxe': 'Hôtel de luxe',
  'beach-club': 'Beach club',
  'spa-bien-etre': 'Spa & bien-être',
  'beauty-lifestyle': 'Beauté & lifestyle',
  'fitness-sport': 'Fitness & sport',
  'brunch-cafe': 'Brunch & café',
  degustation: 'Dégustation',
  'lancement-produit': 'Lancement produit',
  'experience-vip': 'Expérience VIP',
  'voyage-sejour': 'Voyage & séjour',
  autre: 'Autre',
  restaurant: 'Restaurant',
  bar: 'Bar',
  club: 'Club',
  spa: 'Spa',
  sport: 'Sport',
  wellness: 'Bien-être',
  premium: 'Premium',
  other: 'Autre',
};

const MOMENT_LABELS: Record<string, string> = {
  'petit-dejeuner': 'Petit-déjeuner',
  brunch: 'Brunch',
  dejeuner: 'Déjeuner',
  gouter: 'Goûter',
  afterwork: 'Afterwork',
  diner: 'Dîner',
  soir: 'Soirée',
  nuit: 'Nuit',
  journee: 'Journée complète',
  morning: 'Matin',
  afternoon: 'Après-midi',
  evening: 'Soirée',
  night: 'Nuit',
};

const GENDER_LABELS: Record<string, string> = {
  any: 'Ouvert à tous',
  female: 'Femme',
  male: 'Homme',
  mixed: 'Mixte',
};

const REPEAT_LABELS: Record<string, string> = {
  none: 'Ponctuel',
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[1.9rem] p-6 space-y-4"
      style={{
        background: 'linear-gradient(180deg, rgba(23,20,17,0.96), rgba(18,16,14,0.98))',
        border: '1px solid rgba(201,169,97,0.14)',
        boxShadow: '0 18px 60px rgba(0,0,0,0.18)',
      }}
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--primary-light)' }}>{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | number }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(201,169,97,0.08)', border: '1px solid rgba(201,169,97,0.14)' }}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-[15px] font-medium leading-6" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

function EventDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [applications, setApplications] = useState<EventApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    Promise.all([
      api(`/admin/events/${id}`).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || `Erreur ${r.status}`);
        return data;
      }),
      api(`/applications/event/${id}`).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || `Erreur ${r.status}`);
        return data;
      }),
    ])
      .then(([eventData, applicationsData]) => {
        setEvent(eventData.event || null);
        setApplications(applicationsData.applications || []);
      })
      .catch((error) => {
        console.error('event detail load error:', error);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Supprimer cet événement définitivement ?')) return;
    setDeleting(true);
    await api(`/admin/events/${id}`, { method: 'DELETE' });
    router.push('/dashboard/events');
  };

  const handleToggleActive = async () => {
    if (!event) return;
    setToggling(true);
    const res = await api(`/admin/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: !event.isActive }),
    });
    const data = await res.json();
    if (data.event) setEvent(data.event);
    setToggling(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Calendar size={40} style={{ color: 'var(--text-muted)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Événement introuvable</p>
        <button onClick={() => router.back()} className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm"
          style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={14} /> Retour
        </button>
      </div>
    );
  }

  const dateStr = event.date ? new Date(event.date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }) : undefined;
  const catColor = CAT_COLORS[event.category || 'other'] || '#9CA3AF';
  const shortLocation = [event.city, CATEGORY_LABELS[event.category || ''] || 'Événement'].filter(Boolean).join(' · ');
  const pendingApplications = applications.filter((application) => application.status === 'pending');
  const acceptedApplications = applications.filter((application) => application.status === 'accepted');
  const rejectedApplications = applications.filter((application) => application.status === 'rejected');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title={event.title} subtitle={shortLocation} />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto w-full max-w-[1460px] space-y-8">

          {/* Top bar actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm transition-opacity hover:opacity-70"
              style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              <ArrowLeft size={14} /> Retour
            </button>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {/* Status badges */}
              {event.isActive ? (
                <span className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ background: 'rgba(16,217,160,0.12)', color: '#10D9A0', border: '1px solid rgba(16,217,160,0.2)' }}>
                  Actif
                </span>
              ) : (
                <span className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ background: 'rgba(100,100,100,0.1)', color: '#888', border: '1px solid rgba(100,100,100,0.2)' }}>
                  Inactif
                </span>
              )}
              {event.isFull && (
                <span className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  Complet
                </span>
              )}
              {event.isSponsored && (
                <span className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ background: 'rgba(201,169,97,0.12)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.2)' }}>
                  Sponsorisé
                </span>
              )}

              <button onClick={handleToggleActive} disabled={toggling}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ background: event.isActive ? 'rgba(239,68,68,0.08)' : 'rgba(16,217,160,0.08)', color: event.isActive ? '#ef4444' : '#10D9A0', border: `1px solid ${event.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,217,160,0.2)'}` }}>
                {event.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                {event.isActive ? 'Désactiver' : 'Activer'}
              </button>

              <button onClick={() => router.push(`/dashboard/events/${id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-opacity hover:opacity-80"
                style={{ background: 'rgba(201,169,97,0.12)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.2)' }}>
                <Edit3 size={14} /> Modifier
              </button>

              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Trash2 size={14} /> {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>

          <section
            className="overflow-hidden rounded-[2rem]"
            style={{
              background: 'linear-gradient(135deg, rgba(29,24,20,0.95), rgba(16,14,12,0.98))',
              border: '1px solid rgba(201,169,97,0.12)',
              boxShadow: '0 30px 90px rgba(0,0,0,0.24)',
            }}
          >
            <div className="grid grid-cols-1 xl:grid-cols-[460px_minmax(0,1fr)]">
              <div className="relative min-h-[420px]">
                {event.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.images[0]} alt={event.title} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.16), rgba(201,169,97,0.03))' }}>
                    <Calendar size={44} style={{ color: 'rgba(201,169,97,0.35)' }} />
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(9,8,7,0.08), rgba(9,8,7,0.82))' }} />

                <div className="absolute left-6 right-6 top-6 flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{ background: `${catColor}22`, color: catColor, border: `1px solid ${catColor}44` }}>
                      {CATEGORY_LABELS[event.category || ''] || event.category || 'Autre'}
                    </span>
                    {event.moment && (
                      <span className="rounded-full px-3 py-1.5 text-xs"
                        style={{ background: 'rgba(255,255,255,0.08)', color: '#f3ecdf', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {MOMENT_LABELS[event.moment] || event.moment}
                      </span>
                    )}
                  </div>
                  {event.isSponsored && (
                    <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
                      style={{ background: 'rgba(201,169,97,0.14)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.18)' }}>
                      <Sparkles size={12} /> Sponsorisé
                    </div>
                  )}
                </div>

                <div className="absolute inset-x-6 bottom-6 space-y-4">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'rgba(240,235,224,0.72)' }}>Expérience</p>
                    <h1 className="max-w-md text-[2rem] leading-tight panel-title" style={{ color: '#fff' }}>{event.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'rgba(240,235,224,0.82)' }}>
                      {dateStr && <span className="flex items-center gap-2"><Calendar size={14} /> {dateStr}</span>}
                      {[event.venue, event.city].filter(Boolean).length > 0 && (
                        <span className="flex items-center gap-2"><MapPin size={14} /> {[event.venue, event.city].filter(Boolean).join(', ')}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-[1.3rem] p-4" style={{ background: 'rgba(12,11,10,0.42)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'rgba(240,235,224,0.6)' }}>Acceptés</p>
                      <p className="mt-2 text-2xl font-semibold" style={{ color: '#fff' }}>{event.acceptedCount ?? 0}</p>
                    </div>
                    <div className="rounded-[1.3rem] p-4" style={{ background: 'rgba(12,11,10,0.42)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'rgba(240,235,224,0.6)' }}>Places</p>
                      <p className="mt-2 text-2xl font-semibold" style={{ color: '#fff' }}>{event.maxParticipants ?? '—'}</p>
                    </div>
                    <div className="rounded-[1.3rem] p-4" style={{ background: 'rgba(12,11,10,0.42)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'rgba(240,235,224,0.6)' }}>Candidatures</p>
                      <p className="mt-2 text-2xl font-semibold" style={{ color: '#fff' }}>{applications.length}</p>
                    </div>
                    <div className="rounded-[1.3rem] p-4" style={{ background: 'rgba(12,11,10,0.42)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'rgba(240,235,224,0.6)' }}>Statut</p>
                      <p className="mt-2 text-lg font-semibold" style={{ color: event.isActive ? '#10D9A0' : '#b2a38c' }}>
                        {event.isActive ? 'Actif' : 'Inactif'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 lg:p-8 space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] p-5"
                    style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(201,169,97,0.12)' }}>
                    <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--primary-light)' }}>Informations clés</p>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <InfoRow icon={<Calendar size={15} style={{ color: 'var(--primary-light)' }} />} label="Date" value={dateStr} />
                      {(event.startTime || event.endTime) && (
                        <InfoRow icon={<Clock size={15} style={{ color: 'var(--primary-light)' }} />} label="Horaires" value={[event.startTime, event.endTime].filter(Boolean).join(' → ')} />
                      )}
                      <InfoRow
                        icon={<MapPin size={15} style={{ color: 'var(--primary-light)' }} />}
                        label="Lieu"
                        value={[event.venue, event.address, event.city, event.country].filter(Boolean).join(', ')}
                      />
                      {event.dresscode && (
                        <InfoRow icon={<Shirt size={15} style={{ color: 'var(--primary-light)' }} />} label="Dress code" value={event.dresscode} />
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] p-5"
                    style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(201,169,97,0.12)' }}>
                    <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--primary-light)' }}>Profil recherché</p>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <InfoRow icon={<User size={15} style={{ color: 'var(--primary-light)' }} />} label="Âge min." value={event.ageRequirement ? `${event.ageRequirement}+` : undefined} />
                      <InfoRow icon={<Users2 size={15} style={{ color: 'var(--primary-light)' }} />} label="Genre" value={event.genderRequirement ? GENDER_LABELS[event.genderRequirement] || event.genderRequirement : undefined} />
                      <InfoRow icon={<TrendingUp size={15} style={{ color: 'var(--primary-light)' }} />} label="Min. followers" value={event.minFollowers ? `${event.minFollowers >= 1000 ? `${(event.minFollowers / 1000).toFixed(0)}K` : event.minFollowers}+` : undefined} />
                      <InfoRow icon={<Users size={15} style={{ color: 'var(--primary-light)' }} />} label="Guests requis" value={event.guestsRequired ? `+${event.guestsRequired}` : undefined} />
                    </div>
                    {event.repeats && event.repeats !== 'none' && (
                      <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(201,169,97,0.1)' }}>
                        <InfoRow icon={<Repeat2 size={15} style={{ color: 'var(--primary-light)' }} />} label="Fréquence" value={REPEAT_LABELS[event.repeats] || event.repeats} />
                      </div>
                    )}
                  </div>
                </div>

                {event.images && event.images.length > 1 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--primary-light)' }}>Galerie d&apos;ambiance</p>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{event.images.length - 1} visuel{event.images.length - 1 > 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {event.images.slice(1, 5).map((image, index) => (
                        <div key={`${image}-${index}`} className="overflow-hidden rounded-[1.35rem]" style={{ height: 124 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image} alt={`${event.title}-${index + 2}`} className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
            <div className="space-y-6">

              {event.description && (
                <Section title="Narration de l'expérience">
                  <p className="text-[15px] leading-8" style={{ color: 'var(--text-secondary)' }}>{event.description}</p>
                </Section>
              )}

              {event.rules && (
                <Section title="Règles & cadre de participation">
                  <p className="text-[15px] leading-8" style={{ color: 'var(--text-secondary)' }}>{event.rules}</p>
                </Section>
              )}

              <Section title="Candidatures reçues">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'En attente', value: pendingApplications.length, tone: '#F59E0B' },
                    { label: 'Acceptées', value: acceptedApplications.length, tone: '#10D9A0' },
                    { label: 'Refusées', value: rejectedApplications.length, tone: '#EF4444' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[1.35rem] p-4"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,169,97,0.12)' }}
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold" style={{ color: item.tone }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {applications.length === 0 ? (
                  <div
                    className="rounded-[1.5rem] p-6 text-sm"
                    style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', border: '1px solid rgba(201,169,97,0.1)' }}
                  >
                    Aucune candidature pour cet événement pour le moment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applications.map((application) => {
                      const creator = application.user;
                      const tone = application.status === 'accepted'
                        ? '#10D9A0'
                        : application.status === 'rejected'
                          ? '#EF4444'
                          : '#F59E0B';
                      const statusLabel = application.status === 'accepted'
                        ? 'Acceptée'
                        : application.status === 'rejected'
                          ? 'Refusée'
                          : 'En attente';

                      return (
                        <div
                          key={application._id}
                          className="rounded-[1.5rem] p-5"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,169,97,0.12)' }}
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-start gap-4 min-w-0">
                              <div
                                className="h-12 w-12 overflow-hidden rounded-2xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(201,169,97,0.12)', border: '1px solid rgba(201,169,97,0.18)' }}
                              >
                                {creator?.photos?.[0] ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={creator.photos[0]} alt={creator.name || 'Influenceur'} className="h-full w-full object-cover" />
                                ) : (
                                  <Users size={18} style={{ color: 'var(--primary-light)' }} />
                                )}
                              </div>

                              <div className="min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    {creator?.name || 'Influenceur'}
                                  </p>
                                  <span
                                    className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                                    style={{ background: `${tone}20`, color: tone, border: `1px solid ${tone}33` }}
                                  >
                                    {statusLabel}
                                  </span>
                                  {application.isInvitation && (
                                    <span
                                      className="rounded-full px-2.5 py-1 text-[11px]"
                                      style={{ background: 'rgba(201,169,97,0.12)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.18)' }}
                                    >
                                      Invitation
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                  {creator?.city && <span className="flex items-center gap-1.5"><MapPin size={13} /> {creator.city}</span>}
                                  {typeof creator?.followersCount === 'number' && (
                                    <span className="flex items-center gap-1.5"><TrendingUp size={13} /> {creator.followersCount.toLocaleString()} followers</span>
                                  )}
                                  {typeof creator?.score === 'number' && creator.score > 0 && (
                                    <span className="flex items-center gap-1.5"><Sparkles size={13} /> {creator.score.toFixed(1)}/10</span>
                                  )}
                                  {application.appliedAt && (
                                    <span className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(application.appliedAt).toLocaleDateString('fr-FR')}</span>
                                  )}
                                </div>

                                {application.message && (
                                  <p className="text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>
                                    {application.message}
                                  </p>
                                )}

                                {(creator?.instagram || creator?.tiktok) && (
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {creator?.instagram && (
                                      <span className="rounded-full px-3 py-1 text-xs" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                                        @{creator.instagram.replace('@', '')}
                                      </span>
                                    )}
                                    {creator?.tiktok && (
                                      <span className="rounded-full px-3 py-1 text-xs" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                                        @{creator.tiktok.replace('@', '')}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {creator?._id && (
                              <button
                                onClick={() => router.push(`/dashboard/users/${creator._id}`)}
                                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm transition-opacity hover:opacity-75"
                                style={{ background: 'rgba(201,169,97,0.1)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.18)' }}
                              >
                                Voir le profil <ChevronRight size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
            </div>

            <div className="space-y-6">
              {event.deliverables && event.deliverables.length > 0 && (
                <Section title="Livrables">
                  <div className="space-y-2">
                    {event.deliverables.map((d, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-3"
                        style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(201,169,97,0.1)' }}>
                        <CheckCircle2 size={15} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />
                        <span className="text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          </div>

          {(event.offerItems?.length || event.accountsToMention?.length || event.tags?.length) ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              {event.offerItems && event.offerItems.length > 0 && (
                <Section title="Offre proposée">
                  <div className="flex flex-wrap gap-2">
                    {event.offerItems.map((item, i) => (
                      <span key={i} className="text-xs px-3 py-2 rounded-full"
                        style={{ background: 'rgba(201,169,97,0.1)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.18)' }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {event.accountsToMention && event.accountsToMention.length > 0 && (
                <Section title="Comptes à mentionner">
                  <div className="flex flex-wrap gap-2">
                    {event.accountsToMention.map((acc, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-full"
                        style={{ background: 'rgba(201,169,97,0.08)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.15)' }}>
                        <AtSign size={12} /> {acc}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {event.tags && event.tags.length > 0 && (
                <Section title="Tags éditoriaux">
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'var(--bg-card2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                        <Tag size={10} /> {tag}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} />
      </div>
    }>
      <EventDetailContent />
    </Suspense>
  );
}
