'use client';
import { useEffect, useState, Suspense } from 'react';
import { api } from '@/lib/auth';
import Header from '@/components/Header';
import { FileText } from 'lucide-react';

interface Application {
  _id: string;
  influencerId?: { name?: string; city?: string };
  eventId?: { title?: string };
  status: string;
  createdAt: string;
  message?: string;
}

interface EventSummary {
  _id: string;
}

function ApplicationsContent() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all applications via events list (admin sees all)
    api('/admin/users?limit=1').then(() =>
      api('/events').then(r => r.json()).then(async (eventsData: EventSummary[] | { events?: EventSummary[] }) => {
        const events = Array.isArray(eventsData) ? eventsData : eventsData.events || [];
        const allApps: Application[] = [];
        await Promise.all(events.slice(0, 10).map(async (ev) => {
          try {
            const res = await api(`/applications/event/${ev._id}`);
            const data = await res.json();
            if (Array.isArray(data)) allApps.push(...data);
          } catch {}
        }));
        setApps(allApps);
        setLoading(false);
      })
    );
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    pending: 'badge-pending',
    approved: 'badge-validated',
    rejected: 'badge-rejected',
    invited: 'badge-influencer',
  };
  const STATUS_LABELS: Record<string, string> = {
    pending: 'En attente',
    approved: 'Approuvée',
    rejected: 'Refusée',
    invited: 'Invitée',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Candidatures" subtitle={`${apps.length} candidatures chargées`} />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="rounded-[2rem] glass overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b subtle-divider">
                {['Influenceur', 'Événement', 'Statut', 'Date', 'Message'].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i} className="border-b subtle-divider">
                    {Array(5).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 rounded-lg bg-white/5 animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : apps.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                  <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  Aucune candidature
                </td></tr>
              ) : apps.map(app => (
                <tr key={app._id} className="border-b transition-colors" style={{ borderColor: 'rgba(201,169,97,0.08)' }}>
                  <td className="px-5 py-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{app.influencerId?.name || '—'}</td>
                  <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{app.eventId?.title || '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] || 'badge-pending'}`}>
                      {STATUS_LABELS[app.status] || app.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {new Date(app.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-5 py-4 text-sm max-w-48 truncate" style={{ color: 'var(--text-muted)' }}>{app.message || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} /></div>}>
      <ApplicationsContent />
    </Suspense>
  );
}
