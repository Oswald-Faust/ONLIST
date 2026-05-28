const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendResetCodeEmail, sendWelcomeInfluencerEmail, sendWelcomeBusinessEmail } = require('../utils/mailer');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '90d' });

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, type, instagram, tiktok, followersCount,
      city, country, nationality, gender, dateOfBirth, photos,
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
      photos: Array.isArray(photos) ? photos : [],
      businessName, businessType, businessAddress, businessCity, businessDescription,
      status: 'pending',
    });

    // Email de bienvenue (sans bloquer la réponse)
    if (user.email) {
      const sendWelcome = user.type === 'business' ? sendWelcomeBusinessEmail : sendWelcomeInfluencerEmail;
      sendWelcome({
        to: user.email,
        name: user.name,
        businessName: user.businessName,
      }).catch((err) => console.error('Welcome email failed:', err.message));
    }

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

// POST /auth/forgot-password
// Accepte email OU phone, envoie un code à 5 chiffres par email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, phone } = req.body;
    if (!email && !phone) return res.status(400).json({ message: 'Email ou téléphone requis' });

    const query = email ? { email } : { phone };
    const user = await User.findOne(query).select('+resetCode +resetCodeExpiry');
    if (!user) return res.status(404).json({ message: 'Aucun compte associé à cet identifiant' });

    // L'utilisateur doit avoir un email pour recevoir le code
    if (!user.email) {
      return res.status(400).json({ message: 'Ce compte ne possède pas d\'adresse email pour recevoir le code' });
    }

    // Génère un code à 5 chiffres
    const code = String(Math.floor(10000 + Math.random() * 90000));
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetCode = code;
    user.resetCodeExpiry = expiry;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    await sendResetCodeEmail({ to: user.email, code, name: user.name });

    // On retourne l'email masqué pour affichage côté client
    const maskedEmail = user.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) =>
      a + '*'.repeat(Math.max(1, b.length)) + c
    );

    res.json({ message: 'Code envoyé', maskedEmail });
  } catch (err) {
    console.error('forgot-password error:', err);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du code' });
  }
});

// POST /auth/verify-reset-code
// Vérifie le code et retourne un resetToken temporaire
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, phone, code } = req.body;
    if (!code) return res.status(400).json({ message: 'Code requis' });
    if (!email && !phone) return res.status(400).json({ message: 'Email ou téléphone requis' });

    const query = email ? { email } : { phone };
    const user = await User.findOne(query).select('+resetCode +resetCodeExpiry +resetToken +resetTokenExpiry');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    if (!user.resetCode || user.resetCode !== code) {
      return res.status(400).json({ message: 'Code incorrect' });
    }
    if (!user.resetCodeExpiry || user.resetCodeExpiry < new Date()) {
      return res.status(400).json({ message: 'Code expiré, veuillez en demander un nouveau' });
    }

    // Code valide : génère un resetToken court (10 min)
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetCode = undefined;
    user.resetCodeExpiry = undefined;
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    res.json({ message: 'Code vérifié', resetToken });
  } catch (err) {
    console.error('verify-reset-code error:', err);
    res.status(500).json({ message: 'Erreur de vérification' });
  }
});

// POST /auth/reset-password
// Réinitialise le mot de passe avec le resetToken
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: 'Token et nouveau mot de passe requis' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const user = await User.findOne({
      resetToken,
      resetTokenExpiry: { $gt: new Date() },
    }).select('+resetToken +resetTokenExpiry');

    if (!user) {
      return res.status(400).json({ message: 'Lien expiré ou invalide, recommencez la procédure' });
    }

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    console.error('reset-password error:', err);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation' });
  }
});

module.exports = router;
