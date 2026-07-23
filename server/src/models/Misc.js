const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', default: null },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true }, // only reviewable after delivery
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
  },
  { timestamps: true }
);

const complaintSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    resolutionNote: String,
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

// Singleton document holding platform-wide configurable settings.
const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'platform', unique: true },
    defaultCommissionPercent: { type: Number, default: 15 },
    defaultDeliveryCharge: { type: Number, default: 30 },
    // Per-km delivery pricing: super admin sets a rate per km, and the actual
    // charge for each order is computed from the real restaurant-to-customer
    // distance (see server/src/utils/distance.js). defaultDeliveryCharge above
    // is only used as a fallback when distance can't be determined (e.g. the
    // customer didn't share a location).
    perKmDeliveryRate: { type: Number, default: 8 },
    minDeliveryCharge: { type: Number, default: 20 },
    maxDeliveryCharge: { type: Number, default: 150 },
    contact: {
      phone: String,
      supportEmail: String,
      facebook: String,
      instagram: String,
      whatsapp: String,
    },
    razorpayEnabled: { type: Boolean, default: true },
    codEnabled: { type: Boolean, default: true },
    // Super-admin-editable QR code + link shown in the customer app's profile so
    // customers can share the app via WhatsApp/Instagram/Facebook.
    shareQr: {
      imageUrl: String,
      imagePublicId: String,
      link: String,
    },
  },
  { timestamps: true }
);

module.exports = {
  Review: mongoose.model('Review', reviewSchema),
  Complaint: mongoose.model('Complaint', complaintSchema),
  PlatformSettings: mongoose.model('PlatformSettings', platformSettingsSchema),
};
