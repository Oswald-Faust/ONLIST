const crypto = require('crypto');
const express = require('express');
const Application = require('../models/Application');
const Event = require('../models/Event');
const Review = require('../models/Review');
const LieuReview = require('../models/LieuReview');
const User = require('../models/User');
const { protect, requireValidated } = require('../middleware/auth');
const { createNotification } = require('../utils/notifications');
const { getBusinessPlan, isInfluencerVisibleToBusiness } = require('../utils/businessPlans');

const router = express.Router();

// Code d'access pass unique (encodé dans le QR) + code court lisible de secours
function generateAccessCode() {
  return crypto.randomBytes(18).toString('hex'); // 36 caractères, non devinable
}
function generateShortCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // ex: 8 caractères
}

// POST /applications — postuler à un événement
router.post('/', protect, requireValidated, async (req, res) => {
  try {
    if (req.user.type !== 'influencer')
      return res.status(403).json({ message: 'Réservé aux influenceurs' });

    const { eventId, message } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });

    const existing = await Application.findOne({ user: req.user._id, event: eventId });
    if (existing) return res.status(400).json({ message: 'Déjà postulé à cet événement' });

    const application = await Application.create({
      user: req.user._id,
      event: eventId,
      message,
    });

    await createNotification({
      userId: event.creator,
      actorId: req.user._id,
      type: 'application_received',
      category: 'events',
      title: 'Nouvelle candidature',
      body: `${req.user.name || 'Un influenceur'} a postulé à ${event.title}.`,
      entityType: 'application',
      entityId: application._id,
      data: {
        eventId: `${event._id}`,
        eventTitle: event.title,
        city: event.city,
      },
    });

    res.status(201).json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /applications/business/pending — candidatures en attente pour le dashboard business
router.get('/business/pending', protect, requireValidated, async (req, res) => {
  try {
    if (req.user.type !== 'business') {
      return res.status(403).json({ message: 'Réservé aux établissements' });
    }
    const events = await Event.find({ creator: req.user._id }).select('_id title');
    const eventIds = events.map(e => e._id);
    const limit = Math.min(Number(req.query.limit) || 10, 20);

    const [applications, totalPending] = await Promise.all([
      Application.find({ event: { $in: eventIds }, status: 'pending' })
        .populate('user', 'name photos instagram tiktok followersCount score city')
        .populate('event', 'title city images date')
        .sort({ appliedAt: -1 })
        .limit(limit),
      Application.countDocuments({ event: { $in: eventIds }, status: 'pending' }),
    ]);

    res.json({ applications, totalPending });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /applications/my — mes candidatures (influenceur)
router.get('/my', protect, requireValidated, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate('event', 'title description images date endDate city venue address country category moment offer offerItems creator deliverables lieu rules dresscode startTime endTime requiredArrivalTime plusOneMode guestsRequired')
      .populate({ path: 'event', populate: { path: 'creator', select: 'businessName businessLogo' } })
      .populate({ path: 'event', populate: { path: 'lieu', select: 'name city score reviewsCount' } })
      .sort({ appliedAt: -1 });
    const applicationIds = applications.map((application) => application._id);
    const eventIds = applications.map((application) => application.event?._id).filter(Boolean);
    const lieuIds = applications.map((application) => application.event?.lieu?._id).filter(Boolean);

    const [businessReviews, lieuReviews] = await Promise.all([
      Review.find({ influencer: req.user._id, event: { $in: eventIds } }).select('event business createdAt globalScore scores comment'),
      LieuReview.find({ influencer: req.user._id, event: { $in: eventIds }, lieu: { $in: lieuIds } }).select('event lieu createdAt globalScore scores comment'),
    ]);

    const businessReviewByEvent = new Map(
      businessReviews.map((review) => [String(review.event), review])
    );
    const lieuReviewByEvent = new Map(
      lieuReviews.map((review) => [String(review.event), review])
    );

    const enrichedApplications = applications.map((application) => {
      const eventId = application.event?._id ? String(application.event._id) : '';
      const businessReview = businessReviewByEvent.get(eventId) || null;
      const lieuReview = lieuReviewByEvent.get(eventId) || null;
      const nextApplication = application.toObject();
      nextApplication.reviewStatus = {
        byBusiness: !!businessReview,
        byInfluencer: !!lieuReview,
        businessReviewAt: businessReview?.createdAt || null,
        influencerReviewAt: lieuReview?.createdAt || null,
        businessScore: businessReview?.globalScore ?? null,
        influencerScore: lieuReview?.globalScore ?? null,
      };
      nextApplication.businessReview = businessReview;
      nextApplication.influencerReview = lieuReview;
      return nextApplication;
    });

    res.json({ applications: enrichedApplications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /applications/event/:eventId — candidatures pour un événement (business)
router.get('/event/:eventId', protect, requireValidated, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    if (event.creator.toString() !== req.user._id.toString() && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Non autorisé' });

    const applications = await Application.find({ event: req.params.eventId })
      .populate('user', 'name photos instagram tiktok followersCount score city bio')
      .sort({ appliedAt: -1 });
    const influencerIds = applications.map((application) => application.user?._id).filter(Boolean);
    const lieu = event.lieu || null;
    const [businessReviews, lieuReviews] = await Promise.all([
      Review.find({
        event: event._id,
        influencer: { $in: influencerIds },
        business: req.user._id,
      }).select('event influencer createdAt globalScore scores comment'),
      lieu
        ? LieuReview.find({
            event: event._id,
            lieu,
            influencer: { $in: influencerIds },
          }).select('event lieu influencer createdAt globalScore scores comment')
        : [],
    ]);

    const lieuReviewByInfluencer = new Map(
      lieuReviews.map((review) => [`${review.influencer}`, review])
    );
    const businessReviewByInfluencer = new Map(
      businessReviews.map((review) => [`${review.influencer}`, review])
    );

    const enrichedApplications = applications.map((application) => {
      const nextApplication = application.toObject();
      const influencerReview = lieuReviewByInfluencer.get(String(application.user?._id)) || null;
      const businessReview = businessReviewByInfluencer.get(String(application.user?._id)) || null;
      nextApplication.reviewStatus = {
        ...(nextApplication.reviewStatus || {}),
        byInfluencer: !!influencerReview,
        influencerReviewAt: influencerReview?.createdAt || null,
        influencerScore: influencerReview?.globalScore ?? null,
        byBusiness: !!businessReview,
        businessReviewAt: businessReview?.createdAt || null,
        businessScore: businessReview?.globalScore ?? null,
      };
      nextApplication.influencerReview = influencerReview;
      nextApplication.businessReview = businessReview;
      return nextApplication;
    });

    res.json({ applications: enrichedApplications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /applications/:id — gérer le statut d'une candidature (business)
router.put('/:id', protect, requireValidated, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate('event');
    if (!application) return res.status(404).json({ message: 'Candidature introuvable' });

    const event = application.event;
    if (event.creator.toString() !== req.user._id.toString() && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Non autorisé' });

    const { status } = req.body;
    if (!['pending', 'accepted', 'rejected'].includes(status))
      return res.status(400).json({ message: 'Statut invalide' });

    const previousStatus = application.status;
    const plan = getBusinessPlan(req.user);
    if (status === 'accepted' && previousStatus !== 'accepted' && plan.maxCreatorsPerEvent) {
      if ((event.acceptedCount || 0) >= plan.maxCreatorsPerEvent) {
        return res.status(400).json({
          message: `Votre abonnement ${plan.name} limite cet événement à ${plan.maxCreatorsPerEvent} créateurs acceptés`,
        });
      }
    }

    application.status = status;
    application.respondedAt = new Date();

    if (status === 'accepted' && !application.accessCode) {
      application.accessCode = generateAccessCode();
      application.accessCodeShort = generateShortCode();
    }
    if (status === 'pending') {
      application.confirmed = false;
      application.confirmedAt = undefined;
      application.checkedIn = false;
      application.checkedInAt = undefined;
      application.accessCode = undefined;
      application.accessCodeShort = undefined;
      application.reminderSentAt = undefined;
      application.warningIssuedAt = undefined;
    }
    await application.save();

    if (status === 'accepted' && previousStatus !== 'accepted') {
      await Event.findByIdAndUpdate(event._id, { $inc: { acceptedCount: 1 } });
    } else if (previousStatus === 'accepted' && status !== 'accepted') {
      await Event.findByIdAndUpdate(event._id, { $inc: { acceptedCount: -1 } });
    }

    await createNotification({
      userId: application.user,
      actorId: req.user._id,
      type: status === 'accepted'
        ? 'application_accepted'
        : status === 'pending'
          ? 'application_reopened'
          : 'application_rejected',
      category: 'events',
      title: status === 'accepted'
        ? 'Candidature confirmée'
        : status === 'pending'
          ? 'Candidature à relancer'
          : 'Candidature refusée',
      body: status === 'accepted'
        ? `Bonne nouvelle, ${event.title} a confirmé votre participation.`
        : status === 'pending'
          ? `${event.title} vous demande de renvoyer votre candidature.`
          : `${event.title} n’a pas retenu votre candidature.`,
      entityType: 'event',
      entityId: event._id,
      data: {
        eventId: `${event._id}`,
        eventTitle: event.title,
        city: event.city,
        status,
      },
    });

    res.json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /applications/checkin — le business scanne le QR d'un influenceur pour valider l'entrée
router.post('/checkin', protect, requireValidated, async (req, res) => {
  try {
    if (req.user.type !== 'business' && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Réservé aux établissements' });

    const code = String(req.body.code || '').trim();
    if (!code) return res.status(400).json({ message: 'Code manquant' });

    const application = await Application.findOne({
      $or: [{ accessCode: code }, { accessCodeShort: code.toUpperCase() }],
    })
      .populate('event', 'title creator date city plusOneMode guestsRequired')
      .populate('user', 'name photos instagram followersCount');

    if (!application) return res.status(404).json({ message: 'Pass invalide ou inconnu' });
    if (req.user.type !== 'admin' && String(application.event?.creator) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Ce pass ne concerne pas un de vos événements' });
    }
    if (application.status !== 'accepted') {
      return res.status(400).json({ message: 'Participation non valide (candidature non acceptée)' });
    }

    const guest = application.user || {};
    const guestInfo = {
      name: guest.name,
      photo: (guest.photos && guest.photos[0]) || null,
      instagram: guest.instagram,
      followersCount: guest.followersCount,
      eventTitle: application.event?.title,
      plusOneRequired: application.event?.plusOneMode === 'plus_one_required',
      guestsRequired: application.event?.guestsRequired || 0,
    };

    if (application.checkedIn) {
      return res.status(409).json({
        message: 'Ce pass a déjà été utilisé',
        alreadyCheckedIn: true,
        checkedInAt: application.checkedInAt,
        guest: guestInfo,
      });
    }

    application.checkedIn = true;
    application.checkedInAt = new Date();
    if (!application.confirmed) {
      application.confirmed = true;
      application.confirmedAt = new Date();
    }
    await application.save();

    res.json({ success: true, guest: guestInfo, checkedInAt: application.checkedInAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /applications/:id/confirm — l'influenceur confirme sa présence (active l'access pass)
router.post('/:id/confirm', protect, requireValidated, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('event', 'title description city date endDate startTime endTime requiredArrivalTime images venue address country offer offerItems rules dresscode deliverables plusOneMode guestsRequired');
    if (!application) return res.status(404).json({ message: 'Candidature introuvable' });
    if (application.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Non autorisé' });
    if (application.status !== 'accepted')
      return res.status(400).json({ message: 'Votre participation doit d’abord être acceptée' });

    if (!application.accessCode) {
      application.accessCode = generateAccessCode();
      application.accessCodeShort = generateShortCode();
    }
    if (!application.confirmed) {
      application.confirmed = true;
      application.confirmedAt = new Date();
    }
    await application.save();
    res.json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /applications/:id/accept-invite — l'influenceur accepte une invitation reçue
router.post('/:id/accept-invite', protect, requireValidated, async (req, res) => {
  try {
    if (req.user.type !== 'influencer' && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Réservé aux influenceurs' });

    const application = await Application.findById(req.params.id).populate('event');
    if (!application) return res.status(404).json({ message: 'Invitation introuvable' });
    if (req.user.type !== 'admin' && String(application.user) !== String(req.user._id))
      return res.status(403).json({ message: 'Non autorisé' });
    if (!application.isInvitation)
      return res.status(400).json({ message: 'Cette candidature n’est pas une invitation' });
    if (application.status !== 'pending')
      return res.status(400).json({ message: 'Cette invitation ne peut plus être acceptée' });

    const event = application.event;
    if (event.date && new Date(event.date) < new Date()) {
      return res.status(400).json({ message: 'Cette invitation concerne un événement déjà passé' });
    }
    const business = await User.findById(event.creator).select('subscriptionPlan businessName name');
    const plan = getBusinessPlan(business);
    if (plan.maxCreatorsPerEvent && (event.acceptedCount || 0) >= plan.maxCreatorsPerEvent) {
      return res.status(400).json({
        message: `L’établissement a atteint la limite de ${plan.maxCreatorsPerEvent} créateurs pour cet événement`,
      });
    }

    application.status = 'accepted';
    application.respondedAt = new Date();
    if (!application.accessCode) {
      application.accessCode = generateAccessCode();
      application.accessCodeShort = generateShortCode();
    }
    await application.save();

    await Event.findByIdAndUpdate(event._id, { $inc: { acceptedCount: 1 } });

    await createNotification({
      userId: event.creator,
      actorId: req.user._id,
      type: 'invitation_accepted',
      category: 'events',
      title: 'Invitation acceptée',
      body: `${req.user.name || 'Un influenceur'} a accepté votre invitation pour ${event.title}.`,
      entityType: 'application',
      entityId: application._id,
      data: {
        eventId: `${event._id}`,
        eventTitle: event.title,
        city: event.city,
      },
    });

    res.json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /applications/:id/review — noter un influenceur après l'événement (business ou admin)
router.post('/:id/review', protect, requireValidated, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate('event');
    if (!application) return res.status(404).json({ message: 'Candidature introuvable' });

    const event = application.event;
    if (event.creator.toString() !== req.user._id.toString() && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Non autorisé' });

    if (application.status !== 'accepted')
      return res.status(400).json({ message: 'L\'influenceur doit être accepté pour être évalué' });

    const { scores, comment } = req.body;

    let review = await Review.findOne({ influencer: application.user, business: req.user._id, event: event._id });
    if (review) {
      if (scores) review.scores = { ...review.scores.toObject(), ...scores };
      if (comment !== undefined) review.comment = comment;
    } else {
      review = new Review({
        influencer: application.user,
        business: req.user._id,
        event: event._id,
        scores: scores || {},
        comment,
      });
    }
    await review.save();

    // Recalculer les scores agrégés de l'influenceur
    const allReviews = await Review.find({ influencer: application.user });
    const count = allReviews.length;
    const avg = (key) => allReviews.reduce((s, r) => s + (r.scores[key] || 0), 0) / count;
    const scoreDetails = {
      punctuality: parseFloat(avg('punctuality').toFixed(1)),
      style: parseFloat(avg('style').toFixed(1)),
      attitude: parseFloat(avg('attitude').toFixed(1)),
      content: parseFloat(avg('content').toFixed(1)),
    };
    const globalScore = parseFloat(((scoreDetails.punctuality + scoreDetails.style + scoreDetails.attitude + scoreDetails.content) / 4).toFixed(1));

    await User.findByIdAndUpdate(application.user, { score: globalScore, reviewsCount: count, scoreDetails });

    await createNotification({
      userId: application.user,
      actorId: req.user._id,
      type: 'influencer_review_received',
      category: 'events',
      title: 'Nouvelle note reçue',
      body: `${req.user.businessName || req.user.name || 'Un établissement'} a évalué votre participation à ${event.title}.`,
      entityType: 'event',
      entityId: event._id,
      data: {
        eventId: `${event._id}`,
        eventTitle: event.title,
        applicationId: `${application._id}`,
        score: review.globalScore,
      },
    });

    res.json({ review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /applications/invite — inviter un influenceur (business)
router.post('/invite', protect, requireValidated, async (req, res) => {
  try {
    if (req.user.type !== 'business' && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Réservé aux établissements' });

    const plan = getBusinessPlan(req.user);
    if (!plan.canDirectInvite) {
      return res.status(403).json({
        message: `L’invitation directe est réservée aux abonnements APP PRO et APP GROUP`,
      });
    }

    const { userId, eventId } = req.body;
    const [event, influencer] = await Promise.all([
      Event.findById(eventId),
      User.findById(userId).select('followersCount type status'),
    ]);
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    if (event.creator.toString() !== req.user._id.toString() && req.user.type !== 'admin')
      return res.status(403).json({ message: 'Non autorisé' });
    if (event.date && new Date(event.date) < new Date()) {
      return res.status(400).json({ message: 'Impossible d’inviter sur un événement passé' });
    }
    if (!influencer || influencer.type !== 'influencer' || influencer.status !== 'validated') {
      return res.status(404).json({ message: 'Créateur introuvable' });
    }
    if (!isInfluencerVisibleToBusiness(influencer, req.user)) {
      return res.status(403).json({ message: 'Ce créateur n’est pas inclus dans votre abonnement actuel' });
    }
    if (plan.maxCreatorsPerEvent && (event.acceptedCount || 0) >= plan.maxCreatorsPerEvent) {
      return res.status(400).json({
        message: `Votre abonnement ${plan.name} limite cet événement à ${plan.maxCreatorsPerEvent} créateurs`,
      });
    }

    const existing = await Application.findOne({ user: userId, event: eventId });
    if (existing) return res.status(400).json({ message: 'Déjà invité ou postulé' });

    const application = await Application.create({
      user: userId,
      event: eventId,
      isInvitation: true,
      status: 'pending',
    });

    await createNotification({
      userId,
      actorId: req.user._id,
      type: 'event_invite',
      category: 'invites',
      title: 'Nouvelle invitation',
      body: `Vous avez reçu une invitation pour ${event.title}.`,
      entityType: 'event',
      entityId: event._id,
      data: {
        eventId: `${event._id}`,
        applicationId: `${application._id}`,
        eventTitle: event.title,
        city: event.city,
        venue: event.venue,
      },
    });

    res.status(201).json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
