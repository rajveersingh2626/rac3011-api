import { Injectable } from '@nestjs/common';
import type { ProjectSummary } from '../../public/project-summary.registry';
import { DrishtiDashboardRepository } from './drishti-dashboard.repository';
import type { DrishtiDashboard } from './drishti.types';

export const DRISHTI_TARGET_SURGERIES = 100;

@Injectable()
export class DrishtiDashboardService {
  constructor(private readonly repo: DrishtiDashboardRepository) {}

  async build(): Promise<DrishtiDashboard> {
    const [operatedCount, pipelineCounts, hospitals, perClub] = await Promise.all([
      this.repo.operatedCount(),
      this.repo.pipelineCounts(),
      this.repo.hospitals(),
      this.repo.perClub(),
    ]);
    return {
      operatedCount,
      target: DRISHTI_TARGET_SURGERIES,
      pipelineCounts,
      hospitals,
      perClub,
      updatedAt: new Date().toISOString(),
    };
  }

  async summary(): Promise<ProjectSummary> {
    const [operatedCount, pipelineCounts, hospitals] = await Promise.all([
      this.repo.operatedCount(),
      this.repo.pipelineCounts(),
      this.repo.hospitals(),
    ]);
    return {
      headline: 'Surgeries completed toward the 100-surgery target',
      value: operatedCount,
      target: DRISHTI_TARGET_SURGERIES,
      unit: 'surgeries',
      secondary: [
        { label: 'In pipeline', value: pipelineCounts.screened + pipelineCounts.scheduled },
        { label: 'Partner hospitals', value: hospitals.length },
      ],
      updatedAt: new Date().toISOString(),
    };
  }
}
