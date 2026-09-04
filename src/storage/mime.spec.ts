import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertUploadAllowed, isAllowedMimeType, isAllowedSize, MAX_UPLOAD_BYTES } from './mime';

describe('mime allow-lists and size caps per tier', () => {
  it('allows images on every tier and office documents on the private tier only', () => {
    expect(isAllowedMimeType('permanent', 'image/png')).toBe(true);
    expect(isAllowedMimeType('dynamic', 'image/webp')).toBe(true);
    expect(
      isAllowedMimeType(
        'private',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe(true);
    expect(
      isAllowedMimeType(
        'permanent',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe(false);
    expect(isAllowedMimeType('dynamic', 'application/zip')).toBe(false);
  });

  it('enforces the exact per-tier byte caps', () => {
    expect(isAllowedSize('permanent', MAX_UPLOAD_BYTES.permanent)).toBe(true);
    expect(isAllowedSize('permanent', MAX_UPLOAD_BYTES.permanent + 1)).toBe(false);
    expect(isAllowedSize('dynamic', MAX_UPLOAD_BYTES.dynamic)).toBe(true);
    expect(isAllowedSize('private', MAX_UPLOAD_BYTES.private)).toBe(true);
    expect(isAllowedSize('permanent', 0)).toBe(false);
    expect(isAllowedSize('permanent', -1)).toBe(false);
  });

  it('assertUploadAllowed throws BadRequestException for a disallowed mime type or oversized upload', () => {
    expect(() => assertUploadAllowed('permanent', 'application/zip', 1024)).toThrow(
      BadRequestException,
    );
    expect(() =>
      assertUploadAllowed('permanent', 'image/png', MAX_UPLOAD_BYTES.permanent + 1),
    ).toThrow(BadRequestException);
    expect(() => assertUploadAllowed('permanent', 'image/png', 1024)).not.toThrow();
  });
});
