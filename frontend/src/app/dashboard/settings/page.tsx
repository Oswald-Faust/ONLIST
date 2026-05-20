'use client';
import { useState } from 'react';
import { api } from '@/lib/auth';
import Header from '@/components/Header';
import { useAuth } from '@/lib/auth';
import { Shield, Key, UserPlus, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erreur inconnue';
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.75rem] glass p-6 md:p-7">
      <h2 className="panel-title text-3xl leading-none mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');

  const seedAdmin = async () => {
    setSeedLoading(true);
    setSeedMsg('');
    try {
      const res = await api('/admin/seed', { method: 'POST' });
      const data = await res.json();
      setSeedMsg(data.message || 'Succès');
    } catch (error: unknown) {
      setSeedMsg('Erreur: ' + getErrorMessage(error));
    } finally {
      setSeedLoading(false);
    }
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminMsg('');
    try {
      const res = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...newAdmin, type: 'admin', status: 'validated' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAdminMsg('Administrateur créé avec succès !');
      setNewAdmin({ name: '', email: '', password: '' });
    } catch (error: unknown) {
      setAdminMsg('Erreur: ' + getErrorMessage(error));
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Paramètres" subtitle="Configuration du panneau d'administration" />

      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
            <Section title="Mon compte admin" desc="Informations de votre compte administrateur">
              <div className="flex items-center gap-4 p-5 rounded-[1.5rem] surface-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold"
                  style={{ background: 'var(--gradient-primary)', color: '#16130d' }}>
                  {user?.name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-lg truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                  <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
                  <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs badge-admin">
                    <Shield size={10} /> Administrateur
                  </span>
                </div>
              </div>
            </Section>

            <Section title="Configuration API" desc="Paramètres de connexion au backend">
              <div className="flex items-center gap-3 px-4 py-4 rounded-[1.5rem] surface-2">
                <Key size={16} style={{ color: 'var(--text-muted)' }} />
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>API URL</p>
                  <p className="text-sm font-mono truncate" style={{ color: 'var(--text-primary)' }}>{process.env.NEXT_PUBLIC_API_URL}</p>
                </div>
                <span className="ml-auto flex items-center gap-1 text-xs text-green-400 flex-shrink-0">
                  <CheckCircle size={12} /> Connecté
                </span>
              </div>
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Créer un administrateur" desc="Ajouter un nouveau membre de l&apos;équipe admin">
              <form onSubmit={createAdmin} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Nom complet</label>
                  <input required placeholder="Nom du collaborateur" value={newAdmin.name} onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none input-shell focus-ring" />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Email admin</label>
                  <input required type="email" placeholder="admin@onlist.app" value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none input-shell focus-ring" />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Mot de passe</label>
                  <input required type="password" placeholder="Minimum 8 caractères" value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none input-shell focus-ring" />
                </div>

                {adminMsg && (
                  <p className={`text-sm px-3 py-2 rounded-xl ${adminMsg.includes('Erreur') ? 'text-red-400 bg-red-500/10' : 'text-green-400 bg-green-500/10'}`}>
                    {adminMsg}
                  </p>
                )}

                <div className="pt-1">
                  <button type="submit" disabled={adminLoading}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-all disabled:opacity-60 btn-primary">
                    {adminLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus size={16} />}
                    Créer l&apos;administrateur
                  </button>
                </div>
              </form>
            </Section>

            <Section title="Initialisation" desc="Créer le compte admin par défaut (admin@onlist.app / Admin2024!)">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-[1.5rem]" style={{ background: 'rgba(215,167,76,0.1)', border: '1px solid rgba(215,167,76,0.2)' }}>
                  <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-300">Cette action ne fonctionne qu&apos;une seule fois. Si un admin existe déjà, elle sera bloquée.</p>
                </div>

                {seedMsg && (
                  <p className={`text-sm px-3 py-2 rounded-xl ${seedMsg.includes('Erreur') || seedMsg.includes('déjà') ? 'text-red-400 bg-red-500/10' : 'text-green-400 bg-green-500/10'}`}>
                    {seedMsg}
                  </p>
                )}

                <div className="rounded-[1.5rem] surface-2 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--text-muted)' }}>Compte concerné</p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>admin@onlist.app</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Mot de passe initial: Admin2024!</p>
                </div>

                <button onClick={seedAdmin} disabled={seedLoading}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-all disabled:opacity-60"
                  style={{ background: 'rgba(215,167,76,0.12)', border: '1px solid rgba(215,167,76,0.24)', color: '#e7bc6c' }}>
                  {seedLoading ? <div className="w-4 h-4 border-2 border-amber-300/30 border-t-amber-400 rounded-full animate-spin" /> : <Zap size={16} />}
                  Initialiser le compte admin
                </button>
              </div>
            </Section>
          </div>

          <Section title="Notes d&apos;administration" desc="Repères rapides pour éviter les erreurs de configuration.">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] p-4 surface-2">
                <p className="text-xs uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--text-muted)' }}>Accès</p>
                <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                  Les nouveaux comptes créés ici sont enregistrés directement avec le rôle administrateur et le statut validé.
                </p>
              </div>
              <div className="rounded-[1.5rem] p-4 surface-2">
                <p className="text-xs uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--text-muted)' }}>Sécurité</p>
                <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                  Utiliser des mots de passe uniques et éviter de réutiliser le compte par défaut après l&apos;initialisation.
                </p>
              </div>
              <div className="rounded-[1.5rem] p-4 surface-2">
                <p className="text-xs uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--text-muted)' }}>Backend</p>
                <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                  Vérifier l&apos;URL API ci-dessus avant toute opération sensible si l&apos;environnement vient d&apos;être changé.
                </p>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
