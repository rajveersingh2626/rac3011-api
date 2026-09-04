import { Injectable } from '@nestjs/common';

export type ProjectSummary = {
  headline: string;
  value: number;
  target?: number;
  unit: string;
  secondary: { label: string; value: number | string }[];
  updatedAt: string;
};

export type ProjectKey = 'mission3011' | 'drishti' | 'rcl' | 'careerbridge' | 'ride';

export const PROJECT_KEYS: ProjectKey[] = ['mission3011', 'drishti', 'rcl', 'careerbridge', 'ride'];

// Empty until each subdomain (steps 12-13) registers its own summary() provider (spec §10).
@Injectable()
export class ProjectSummaryRegistry {
  private readonly providers = new Map<ProjectKey, () => Promise<ProjectSummary>>();

  register(key: ProjectKey, provider: () => Promise<ProjectSummary>): void {
    this.providers.set(key, provider);
  }

  get(key: ProjectKey): (() => Promise<ProjectSummary>) | undefined {
    return this.providers.get(key);
  }
}
