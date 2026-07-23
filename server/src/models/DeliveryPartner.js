const mongoose = require('mongoose');
const { staffAccountFields } = require('./schemaHelpers');

const deliveryPartnerSchema = new mongoose.Schema(
  {
    partnerId: { type: String, required: true, unique: true }, // e.g. LB-HJ-DEL-014
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    vehicleType: { type: String, enum: ['bike', 'bicycle', 'on-foot'], default: 'bike' },
    isOnline: { type: Boolean, default: false },
    currentLat: Number,
    currentLng: Number,
    totalEarnings: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    // One entry per browser/device that opted in to push notifications.
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

deliveryPartnerSchema.index({ city: 1, isOnline: 1 });

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
