'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/auth';
import Header from '@/components/Header';
import { FileText, AlertCircle, ChevronRight } from 'lucide-react';

interface Application {
  _id: string;
  user?: { name?: string; city?: string };
  event?: { title?: string };
  status: string;
  appliedAt: string;
  message?: string;
}

function ApplicationsContent() {
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api('/admin/applications')
      .then(async res => {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok) throw new Error(data.message || `Erreur ${res.status}`);
        setApps(data.applications || []);
      })
      .catch((err: Error) => {
        console.error('applications fetch error:', err);
        setError(
          err.message.includes('Unexpected token')
            ? 'Le backend local ne renvoie pas encore la route des candidatures. Redémarre le serveur backend avec le code à jour.'
            : err.message
        );
      })
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Candidatures" subtitle={`${apps.length} candidatures chargées`} />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="rounded-[2rem] glass overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b subtle-divider">
                {['Influenceur', 'Événement', 'Statut', 'Date', 'Message', ''].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i} className="border-b subtle-divider">
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 rounded-lg bg-white/5 animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr><td colSpan={6} className="text-center py-16" style={{ color: '#e8594a' }}>
                  <AlertCircle size={40} className="mx-auto mb-3" />
                  {error}
                </td></tr>
              ) : apps.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                  <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  Aucune candidature
                </td></tr>
              ) : apps.map(app => (
                <tr
                  key={app._id}
                  className="border-b transition-colors cursor-pointer hover:bg-white/[0.02]"
                  style={{ borderColor: 'rgba(201,169,97,0.08)' }}
                  onClick={() => router.push(`/dashboard/applications/${app._id}`)}
                >
                  <td className="px-5 py-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{app.user?.name || '—'}</td>
                  <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{app.event?.title || '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] || 'badge-pending'}`}>
                      {STATUS_LABELS[app.status] || app.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-5 py-4 text-sm max-w-48 truncate" style={{ color: 'var(--text-muted)' }}>{app.message || '—'}</td>
                  <td className="px-5 py-4">
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </td>
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
