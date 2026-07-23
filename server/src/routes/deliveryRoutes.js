const router = require('express').Router();
const { protect, allowRoles, blockIfMustChangePassword } = require('../middleware/auth');
const ctrl = require('../controllers/deliveryController');
const orderCtrl = require('../controllers/orderController');

router.use(protect, allowRoles('delivery_partner'), blockIfMustChangePassword);

router.patch('/status', ctrl.setOnlineStatus);
router.patch('/location', ctrl.updateLocation);
router.get('/available-orders', ctrl.availableOrders);
router.get('/my-order', ctrl.myActiveOrder);
router.get('/my-order/address-pdf', ctrl.exportAddressSlipPdf);
router.get('/history', ctrl.history);
router.get('/history/export-pdf', ctrl.exportHistoryPdf);
router.get('/earnings', ctrl.earnings);

router.post('/push-subscribe', ctrl.subscribePush);
router.delete('/push-subscribe', ctrl.unsubscribePush);

router.patch('/orders/:id/status', orderCtrl.updateDeliveryStatus);
router.get('/orders/:id', orderCtrl.getOrderForDeliveryPartner);

module.exports = router;
