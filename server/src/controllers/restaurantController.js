const asyncHandler = require('express-async-handler');
const { Category, Food } = require('../models/Food');
const { Order } = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const { uploadImage, deleteImage } = require('../config/cloudinary');

// GET /api/restaurant/profile
const getProfile = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.user.id).select('-passwordHash');
  res.json({ success: true, restaurant });
});

// PATCH /api/restaurant/profile  { name?, description?, address?, lat?, lng?, cuisineTags? }
const updateProfile = asyncHandler(async (req, res) => {
  const { name, description, address, lat, lng, cuisineTags } = req.body;
  const restaurant = await Restaurant.findById(req.user.id);
  if (name !== undefined) restaurant.name = name;
  if (description !== undefined) restaurant.description = description;
  if (address !== undefined) restaurant.address = address;
  if (lat !== undefined) restaurant.lat = lat;
  if (lng !== undefined) restaurant.lng = lng;
  if (cuisineTags !== undefined) restaurant.cuisineTags = cuisineTags;
  await restaurant.save();
  res.json({ success: true, restaurant });
});

// POST /api/restaurant/gallery  { imageBase64 }
const addGalleryImage = asyncHandler(async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    res.status(400);
    throw new Error('No image provided');
  }
  const uploaded = await uploadImage(imageBase64, 'local-bites/restaurant-gallery');
  const restaurant = await Restaurant.findById(req.user.id);
  restaurant.galleryImages.push({ url: uploaded.url, publicId: uploaded.publicId });
  await restaurant.save();
  res.json({ success: true, galleryImages: restaurant.galleryImages });
});

// DELETE /api/restaurant/gallery/:publicId
const deleteGalleryImage = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.user.id);
  const image = restaurant.galleryImages.find((g) => g.publicId === req.params.publicId);
  if (image) {
    await deleteImage(image.publicId).catch(() => {}); // best-effort cleanup on Cloudinary
    restaurant.galleryImages = restaurant.galleryImages.filter((g) => g.publicId !== req.params.publicId);
    await restaurant.save();
  }
  res.json({ success: true, galleryImages: restaurant.galleryImages });
});

// GET /api/restaurant/categories
const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ restaurant: req.user.id }).sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, categories });
});

// GET /api/restaurant/foods
const listFoods = asyncHandler(async (req, res) => {
  const foods = await Food.find({ restaurant: req.user.id }).populate('category', 'name').sort({ createdAt: -1 });
  res.json({ success: true, foods });
});

// POST /api/restaurant/categories { name }
const addCategory = asyncHandler(async (req, res) => {
  const category = await Category.create({ name: req.body.name, restaurant: req.user.id });
  res.status(201).json({ success: true, category });
});

// POST /api/restaurant/foods  { categoryId, name, description, price, offerPrice, isVeg, imagesBase64: string[] }
// imagesBase64 accepts up to 5 data-URI images. `imageBase64` (single, legacy) is still accepted for older clients.
const addFood = asyncHandler(async (req, res) => {
  const { categoryId, name, description, price, offerPrice, isVeg, imageBase64, imagesBase64 } = req.body;

  const rawImages = (Array.isArray(imagesBase64) ? imagesBase64 : imageBase64 ? [imageBase64] : []).filter(Boolean);
  if (rawImages.length > 5) {
    res.status(400);
    throw new Error('You can upload at most 5 photos per item');
  }

  let images = [];
  if (rawImages.length) {
    try {
      images = await Promise.all(rawImages.map((img) => uploadImage(img, 'local-bites/food')));
    } catch (err) {
      // Surface a clear error instead of silently creating the item without photos
      res.status(502);
      throw new Error('Image upload failed — please try again with a smaller photo. (' + err.message + ')');
    }
  }

  const food = await Food.create({
    restaurant: req.user.id,
    category: categoryId,
    name,
    description,
    price,
    offerPrice: offerPrice ?? null,
    isVeg,
    images: images.map((i) => ({ url: i.url, publicId: i.publicId })),
    imageUrl: images[0]?.url,
    imagePublicId: images[0]?.publicId,
  });
  res.status(201).json({ success: true, food });
});

