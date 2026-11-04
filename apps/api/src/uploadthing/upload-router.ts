import { createUploadthing, type FileRouter } from 'uploadthing/express';
import { Request } from 'express';
import { JwtPayload } from '@food-delivery/types';

type AuthenticatedRequest = Request & { user?: JwtPayload };

const DEFAULT_UPLOADTHING_TOKEN =
  'eyJhcGlLZXkiOiJza19saXZlXzFmNmMzYjRhNDEwZTUxOGJiYjZkZjRkZDljZTg1ZmJlMzI0NmFhYWEyZmE0M2IyMzdkYTNjM2RkMDQwY2ZkNzUiLCJhcHBJZCI6IjZqbWdodGs1ZHoiLCJyZWdpb25zIjpbInNlYTEiXX0=';

export function resolveUploadthingToken(raw?: string): string {
  if (!raw) return DEFAULT_UPLOADTHING_TOKEN;

  let cleaned = raw.trim();
  if (cleaned.startsWith('UPLOADTHING_TOKEN=')) {
    cleaned = cleaned.slice('UPLOADTHING_TOKEN='.length).trim();
  }
  cleaned = cleaned.replace(/^['"`]+|['"`]+$/g, '').trim();

  try {
    const decoded = Buffer.from(cleaned, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as {
      apiKey?: unknown;
      appId?: unknown;
      regions?: unknown;
    };
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.apiKey === 'string' &&
      parsed.apiKey.startsWith('sk_') &&
      typeof parsed.appId === 'string' &&
      parsed.appId.length > 0 &&
      Array.isArray(parsed.regions) &&
      parsed.regions.length > 0 &&
      parsed.regions.every((r) => typeof r === 'string')
    ) {
      return Buffer.from(JSON.stringify(parsed), 'utf8').toString('base64');
    }
  } catch {
    // Fallback to default token below
  }

  console.warn(
    '[UploadThing] Invalid UPLOADTHING_TOKEN in environment, using fallback token.',
  );
  return DEFAULT_UPLOADTHING_TOKEN;
}

const f = createUploadthing();

export const uploadRouter: FileRouter = {
  restaurantImage: f(
    {
      image: {
        maxFileSize: '16MB',
        maxFileCount: 1,
      },
    },
    {
      awaitServerData: false,
    },
  )
    .middleware(({ req }) => {
      const authReq = req as AuthenticatedRequest;
      return { uploadedBy: authReq.user?.sub ?? 'unknown' };
    })
    .onUploadComplete(({ file, metadata }) => {
      console.log('Upload complete by:', metadata.uploadedBy);
      console.log('File URL:', file.ufsUrl);
      return { url: file.ufsUrl };
    }),

  menuItemImage: f(
    {
      image: {
        maxFileSize: '16MB',
        maxFileCount: 1,
      },
    },
    {
      awaitServerData: false,
    },
  )
    .middleware(({ req }) => {
      const authReq = req as AuthenticatedRequest;
      return { uploadedBy: authReq.user?.sub ?? 'unknown' };
    })
    .onUploadComplete(({ file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
