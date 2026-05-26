'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, ChevronDown, X } from 'lucide-react';
import { api } from '@/lib/auth';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CityResult {
  name: string;
  country: string;
  countryCode: string;
  admin1?: string;
  label: string;
}

interface CountryResult {
  code: string;
  name: string;
}

// ─── CityInput ─────────────────────────────────────────────────────────────────

export function CityInput({
  value,
  countryCode,
  onChange,
  required,
}: {
  value: string;
  countryCode?: string;
  onChange: (city: string) => void;
  required?: boolean;
}) {
  const [input, setInput] = useState(value);
  const [results, setResults] = useState<CityResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync when value changes externally
  useEffect(() => { setInput(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q, count: '8' });
        if (countryCode) params.set('countryCode', countryCode);
        const res = await api(`/meta/cities?${params.toString()}`);
        const data = await res.json();
        setResults(data.cities || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [countryCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    onChange(e.target.value); // update parent with raw text too
    search(e.target.value);
  };

  const select = (city: CityResult) => {
    setInput(city.name);
    onChange(city.name);
    setResults([]);
    setOpen(false);
  };

  const clear = () => {
    setInput('');
    onChange('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
        Ville {required && <span style={{ color: 'var(--primary-light)' }}>*</span>}
      </label>
      <div className="flex items-center gap-2 px-3 rounded-xl"
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
        <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          className="flex-1 text-sm py-2.5 bg-transparent outline-none"
          style={{ color: 'var(--text-primary)' }}
          value={input}
          onChange={handleChange}
          onFocus={() => input.length >= 2 && search(input)}
          placeholder="Ex: Paris, London, Abidjan..."
          required={required}
          autoComplete="off"
        />
        {input && (
          <button type="button" onClick={clear} className="opacity-50 hover:opacity-100">
            <X size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
        {loading && (
          <div className="w-3.5 h-3.5 rounded-full border animate-spin flex-shrink-0"
            style={{ borderColor: 'rgba(201,169,97,0.2)', borderTopColor: 'var(--primary)' }} />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-2xl overflow-hidden z-50 shadow-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: 280, overflowY: 'auto' }}>
          {results.map((city, i) => (
            <button
              key={i}
              type="button"
              onClick={() => select(city)}
              className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-white/5 border-b last:border-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <MapPin size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--primary-light)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{city.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {[city.admin1, city.country].filter(Boolean).join(', ')}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CountryInput ──────────────────────────────────────────────────────────────

export function CountryInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string, code: string) => void;
}) {
  const [input, setInput] = useState(value);
  const [allCountries, setAllCountries] = useState<CountryResult[]>([]);
  const [results, setResults] = useState<CountryResult[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInput(value); }, [value]);

  useEffect(() => {
    api('/meta/countries').then(r => r.json()).then(data => {
      setAllCountries(data.countries || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setInput(q);
    if (q.length >= 1) {
      const filtered = allCountries
        .filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 8);
      setResults(filtered);
      setOpen(true);
    } else {
      setResults([]);
      setOpen(false);
    }
  };

  const select = (c: CountryResult) => {
    setInput(c.name);
    onChange(c.name, c.code);
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Pays</label>
      <div className="flex items-center gap-2 px-3 rounded-xl"
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
        <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          className="flex-1 text-sm py-2.5 bg-transparent outline-none"
          style={{ color: 'var(--text-primary)' }}
          value={input}
          onChange={handleChange}
          onFocus={() => { if (input.length >= 1) { const f = allCountries.filter(c => c.name.toLowerCase().includes(input.toLowerCase())).slice(0, 8); setResults(f); setOpen(f.length > 0); } }}
          placeholder="Ex: France, UK, Côte d'Ivoire..."
          autoComplete="off"
        />
        <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-2xl overflow-hidden z-50 shadow-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: 240, overflowY: 'auto' }}>
          {results.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => select(c)}
              className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors hover:bg-white/5 border-b last:border-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
              <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
