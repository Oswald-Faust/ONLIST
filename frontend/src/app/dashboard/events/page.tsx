'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/auth';
import Header from '@/components/Header';
import {
  Calendar, MapPin, Users, Clock, Search, Plus, Eye, EyeOff, Trash2, Edit3, LayoutGrid, Rows3,
} from 'lucide-react';

interface Event {
  _id: string;
  title: string;
  description?: string;
  venue?: string;
  address?: string;
  city: string;
  category?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  images?: string[];
  maxParticipants?: number;
  acceptedCount?: number;
  isActive?: boolean;
  isFull?: boolean;
  isLive?: boolean;
  isSponsored?: boolean;
  createdAt: string;
}

const CAT_COLORS: Record<string, string> = {
  restaurant: '#C9A961', bar: '#A78BFA', club: '#F472B6', spa: '#34D399',
  sport: '#60A5FA', wellness: '#86EFAC', premium: '#FCD34D', other: '#9CA3AF',
};

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  bar: 'Bar',
  club: 'Club',
  spa: 'Spa',
  sport: 'Sport',
  wellness: 'Bien-être',
  premium: 'Premium',
  other: 'Autre',
};

function EventCard({ ev, onToggleActive, onDelete }: {
  ev: Event;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const dateStr = ev.date ? new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD';
  const catColor = CAT_COLORS[ev.category || 'other'] || '#9CA3AF';
  const categoryLabel = CATEGORY_LABELS[ev.category || 'other'] || ev.category || 'Autre';

  return (
    <div className="rounded-[1.75rem] overflow-hidden transition-all animate-fade-in flex flex-col"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>

      {/* Cover */}
      <div className="relative flex-shrink-0 cursor-pointer" style={{ height: 160 }}
        onClick={() => router.push(`/dashboard/events/${ev._id}`)}>
        {ev.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ev.images[0]} alt={ev.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.06), rgba(201,169,97,0.02))' }}>
            <Calendar size={28} style={{ color: 'rgba(201,169,97,0.25)' }} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)' }} />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{
              background: 'rgba(17, 15, 12, 0.78)',
              color: '#F3E8D1',
              border: `1px solid ${catColor}66`,
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 22px rgba(0,0,0,0.28)',
            }}>
            {categoryLabel}
          </span>
          {ev.isFull && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
              FULL
            </span>
          )}
          {ev.isLive && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
              style={{ background: 'rgba(16,217,160,0.2)', color: '#10D9A0' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />LIVE
            </span>
          )}
          {!ev.isActive && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(80,80,80,0.3)', color: '#888' }}>
              Inactif
            </span>
          )}
        </div>

        <p className="absolute bottom-2.5 left-3 right-3 font-bold text-sm line-clamp-1 text-white">{ev.title}</p>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 space-y-1.5">
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><Clock size={11} />{dateStr}</span>
          {ev.startTime && <span>{ev.startTime}</span>}
        </div>
        {(ev.venue || ev.city) && (
          <p className="flex items-center gap-1 text-xs line-clamp-1" style={{ color: 'var(--text-muted)' }}>
            <MapPin size={10} /> {[ev.venue, ev.city].filter(Boolean).join(', ')}
          </p>
        )}
        {ev.maxParticipants != null && (
          <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Users size={10} /> {ev.acceptedCount ?? 0}/{ev.maxParticipants} influenceurs
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-4">
        <button onClick={() => router.push(`/dashboard/events/${ev._id}`)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs transition-opacity hover:opacity-75"
          style={{ background: 'rgba(201,169,97,0.08)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.15)' }}>
          <Eye size={12} /> Détail
        </button>
        <button onClick={() => router.push(`/dashboard/events/${ev._id}/edit`)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs transition-opacity hover:opacity-75"
          style={{ background: 'rgba(201,169,97,0.08)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.15)' }}>
          <Edit3 size={12} /> Modifier
        </button>
        <button onClick={onToggleActive}
          className="w-8 h-8 flex items-center justify-center rounded-xl transition-opacity hover:opacity-75"
          style={{ background: ev.isActive ? 'rgba(239,68,68,0.06)' : 'rgba(16,217,160,0.06)', border: `1px solid ${ev.isActive ? 'rgba(239,68,68,0.18)' : 'rgba(16,217,160,0.18)'}` }}>
          {ev.isActive
            ? <EyeOff size={13} style={{ color: '#ef4444' }} />
            : <Eye size={13} style={{ color: '#10D9A0' }} />}
        </button>
        <button onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center rounded-xl transition-opacity hover:opacity-75"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
          <Trash2 size={13} style={{ color: '#ef4444' }} />
        </button>
      </div>
    </div>
  );
}

function EventListRow({ ev, onToggleActive, onDelete }: {
  ev: Event;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const dateStr = ev.date ? new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD';
  const catColor = CAT_COLORS[ev.category || 'other'] || '#9CA3AF';
  const categoryLabel = CATEGORY_LABELS[ev.category || 'other'] || ev.category || 'Autre';

  return (
    <div
      className="grid grid-cols-[112px_minmax(0,1.55fr)_minmax(0,1fr)_auto] items-center gap-5 rounded-[1.6rem] p-4 transition-all animate-fade-in"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
    >
      <button
        type="button"
        onClick={() => router.push(`/dashboard/events/${ev._id}`)}
        className="relative h-24 overflow-hidden rounded-[1.25rem] text-left"
      >
        {ev.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ev.images[0]} alt={ev.title} className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.06), rgba(201,169,97,0.02))' }}
          >
            <Calendar size={24} style={{ color: 'rgba(201,169,97,0.25)' }} />
          </div>
        )}
      </button>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: 'rgba(201,169,97,0.10)',
              color: '#F3E8D1',
              border: `1px solid ${catColor}55`,
            }}
          >
            {categoryLabel}
          </span>
          {!ev.isActive && (
            <span className="rounded-full px-2.5 py-1 text-[11px]" style={{ background: 'rgba(80,80,80,0.3)', color: '#888' }}>
              Inactif
            </span>
          )}
          {ev.isFull && (
            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
              FULL
            </span>
          )}
          {ev.isLive && (
            <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'rgba(16,217,160,0.2)', color: '#10D9A0' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />LIVE
            </span>
          )}
        </div>

        <button type="button" onClick={() => router.push(`/dashboard/events/${ev._id}`)} className="block text-left">
          <p className="text-base font-semibold line-clamp-1" style={{ color: 'var(--text-primary)' }}>{ev.title}</p>
        </button>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><Clock size={11} />{dateStr}</span>
          {(ev.venue || ev.city) && <span className="flex items-center gap-1"><MapPin size={11} />{[ev.venue, ev.city].filter(Boolean).join(', ')}</span>}
        </div>
      </div>

      <div className="min-w-0 space-y-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        {ev.startTime && (
          <p className="line-clamp-1">
            Horaire: <span style={{ color: 'var(--text-primary)' }}>{[ev.startTime, ev.endTime].filter(Boolean).join(' → ')}</span>
          </p>
        )}
        {ev.maxParticipants != null && (
          <p className="flex items-center gap-1">
            <Users size={11} /> <span style={{ color: 'var(--text-primary)' }}>{ev.acceptedCount ?? 0}/{ev.maxParticipants}</span> influenceurs
          </p>
        )}
        {ev.description && <p className="line-clamp-2">{ev.description}</p>}
      </div>

      <div className="flex items-center justify-end gap-2 self-stretch">
        <button onClick={() => router.push(`/dashboard/events/${ev._id}`)}
          className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs transition-opacity hover:opacity-75"
          style={{ background: 'rgba(201,169,97,0.08)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.15)' }}>
          <Eye size={12} /> Détail
        </button>
        <button onClick={() => router.push(`/dashboard/events/${ev._id}/edit`)}
          className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs transition-opacity hover:opacity-75"
          style={{ background: 'rgba(201,169,97,0.08)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.15)' }}>
          <Edit3 size={12} /> Modifier
        </button>
        <button onClick={onToggleActive}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-opacity hover:opacity-75"
          style={{ background: ev.isActive ? 'rgba(239,68,68,0.06)' : 'rgba(16,217,160,0.06)', border: `1px solid ${ev.isActive ? 'rgba(239,68,68,0.18)' : 'rgba(16,217,160,0.18)'}` }}>
          {ev.isActive ? <EyeOff size={13} style={{ color: '#ef4444' }} /> : <Eye size={13} style={{ color: '#10D9A0' }} />}
        </button>
        <button onClick={onDelete}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-opacity hover:opacity-75"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
          <Trash2 size={13} style={{ color: '#ef4444' }} />
        </button>
      </div>
    </div>
  );
}

