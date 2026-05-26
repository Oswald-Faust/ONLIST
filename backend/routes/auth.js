const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '90d' });

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, type, instagram, tiktok, followersCount,
      city, country, nationality, gender, dateOfBirth,
      businessName, businessType, businessAddress, businessCity, businessDescription } = req.body;

    const orConditions = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });
    if (orConditions.length > 0) {
      const exists = await User.findOne({ $or: orConditions });
      if (exists) return res.status(400).json({ message: 'Email ou téléphone déjà utilisé' });
    }

    const user = await User.create({
      name, email, phone, password, type: type || 'influencer',
      instagram, tiktok, followersCount, city, country,
      nationality, gender, dateOfBirth,
      businessName, businessType, businessAddress, businessCity, businessDescription,
      status: 'pending',
    });

    res.status(201).json({
      token: signToken(user._id),
      user: {
        _id: user._id, name: user.name, email: user.email,
        phone: user.phone, type: user.type, status: user.status,
        city: user.city, country: user.country,
        nationality: user.nationality, gender: user.gender, dateOfBirth: user.dateOfBirth,
        instagram: user.instagram, tiktok: user.tiktok, followersCount: user.followersCount,
        photos: user.photos,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    const query = email ? { email } : { phone };
    const user = await User.findOne(query).select('+password');
    if (!user) return res.status(401).json({ message: 'Identifiants incorrects' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Identifiants incorrects' });

    res.json({
      token: signToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        type: user.type,
        status: user.status,
        photos: user.photos,
        bio: user.bio,
        instagram: user.instagram,
        tiktok: user.tiktok,
        followersCount: user.followersCount,
        score: user.score,
        reviewsCount: user.reviewsCount,
        city: user.city,
        country: user.country,
        nationality: user.nationality,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        businessName: user.businessName,
        businessType: user.businessType,
        plasma: user.plasma,
        expoPushToken: user.expoPushToken,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

// POST /auth/google — échange un access token Google contre un JWT ONLIST
router.post('/google', async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ message: 'accessToken requis' });

    // Vérifie le token et récupère les infos utilisateur via Google
    const gRes = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`);
    if (!gRes.ok) return res.status(401).json({ message: 'Token Google invalide' });
    const { id, email, name, picture } = await gRes.json();

    // Cherche ou crée l'utilisateur
    let user = await User.findOne({ googleId: id });
    if (!user && email) user = await User.findOne({ email });

    if (user) {
      // Mise à jour du googleId si manquant
      if (!user.googleId) { user.googleId = id; user.authProvider = 'google'; await user.save(); }
    } else {
      user = await User.create({
        name, email, googleId: id, avatarUrl: picture,
        type: 'influencer', status: 'pending', authProvider: 'google',
      });
    }

    res.json({
      token: signToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, type: user.type, status: user.status, avatarUrl: user.avatarUrl },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /auth/apple — échange un identityToken Apple contre un JWT ONLIST
router.post('/apple', async (req, res) => {
  try {
    const { identityToken, fullName, email: appleEmail } = req.body;
    if (!identityToken) return res.status(400).json({ message: 'identityToken requis' });

    // Décode le JWT Apple sans vérifier la signature (pour le MVP)
    // En production : vérifier avec les clés publiques Apple (https://appleid.apple.com/auth/keys)
    const payload = JSON.parse(Buffer.from(identityToken.split('.')[1], 'base64').toString());
    const appleId = payload.sub;
    const email = appleEmail || payload.email;

    if (!appleId) return res.status(401).json({ message: 'Token Apple invalide' });

    let user = await User.findOne({ appleId });
    if (!user && email) user = await User.findOne({ email });

    if (user) {
      if (!user.appleId) { user.appleId = appleId; user.authProvider = 'apple'; await user.save(); }
    } else {
      const name = fullName
        ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ')
        : (email ? email.split('@')[0] : 'Utilisateur');
      user = await User.create({
        name, email, appleId, type: 'influencer', status: 'pending', authProvider: 'apple',
      });
    }

    res.json({
      token: signToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, type: user.type, status: user.status },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
