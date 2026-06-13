const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/auth');

const router = express.Router();

// MIME type -> extension de fichier. Sert à la fois de liste blanche
// et de source de l'extension quand l'URI du client n'en fournit pas
// (cas fréquent sur iOS avec expo-image-picker).
const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    // On déduit l'extension du MIME type plutôt que de l'originalname :
    // les URI iOS n'ont pas toujours d'extension exploitable.
    const ext = MIME_EXTENSIONS[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    // Filtrage sur le MIME type (et non l'extension) pour accepter
    // les photos HEIC de l'iPhone et les fichiers sans extension.
    if (MIME_EXTENSIONS[file.mimetype]) {
      cb(null, true);
    } else {
      const err = new Error('Type de fichier non supporté');
      err.status = 400;
      cb(err);
    }
  },
});

// Encapsule multer pour transformer ses erreurs (type non supporté,
// fichier trop volumineux...) en réponses 400 propres au lieu d'un 500.
function uploadSingle(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    const isSize = err.code === 'LIMIT_FILE_SIZE';
    const status = isSize ? 400 : err.status || 400;
    const message = isSize ? 'Fichier trop volumineux (max 10 Mo)' : err.message || "Échec de l'upload";
    return res.status(status).json({ message });
  });
}

function respondWithFileUrl(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu' });
  const host = `${req.protocol}://${req.get('host')}`;
  const url = `${host}/uploads/${req.file.filename}`;
  return res.json({ url, filename: req.file.filename });
}

// POST /api/upload — upload d'une image
router.post('/', protect, uploadSingle, respondWithFileUrl);

// POST /api/upload/public — upload d'image avant authentification
router.post('/public', uploadSingle, respondWithFileUrl);

module.exports = router;
