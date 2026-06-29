const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a local file to Cloudinary and returns the secure URL
 * @param {string} localFilePath - Path to the local file
 * @returns {Promise<string>} - Cloudinary secure URL
 */
const uploadToCloudinary = async (localFilePath) => {
  try {
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder: 'civicsprint', // Optional: organized folder name
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Uploads a buffer directly to Cloudinary and returns the secure URL
 * @param {Buffer} fileBuffer - Image buffer
 * @returns {Promise<string>} - Cloudinary secure URL
 */
const uploadBufferToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'civicsprint' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary buffer upload error:', error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    const { Readable } = require('stream');
    const readable = new Readable();
    readable._read = () => {};
    readable.push(fileBuffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

module.exports = {
  uploadToCloudinary,
  uploadBufferToCloudinary,
};
