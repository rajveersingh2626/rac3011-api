import { Injectable } from '@nestjs/common';
import type { ProjectSummary } from '../../public/project-summary.registry';
import { CareerbridgeListingsRepository } from './careerbridge-listings.repository';

@Injectable()
export class CareerbridgeDashboardService {
  constructor(private readonly repo: CareerbridgeListingsRepository) {}

  async summary(): Promise<ProjectSummary> {
    const stats = await this.repo.stats();
    return {
      headline: 'Open opportunities on Career Bridge',
      value: stats.verified,
      unit: 'listings',
      secondary: [
        { label: 'Filled', value: stats.filled },
        { label: 'Pending review', value: stats.pending },
      ],
      updatedAt: new Date().toISOString(),
    };
  }
}
