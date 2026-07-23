const asyncHandler = require('express-async-handler');
const Restaurant = require('../models/Restaurant');
const DeliveryPartner = require('../models/DeliveryPartner');
const { Admin } = require('../models/AdminModels');
const City = require('../models/City');
const { PlatformSettings } = require('../models/Misc');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const { hashPassword, generateAccessCode, generateTempPassword } = require('../utils/authUtils');

// POST /api/superadmin/restaurants
const createRestaurant = asyncHandler(async (req, res) => {
  const { name, description, cityId, address, contactPhone, cuisineTags } = req.body;
  const city = await City.findById(cityId);
  if (!city) {
    res.status(400);
    throw new Error('Invalid city');
  }

  const tempPassword = generateTempPassword();
  const restaurant = await Restaurant.create({
    restaurantId: `LB-${city.name.slice(0, 2).toUpperCase()}-REST-${Date.now().toString().slice(-5)}`,
    name,
    description,
    city: cityId,
    address,
    contactPhone,
    cuisineTags,
    accessCode: generateAccessCode('REST'),
    passwordHash: await hashPassword(tempPassword),
    mustChangePassword: true,
  });

  // In production: deliver accessCode + tempPassword via a secure out-of-band channel
  // (e.g. SMS/email to contactPhone), never logged. Returned here for the onboarding flow.
  res.status(201).json({
    success: true,
    restaurant,
    credentials: { accessCode: restaurant.accessCode, tempPassword },
  });
});

// POST /api/superadmin/delivery-partners
const createDeliveryPartner = asyncHandler(async (req, res) => {
  const { name, mobile, cityId, vehicleType } = req.body;
  const city = await City.findById(cityId);
  if (!city) {
    res.status(400);
    throw new Error('Invalid city');
  }

  const tempPassword = generateTempPassword();
  const partner = await DeliveryPartner.create({
    partnerId: `LB-${city.name.slice(0, 2).toUpperCase()}-DEL-${Date.now().toString().slice(-5)}`,
    name,
    mobile,
    city: cityId,
    vehicleType,
    accessCode: generateAccessCode('DEL'),
    passwordHash: await hashPassword(tempPassword),
    mustChangePassword: true,
  });

  res.status(201).json({
    success: true,
    partner,
    credentials: { accessCode: partner.accessCode, tempPassword },
  });
});

// POST /api/superadmin/admins
const createAdmin = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const tempPassword = generateTempPassword();
  const admin = await Admin.create({
    adminId: `LB-ADM-${Date.now().toString().slice(-5)}`,
    name,
    email,
    createdBy: req.user.id,
    accessCode: generateAccessCode('ADM'),
    passwordHash: await hashPassword(tempPassword),
    mustChangePassword: true,
  });

  res.status(201).json({
    success: true,
    admin,
    credentials: { accessCode: admin.accessCode, tempPassword },
  });
});

// GET /api/superadmin/admins
const listAdmins = asyncHandler(async (req, res) => {
  const admins = await Admin.find().select('-passwordHash');
  res.json({ success: true, admins });
});

// PATCH /api/superadmin/admins/:id/disable
const disableAdmin = asyncHandler(async (req, res) => {
  const admin = await Admin.findByIdAndUpdate(req.params.id, { isDisabled: true }, { new: true });
  if (!admin) {
    res.status(404);
    throw new Error('Admin not found');
  }
  res.json({ success: true, admin });
});

// DELETE /api/superadmin/admins/:id
const removeAdmin = asyncHandler(async (req, res) => {
  await Admin.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// DELETE /api/superadmin/restaurants/:id
const removeRestaurant = asyncHandler(async (req, res) => {
  await Restaurant.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// DELETE /api/superadmin/delivery-partners/:id
const removeDeliveryPartner = asyncHandler(async (req, res) => {
  await DeliveryPartner.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// POST /api/superadmin/cities   { name, state }
const addCity = asyncHandler(async (req, res) => {
  const city = await City.create(req.body);
  res.status(201).json({ success: true, city });
});

// DELETE /api/superadmin/cities/:id
const removeCity = asyncHandler(async (req, res) => {
  await City.findByIdAndUpdate(req.params.id, { isActive: false }); // soft-remove: preserves history
  res.json({ success: true });
});

// GET /api/superadmin/settings
const getPlatformSettings = asyncHandler(async (req, res) => {
  const settings = (await PlatformSettings.findOne({ key: 'platform' })) || {};
  res.json({ success: true, settings });
});

// PATCH /api/superadmin/settings
const updatePlatformSettings = asyncHandler(async (req, res) => {
  const settings = await PlatformSettings.findOneAndUpdate({ key: 'platform' }, req.body, {
    new: true,
    upsert: true,
  });
  res.json({ success: true, settings });
});

// PATCH /api/superadmin/share-qr  { imageBase64?, link? }
// Lets the super admin set/replace the QR code image and link shown in the customer
// app's profile, so customers can share the app via WhatsApp/Instagram/Facebook.
// Editable any time in future — nothing here is hardcoded.
const updateShareQr = asyncHandler(async (req, res) => {
  const { imageBase64, link } = req.body;
  const settings = (await PlatformSettings.findOne({ key: 'platform' })) || new PlatformSettings();

  if (imageBase64) {
    if (settings.shareQr?.imagePublicId) {
      await deleteImage(settings.shareQr.imagePublicId).catch(() => {});
    }
    const uploaded = await uploadImage(imageBase64, 'local-bites/share-qr');
    settings.shareQr = {
      imageUrl: uploaded.url,
      imagePublicId: uploaded.publicId,
      link: link !== undefined ? link : settings.shareQr?.link,
    };
  } else if (link !== undefined) {
    settings.shareQr = { ...(settings.shareQr?.toObject?.() || settings.shareQr || {}), link };
  }

  await settings.save();
  res.json({ success: true, shareQr: settings.shareQr });
});

module.exports = {
  createRestaurant,
  createDeliveryPartner,
  createAdmin,
  listAdmins,
  disableAdmin,
  removeAdmin,
  removeRestaurant,
  removeDeliveryPartner,
  addCity,
  removeCity,
  getPlatformSettings,
  updatePlatformSettings,
  updateShareQr,
};
