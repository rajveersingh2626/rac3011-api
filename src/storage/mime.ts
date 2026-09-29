import { BadRequestException } from '@nestjs/common';
import type { StorageTier } from './storage.port';

const MB = 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
const VIDEO_TYPES = ['video/mp4', 'video/webm'] as const;
const OFFICE_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

export const ALLOWED_MIME_TYPES: Record<StorageTier, readonly string[]> = {
  permanent: [...IMAGE_TYPES, 'application/pdf'],
  dynamic: [...IMAGE_TYPES, ...VIDEO_TYPES, 'application/pdf'],
  private: [...IMAGE_TYPES, ...VIDEO_TYPES, 'application/pdf', ...OFFICE_TYPES],
};

export const MAX_UPLOAD_BYTES: Record<StorageTier, number> = {
  permanent: 5 * MB,
  dynamic: 25 * MB,
  private: 25 * MB,
};

export function isAllowedMimeType(tier: StorageTier, mimeType: string): boolean {
  return ALLOWED_MIME_TYPES[tier].includes(mimeType);
}

export function isAllowedSize(tier: StorageTier, size: number): boolean {
  return Number.isInteger(size) && size > 0 && size <= MAX_UPLOAD_BYTES[tier];
}

export function validateBufferMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  switch (mimeType) {
    case 'image/jpeg':
      return buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    case 'image/png':
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4E &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0D &&
        buffer[5] === 0x0A &&
        buffer[6] === 0x1A &&
        buffer[7] === 0x0A
      );
    case 'image/webp':
      return (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    case 'image/avif':
      return (
        buffer.length >= 12 &&
        buffer.toString('ascii', 4, 8) === 'ftyp' &&
        (buffer.toString('ascii', 8, 12) === 'avif' || buffer.toString('ascii', 8, 12) === 'avis')
      );
    case 'application/pdf':
      return buffer.length >= 4 && buffer.toString('ascii', 0, 4) === '%PDF';
    case 'video/mp4':
      return buffer.length >= 8 && buffer.toString('ascii', 4, 8) === 'ftyp';
    case 'video/webm':
      return (
        buffer.length >= 4 &&
        buffer[0] === 0x1A &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xDF &&
        buffer[3] === 0xA3
      );
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      // OpenXML files are ZIP archives starting with PK (0x50 0x4B)
      return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B;
    default:
      return false;
  }
}

export function assertUploadAllowed(tier: StorageTier, mimeType: string, size: number): void {
  if (!isAllowedMimeType(tier, mimeType)) {
    throw new BadRequestException(`mimeType ${mimeType} is not allowed for the ${tier} tier`);
  }
  if (!isAllowedSize(tier, size)) {
    throw new BadRequestException(
      `size must be between 1 and ${MAX_UPLOAD_BYTES[tier]} bytes for the ${tier} tier`,
    );
  }
}

