const mongoose = require('mongoose');

const deliverableSubmissionSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
  influencer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deliverableType: { type: String, required: true, trim: true },
  assetUrl: { type: String, trim: true },
  assetUrls: [{ type: String, trim: true }],
  note: { type: String, trim: true },
  status: { type: String, enum: ['submitted', 'flagged'], default: 'submitted' },
  submittedAt: { type: Date, default: Date.now },
  flaggedAt: { type: Date },
  flaggedReason: { type: String, trim: true },
});

deliverableSubmissionSchema.index(
  { application: 1, deliverableType: 1 },
  { unique: true }
);

module.exports = mongoose.model('DeliverableSubmission', deliverableSubmissionSchema);
