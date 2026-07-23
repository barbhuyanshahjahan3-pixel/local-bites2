const asyncHandler = require('express-async-handler');
const Razorpay = require('razorpay');
const { Order } = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const DeliveryPartner = require('../models/DeliveryPartner');
const { PlatformSettings } = require('../models/Misc');
const { getDistanceKm, computeDeliveryCharge } = require('../utils/distance');
const { emitToRestaurant, emitToCustomer, emitToDeliveryPool, emitToPartner } = require('../sockets/emit');
const { sendPushToSubscriptions } = require('../utils/webPush');

// Pushes a "new delivery available" notification to every online delivery
// partner's phone in the given city — reaches them even if they've closed
// the delivery app, unlike the emitToDeliveryPool socket event which only
// reaches partners with the app open right now.
async function pushToOnlinePartners(cityId, payload) {
  const partners = await DeliveryPartner.find({ city: cityId, isOnline: true }).select(
    'pushSubscriptions'
  );
  for (const partner of partners) {
    if (!partner.pushSubscriptions?.length) continue;
    const { deadEndpoints } = await sendPushToSubscriptions(partner.pushSubscriptions, payload);
    if (deadEndpoints.length) {
      await DeliveryPartner.updateOne(
        { _id: partner._id },
        { $pull: { pushSubscriptions: { endpoint: { $in: deadEndpoints } } } }
      );
    }
  }
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const nextOrderNumber = async (cityCode) => {
  const count = await Order.countDocuments();
  return `LB-${cityCode}-${String(count + 1).padStart(6, '0')}`;
};

// POST /api/orders  (customer)
// Body: { restaurantId, items: [{foodId, quantity}], paymentMethod, name, mobile, deliveryAddress, lat, lng }
const placeOrder = asyncHandler(async (req, res) => {
  const { restaurantId, items, paymentMethod, name, mobile, deliveryAddress, lat, lng } = req.body;
  const restaurant = await Restaurant.findById(restaurantId).populate('city');
  if (!restaurant || !restaurant.isOpen) {
    res.status(400);
    throw new Error('Restaurant unavailable');
  }

  const { Food } = require('../models/Food');
  let itemsTotal = 0;
  const orderItems = [];
  for (const line of items) {
    const food = await Food.findById(line.foodId);
    if (!food || !food.isAvailable) continue;
    const unitPrice = food.offerPrice ?? food.price;
    itemsTotal += unitPrice * line.quantity;
    orderItems.push({ food: food._id, name: food.name, price: unitPrice, quantity: line.quantity });
  }
  if (orderItems.length === 0) {
    res.status(400);
    throw new Error('No valid items in order');
  }

  const settings = await PlatformSettings.findOne({ key: 'platform' });

  // Per-km delivery charge: computed from the real distance between the
  // restaurant and the customer's delivery location. Falls back to the flat
  // defaultDeliveryCharge (or the city's override) if either location is
  // missing so an order can still be placed.
  let distanceKm = null;
  let distanceSource = null;
  if (restaurant.lat != null && restaurant.lng != null && lat != null && lng != null) {
    const result = await getDistanceKm(restaurant.lat, restaurant.lng, lat, lng);
    distanceKm = Math.round(result.distanceKm * 10) / 10;
    distanceSource = result.source;
  }
  const flatFallback = restaurant.city.deliveryChargeOverride ?? settings?.defaultDeliveryCharge ?? 30;
  const deliveryCharge = computeDeliveryCharge(distanceKm, {
    perKmRate: settings?.perKmDeliveryRate ?? 8,
    minCharge: settings?.minDeliveryCharge ?? 20,
    maxCharge: settings?.maxDeliveryCharge ?? 150,
    flatFallback,
  });
  const commissionPercent =
    restaurant.commissionPercentOverride ??
    restaurant.city.commissionPercentOverride ??
    settings?.defaultCommissionPercent ??
    15;
  const platformCommission = Math.round((itemsTotal * commissionPercent) / 100);
  const grandTotal = itemsTotal + deliveryCharge;

  const orderNumber = await nextOrderNumber(restaurant.city.name.slice(0, 2).toUpperCase());

  // 'online' method = pay the full amount now. 'cod' method = pay 50% now as a
  // non-refundable-if-customer-cancels advance, rest as cash on delivery.
  const advanceAmount =
    paymentMethod === 'online' ? grandTotal : Math.round(grandTotal / 2);
  const codRemainingAmount = grandTotal - advanceAmount;

  const order = await Order.create({
    orderNumber,
    customer: req.user.id,
    restaurant: restaurant._id,
    city: restaurant.city._id,
    items: orderItems,
    itemsTotal,
    deliveryCharge,
    deliveryDistanceKm: distanceKm,
    platformCommission,
    grandTotal,
    paymentMethod,
    advanceAmount,
    codRemainingAmount,
    customerName: name,
    customerMobile: mobile,
    deliveryAddress,
    deliveryLat: lat,
    deliveryLng: lng,
    status: 'placed',
    statusHistory: [{ status: 'placed', by: 'customer' }],
  });

  // Every order now requires an online payment (full amount, or the 50% advance)
  // before the restaurant ever sees it. We create the Razorpay order here, but the
  // restaurant is only notified once /api/payments/verify confirms the payment —
  // see paymentRoutes.js. This is what makes an unpaid order "not accepted".
  const razorpayOrder = await razorpay.orders.create({
    amount: advanceAmount * 100, // paise
    currency: 'INR',
    receipt: orderNumber,
  });
  order.razorpayOrderId = razorpayOrder.id;
  await order.save();

  res.status(201).json({
    success: true,
    order,
    razorpayOrder,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  });
});

// PATCH /api/orders/:id/restaurant-status  (restaurant)  { action: 'accept'|'reject'|'preparing'|'ready', reason? }
const updateRestaurantStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || String(order.restaurant) !== req.user.id) {
    res.status(404);
    throw new Error('Order not found');
  }

  const map = {
    accept: 'restaurant_accepted',
    reject: 'restaurant_rejected',
    preparing: 'preparing',
    ready: 'ready_for_pickup',
  };
  const newStatus = map[req.body.action];
  if (!newStatus) {
    res.status(400);
    throw new Error('Invalid action');
  }

  order.status = newStatus;
  order.statusHistory.push({ status: newStatus, by: 'restaurant', note: req.body.reason });
  if (newStatus === 'restaurant_rejected') {
    order.rejectedBy = 'restaurant';
    order.rejectionReason = req.body.reason;
    // Not the customer's fault — refund whatever was paid online.
    if (!order.refunded && order.razorpayPaymentId && ['advance_paid', 'paid'].includes(order.paymentStatus)) {
      const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
        amount: order.advanceAmount * 100,
      });
      order.refunded = true;
      order.refundId = refund.id;
      order.refundedAt = new Date();
      order.paymentStatus = 'refunded';
    }
  }
  await order.save();

  emitToCustomer(order.customer.toString(), 'order_status', { orderId: order._id, status: newStatus });

  // Once food is ready for pickup, broadcast to the online delivery pool in that city.
  if (newStatus === 'ready_for_pickup') {
    emitToDeliveryPool(order.city.toString(), 'delivery_available', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      restaurantName: undefined, // populate on client via restaurant id if needed
    });
    pushToOnlinePartners(order.city, {
      title: 'New delivery available',
      body: `${order.orderNumber} · ₹${order.deliveryCharge} delivery charge — tap to view`,
      url: '/delivery/',
      tag: `delivery-${order._id}`,
    }).catch((err) => console.error('[push] ready_for_pickup broadcast failed:', err.message));
  }

  res.json({ success: true, order });
});

