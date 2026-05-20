'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Eye, EyeOff, LogIn, Hexagon } from 'lucide-react';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erreur de connexion';
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden app-shell px-4">
      <div className="absolute inset-0 pointer-events-none opacity-70"
        style={{ background: 'linear-gradient(135deg, rgba(201,169,97,0.04), transparent 35%, transparent 60%, rgba(201,169,97,0.03))' }} />
      <div className="absolute w-[34rem] h-[34rem] rounded-full blur-3xl opacity-20 top-[-8rem] right-[-6rem] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,169,97,0.42), transparent 60%)' }} />
      <div className="absolute w-[26rem] h-[26rem] rounded-full blur-3xl opacity-10 bottom-[-6rem] left-[-4rem] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,144,96,0.36), transparent 60%)' }} />

      <div className="w-full max-w-[1100px] grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center animate-fade-in">
        <div className="hidden lg:block">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-3 rounded-full px-4 py-2 mb-8 surface-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(201,169,97,0.12)', border: '1px solid rgba(201,169,97,0.18)' }}>
                <Hexagon size={16} style={{ color: 'var(--primary-light)' }} />
              </div>
              <span className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>ONLIST Administration</span>
            </div>
            <h1 className="panel-title text-6xl leading-[0.95] mb-6" style={{ color: 'var(--text-primary)' }}>
              Une interface admin plus discrète, plus nette, plus premium.
            </h1>
            <p className="text-base leading-8 max-w-lg" style={{ color: 'var(--text-secondary)' }}>
              Validation des comptes, suivi des candidatures et pilotage de la plateforme dans une interface sobre inspirée d&apos;un back-office luxe plutôt que d&apos;un produit IA générique.
            </p>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center gap-3 justify-center lg:justify-start mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(180deg, rgba(201,169,97,0.16), rgba(201,169,97,0.06))', border: '1px solid rgba(201,169,97,0.22)' }}>
              <Hexagon size={24} style={{ color: 'var(--primary-light)' }} />
            </div>
            <div>
              <p className="text-xl font-bold tracking-[0.3em]" style={{ color: 'var(--text-primary)' }}>ONLIST</p>
              <p className="text-xs tracking-[0.24em] uppercase" style={{ color: 'var(--text-muted)' }}>Administration</p>
            </div>
          </div>

          <div className="rounded-[2rem] p-8 glass">
            <h1 className="panel-title text-5xl leading-none mb-2" style={{ color: 'var(--text-primary)' }}>Connexion</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Accès réservé aux administrateurs ONLIST</p>

            {error && (
              <div className="mb-6 rounded-2xl p-4 text-sm flex items-center gap-2"
                style={{ color: '#eba0a0', background: 'rgba(212,106,106,0.08)', border: '1px solid rgba(212,106,106,0.18)' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#eba0a0' }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@onlist.app"
                  required
                  className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none input-shell focus-ring"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none transition-all pr-12 input-shell focus-ring"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-muted)' }}>
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all mt-2 disabled:opacity-60 btn-primary"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(22,19,13,0.25)', borderTopColor: '#16130d' }} />
                ) : (
                  <><LogIn size={18} /> Se connecter</>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t flex items-center justify-center gap-2 text-xs" style={{ borderColor: 'rgba(201,169,97,0.1)', color: 'var(--text-muted)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
              Connexion sécurisée · ONLIST Admin v1.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
