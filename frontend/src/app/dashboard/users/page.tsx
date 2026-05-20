'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/auth';
import Header from '@/components/Header';
import { Search, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  type: 'influencer' | 'business' | 'admin';
  status: 'pending' | 'validated' | 'rejected';
  createdAt: string;
  instagram?: string;
  tiktok?: string;
  followersCount?: number;
  city?: string;
  businessName?: string;
  businessType?: string;
  plasma?: number;
  score?: number;
}

const STATUS_MAP = {
  pending: { label: 'En attente', color: '#f59e0b', bg: 'badge-pending', icon: Clock },
  validated: { label: 'Validé', color: '#10b981', bg: 'badge-validated', icon: CheckCircle },
  rejected: { label: 'Rejeté', color: '#ef4444', bg: 'badge-rejected', icon: XCircle },
};



function UsersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const status = searchParams.get('status') || '';
  const type = searchParams.get('type') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const LIMIT = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    params.set('page', String(page));
    params.set('limit', String(LIMIT));
    const res = await api(`/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [status, type, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = search
    ? users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search) ||
        u.city?.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    p.set('page', '1');
    router.push(`/dashboard/users?${p}`);
  };

  const totalPages = Math.ceil(total / LIMIT);

  const quickAction = async (userId: string, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api(`/admin/users/${userId}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    fetchUsers();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Utilisateurs" subtitle={`${total} utilisateurs au total`} />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl flex-1 min-w-48 input-shell"
            style={{ maxWidth: 680 }}>
            <Search size={16} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email, ville..." className="bg-transparent text-sm outline-none w-full placeholder-gray-600" style={{ color: 'var(--text-primary)' }} />
          </div>

          <div className="flex rounded-2xl overflow-hidden segmented">
            {[['', 'Tous'], ['pending', 'En attente'], ['validated', 'Validés'], ['rejected', 'Rejetés']].map(([val, lbl]) => (
              <button key={val} onClick={() => setFilter('status', val)}
                className={`px-4 py-3 text-sm font-medium transition-all ${status === val ? 'segmented-active' : ''}`}
                style={status === val ? {} : { color: 'var(--text-muted)' }}>
                {lbl}
              </button>
            ))}
          </div>

          <div className="flex rounded-2xl overflow-hidden segmented">
            {[['', 'Tous'], ['influencer', 'Influenceurs'], ['business', 'Établissements']].map(([val, lbl]) => (
              <button key={val} onClick={() => setFilter('type', val)}
                className={`px-4 py-3 text-sm font-medium transition-all ${type === val ? 'segmented-active' : ''}`}
                style={type === val ? {} : { color: 'var(--text-muted)' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] glass overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b subtle-divider">
                {['Utilisateur', 'Contact', 'Type', 'Statut', 'Ville', 'Inscrit le', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b subtle-divider">
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 rounded-lg bg-white/5 animate-pulse" style={{ width: j === 0 ? '120px' : '80px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Aucun utilisateur trouvé</td></tr>
              ) : (
                filtered.map(u => (
                  <tr key={u._id} onClick={() => router.push(`/dashboard/users/${u._id}`)}
                    className="border-b transition-colors cursor-pointer"
                    style={{ borderColor: 'rgba(201,169,97,0.08)' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: u.type === 'influencer' ? 'var(--gradient-primary)' : 'linear-gradient(135deg, #a89060, #d4af77)', color: '#16130d' }}>
                          {u.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                          {u.businessName && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.businessName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm max-w-36 truncate" style={{ color: 'var(--text-secondary)' }}>{u.email || u.phone || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium badge-${u.type}`}>
                        {u.type === 'influencer' ? 'Influenceur' : u.type === 'business' ? 'Business' : 'Admin'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium badge-${u.status}`}>
                        {STATUS_MAP[u.status]?.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{u.city || '—'}</td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        {u.status === 'pending' && (
                          <>
                            <button onClick={e => quickAction(u._id, 'validated', e)}
                              className="p-2 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors" title="Valider">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={e => quickAction(u._id, 'rejected', e)}
                              className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors" title="Rejeter">
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        <button onClick={() => router.push(`/dashboard/users/${u._id}`)}
                          className="p-2 rounded-lg transition-colors" title="Voir la fiche" style={{ color: 'var(--text-muted)' }}>
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} sur {total}
            </p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}
                className="p-2 rounded-2xl disabled:opacity-30 transition-all surface"
                style={{ color: 'var(--text-secondary)' }}>
                <ChevronLeft size={18} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setFilter('page', String(page + 1))}
                className="p-2 rounded-2xl disabled:opacity-30 transition-all surface"
                style={{ color: 'var(--text-secondary)' }}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} /></div>}>
      <UsersContent />
    </Suspense>
  );
}
