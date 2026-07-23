const asyncHandler = require('express-async-handler');
const Restaurant = require('../models/Restaurant');
const { Food } = require('../models/Food');
const Customer = require('../models/Customer');
const { Review, Complaint } = require('../models/Misc');
const { Order } = require('../models/Order');

// GET /api/public/restaurants?cityId=&search=
const listRestaurants = asyncHandler(async (req, res) => {
  const { cityId, search, featured } = req.query;
  const filter = { isOpen: true };
  if (cityId) filter.city = cityId;
  if (search) filter.name = { $regex: search, $options: 'i' };
  if (featured === 'true') filter.isFeatured = true;
  const restaurants = await Restaurant.find(filter)
    .select('name logoUrl coverImageUrl avgRating ratingCount cuisineTags city isFeatured featuredOrder')
    .sort({ featuredOrder: 1, avgRating: -1 });
  res.json({ success: true, restaurants });
});

// GET /api/public/restaurants/:id
const getRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id).select(
    'name description logoUrl coverImageUrl galleryImages lat lng avgRating ratingCount cuisineTags address city isOpen'
  );
  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }
  const foods = await Food.find({ restaurant: restaurant._id, isAvailable: true }).populate('category', 'name');
  res.json({ success: true, restaurant, foods });
});

// GET /api/public/foods/search?q=
const searchFood = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const foods = await Food.find({ $text: { $search: q }, isAvailable: true })
    .populate('restaurant', 'name city isOpen')
    .limit(50);
  res.json({ success: true, foods });
});

// GET /api/customer/wishlist
const getWishlist = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.user.id).populate({
    path: 'wishlist',
    populate: { path: 'restaurant', select: 'name isOpen' },
  });
  res.json({ success: true, wishlist: customer.wishlist });
});

// POST /api/customer/wishlist/:foodId
const toggleWishlist = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.user.id);
  const idx = customer.wishlist.findIndex((f) => f.toString() === req.params.foodId);
  if (idx >= 0) customer.wishlist.splice(idx, 1);
  else customer.wishlist.push(req.params.foodId);
  await customer.save();
  res.json({ success: true, wishlist: customer.wishlist });
});

// POST /api/customer/reviews  { restaurantId, foodId?, orderId, rating, comment }
const addReview = asyncHandler(async (req, res) => {
  const { restaurantId, foodId, orderId, rating, comment } = req.body;
  const order = await Order.findOne({ _id: orderId, customer: req.user.id, status: 'delivered' });
  if (!order) {
    res.status(400);
    throw new Error('You can only review delivered orders');
  }
  const review = await Review.create({
    customer: req.user.id,
    restaurant: restaurantId,
    food: foodId || null,
    order: orderId,
    rating,
    comment,
  });

  // Recompute restaurant rolling average.
  const restaurant = await Restaurant.findById(restaurantId);
  const newCount = restaurant.ratingCount + 1;
  restaurant.avgRating = (restaurant.avgRating * restaurant.ratingCount + rating) / newCount;
  restaurant.ratingCount = newCount;
  await restaurant.save();

  res.status(201).json({ success: true, review });
});

// POST /api/customer/complaints  { orderId?, subject, description }
const fileComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.create({
    customer: req.user.id,
    order: req.body.orderId || null,
    subject: req.body.subject,
    description: req.body.description,
  });
  res.status(201).json({ success: true, complaint });
});

// GET /api/customer/complaints/mine
const myComplaints = asyncHandler(async (req, res) => {
  const complaints = await Complaint.find({ customer: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, complaints });
});

module.exports = {
  listRestaurants,
  getRestaurant,
  searchFood,
  getWishlist,
  toggleWishlist,
  addReview,
  fileComplaint,
  myComplaints,
};
