const mongoose = require('mongoose');
const { staffAccountFields } = require('./schemaHelpers');

const restaurantSchema = new mongoose.Schema(
  {
    restaurantId: { type: String, required: true, unique: true }, // e.g. LB-HJ-REST-001
    name: { type: String, required: true, trim: true },
    description: String,
    logoUrl: String,
    logoPublicId: String,
    coverImageUrl: String,
    coverImagePublicId: String,
    galleryImages: [{ url: String, publicId: String }],
    lat: Number,
    lng: Number,
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    address: { type: String, required: true },
    // Restaurant's own contact for platform/admin use only — NOT exposed to customers,
    // and customers' phone/address are not exposed to the restaurant (see controllers).
    contactPhone: { type: String, required: true },
    cuisineTags: [String],
    isOpen: { type: Boolean, default: true }, // toggled by restaurant (e.g. closing time)
    // Set by admin/super-admin only — controls the "featured restaurants" banner strip
    // on the customer home page. Lower featuredOrder shows first; isFeatured must be
    // true for a restaurant to appear in the banner at all.
    isFeatured: { type: Boolean, default: false },
    featuredOrder: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    commissionPercentOverride: { type: Number, default: null },
    // One entry per browser/device that opted in to push notifications.
    // Multiple entries are normal (e.g. phone + desktop both subscribed).
    pushSubscriptions: [
      {
        endpoint: { type: String, required: true },
        keys: {
          p256dh: { type: String, required: true },
          auth: { type: String, required: true },
        },
      },
    ],
    ...staffAccountFields,
  },
  { timestamps: true }
);

restaurantSchema.index({ city: 1, isOpen: 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
