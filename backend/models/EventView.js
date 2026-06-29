const mongoose = require('mongoose');

// Une vue = une ouverture de la fiche d'un événement par un influenceur.
// La durée de consultation (durationMs) est mise à jour à la sortie de l'écran.
const eventViewSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  viewedAt: { type: Date, default: Date.now },
  durationMs: { type: Number, default: 0 },
});

// Agrégations principales : courbe par jour et comptages par événement.
eventViewSchema.index({ event: 1, viewedAt: 1 });

module.exports = mongoose.model('EventView', eventViewSchema);
