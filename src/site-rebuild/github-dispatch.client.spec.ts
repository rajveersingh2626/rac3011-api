import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env';
import { GithubDispatchClient } from './github-dispatch.client';

describe('GithubDispatchClient', () => {
  const originalEnabled = env.SITE_REBUILD_ENABLED;
  const originalToken = env.SITE_REBUILD_GITHUB_TOKEN;
  const originalRepo = env.SITE_REBUILD_REPO;
  const originalWorkflow = env.SITE_REBUILD_WORKFLOW;

  afterEach(() => {
    env.SITE_REBUILD_ENABLED = originalEnabled;
    env.SITE_REBUILD_GITHUB_TOKEN = originalToken;
    env.SITE_REBUILD_REPO = originalRepo;
    env.SITE_REBUILD_WORKFLOW = originalWorkflow;
    vi.unstubAllGlobals();
  });

  it('no-ops without calling fetch when SITE_REBUILD_ENABLED is off', async () => {
    env.SITE_REBUILD_ENABLED = 'off';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await new GithubDispatchClient().dispatch();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no-ops without calling fetch when no token is configured', async () => {
    env.SITE_REBUILD_ENABLED = 'on';
    env.SITE_REBUILD_GITHUB_TOKEN = undefined;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await new GithubDispatchClient().dispatch();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dispatches workflow_dispatch with ref=main and a bearer token', async () => {
    env.SITE_REBUILD_ENABLED = 'on';
    env.SITE_REBUILD_GITHUB_TOKEN = 'gho_test';
    env.SITE_REBUILD_REPO = 'round-robin-solutions/rac3011-web';
    env.SITE_REBUILD_WORKFLOW = 'ci.yml';
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetchMock);
    await new GithubDispatchClient().dispatch();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/round-robin-solutions/rac3011-web/actions/workflows/ci.yml/dispatches',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer gho_test',
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      },
    );
  });

  it('throws on a non-ok response so BullMQ retries', async () => {
    env.SITE_REBUILD_ENABLED = 'on';
    env.SITE_REBUILD_GITHUB_TOKEN = 'gho_test';
    const fetchMock = vi.fn(() => Promise.resolve(new Response('bad', { status: 500 })));
    vi.stubGlobal('fetch', fetchMock);
    await expect(new GithubDispatchClient().dispatch()).rejects.toThrow(/500/);
  });
});
