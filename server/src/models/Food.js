const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
categorySchema.index({ restaurant: 1, name: 1 }, { unique: true });

const foodSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true, trim: true },
    description: String,
    imageUrl: String, // kept in sync with images[0] for backward compatibility
    imagePublicId: String,
    images: {
      type: [{ url: String, publicId: String }],
      validate: {
        validator: (arr) => !arr || arr.length <= 5,
        message: 'A food item can have at most 5 photos',
      },
      default: [],
    },
    price: { type: Number, required: true, min: 0 },
    offerPrice: { type: Number, default: null }, // null = no active offer
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true }, // restaurant can 86 an item instantly
    avgRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

foodSchema.index({ name: 'text', description: 'text' }); // powers food search

const Category = mongoose.model('Category', categorySchema);
const Food = mongoose.model('Food', foodSchema);

module.exports = { Category, Food };
