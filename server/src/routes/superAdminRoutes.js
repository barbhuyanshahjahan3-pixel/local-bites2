const router = require('express').Router();
const { protect, allowRoles, blockIfMustChangePassword } = require('../middleware/auth');
const ctrl = require('../controllers/superAdminController');

router.use(protect, allowRoles('super_admin'), blockIfMustChangePassword);

router.post('/restaurants', ctrl.createRestaurant);
router.delete('/restaurants/:id', ctrl.removeRestaurant);

router.post('/delivery-partners', ctrl.createDeliveryPartner);
router.delete('/delivery-partners/:id', ctrl.removeDeliveryPartner);

router.post('/admins', ctrl.createAdmin);
router.get('/admins', ctrl.listAdmins);
router.patch('/admins/:id/disable', ctrl.disableAdmin);
router.delete('/admins/:id', ctrl.removeAdmin);

router.post('/cities', ctrl.addCity);
router.delete('/cities/:id', ctrl.removeCity);

router.get('/settings', ctrl.getPlatformSettings);
router.patch('/settings', ctrl.updatePlatformSettings);
router.patch('/share-qr', ctrl.updateShareQr);

module.exports = router;
