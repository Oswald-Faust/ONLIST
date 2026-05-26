'use client';
import { useState, useRef } from 'react';
import {
  Upload, Trash2, Plus, X, ArrowLeft, Save, Check, Sparkles, CalendarDays,
  MapPin, UtensilsCrossed, Wine, Building2, SunMedium, MoonStar, Users,
  BadgeCheck, Repeat2, Shirt, Megaphone, Camera, Gift, Hash, AtSign, FileText,
} from 'lucide-react';
import { api } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { CityInput, CountryInput } from './CityCountryInput';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface EventPayload {
  title: string;
  description: string;
  images: string[];
  venue: string;
  address: string;
  city: string;
  country: string;
  category: string;
  moment: string;
  date: string;
  startTime: string;
  endTime: string;
  dresscode: string;
  ageRequirement: number;
  guestsRequired: number;
  repeats: string;
  maxParticipants: number;
  minFollowers: number;
  genderRequirement: string;
  offer: string;
  rules: string;
  deliverables: string[];
  offerItems: string[];
  accountsToMention: string[];
  tags: string[];
  isSponsored: boolean;
}

const EMPTY: EventPayload = {
  title: '', description: '', images: [],
  venue: '', address: '', city: '', country: 'France',
  category: 'restaurant-gastronomique', moment: 'soir',
  date: '', startTime: '', endTime: '',
  dresscode: '', ageRequirement: 18, guestsRequired: 0,
  repeats: 'none', maxParticipants: 10, minFollowers: 0,
  genderRequirement: 'any', offer: '', rules: '',
  deliverables: [], offerItems: [], accountsToMention: [], tags: [],
  isSponsored: false,
};

const CATEGORIES = [
  { value: 'restaurant-gastronomique', label: 'Restaurant gastronomique' },
  { value: 'restaurant-tendance', label: 'Restaurant tendance' },
  { value: 'bar-cocktail', label: 'Bar à cocktails' },
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'club-prive', label: 'Club privé' },
  { value: 'hotel-luxe', label: 'Hôtel de luxe' },
  { value: 'beach-club', label: 'Beach club' },
  { value: 'spa-bien-etre', label: 'Spa & bien-être' },
  { value: 'beauty-lifestyle', label: 'Beauté & lifestyle' },
  { value: 'fitness-sport', label: 'Fitness & sport' },
  { value: 'brunch-cafe', label: 'Brunch & café' },
  { value: 'degustation', label: 'Dégustation' },
  { value: 'lancement-produit', label: 'Lancement produit' },
  { value: 'experience-vip', label: 'Expérience VIP' },
  { value: 'voyage-sejour', label: 'Voyage & séjour' },
  { value: 'autre', label: 'Autre' },
];
const MOMENTS = [
  { value: 'petit-dejeuner', label: 'Petit-déjeuner' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'dejeuner', label: 'Déjeuner' },
  { value: 'gouter', label: 'Goûter' },
  { value: 'afterwork', label: 'Afterwork' },
  { value: 'diner', label: 'Dîner' },
  { value: 'soir', label: 'Soirée' },
  { value: 'nuit', label: 'Nuit' },
  { value: 'journee', label: 'Journée complète' },
];
const GENDERS = [
  { value: 'any', label: 'Ouvert à tous', description: 'Aucune préférence de genre', icon: Users },
  { value: 'female', label: 'Femme', description: 'Réservé aux créatrices', icon: BadgeCheck },
  { value: 'male', label: 'Homme', description: 'Réservé aux créateurs', icon: BadgeCheck },
  { value: 'mixed', label: 'Mixte', description: 'Profil équilibré recherché', icon: Users },
];
const REPEATS = [
  { value: 'none', label: 'Ponctuel' },
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
];
const CATEGORY_ICONS: Record<string, typeof UtensilsCrossed> = {
  'restaurant-gastronomique': UtensilsCrossed,
  'restaurant-tendance': UtensilsCrossed,
  'bar-cocktail': Wine,
  rooftop: Building2,
  'club-prive': MoonStar,
  'hotel-luxe': Building2,
  'beach-club': SunMedium,
  'spa-bien-etre': Sparkles,
  'beauty-lifestyle': Sparkles,
  'fitness-sport': Users,
  'brunch-cafe': SunMedium,
  degustation: UtensilsCrossed,
  'lancement-produit': Megaphone,
  'experience-vip': Sparkles,
  'voyage-sejour': MapPin,
  autre: CalendarDays,
};
const MOMENT_ICONS: Record<string, typeof SunMedium> = {
  'petit-dejeuner': SunMedium,
  brunch: SunMedium,
  dejeuner: SunMedium,
  gouter: SunMedium,
  afterwork: Wine,
  diner: UtensilsCrossed,
  soir: MoonStar,
  nuit: MoonStar,
  journee: CalendarDays,
};
const REPEAT_LABELS: Record<string, string> = Object.fromEntries(REPEATS.map((item) => [item.value, item.label]));

function StepShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: 'var(--primary-light)' }}>{eyebrow}</p>
        <h2 className="text-[2rem] leading-tight panel-title" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        <p className="max-w-2xl text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
      <div className="space-y-8">
        {children}
      </div>
    </section>
  );
}

function FieldHeader({ label, hint, required }: { label: string; hint?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {label} {required && <span style={{ color: 'var(--primary-light)' }}>*</span>}
      </p>
      {hint && <p className="text-xs leading-6" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

function ChoiceGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; description: string; icon: typeof Sparkles }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="rounded-[1.4rem] p-4 text-left transition-all"
            style={{
              background: active ? 'linear-gradient(180deg, rgba(201,169,97,0.18), rgba(201,169,97,0.08))' : 'rgba(255,255,255,0.01)',
              border: `1px solid ${active ? 'rgba(201,169,97,0.28)' : 'rgba(201,169,97,0.12)'}`,
              boxShadow: active ? '0 14px 32px rgba(201,169,97,0.08)' : 'none',
            }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: active ? 'rgba(201,169,97,0.16)' : 'rgba(255,255,255,0.04)', color: active ? 'var(--primary-light)' : 'var(--text-muted)' }}>
              <Icon size={18} />
            </div>
            <p className="text-sm font-medium" style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{option.label}</p>
            <p className="mt-1 text-xs leading-6" style={{ color: 'var(--text-muted)' }}>{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function VisualSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="rounded-2xl px-4 py-2.5 text-sm transition-all"
            style={{
              background: active ? 'rgba(201,169,97,0.14)' : 'rgba(255,255,255,0.02)',
              color: active ? 'var(--primary-light)' : 'var(--text-secondary)',
              border: `1px solid ${active ? 'rgba(201,169,97,0.24)' : 'rgba(201,169,97,0.12)'}`,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── TagInput ──────────────────────────────────────────────────────────────────

function TagInput({ label, values, onChange, placeholder }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  };
  return (
    <div className="space-y-3">
      <FieldHeader label={label} />
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {values.map(v => (
            <span key={v} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(201,169,97,0.1)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.18)' }}>
              {v}
              <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="opacity-60 hover:opacity-100">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none"
          style={{ background: 'var(--bg-input)', border: '1px solid rgba(201,169,97,0.16)', color: 'var(--text-primary)' }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder || 'Ajouter...'} />
        <button type="button" onClick={add}
          className="rounded-2xl px-4 py-3 text-sm"
          style={{ background: 'rgba(201,169,97,0.12)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.18)' }}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── ImageUploader ─────────────────────────────────────────────────────────────

function ImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const token = localStorage.getItem('admin_token');
      const API = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload échoué');
      onChange(data.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Image de couverture</label>
      {value ? (
        <div className="relative rounded-2xl overflow-hidden group" style={{ height: 200 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium"
              style={{ background: 'rgba(201,169,97,0.9)', color: '#000' }}>
              <Upload size={13} /> Remplacer
            </button>
            <button type="button" onClick={() => onChange('')}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium"
              style={{ background: 'rgba(239,68,68,0.85)', color: '#fff' }}>
              <Trash2 size={13} /> Supprimer
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-full rounded-2xl flex flex-col items-center justify-center gap-2 py-10 transition-all"
          style={{ border: '2px dashed rgba(201,169,97,0.2)', background: 'rgba(201,169,97,0.03)', color: 'var(--text-muted)' }}>
          {uploading ? (
            <div className="w-6 h-6 rounded-full animate-spin border-2"
              style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} />
          ) : (
            <>
              <Upload size={24} style={{ color: 'var(--primary-light)' }} />
              <p className="text-sm">Cliquer pour uploader une image</p>
              <p className="text-xs">JPG, PNG, WebP — max 10 MB</p>
            </>
          )}
        </button>
      )}
      {error && <p className="text-xs mt-1.5" style={{ color: '#ef4444' }}>{error}</p>}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
    </div>
  );
}

function GalleryUploader({ values, onChange }: { values: string[]; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setError('');
    setUploading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const API = process.env.NEXT_PUBLIC_API_URL;
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${API}/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Upload échoué');
        uploadedUrls.push(data.url);
      }

      onChange([...values, ...uploadedUrls]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur upload');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <FieldHeader label="Images supplémentaires" hint="Ajoute des visuels d’ambiance, de lieu ou de mise en scène pour enrichir la fiche." />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
          style={{ background: 'rgba(201,169,97,0.12)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.18)' }}
        >
          <Plus size={13} /> Ajouter des visuels
        </button>
      </div>

      {values.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {values.map((image, index) => (
            <div key={`${image}-${index}`} className="group relative overflow-hidden rounded-2xl" style={{ height: 132 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={`gallery-${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(values.filter((_, currentIndex) => currentIndex !== index))}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: 'rgba(8,8,10,0.75)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-2xl border-2 border-dashed py-8 text-sm transition-all"
          style={{ borderColor: 'rgba(201,169,97,0.2)', background: 'rgba(201,169,97,0.03)', color: 'var(--text-muted)' }}
        >
          {uploading ? 'Upload en cours...' : 'Ajouter plusieurs images de présentation'}
        </button>
      )}

      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }}
      />
    </div>
  );
}

// ─── EventForm ─────────────────────────────────────────────────────────────────

interface Props {
  initialData?: Partial<EventPayload> & { _id?: string; images?: string[] };
  mode: 'create' | 'edit';
}

export default function EventForm({ initialData, mode }: Props) {
  const router = useRouter();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState<EventPayload>({
    ...EMPTY,
    ...(initialData ? {
      title: initialData.title || '',
      description: initialData.description || '',
      venue: initialData.venue || '',
      address: initialData.address || '',
      city: initialData.city || '',
      country: initialData.country || 'France',
      category: initialData.category || 'restaurant-gastronomique',
      moment: initialData.moment || 'soir',
      date: initialData.date ? initialData.date.slice(0, 10) : '',
      startTime: initialData.startTime || '',
      endTime: initialData.endTime || '',
      dresscode: initialData.dresscode || '',
      ageRequirement: initialData.ageRequirement ?? 18,
      guestsRequired: initialData.guestsRequired ?? 0,
      repeats: initialData.repeats || 'none',
      maxParticipants: initialData.maxParticipants ?? 10,
      minFollowers: initialData.minFollowers ?? 0,
      genderRequirement: initialData.genderRequirement || 'any',
      offer: initialData.offer || '',
      rules: initialData.rules || '',
      deliverables: initialData.deliverables || [],
      offerItems: initialData.offerItems || [],
      accountsToMention: initialData.accountsToMention || [],
      tags: initialData.tags || [],
      isSponsored: initialData.isSponsored || false,
      images: initialData.images || [],
    } : {}),
  });

  const [coverImage, setCoverImage] = useState(initialData?.images?.[0] || '');
  const [galleryImages, setGalleryImages] = useState((initialData?.images || []).slice(1));
  const [countryCode, setCountryCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'details' | 'content'>('info');

  const set = (k: keyof EventPayload, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.city || !form.date) {
      setError('Titre, ville et date sont obligatoires');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        images: [coverImage, ...galleryImages].filter(Boolean),
        date: new Date(form.date).toISOString(),
      };
      const endpoint = isEdit ? `/admin/events/${initialData?._id}` : '/admin/events';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await api(endpoint, { method, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur serveur');
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/events'), 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setSaving(false);
    }
  };

  const inputCls = 'w-full text-sm px-3 py-2.5 rounded-xl outline-none';
  const inputStyle = { background: 'var(--bg-input)', border: '1px solid rgba(201,169,97,0.16)', color: 'var(--text-primary)' };
  const TABS = [
    { id: 'info', label: '1. Informations' },
    { id: 'details', label: '2. Détails' },
    { id: 'content', label: '3. Contenu' },
  ] as const;

  if (success) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'rgba(16,217,160,0.15)', border: '1px solid rgba(16,217,160,0.3)' }}>
            <Check size={28} style={{ color: '#10D9A0' }} />
          </div>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Événement mis à jour !' : 'Événement créé avec succès !'}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Redirection...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="px-8 py-4 flex gap-2 border-b" style={{ borderColor: 'rgba(201,169,97,0.1)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="px-5 py-3 rounded-2xl text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? 'rgba(201,169,97,0.12)' : 'transparent',
              color: activeTab === tab.id ? 'var(--primary-light)' : 'var(--text-muted)',
              border: activeTab === tab.id ? '1px solid rgba(201,169,97,0.2)' : '1px solid transparent',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1440px] mx-auto px-8 py-10 space-y-10">

          {/* ── TAB 1: Informations ── */}
          {activeTab === 'info' && (
            <StepShell
              eyebrow="Étape 1"
              title="Poser le cadre de l’événement"
              description="Commence par définir l’univers, le lieu et le rythme de l’expérience. L’objectif est de rendre l’événement immédiatement clair et désirable."
            >
              <ImageUploader value={coverImage} onChange={setCoverImage} />
              <GalleryUploader values={galleryImages} onChange={setGalleryImages} />

              <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_380px]">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <FieldHeader
                      label="Titre de l’événement"
                      hint="Le nom doit donner immédiatement envie et refléter l’expérience proposée."
                      required
                    />
                    <input className={`${inputCls} px-4 py-4 text-base rounded-2xl`} style={inputStyle} value={form.title}
                  onChange={e => set('title', e.target.value)}
                    placeholder="Ex: Dîner signature au rooftop" required />
                  </div>

                  <div className="space-y-3">
                    <FieldHeader label="Catégorie" hint="Choisis le format qui décrit le mieux l’expérience." />
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {CATEGORIES.map((category) => {
                        const Icon = CATEGORY_ICONS[category.value] || CalendarDays;
                        const active = form.category === category.value;
                        return (
                          <button
                            key={category.value}
                            type="button"
                            onClick={() => set('category', category.value)}
                            className="rounded-[1.35rem] p-4 text-left transition-all"
                            style={{
                              background: active ? 'linear-gradient(180deg, rgba(201,169,97,0.18), rgba(201,169,97,0.08))' : 'rgba(255,255,255,0.015)',
                              border: `1px solid ${active ? 'rgba(201,169,97,0.28)' : 'rgba(201,169,97,0.12)'}`,
                            }}
                          >
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl"
                              style={{ background: active ? 'rgba(201,169,97,0.16)' : 'rgba(255,255,255,0.04)', color: active ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                              <Icon size={17} />
                            </div>
                            <p className="text-sm font-medium" style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{category.label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <FieldHeader label="Moment" hint="Le contexte temporel influence fortement le style du contenu attendu." />
                    <div className="grid gap-3 sm:grid-cols-3">
                      {MOMENTS.map((moment) => {
                        const Icon = MOMENT_ICONS[moment.value] || CalendarDays;
                        const active = form.moment === moment.value;
                        return (
                          <button
                            key={moment.value}
                            type="button"
                            onClick={() => set('moment', moment.value)}
                            className="flex items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left transition-all"
                            style={{
                              background: active ? 'rgba(201,169,97,0.14)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${active ? 'rgba(201,169,97,0.24)' : 'rgba(201,169,97,0.12)'}`,
                            }}
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl"
                              style={{ background: active ? 'rgba(201,169,97,0.16)' : 'rgba(255,255,255,0.04)', color: active ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                              <Icon size={16} />
                            </span>
                            <span className="text-sm" style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{moment.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-5 rounded-[1.6rem] p-5"
                  style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(201,169,97,0.1)' }}>
                  <div className="space-y-3">
                    <FieldHeader label="Date & horaires" hint="Donne un cadre clair pour faciliter la projection et la participation." required />
                    <div className="space-y-3">
                      <input type="date" className={`${inputCls} px-4 py-3 rounded-2xl`} style={inputStyle} value={form.date}
                        onChange={e => set('date', e.target.value)} required />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="time" className={`${inputCls} px-4 py-3 rounded-2xl`} style={inputStyle} value={form.startTime}
                          onChange={e => set('startTime', e.target.value)} />
                        <input type="time" className={`${inputCls} px-4 py-3 rounded-2xl`} style={inputStyle} value={form.endTime}
                          onChange={e => set('endTime', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <FieldHeader label="Nom du lieu" hint="Nom commercial ou appellation visible de l’établissement." />
                    <input className={`${inputCls} px-4 py-3 rounded-2xl`} style={inputStyle} value={form.venue}
                  onChange={e => set('venue', e.target.value)}
                  placeholder="Ex: Gallio Fitzrovia" />
                  </div>

                  <div className="space-y-3">
                    <FieldHeader label="Adresse" hint="Adresse précise ou zone de rendez-vous." />
                    <input className={`${inputCls} px-4 py-3 rounded-2xl`} style={inputStyle} value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="Ex: 7 Charlotte St., London" />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <CityInput
                      value={form.city}
                      countryCode={countryCode}
                      onChange={v => set('city', v)}
                      required
                    />
                    <CountryInput
                      value={form.country}
                      onChange={(name, code) => { set('country', name); setCountryCode(code); }}
                    />
                  </div>
                </div>
              </div>
            </StepShell>
          )}

          {/* ── TAB 2: Détails ── */}
          {activeTab === 'details' && (
            <StepShell
              eyebrow="Étape 2"
              title="Définir les critères et les conditions"
              description="Cadre la sélection des profils, la capacité d’accueil et le niveau d’exigence attendu. Cette étape doit être claire, précise et simple à comprendre."
            >
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1.18fr)_380px]">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-3">
                      <FieldHeader label="Participants maximum" hint="Capacité totale validée pour cet événement." />
                      <input type="number" min={1} className={`${inputCls} px-4 py-4 rounded-2xl text-base`} style={inputStyle} value={form.maxParticipants}
                    onChange={e => set('maxParticipants', +e.target.value)} />
                    </div>
                    <div className="space-y-3">
                      <FieldHeader label="Minimum de followers" hint="Niveau d’audience minimal recherché." />
                      <input type="number" min={0} className={`${inputCls} px-4 py-4 rounded-2xl text-base`} style={inputStyle} value={form.minFollowers}
                    onChange={e => set('minFollowers', +e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <FieldHeader label="Genre recherché" hint="Présente la cible créative de l’invitation, si besoin." />
                    <ChoiceGrid options={GENDERS} value={form.genderRequirement} onChange={(value) => set('genderRequirement', value)} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-3">
                      <FieldHeader label="Âge minimum" hint="Âge requis pour participer à l’événement." />
                      <input type="number" min={0} className={`${inputCls} px-4 py-4 rounded-2xl text-base`} style={inputStyle} value={form.ageRequirement}
                    onChange={e => set('ageRequirement', +e.target.value)} />
                    </div>
                    <div className="space-y-3">
                      <FieldHeader label="Invités requis (+N)" hint="Nombre d’accompagnants minimum ou attendu." />
                      <input type="number" min={0} className={`${inputCls} px-4 py-4 rounded-2xl text-base`} style={inputStyle} value={form.guestsRequired}
                    onChange={e => set('guestsRequired', +e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <FieldHeader label="Fréquence" hint="Si l’événement doit être répété ou non." />
                    <VisualSelect options={REPEATS} value={form.repeats} onChange={(value) => set('repeats', value)} />
                  </div>
                </div>

                <div className="space-y-5 rounded-[1.6rem] p-5"
                  style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(201,169,97,0.1)' }}>
                  <div className="space-y-3">
                    <FieldHeader label="Dress code" hint="Précise le ton vestimentaire attendu pour harmoniser les contenus." />
                    <div className="relative">
                      <Shirt size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                      <input className={`${inputCls} rounded-2xl py-4 pl-11 pr-4 text-base`} style={inputStyle} value={form.dresscode}
                  onChange={e => set('dresscode', e.target.value)}
                  placeholder="Ex: Smart Casual" />
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] p-4 space-y-4"
                    style={{ background: 'rgba(201,169,97,0.06)', border: '1px solid rgba(201,169,97,0.14)' }}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl"
                        style={{ background: 'rgba(201,169,97,0.14)', color: 'var(--primary-light)' }}>
                        <Megaphone size={17} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Mise en avant sponsorisée</p>
                        <p className="text-xs leading-6" style={{ color: 'var(--text-muted)' }}>
                          Active cette option si l’événement bénéficie d’un niveau de visibilité renforcé ou d’un positionnement premium.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <button type="button"
                        onClick={() => set('isSponsored', !form.isSponsored)}
                        className="w-12 h-7 rounded-full transition-colors relative flex-shrink-0"
                        style={{ background: form.isSponsored ? 'rgba(201,169,97,0.8)' : 'var(--bg-input)', border: '1px solid rgba(201,169,97,0.18)' }}>
                        <span className="absolute top-0.5 h-5 w-5 rounded-full transition-all shadow"
                          style={{ background: '#fff', left: form.isSponsored ? '25px' : '3px' }} />
                      </button>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {form.isSponsored ? 'Événement sponsorisé activé' : 'Événement non sponsorisé'}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] p-4"
                    style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(201,169,97,0.12)' }}>
                    <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--primary-light)' }}>Résumé rapide</p>
                    <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <p>{form.maxParticipants} places maximum</p>
                      <p>{form.minFollowers} followers minimum</p>
                      <p>{GENDERS.find((item) => item.value === form.genderRequirement)?.label}</p>
                      <p>{REPEAT_LABELS[form.repeats]}</p>
                    </div>
                  </div>
                </div>
              </div>
            </StepShell>
          )}

          {/* ── TAB 3: Contenu & livrables ── */}
          {activeTab === 'content' && (
            <StepShell
              eyebrow="Étape 3"
              title="Raconter l’expérience et les attentes"
              description="Structure le brief comme une vraie mission créative: ce que l’invité va vivre, ce qu’il doit produire et les éléments à respecter."
            >
              <div className="space-y-3">
                <FieldHeader label="Description" hint="Présente l’expérience, l’ambiance, le bénéfice invité et l’intention créative." />
                <div className="relative">
                  <FileText size={16} className="absolute left-4 top-4" style={{ color: 'var(--text-muted)' }} />
                  <textarea className={`${inputCls} min-h-[140px] rounded-2xl py-4 pl-11 pr-4 text-base`} style={{ ...inputStyle, resize: 'vertical' }}
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Décris l’événement, l’ambiance, le public visé et ce que l’influenceur va vivre..." />
                </div>
              </div>

              <div className="space-y-3">
                <FieldHeader label="Règles de l’événement" hint="Ajoute les conditions importantes: horaires, publication, comportement attendu, contraintes." />
                <textarea className={`${inputCls} min-h-[110px] rounded-2xl px-4 py-4 text-base`} style={{ ...inputStyle, resize: 'vertical' }}
                  value={form.rules}
                  onChange={e => set('rules', e.target.value)}
                  placeholder="Ex: arrivée 15 min avant, publication sous 48h, présence confirmée obligatoire..." />
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-[1.5rem] p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(201,169,97,0.12)' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'rgba(201,169,97,0.14)', color: 'var(--primary-light)' }}>
                      <Camera size={17} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Livrables</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ce que tu attends en production de contenu.</p>
                    </div>
                  </div>
                  <TagInput label="Livrables" values={form.deliverables}
                onChange={v => set('deliverables', v)}
                placeholder="Ex: TikTok reel, 3 Instagram stories..." />
                </div>

                <div className="rounded-[1.5rem] p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(201,169,97,0.12)' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'rgba(201,169,97,0.14)', color: 'var(--primary-light)' }}>
                      <Gift size={17} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Offre proposée</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ce qui est offert ou mis à disposition.</p>
                    </div>
                  </div>
                  <TagInput label="Offre proposée" values={form.offerItems}
                onChange={v => set('offerItems', v)}
                placeholder="Ex: Drinks, Bites, Afternoon Tea..." />
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-[1.5rem] p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(201,169,97,0.12)' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'rgba(201,169,97,0.14)', color: 'var(--primary-light)' }}>
                      <AtSign size={17} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Comptes à mentionner</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Marques, établissements ou comptes partenaires.</p>
                    </div>
                  </div>
                  <TagInput label="Comptes à mentionner" values={form.accountsToMention}
                onChange={v => set('accountsToMention', v)}
                placeholder="@compte..." />
                </div>

                <div className="rounded-[1.5rem] p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(201,169,97,0.12)' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'rgba(201,169,97,0.14)', color: 'var(--primary-light)' }}>
                      <Hash size={17} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Tags & hashtags</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Repères éditoriaux à reprendre dans les contenus.</p>
                    </div>
                  </div>
                  <TagInput label="Tags / Hashtags" values={form.tags}
                onChange={v => set('tags', v)}
                placeholder="#hashtag..." />
                </div>
              </div>
            </StepShell>
          )}

        </div>
      </div>

      {/* Footer sticky */}
      <div className="px-8 py-4 flex items-center gap-4 border-t"
        style={{ borderColor: 'rgba(201,169,97,0.1)', background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)' }}>
        <button type="button" onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm transition-opacity hover:opacity-70"
          style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={15} /> Retour
        </button>

        <div className="flex gap-2 ml-auto">
          {activeTab !== 'info' && (
            <button type="button"
              onClick={() => setActiveTab(activeTab === 'content' ? 'details' : 'info')}
              className="px-4 py-2.5 rounded-2xl text-sm"
              style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              ← Précédent
            </button>
          )}
          {activeTab !== 'content' ? (
            <button type="button"
              onClick={() => setActiveTab(activeTab === 'info' ? 'details' : 'content')}
              className="px-5 py-2.5 rounded-2xl text-sm font-medium"
              style={{ background: 'rgba(201,169,97,0.12)', color: 'var(--primary-light)', border: '1px solid rgba(201,169,97,0.2)' }}>
              Suivant →
            </button>
          ) : (
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #C0A981, #D4AF77)', color: '#000' }}>
              {saving ? (
                <div className="w-4 h-4 rounded-full border-2 animate-spin"
                  style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#000' }} />
              ) : (
                <Save size={15} />
              )}
              {isEdit ? 'Mettre à jour' : 'Créer l\'événement'}
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
