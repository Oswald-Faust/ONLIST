const express = require('express');
const DeliverableSubmission = require('../models/DeliverableSubmission');
const Application = require('../models/Application');
const Event = require('../models/Event');
const User = require('../models/User');
const { protect, requireValidated } = require('../middleware/auth');
const { createNotification } = require('../utils/notifications');

const router = express.Router();

function getDeliverableDeadline(eventDate) {
  const deadline = new Date(eventDate);
  deadline.setDate(deadline.getDate() + 3);
  deadline.setHours(23, 59, 59, 999);
  return deadline;
}

router.get('/my', protect, requireValidated, async (req, res) => {
  try {
    const filter = req.user.type === 'business'
      ? { business: req.user._id }
      : { influencer: req.user._id };

    const submissions = await DeliverableSubmission.find(filter)
      .populate('event', 'title date city')
      .populate('application', '_id checkedIn checkedInAt')
      .populate('influencer', 'name instagram')
      .sort({ submittedAt: -1, createdAt: -1 });

    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/submit', protect, requireValidated, async (req, res) => {
  try {
    if (req.user.type !== 'influencer') {
      return res.status(403).json({ message: 'Réservé aux créateurs' });
    }

    const { applicationId, deliverableType, assetUrl, assetUrls, note } = req.body;
    const application = await Application.findById(applicationId).populate('event');
    if (!application || application.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Participation introuvable' });
    }
    if (application.status !== 'accepted') {
      return res.status(400).json({ message: 'La participation doit être acceptée' });
    }
    if (!application.checkedIn) {
      return res.status(400).json({ message: 'Le badge doit être scanné avant de soumettre un livrable' });
    }

    const event = application.event;
    const eventDeliverables = Array.isArray(event.deliverables) ? event.deliverables.filter(Boolean) : [];
    if (!deliverableType || !eventDeliverables.includes(deliverableType)) {
      return res.status(400).json({ message: 'Livrable invalide pour cet événement' });
    }

    const normalizedAssetUrls = (Array.isArray(assetUrls) ? assetUrls : [assetUrl])
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);

    if (normalizedAssetUrls.length === 0) {
      return res.status(400).json({ message: 'Au moins une preuve est requise' });
    }

    const deadline = getDeliverableDeadline(event.date);
    const now = new Date();
    const existingSubmission = await DeliverableSubmission.findOne({
      application: application._id,
      deliverableType,
    });

    const payload = {
      event: event._id,
      application: application._id,
      influencer: req.user._id,
      business: event.creator,
      deliverableType,
      assetUrl: normalizedAssetUrls[0],
      assetUrls: normalizedAssetUrls,
      note,
      status: 'submitted',
      submittedAt: now,
      flaggedAt: undefined,
      flaggedReason: '',
    };

    const submission = existingSubmission
      ? await DeliverableSubmission.findByIdAndUpdate(existingSubmission._id, payload, { new: true })
      : await DeliverableSubmission.create(payload);

    await createNotification({
      userId: event.creator,
      actorId: req.user._id,
      type: 'deliverable_submitted',
      category: 'deliverables',
      title: 'Livrable reçu',
      body: `${req.user.name || 'Un créateur'} a soumis un livrable pour ${event.title}.`,
      entityType: 'deliverable',
      entityId: submission._id,
      data: {
        eventId: `${event._id}`,
        applicationId: `${application._id}`,
        deliverableType,
        submittedBeforeDeadline: now <= deadline,
      },
    });

    res.status(201).json({ submission });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/flag', protect, requireValidated, async (req, res) => {
  try {
    if (req.user.type !== 'business' && req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Réservé aux établissements' });
    }

    const submission = await DeliverableSubmission.findById(req.params.id).populate('event');
    if (!submission) return res.status(404).json({ message: 'Livrable introuvable' });
    if (req.user.type !== 'admin' && submission.business.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    submission.status = 'flagged';
    submission.flaggedAt = new Date();
    submission.flaggedReason = req.body.reason || '';
    await submission.save();

    await createNotification({
      userId: submission.influencer,
      actorId: req.user._id,
      type: 'deliverable_flagged',
      category: 'deliverables',
      title: 'Livrable signalé',
      body: 'Un établissement a signalé un livrable. Notre équipe peut intervenir si nécessaire.',
      entityType: 'deliverable',
      entityId: submission._id,
      data: { reason: submission.flaggedReason, eventId: `${submission.event._id}` },
    });

    res.json({ submission });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/cron/process', async (req, res) => {
  try {
    if (process.env.DELIVERABLES_CRON_SECRET) {
      const incoming = req.headers.authorization || '';
      if (incoming !== `Bearer ${process.env.DELIVERABLES_CRON_SECRET}`) {
        return res.status(401).json({ message: 'Non autorisé' });
      }
    }

    const acceptedApplications = await Application.find({ status: 'accepted' }).populate('event user');
    let remindersSent = 0;
    let warningsIssued = 0;
    let bansIssued = 0;

    for (const application of acceptedApplications) {
      const event = application.event;
      if (!event?.date) continue;
      const hoursSinceEvent = (Date.now() - new Date(event.date).getTime()) / (1000 * 60 * 60);
      if (hoursSinceEvent < 48) continue;

      const hasSubmission = await DeliverableSubmission.exists({ application: application._id });
      if (hasSubmission) continue;

      const influencer = await User.findById(application.user._id);
      if (!influencer) continue;

      if (hoursSinceEvent >= 48 && hoursSinceEvent < 72 && !application.reminderSentAt) {
        application.reminderSentAt = new Date();
        await application.save();
        remindersSent += 1;
        await createNotification({
          userId: influencer._id,
          actorId: event.creator,
          type: 'deliverable_reminder',
          category: 'deliverables',
          title: 'Rappel livrable',
          body: `Il vous reste 24h pour soumettre vos livrables pour ${event.title}.`,
          entityType: 'deliverable',
          data: { eventId: `${event._id}`, applicationId: `${application._id}` },
        });
      }

      if (hoursSinceEvent >= 72 && !application.warningIssuedAt) {
        application.warningIssuedAt = new Date();
        await application.save();
        influencer.warningCount = (influencer.warningCount || 0) + 1;
        warningsIssued += 1;

        let banTriggered = false;
        if ((influencer.warningCount || 0) >= 2) {
          influencer.status = 'rejected';
          influencer.bannedAt = new Date();
          banTriggered = true;
          bansIssued += 1;
        }

        await influencer.save();

        await createNotification({
          userId: influencer._id,
          actorId: event.creator,
          type: banTriggered ? 'creator_banned' : 'creator_warning',
          category: 'deliverables',
          title: banTriggered ? 'Compte suspendu' : 'Avertissement officiel',
          body: banTriggered
            ? 'Deux avertissements ont été cumulés. Votre compte créateur est suspendu.'
            : `Aucun livrable reçu pour ${event.title}. Ceci constitue un avertissement officiel.`,
          entityType: 'deliverable',
          data: { eventId: `${event._id}`, applicationId: `${application._id}`, warningCount: influencer.warningCount || 0 },
        });
      }
    }

    res.json({ processed: true, remindersSent, warningsIssued, bansIssued });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