// PATCH /api/orders/:id/delivery-status (delivery partner) { action: 'accept'|'reject'|'pickup'|'on_the_way'|'delivered', reason? }
const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const { action, reason } = req.body;

  if (action === 'accept') {
    if (order.deliveryPartner) {
      res.status(409);
      throw new Error('Order already claimed');
    }
    order.deliveryPartner = req.user.id;
    order.status = 'delivery_accepted';
    order.statusHistory.push({ status: 'delivery_accepted', by: `delivery_partner:${req.user.id}` });
  } else if (action === 'reject') {
    order.status = 'delivery_rejected';
    order.rejectedBy = `delivery_partner:${req.user.id}`;
    order.rejectionReason = reason;
    order.statusHistory.push({ status: 'delivery_rejected', by: `delivery_partner:${req.user.id}`, note: reason });
    // Re-open to the pool so another partner can accept it.
    order.deliveryPartner = null;
    order.status = 'ready_for_pickup';
    emitToDeliveryPool(order.city.toString(), 'delivery_available', {
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
    pushToOnlinePartners(order.city, {
      title: 'Delivery available',
      body: `${order.orderNumber} was re-queued — tap to view`,
      url: '/delivery/',
      tag: `delivery-${order._id}`,
    }).catch((err) => console.error('[push] re-queue broadcast failed:', err.message));
  } else if (['pickup', 'on_the_way', 'delivered'].includes(action)) {
    if (String(order.deliveryPartner) !== req.user.id) {
      res.status(403);
      throw new Error('Not your assigned order');
    }
    const map = { pickup: 'picked_up', on_the_way: 'on_the_way', delivered: 'delivered' };
    order.status = map[action];
    order.statusHistory.push({ status: order.status, by: `delivery_partner:${req.user.id}` });
    if (action === 'delivered') {
      // For COD orders, the delivery partner must confirm the remaining cash was
      // actually collected before the order can be marked delivered.
      if (order.paymentMethod === 'cod' && order.codRemainingAmount > 0 && !req.body.cashCollected) {
        res.status(400);
        throw new Error('Confirm cash collected before marking as delivered');
      }
      order.deliveredAt = new Date();
      if (order.paymentMethod === 'cod') {
        order.codCollected = true;
        order.paymentStatus = 'paid'; // advance + cash both now settled
      }

      const DeliveryPartner = require('../models/DeliveryPartner');
      await DeliveryPartner.findByIdAndUpdate(req.user.id, {
        $inc: { totalEarnings: order.deliveryCharge, totalDeliveries: 1 },
      });
    }
  } else {
    res.status(400);
    throw new Error('Invalid action');
  }

  await order.save();
  emitToCustomer(order.customer.toString(), 'order_status', { orderId: order._id, status: order.status });
  res.json({ success: true, order });
});