// PATCH /api/restaurant/foods/:id
const editFood = asyncHandler(async (req, res) => {
  const food = await Food.findOne({ _id: req.params.id, restaurant: req.user.id });
  if (!food) {
    res.status(404);
    throw new Error('Food not found');
  }
  const { name, description, price, offerPrice, isVeg, isAvailable, imageBase64, imagesBase64, removePublicIds } =
    req.body;

  let images = food.images || [];
  if (Array.isArray(removePublicIds) && removePublicIds.length) {
    const toRemove = images.filter((img) => removePublicIds.includes(img.publicId));
    await Promise.all(toRemove.map((img) => deleteImage(img.publicId).catch(() => {})));
    images = images.filter((img) => !removePublicIds.includes(img.publicId));
  }

  const newRaw = (Array.isArray(imagesBase64) ? imagesBase64 : imageBase64 ? [imageBase64] : []).filter(Boolean);
  if (newRaw.length) {
    if (images.length + newRaw.length > 5) {
      res.status(400);
      throw new Error('You can upload at most 5 photos per item');
    }
    let uploaded;
    try {
      uploaded = await Promise.all(newRaw.map((img) => uploadImage(img, 'local-bites/food')));
    } catch (err) {
      res.status(502);
      throw new Error('Image upload failed — please try again with a smaller photo. (' + err.message + ')');
    }
    images = [...images, ...uploaded.map((i) => ({ url: i.url, publicId: i.publicId }))];
  }

  food.images = images;
  food.imageUrl = images[0]?.url;
  food.imagePublicId = images[0]?.publicId;

  Object.assign(food, {
    name: name ?? food.name,
    description: description ?? food.description,
    price: price ?? food.price,
    offerPrice: offerPrice === undefined ? food.offerPrice : offerPrice,
    isVeg: isVeg ?? food.isVeg,
    isAvailable: isAvailable ?? food.isAvailable,
  });
  await food.save();
  res.json({ success: true, food });
});

// DELETE /api/restaurant/foods/:id
const deleteFood = asyncHandler(async (req, res) => {
  const food = await Food.findOne({ _id: req.params.id, restaurant: req.user.id });
  if (!food) {
    res.status(404);
    throw new Error('Food not found');
  }
  await Promise.all((food.images || []).map((img) => deleteImage(img.publicId).catch(() => {})));
  await food.deleteOne();
  res.json({ success: true });
});

// GET /api/restaurant/reports/sales?from=&to=
const salesReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const match = { restaurant: req.user.id, status: 'delivered' };
  if (from || to) {
    match.deliveredAt = {};
    if (from) match.deliveredAt.$gte = new Date(from);
    if (to) match.deliveredAt.$lte = new Date(to);
  }
  const orders = await Order.find(match);
  const totalRevenue = orders.reduce((sum, o) => sum + o.itemsTotal, 0);
  const totalCommission = orders.reduce((sum, o) => sum + o.platformCommission, 0);
  res.json({
    success: true,
    report: {
      orderCount: orders.length,
      totalRevenue,
      totalCommission,
      netPayout: totalRevenue - totalCommission,
    },
  });
});

// POST /api/restaurant/push-subscribe — body is the PushSubscription object
// the browser gave us (endpoint + keys). Called once per device after the
// restaurant grants notification permission.
const subscribePush = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400);
    throw new Error('Invalid push subscription');
  }
  await Restaurant.updateOne({ _id: req.user.id }, { $pull: { pushSubscriptions: { endpoint } } });
  await Restaurant.updateOne(
    { _id: req.user.id },
    { $push: { pushSubscriptions: { endpoint, keys } } }
  );
  res.json({ success: true });
});

// DELETE /api/restaurant/push-subscribe — body: { endpoint }. Called when the
// restaurant turns notifications off on a device.
const unsubscribePush = asyncHandler(async (req, res) => {
  await Restaurant.updateOne(
    { _id: req.user.id },
    { $pull: { pushSubscriptions: { endpoint: req.body.endpoint } } }
  );
  res.json({ success: true });
});

module.exports = {
  getProfile,
  updateProfile,
  addGalleryImage,
  deleteGalleryImage,
  addCategory,
  listCategories,
  addFood,
  listFoods,
  editFood,
  deleteFood,
  salesReport,
  subscribePush,
  unsubscribePush,
};
