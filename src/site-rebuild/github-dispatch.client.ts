import { Injectable, Logger } from '@nestjs/common';
import { env } from '../config/env';

@Injectable()
export class GithubDispatchClient {
  private readonly logger = new Logger('GithubDispatchClient');

  async dispatch(): Promise<void> {
    if (env.SITE_REBUILD_ENABLED === 'off') {
      this.logger.log('SITE_REBUILD_ENABLED=off, skipping site rebuild dispatch');
      return;
    }
    if (!env.SITE_REBUILD_GITHUB_TOKEN) {
      this.logger.warn('SITE_REBUILD_GITHUB_TOKEN not set, skipping site rebuild dispatch');
      return;
    }
    const url = `https://api.github.com/repos/${env.SITE_REBUILD_REPO}/actions/workflows/${env.SITE_REBUILD_WORKFLOW}/dispatches`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SITE_REBUILD_GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`site rebuild dispatch failed (${res.status}): ${text}`);
    }
    this.logger.log(`site rebuild dispatched for ${env.SITE_REBUILD_REPO}@main`);
  }
}
