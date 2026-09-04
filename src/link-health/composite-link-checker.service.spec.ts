import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompositeLinkChecker, extractDriveFileId } from './composite-link-checker.service';
import type { LinkCheckStatus } from './link-checker.port';

function fakeDrive(configured: boolean, result: LinkCheckStatus) {
  return { isConfigured: () => configured, getFile: vi.fn(() => Promise.resolve(result)) };
}

describe('extractDriveFileId', () => {
  it('reads the id from a /d/ path', () => {
    expect(extractDriveFileId('https://drive.google.com/file/d/abc123/view')).toBe('abc123');
  });
  it('reads the id from a ?id= query param', () => {
    expect(extractDriveFileId('https://drive.google.com/open?id=xyz789')).toBe('xyz789');
  });
  it('returns null when no id is present', () => {
    expect(extractDriveFileId('https://drive.google.com/drive/folders/')).toBeNull();
  });
});

describe('CompositeLinkChecker', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('routes Drive URLs to the Drive gateway when configured', async () => {
    const drive = fakeDrive(true, 'private');
    const checker = new CompositeLinkChecker(drive);
    const status = await checker.check('https://drive.google.com/file/d/abc123/view');
    expect(status).toBe('private');
    expect(drive.getFile).toHaveBeenCalledWith('abc123');
  });

  it('falls back to HTTP HEAD for Drive URLs when the gateway is not configured', async () => {
    const drive = fakeDrive(false, 'ok');
    const fetchMock = vi.fn(() => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const checker = new CompositeLinkChecker(drive);
    const status = await checker.check('https://drive.google.com/file/d/abc123/view');
    expect(status).toBe('ok');
    expect(drive.getFile).not.toHaveBeenCalled();
  });

  it('treats a broken Drive URL with no extractable id as broken', async () => {
    const drive = fakeDrive(true, 'ok');
    const checker = new CompositeLinkChecker(drive);
    const status = await checker.check('https://drive.google.com/drive/folders/');
    expect(status).toBe('broken');
  });

  it('follows a GET for Google Photos hosts', async () => {
    const fetchMock = vi.fn(() => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const checker = new CompositeLinkChecker(fakeDrive(false, 'ok'));
    const status = await checker.check('https://photos.app.goo.gl/abcd');
    expect(status).toBe('ok');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('HEADs a generic URL and falls back to GET on 405', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const checker = new CompositeLinkChecker(fakeDrive(false, 'ok'));
    const status = await checker.check('https://example.org/doc.pdf');
    expect(status).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('marks an unresolvable URL as broken', async () => {
    const checker = new CompositeLinkChecker(fakeDrive(false, 'ok'));
    const status = await checker.check('not-a-url');
    expect(status).toBe('broken');
  });

  it('marks a network failure or timeout as broken', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('network error');
      }),
    );
    const checker = new CompositeLinkChecker(fakeDrive(false, 'ok'));
    const status = await checker.check('https://example.org/unreachable');
    expect(status).toBe('broken');
  });
});
