const router = require('express').Router();
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const { protect, allowRoles } = require('../middleware/auth');
const { Order } = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const { emitToRestaurant } = require('../sockets/emit');
const { sendPushToSubscriptions } = require('../utils/webPush');

// POST /api/payments/verify (customer)
// Body: { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
router.post(
  '/verify',
  protect,
  allowRoles('customer'),
  asyncHandler(async (req, res) => {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      res.status(400);
      throw new Error('Payment verification failed');
    }

    const order = await Order.findOne({ _id: orderId, customer: req.user.id });
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // 'online' method = the full amount just cleared -> fully paid.
    // 'cod' method = only the 50% advance just cleared -> rest is still cash on delivery.
    order.paymentStatus = order.paymentMethod === 'online' ? 'paid' : 'advance_paid';
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    // The restaurant is only told about the order now that it's actually paid for —
    // an order that never completes payment never reaches the restaurant at all.
    emitToRestaurant(order.restaurant.toString(), 'new_order', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      items: order.items,
    });

    // Also fire a real push notification — this is what reaches the restaurant's
    // phone even if they've closed the app/browser entirely. The socket event
    // above only fires while the dashboard tab is open and connected.
    const restaurant = await Restaurant.findById(order.restaurant).select('pushSubscriptions');
    if (restaurant?.pushSubscriptions?.length) {
      const { deadEndpoints } = await sendPushToSubscriptions(restaurant.pushSubscriptions, {
        title: `New order ${order.orderNumber}`,
        body: `${order.items.length} item${order.items.length > 1 ? 's' : ''} · ₹${order.itemsTotal} · tap to view`,
        url: '/restaurant/',
        tag: `order-${order._id}`,
      });
      if (deadEndpoints.length) {
        await Restaurant.updateOne(
          { _id: restaurant._id },
          { $pull: { pushSubscriptions: { endpoint: { $in: deadEndpoints } } } }
        );
      }
    }

    res.json({ success: true, order });
  })
);

module.exports = router;
