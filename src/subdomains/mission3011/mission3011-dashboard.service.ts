import { Injectable } from '@nestjs/common';
import type { ProjectSummary } from '../../public/project-summary.registry';
import { Mission3011DashboardRepository } from './mission3011-dashboard.repository';
import type { Mission3011Dashboard } from './mission3011.types';

export const MISSION3011_TARGET_UNITS = 3011;
const LATEST_CAMPS_LIMIT = 10;

@Injectable()
export class Mission3011DashboardService {
  constructor(private readonly repo: Mission3011DashboardRepository) {}

  async build(): Promise<Mission3011Dashboard> {
    const [totalUnits, byZone, latest, perClub] = await Promise.all([
      this.repo.totalApprovedUnits(),
      this.repo.byZone(),
      this.repo.latestApproved(LATEST_CAMPS_LIMIT),
      this.repo.perClub(),
    ]);
    return {
      totalUnits,
      target: MISSION3011_TARGET_UNITS,
      byZone,
      latestApprovedCamps: latest.map((c) => ({
        id: c.id,
        date: c.date.toISOString().slice(0, 10),
        venue: c.venue,
        city: c.city,
        unitsCollected: c.unitsCollected,
        leadClub: c.leadClub,
      })),
      perClub,
      updatedAt: new Date().toISOString(),
    };
  }

  async summary(): Promise<ProjectSummary> {
    const [totalUnits, campsApproved, byZone] = await Promise.all([
      this.repo.totalApprovedUnits(),
      this.repo.countApprovedCamps(),
      this.repo.byZone(),
    ]);
    return {
      headline: 'Units collected toward the 3,011 target',
      value: totalUnits,
      target: MISSION3011_TARGET_UNITS,
      unit: 'units',
      secondary: [
        { label: 'Camps approved', value: campsApproved },
        { label: 'Zones reporting', value: byZone.length },
      ],
      updatedAt: new Date().toISOString(),
    };
  }
}
