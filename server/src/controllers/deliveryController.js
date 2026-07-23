const asyncHandler = require('express-async-handler');
const PDFDocument = require('pdfkit');
const DeliveryPartner = require('../models/DeliveryPartner');
const { Order } = require('../models/Order');
const { emitToCustomer } = require('../sockets/emit');

// PATCH /api/delivery/status { isOnline, lat, lng }
const setOnlineStatus = asyncHandler(async (req, res) => {
  const { isOnline, lat, lng } = req.body;
  const partner = await DeliveryPartner.findByIdAndUpdate(
    req.user.id,
    { isOnline, currentLat: lat, currentLng: lng },
    { new: true }
  );
  res.json({ success: true, partner });
});

// PATCH /api/delivery/location { lat, lng } — sent every ~10-15s from the
// delivery app's browser geolocation while the partner has an active
// delivery, so the customer can watch them move toward the delivery address
// on a live map (no Google Maps key needed — the map itself is rendered with
// free OpenStreetMap tiles on the frontend; this endpoint just relays the
// coordinates in real time over the existing Socket.IO connection).
const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    res.status(400);
    throw new Error('lat and lng are required');
  }

  await DeliveryPartner.updateOne({ _id: req.user.id }, { currentLat: lat, currentLng: lng });

  const activeOrder = await Order.findOne({
    deliveryPartner: req.user.id,
    status: { $in: ['delivery_accepted', 'picked_up', 'on_the_way'] },
  }).select('_id customer');

  if (activeOrder) {
    emitToCustomer(activeOrder.customer.toString(), 'partner_location', {
      orderId: activeOrder._id,
      lat,
      lng,
    });
  }

  res.json({ success: true });
});

// GET /api/delivery/available-orders — unclaimed, ready-for-pickup orders in this partner's city
const availableOrders = asyncHandler(async (req, res) => {
  const partner = await DeliveryPartner.findById(req.user.id);
  const orders = await Order.find({
    city: partner.city,
    status: 'ready_for_pickup',
    deliveryPartner: null,
  })
    .select('orderNumber items grandTotal deliveryCharge paymentMethod restaurant createdAt')
    .populate('restaurant', 'name address')
    .sort({ createdAt: 1 });
  res.json({ success: true, orders });
});

// GET /api/delivery/history
const history = asyncHandler(async (req, res) => {
  const orders = await Order.find({ deliveryPartner: req.user.id, status: 'delivered' }).sort({
    deliveredAt: -1,
  });
  res.json({ success: true, orders });
});

// GET /api/delivery/earnings
const earnings = asyncHandler(async (req, res) => {
  const partner = await DeliveryPartner.findById(req.user.id).select('totalEarnings totalDeliveries');
  res.json({ success: true, earnings: partner });
});

// POST /api/delivery/push-subscribe — body is the PushSubscription object
// the browser gave us (endpoint + keys).
const subscribePush = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400);
    throw new Error('Invalid push subscription');
  }
  await DeliveryPartner.updateOne(
    { _id: req.user.id },
    { $pull: { pushSubscriptions: { endpoint } } }
  );
  await DeliveryPartner.updateOne(
    { _id: req.user.id },
    { $push: { pushSubscriptions: { endpoint, keys } } }
  );
  res.json({ success: true });
});

// DELETE /api/delivery/push-subscribe — body: { endpoint }
const unsubscribePush = asyncHandler(async (req, res) => {
  await DeliveryPartner.updateOne(
    { _id: req.user.id },
    { $pull: { pushSubscriptions: { endpoint: req.body.endpoint } } }
  );
  res.json({ success: true });
});

// GET /api/delivery/history/export-pdf
const exportHistoryPdf = asyncHandler(async (req, res) => {
  const orders = await Order.find({ deliveryPartner: req.user.id, status: 'delivered' }).sort({
    deliveredAt: -1,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="delivery-history.pdf"');

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(18).text('Local Bites — Completed Deliveries', { align: 'center' });
  doc.moveDown();

  orders.forEach((o) => {
    doc
      .fontSize(11)
      .text(`Order: ${o.orderNumber}   Delivered: ${o.deliveredAt?.toDateString() || '-'}`)
      .text(`Delivery charge earned: Rs. ${o.deliveryCharge}`)
      .moveDown(0.5);
  });

  doc.moveDown();
  doc.fontSize(12).text(`Total deliveries: ${orders.length}`);
  doc.text(`Total earned: Rs. ${orders.reduce((s, o) => s + o.deliveryCharge, 0)}`);

  doc.end();
});

// GET /api/delivery/my-order/address-pdf — a printable/saveable slip with the
// customer's name, mobile, and delivery address for the partner's current
// active delivery. Useful when the rider wants an offline copy.
const exportAddressSlipPdf = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    deliveryPartner: req.user.id,
    status: { $in: ['delivery_accepted', 'picked_up', 'on_the_way'] },
  }).select('orderNumber customerName customerMobile deliveryAddress deliveryLat deliveryLng codRemainingAmount');

  if (!order) {
    res.status(404);
    throw new Error('No active delivery to export');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${order.orderNumber}-address.pdf"`);

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(18).text('Local Bites — Delivery Address Slip', { align: 'center' });
  doc.moveDown();
  doc.fontSize(13).text(`Order: ${order.orderNumber}`);
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Customer: ${order.customerName}`);
  doc.text(`Mobile: ${order.customerMobile}`);
  doc.moveDown(0.5);
  doc.text('Delivery address:', { underline: true });
  doc.text(order.deliveryAddress || '-');
  if (order.deliveryLat != null && order.deliveryLng != null) {
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#2563eb').text(
      `Map: https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLat},${order.deliveryLng}`
    );
    doc.fillColor('black');
  }
  if (order.codRemainingAmount > 0) {
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Cash to collect on delivery: Rs. ${order.codRemainingAmount}`);
  }

  doc.end();
});

// GET /api/delivery/my-order — the partner's single active assignment, if any
const myActiveOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    deliveryPartner: req.user.id,
    status: { $in: ['delivery_accepted', 'picked_up', 'on_the_way'] },
  })
    .select(
      'orderNumber items grandTotal paymentMethod paymentStatus codRemainingAmount codCollected customerName customerMobile deliveryAddress deliveryLat deliveryLng status deliveryPartner restaurant'
    )
    .populate('restaurant', 'name address lat lng');
  res.json({ success: true, order: order || null });
});

module.exports = {
  setOnlineStatus,
  updateLocation,
  availableOrders,
  myActiveOrder,
  history,
  earnings,
  exportHistoryPdf,
  exportAddressSlipPdf,
  subscribePush,
  unsubscribePush,
};
