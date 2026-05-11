const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;

  if (!token) return res.status(401).json({ message: 'Non autorisé' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ message: 'Utilisateur introuvable' });
    next();
  } catch {
    res.status(401).json({ message: 'Token invalide' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.type !== 'admin')
    return res.status(403).json({ message: 'Accès réservé aux admins' });
  next();
};

const requireValidated = (req, res, next) => {
  if (req.user?.status !== 'validated' && req.user?.type !== 'admin')
    return res.status(403).json({ message: 'Compte en attente de validation' });
  next();
};

module.exports = { protect, requireAdmin, requireValidated };
