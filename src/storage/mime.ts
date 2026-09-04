import { BadRequestException } from '@nestjs/common';
import type { StorageTier } from './storage.port';

const MB = 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
const OFFICE_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

export const ALLOWED_MIME_TYPES: Record<StorageTier, readonly string[]> = {
  permanent: [...IMAGE_TYPES, 'application/pdf'],
  dynamic: [...IMAGE_TYPES, 'application/pdf'],
  private: [...IMAGE_TYPES, 'application/pdf', ...OFFICE_TYPES],
};

export const MAX_UPLOAD_BYTES: Record<StorageTier, number> = {
  permanent: 5 * MB,
  dynamic: 10 * MB,
  private: 25 * MB,
};

export function isAllowedMimeType(tier: StorageTier, mimeType: string): boolean {
  return ALLOWED_MIME_TYPES[tier].includes(mimeType);
}

export function isAllowedSize(tier: StorageTier, size: number): boolean {
  return Number.isInteger(size) && size > 0 && size <= MAX_UPLOAD_BYTES[tier];
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
