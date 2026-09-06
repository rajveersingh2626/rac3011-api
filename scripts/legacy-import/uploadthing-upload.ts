import { readFile } from 'node:fs/promises';
import { UTApi } from 'uploadthing/server';

let api: UTApi | undefined;

function client(): UTApi {
  const token = process.env.UPLOADTHING_TOKEN_PERMANENT;
  if (!token) throw new Error('UPLOADTHING_TOKEN_PERMANENT is not configured');
  api ??= new UTApi({ token });
  return api;
}

export function uploadThingConfigured(): boolean {
  return !!process.env.UPLOADTHING_TOKEN_PERMANENT;
}

const MIME_BY_EXT: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

export async function uploadPermanentImage(filePath: string, name: string): Promise<string> {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream';
  const buffer = await readFile(filePath);
  const file = new File([buffer], name, { type: mime });
  const result = await client().uploadFiles(file);
  if (result.error)
    throw new Error(`uploadthing upload failed for ${name}: ${result.error.message}`);
  return result.data.ufsUrl;
}
