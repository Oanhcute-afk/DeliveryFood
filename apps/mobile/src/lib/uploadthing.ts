import { generateReactNativeHelpers } from '@uploadthing/expo';
import type { OurFileRouter } from '../../../api/src/uploadthing/upload-router';

const rawServerUrl =
  process.env.EXPO_PUBLIC_SERVER_URL?.trim() ||
  process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/api\/?$/, '') ||
  'https://deliveryfood-l3dv.onrender.com';

const serverUrl = rawServerUrl.replace(/\/+$/, '');

export const { useImageUploader, useDocumentUploader } =
  generateReactNativeHelpers<OurFileRouter>({
    url: `${serverUrl}/api/uploadthing`,
  });