// PATCH /api/orders/:id/cancel (customer) — allowed only before the restaurant starts
// preparing. The advance is deliberately NOT refunded here — that's the whole point
// of taking it upfront. Refunds only happen if the RESTAURANT rejects the order
// (see updateRestaurantStatus above).
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user.id });
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (!['placed', 'restaurant_accepted'].includes(order.status)) {
    res.status(400);
    throw new Error('This order can no longer be cancelled');
  }

  order.status = 'cancelled';
  order.rejectedBy = 'customer';
  order.rejectionReason = req.body.reason || 'Cancelled by customer';
  order.statusHistory.push({ status: 'cancelled', by: 'customer', note: order.rejectionReason });
  await order.save();

  emitToRestaurant(order.restaurant.toString(), 'order_status', { orderId: order._id, status: 'cancelled' });
  res.json({ success: true, order });
});

// GET /api/orders/:id/for-delivery-partner  — only the assigned partner sees customer contact/address
const getOrderForDeliveryPartner = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).select(
    'orderNumber items grandTotal paymentMethod paymentStatus codRemainingAmount codCollected customerName customerMobile deliveryAddress deliveryLat deliveryLng status deliveryPartner'
  );
  if (!order || String(order.deliveryPartner) !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized for this order');
  }
  res.json({ success: true, order });
});

// GET /api/orders/mine/:id (customer) — includes full status history for tracking
const getMyOrderDetail = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user.id })
    .populate('restaurant', 'name lat lng address')
    .populate('deliveryPartner', 'name currentLat currentLng vehicleType');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  res.json({ success: true, order });
});

// GET /api/orders/mine (customer)
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

// GET /api/orders/restaurant (restaurant) — deliberately excludes customer mobile/address.
// Unpaid orders (paymentStatus 'pending' or 'failed') never reached checkout completion,
// so the restaurant shouldn't see them at all — only orders where the required online
// payment (advance or full) has actually cleared.
const getRestaurantOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    restaurant: req.user.id,
    paymentStatus: { $in: ['advance_paid', 'paid', 'refunded'] },
  })
    .select('-customerMobile -deliveryAddress -deliveryLat -deliveryLng')
    .sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

module.exports = {
  placeOrder,
  updateRestaurantStatus,
  updateDeliveryStatus,
  cancelOrder,
  getOrderForDeliveryPartner,
  getMyOrders,
  getMyOrderDetail,
  getRestaurantOrders,
};
