import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'profiles',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
});

export const uploadToCloudinary = async (filePath, folder = 'interview-ai') => {
  const result = await cloudinary.uploader.upload(filePath, { folder });
  return result.secure_url;
};

export const uploadBase64 = async (base64Data, folder = 'interview-ai') => {
  const result = await cloudinary.uploader.upload(base64Data, { folder });
  return result.secure_url;
};

export default cloudinary;
