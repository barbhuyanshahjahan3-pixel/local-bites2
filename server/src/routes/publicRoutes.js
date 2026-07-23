const router = require('express').Router();
const asyncHandler = require('express-async-handler');
const ctrl = require('../controllers/customerController');
const City = require('../models/City');
const Restaurant = require('../models/Restaurant');
const { PlatformSettings } = require('../models/Misc');
const { getDistanceKm, computeDeliveryCharge } = require('../utils/distance');

router.get('/restaurants', ctrl.listRestaurants);
router.get('/restaurants/:id', ctrl.getRestaurant);
router.get('/foods/search', ctrl.searchFood);

// GET /api/public/delivery-estimate?restaurantId=...&lat=...&lng=...
// Lets the customer app show the distance and delivery charge *before*
// checkout, using the same per-km logic the order placement endpoint uses.
router.get(
  '/delivery-estimate',
  asyncHandler(async (req, res) => {
    const { restaurantId, lat, lng } = req.query;
    const restaurant = await Restaurant.findById(restaurantId).populate('city');
    if (!restaurant) {
      res.status(404);
      throw new Error('Restaurant not found');
    }
    const settings = await PlatformSettings.findOne({ key: 'platform' });
    const flatFallback = restaurant.city.deliveryChargeOverride ?? settings?.defaultDeliveryCharge ?? 30;

    let distanceKm = null;
    if (restaurant.lat != null && restaurant.lng != null && lat != null && lng != null) {
      const result = await getDistanceKm(restaurant.lat, restaurant.lng, Number(lat), Number(lng));
      distanceKm = Math.round(result.distanceKm * 10) / 10;
    }
    const deliveryCharge = computeDeliveryCharge(distanceKm, {
      perKmRate: settings?.perKmDeliveryRate ?? 8,
      minCharge: settings?.minDeliveryCharge ?? 20,
      maxCharge: settings?.maxDeliveryCharge ?? 150,
      flatFallback,
    });
    res.json({ success: true, distanceKm, deliveryCharge });
  })
);

router.get(
  '/cities',
  asyncHandler(async (req, res) => {
    const cities = await City.find({ isActive: true }).select('name state');
    res.json({ success: true, cities });
  })
);

router.get(
  '/contact',
  asyncHandler(async (req, res) => {
    const settings = await PlatformSettings.findOne({ key: 'platform' }).select('contact');
    res.json({ success: true, contact: settings?.contact || {} });
  })
);

router.get(
  '/share-qr',
  asyncHandler(async (req, res) => {
    const settings = await PlatformSettings.findOne({ key: 'platform' }).select('shareQr');
    res.json({ success: true, shareQr: settings?.shareQr || {} });
  })
);

module.exports = router;
