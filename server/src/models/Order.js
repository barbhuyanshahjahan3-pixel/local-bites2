const mongoose = require('mongoose');

// Status progression (enforced in orderController, not just documented here):
// placed -> restaurant_accepted -> preparing -> ready_for_pickup
//        -> delivery_accepted -> picked_up -> on_the_way -> delivered
// Branches: restaurant_rejected, delivery_rejected (re-queued to another partner), cancelled
const ORDER_STATUSES = [
  'placed',
  'restaurant_accepted',
  'restaurant_rejected',
  'preparing',
  'ready_for_pickup',
  'delivery_accepted',
  'delivery_rejected',
  'picked_up',
  'on_the_way',
  'delivered',
  'cancelled',
];

const orderItemSchema = new mongoose.Schema(
  {
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
    name: String, // snapshot at order time, in case food is later edited
    price: Number, // snapshot price actually charged
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    by: { type: String }, // e.g. "restaurant", "delivery_partner", "admin:LB-ADM-003"
    note: String, // e.g. rejection reason
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true }, // human-readable, e.g. LB-HJ-000241
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },

    items: [orderItemSchema],
    itemsTotal: { type: Number, required: true },
    deliveryCharge: { type: Number, required: true },
    deliveryDistanceKm: { type: Number, default: null },
    platformCommission: { type: Number, required: true }, // computed at order time, restaurant payout basis
    grandTotal: { type: Number, required: true },

    // 'cod'    = 50% paid online now (advance), 50% collected as cash on delivery
    // 'online' = 100% paid online now, nothing collected on delivery
    paymentMethod: { type: String, enum: ['cod', 'online'], required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'advance_paid', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    advanceAmount: { type: Number, required: true }, // amount required online at checkout
    codRemainingAmount: { type: Number, default: 0 }, // amount to collect as cash on delivery (0 for 'online')
    codCollected: { type: Boolean, default: false }, // delivery partner confirms cash received
    razorpayOrderId: String,
    razorpayPaymentId: String,
    // The advance is non-refundable if the CUSTOMER cancels. It IS refunded if the
    // restaurant rejects/cancels the order — that's not the customer's fault.
    refunded: { type: Boolean, default: false },
    refundId: String,
    refundedAt: Date,

    // Checkout-collected info. Restaurant does NOT get address/mobile — only the
    // delivery partner does, once assigned (see privacy note in orderController).
    customerName: { type: String, required: true },
    customerMobile: { type: String, required: true },
    deliveryAddress: { type: String, required: true },
    deliveryLat: Number,
    deliveryLng: Number,

    status: { type: String, enum: ORDER_STATUSES, default: 'placed' },
    statusHistory: [statusHistorySchema],

    rejectedBy: { type: String }, // "restaurant" | "delivery_partner:<partnerId>" — feeds analytics
    rejectionReason: String,

    deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner', default: null },
    deliveredAt: Date,
  },
  { timestamps: true }
);

orderSchema.index({ restaurant: 1, status: 1, createdAt: -1 });
orderSchema.index({ deliveryPartner: 1, status: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ city: 1, createdAt: -1 });

module.exports = { Order: mongoose.model('Order', orderSchema), ORDER_STATUSES };
