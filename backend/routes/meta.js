const express = require('express');
const Event = require('../models/Event');

const router = express.Router();

const COUNTRIES_TTL_MS = 24 * 60 * 60 * 1000;
const CITY_TTL_MS = 10 * 60 * 1000;

let countriesCache = {
  expiresAt: 0,
  data: null,
};

const cityCache = new Map();

function normalizeCountries(payload) {
  return payload
    .map((country) => {
      const name = country?.translations?.fra?.common || country?.name?.common;
      const code = country?.cca2;
      if (!name || !code) return null;

      const nationality =
        country?.demonyms?.fra?.m ||
        country?.demonyms?.eng?.m ||
        name;

      return {
        code,
        name,
        nationality,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

async function fetchCountries() {
  const now = Date.now();
  if (countriesCache.data && countriesCache.expiresAt > now) {
    return countriesCache.data;
  }

  const response = await fetch(
    'https://restcountries.com/v3.1/all?fields=name,translations,cca2,demonyms'
  );

  if (!response.ok) {
    throw new Error('Impossible de récupérer la liste des pays');
  }

  const payload = await response.json();
  const data = normalizeCountries(payload);

  countriesCache = {
    data,
    expiresAt: now + COUNTRIES_TTL_MS,
  };

  return data;
}

async function fetchCities({ query, countryCode, count }) {
  const normalizedQuery = query.trim().toLowerCase();
  const cacheKey = `${countryCode}:${normalizedQuery}:${count}`;
  const now = Date.now();
  const cached = cityCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const params = new URLSearchParams({
    name: query.trim(),
    count: String(count),
    language: 'fr',
    format: 'json',
  });

  if (countryCode) params.set('countryCode', countryCode);

  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Impossible de récupérer la liste des villes');
  }

  const payload = await response.json();
  const results = Array.isArray(payload.results) ? payload.results : [];

  const data = results.map((item) => ({
    id: item.id,
    name: item.name,
    country: item.country,
    countryCode: item.country_code,
    admin1: item.admin1 || '',
    latitude: item.latitude,
    longitude: item.longitude,
    label: [item.name, item.admin1, item.country].filter(Boolean).join(', '),
  }));

  cityCache.set(cacheKey, {
    data,
    expiresAt: now + CITY_TTL_MS,
  });

  return data;
}

router.get('/countries', async (_req, res) => {
  try {
    const countries = await fetchCountries();
    res.json({ countries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/cities', async (req, res) => {
  try {
    const query = `${req.query.q || ''}`.trim();
    const countryCode = `${req.query.countryCode || ''}`.trim().toUpperCase();
    const count = Math.min(Math.max(Number(req.query.count) || 20, 1), 50);

    if (query.length < 2) {
      return res.json({ cities: [] });
    }

    const cities = await fetchCities({ query, countryCode, count });
    res.json({ cities });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /meta/event-cities — villes qui ont au moins un événement actif
router.get('/event-cities', async (_req, res) => {
  try {
    const cities = await Event.distinct('city', { isActive: true });
    const sorted = cities.filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr'));
    res.json({ cities: sorted });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
