const cloudinary = require('cloudinary').v2;

// Cloudinary free tier needs no credit card. Configure once here using
// credentials from Cloudinary dashboard > Home (Account Details card):
//   Cloud name, API Key, API Secret
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a base64 image data URI to Cloudinary under a given folder.
 * Same signature and return shape as the old R2/Cloudinary uploadImage, so
 * callers (restaurantController, superAdminController) don't need changes.
 * @param {string} base64DataUri e.g. "data:image/jpeg;base64,...."
 * @param {string} folder e.g. 'local-bites/food', 'local-bites/restaurant-gallery'
 */
const uploadImage = async (base64DataUri, folder) => {
  const result = await cloudinary.uploader.upload(base64DataUri, {
    folder,
    resource_type: 'image',
  });
  return { url: result.secure_url, publicId: result.public_id };
};

const deleteImage = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

module.exports = { uploadImage, deleteImage };
