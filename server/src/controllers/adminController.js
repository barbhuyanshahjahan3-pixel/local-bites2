const asyncHandler = require('express-async-handler');
const { Order } = require('../models/Order');
const { Complaint, PlatformSettings } = require('../models/Misc');
const Restaurant = require('../models/Restaurant');
const DeliveryPartner = require('../models/DeliveryPartner');
const Customer = require('../models/Customer');
const { emitToCustomer, emitToPartner, emitToDeliveryPool } = require('../sockets/emit');

// GET /api/admin/orders?status=&cityId=
const superviseOrders = asyncHandler(async (req, res) => {
  const { status, cityId } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (cityId) filter.city = cityId;
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, orders });
});

// GET /api/admin/restaurants | delivery-partners | customers
const listRestaurants = asyncHandler(async (req, res) => {
  res.json({ success: true, restaurants: await Restaurant.find().select('-passwordHash') });
});
const listDeliveryPartners = asyncHandler(async (req, res) => {
  res.json({ success: true, partners: await DeliveryPartner.find().select('-passwordHash') });
});
const listCustomers = asyncHandler(async (req, res) => {
  res.json({ success: true, customers: await Customer.find().select('-passwordHash') });
});

// PATCH /api/admin/restaurants/:id
const editRestaurant = asyncHandler(async (req, res) => {
  const allowed = ['name', 'description', 'address', 'contactPhone', 'cuisineTags', 'isOpen', 'isFeatured', 'featuredOrder'];
  const updates = {};
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });
  const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, updates, { new: true });
  res.json({ success: true, restaurant });
});

// PATCH /api/admin/delivery-partners/:id
const editDeliveryPartner = asyncHandler(async (req, res) => {
  const allowed = ['name', 'mobile', 'vehicleType', 'isDisabled'];
  const updates = {};
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });
  const partner = await DeliveryPartner.findByIdAndUpdate(req.params.id, updates, { new: true });
  res.json({ success: true, partner });
});

// GET /api/admin/complaints?status=
const listComplaints = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, complaints });
});

// PATCH /api/admin/complaints/:id  { status, resolutionNote }
const resolveComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status, resolutionNote: req.body.resolutionNote, handledBy: req.user.id },
    { new: true }
  );
  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found');
  }
  emitToCustomer(complaint.customer.toString(), 'complaint_update', {
    complaintId: complaint._id,
    status: complaint.status,
  });
  res.json({ success: true, complaint });
});

// PATCH /api/admin/contact  { phone, supportEmail, facebook, instagram, whatsapp }
const updateContact = asyncHandler(async (req, res) => {
  const settings = await PlatformSettings.findOneAndUpdate(
    { key: 'platform' },
    { contact: req.body },
    { new: true, upsert: true }
  );
  res.json({ success: true, settings });
});

// PATCH /api/admin/orders/:id/reassign-delivery  { newPartnerId }
const reassignDelivery = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  order.deliveryPartner = req.body.newPartnerId;
  order.status = 'delivery_accepted';
  order.statusHistory.push({ status: 'delivery_accepted', by: `admin:${req.user.id}`, note: 'reassigned' });
  await order.save();
  emitToPartner(req.body.newPartnerId, 'order_assigned', { orderId: order._id });
  res.json({ success: true, order });
});

// PATCH /api/admin/orders/:id/override-status  { status, note }
// Authorized override of restaurant or delivery status — logged in statusHistory as admin action.
const overrideOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  order.status = req.body.status;
  order.statusHistory.push({ status: req.body.status, by: `admin:${req.user.id}`, note: req.body.note });
  await order.save();
  emitToCustomer(order.customer.toString(), 'order_status', { orderId: order._id, status: order.status });
  res.json({ success: true, order });
});

module.exports = {
  superviseOrders,
  listRestaurants,
  listDeliveryPartners,
  listCustomers,
  editRestaurant,
  editDeliveryPartner,
  listComplaints,
  resolveComplaint,
  updateContact,
  reassignDelivery,
  overrideOrderStatus,
};
