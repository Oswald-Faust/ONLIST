'use client';
import { useEffect, useState, Suspense } from 'react';
import { api } from '@/lib/auth';
import Header from '@/components/Header';
import { Calendar, MapPin, Users, Clock, Search } from 'lucide-react';

interface Event {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  date?: string;
  businessId?: { name?: string; businessName?: string };
  maxInfluencers?: number;
  status?: string;
  createdAt: string;
}

function EventsContent() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api('/events').then(r => r.json()).then(data => {
      setEvents(Array.isArray(data) ? data : data.events || []);
      setLoading(false);
    });
  }, []);

  const filtered = search
    ? events.filter(e => e.title?.toLowerCase().includes(search.toLowerCase()) || e.location?.toLowerCase().includes(search.toLowerCase()))
    : events;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Événements" subtitle={`${events.length} événements au total`} />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl max-w-sm input-shell">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un événement..." className="bg-transparent text-sm outline-none w-full placeholder-gray-600" style={{ color: 'var(--text-primary)' }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? Array(6).fill(0).map((_, i) => (
            <div key={i} className="rounded-2xl p-6 glass animate-pulse h-48" />
          )) : filtered.length === 0 ? (
            <div className="col-span-3 text-center py-16">
              <Calendar size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Aucun événement trouvé</p>
            </div>
          ) : filtered.map(ev => (
            <div key={ev._id} className="rounded-[1.75rem] p-6 glass transition-all animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(201,169,97,0.12)', border: '1px solid rgba(201,169,97,0.18)' }}>
                  <Calendar size={18} style={{ color: 'var(--primary-light)' }} />
                </div>
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={12} /> {ev.date ? new Date(ev.date).toLocaleDateString('fr-FR') : 'Date TBD'}
                </span>
              </div>
              <h3 className="font-bold mb-1 line-clamp-1" style={{ color: 'var(--text-primary)' }}>{ev.title || 'Sans titre'}</h3>
              <p className="text-sm line-clamp-2 mb-4" style={{ color: 'var(--text-secondary)' }}>{ev.description || 'Aucune description'}</p>
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                {ev.location && (
                  <span className="flex items-center gap-1"><MapPin size={12} />{ev.location}</span>
                )}
                {ev.maxInfluencers && (
                  <span className="flex items-center gap-1"><Users size={12} />{ev.maxInfluencers} influenceurs</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} /></div>}>
      <EventsContent />
    </Suspense>
  );
}
