import type { LinkCheckStatus } from './link-checker.port';

const TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, method: 'HEAD' | 'GET'): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { method, redirect: 'follow', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function httpCheck(url: string): Promise<LinkCheckStatus> {
  try {
    let res = await fetchWithTimeout(url, 'HEAD');
    if (res.status === 405) res = await fetchWithTimeout(url, 'GET');
    return res.ok ? 'ok' : 'broken';
  } catch {
    return 'broken';
  }
}

export async function followGetOk(url: string): Promise<LinkCheckStatus> {
  try {
    const res = await fetchWithTimeout(url, 'GET');
    return res.ok ? 'ok' : 'broken';
  } catch {
    return 'broken';
  }
}
