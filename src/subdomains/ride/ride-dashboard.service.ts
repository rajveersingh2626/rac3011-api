import { Injectable } from '@nestjs/common';
import { currentRyYear } from '../../common/ry-year';
import type { ProjectSummary } from '../../public/project-summary.registry';
import { RideDelegationsRepository } from './ride-delegations.repository';
import type { RideDashboard } from './ride.types';

@Injectable()
export class RideDashboardService {
  constructor(private readonly repo: RideDelegationsRepository) {}

  async build(): Promise<RideDashboard> {
    const ryYear = currentRyYear();
    const [delegationsThisRy, hostClubsThisRy] = await Promise.all([
      this.repo.countThisRy(ryYear),
      this.repo.countDistinctHostClubsThisRy(ryYear),
    ]);
    return { delegationsThisRy, hostClubsThisRy, updatedAt: new Date().toISOString() };
  }

  async summary(): Promise<ProjectSummary> {
    const dashboard = await this.build();
    return {
      headline: 'Incoming delegations hosted this Rotary year',
      value: dashboard.delegationsThisRy,
      unit: 'delegations',
      secondary: [{ label: 'Host clubs', value: dashboard.hostClubsThisRy }],
      updatedAt: dashboard.updatedAt,
    };
  }
}