function EventsContent() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const load = useCallback(() => {
    setLoading(true);
    api('/admin/events').then(r => r.json()).then(data => {
      setEvents(Array.isArray(data) ? data : data.events || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = events.filter(e => {
    const matchSearch = !search
      || e.title?.toLowerCase().includes(search.toLowerCase())
      || e.city?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all'
      || (filter === 'active' && e.isActive)
      || (filter === 'inactive' && !e.isActive)
      || (filter === 'full' && e.isFull);
    return matchSearch && matchFilter;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet événement ?')) return;
    setDeleting(id);
    await api(`/admin/events/${id}`, { method: 'DELETE' });
    setEvents(prev => prev.filter(e => e._id !== id));
    setDeleting(null);
  };

  const handleToggleActive = async (ev: Event) => {
    const res = await api(`/admin/events/${ev._id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: !ev.isActive }),
    });
    const data = await res.json();
    if (data.event) setEvents(prev => prev.map(e => e._id === ev._id ? data.event : e));
  };

  const FILTERS = [
    { id: 'all', label: 'Tous' },
    { id: 'active', label: 'Actifs' },
    { id: 'inactive', label: 'Inactifs' },
    { id: 'full', label: 'Complets' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Événements" subtitle={`${events.length} événement${events.length !== 1 ? 's' : ''}`} />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl max-w-xs flex-1 input-shell">
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par titre ou ville..."
              className="bg-transparent text-sm outline-none w-full"
              style={{ color: 'var(--text-primary)' }} />
          </div>

          <div className="flex gap-1.5">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: filter === f.id ? 'rgba(201,169,97,0.12)' : 'var(--bg-card)',
                  color: filter === f.id ? 'var(--primary-light)' : 'var(--text-muted)',
                  border: `1px solid ${filter === f.id ? 'rgba(201,169,97,0.22)' : 'var(--border)'}`,
                }}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-2xl p-1 ml-auto"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setView('grid')}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all"
              style={{
                background: view === 'grid' ? 'rgba(201,169,97,0.12)' : 'transparent',
                color: view === 'grid' ? 'var(--primary-light)' : 'var(--text-muted)',
                border: `1px solid ${view === 'grid' ? 'rgba(201,169,97,0.22)' : 'transparent'}`,
              }}
            >
              <LayoutGrid size={13} /> Grille
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all"
              style={{
                background: view === 'list' ? 'rgba(201,169,97,0.12)' : 'transparent',
                color: view === 'list' ? 'var(--primary-light)' : 'var(--text-muted)',
                border: `1px solid ${view === 'list' ? 'rgba(201,169,97,0.22)' : 'transparent'}`,
              }}
            >
              <Rows3 size={13} /> Liste
            </button>
          </div>

          <button onClick={() => router.push('/dashboard/events/new')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #C0A981, #D4AF77)', color: '#000' }}>
            <Plus size={16} /> Créer un événement
          </button>
        </div>

        <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-4'}>
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className={`rounded-[1.75rem] animate-pulse ${view === 'grid' ? 'h-72' : 'h-28'}`}
                style={{ background: 'var(--bg-card)' }} />
            ))
          ) : filtered.length === 0 ? (
            <div className={`${view === 'grid' ? 'col-span-3' : ''} text-center py-20 space-y-4`}>
              <Calendar size={36} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>
                {search ? `Aucun résultat pour "${search}"` : 'Aucun événement'}
              </p>
              <button onClick={() => router.push('/dashboard/events/new')}
                className="px-6 py-2.5 rounded-2xl text-sm font-medium inline-flex items-center gap-2"
                style={{ background: 'rgba(201,169,97,0.08)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.18)' }}>
                <Plus size={14} /> Créer le premier événement
              </button>
            </div>
          ) : (
            filtered.map(ev => (
              <div key={ev._id} style={{ opacity: deleting === ev._id ? 0.4 : 1, transition: 'opacity .15s' }}>
                {view === 'grid' ? (
                  <EventCard
                    ev={ev}
                    onToggleActive={() => handleToggleActive(ev)}
                    onDelete={() => handleDelete(ev._id)}
                  />
                ) : (
                  <EventListRow
                    ev={ev}
                    onToggleActive={() => handleToggleActive(ev)}
                    onDelete={() => handleDelete(ev._id)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} />
      </div>
    }>
      <EventsContent />
    </Suspense>
  );
}
